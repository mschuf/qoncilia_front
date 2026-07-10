import type { ChangeEvent, Dispatch, SetStateAction } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { DragEndEvent } from "@dnd-kit/core"
import { apiClient, ApiError } from "../api/apiClient"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useDebounce } from "./useDebounce"
import {
  getStoredSapConfigId,
  storeSapConfigId,
  type SapB1QueryComparisonResult,
  type SapB1QueryPreviewResult,
  type SapExternalReconciliationRequest,
  type SapExternalReconciliationResult,
  type SapErpSession,
  type SapTarjetasBulkDepositResult,
  type SapTarjetasCsvParseResult,
  type SapTarjetasDepositRequest,
  type SapTarjetasSystemQueryResult,
} from "../erp/sap"
import type { AuthUser } from "../types/auth"
import type {
  BankStatementSummary,
  Layout,
  LayoutMapping,
  PreviewMatch,
  PreviewResponse,
  PreviewRow,
  UserBankWithLayouts,
  PaginatedResponse
} from "../types/conciliation"
import type { CompanyErpConfig } from "../types/erp"
import { isAdminRole, isSuperAdminRole, ROLE_VALUES } from "../utils/role"
import { getDefaultEsteMesDates } from "../components/ConciliationWorkbench/DateRangePicker"

function hasComparableMapping(mapping: LayoutMapping) {
  return Boolean(mapping.systemColumn?.trim() && mapping.bankColumn?.trim())
}

function createManualMatch(
  mappings: LayoutMapping[],
  systemRow: PreviewRow,
  bankRow: PreviewRow
): PreviewMatch {
  const activeMappings = mappings.filter((item) => item.active && hasComparableMapping(item))
  let totalWeight = 0
  let matchedWeight = 0
  const ruleResults = activeMappings.map((mapping) => {
    const systemValue = systemRow.normalized[mapping.fieldKey] ?? null
    const bankValue = bankRow.normalized[mapping.fieldKey] ?? null
    const passed = compareValues(mapping, systemValue, bankValue)
    const applicable = mapping.required || systemValue !== null || bankValue !== null

    if (applicable) {
      totalWeight += mapping.weight
      if (passed) matchedWeight += mapping.weight
    }

    return {
      fieldKey: mapping.fieldKey,
      label: mapping.label,
      passed,
      compareOperator: mapping.compareOperator,
      systemValue,
      bankValue
    }
  })

  return {
    systemRowId: systemRow.rowId,
    bankRowId: bankRow.rowId,
    systemRowNumber: systemRow.rowNumber,
    bankRowNumber: bankRow.rowNumber,
    score: totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) / 100 : 0,
    status: "manual",
    ruleResults
  }
}

function compareValues(
  mapping: LayoutMapping,
  left: string | number | null,
  right: string | number | null
): boolean {
  if (left === null && right === null) return true
  if (left === null || right === null) return false

  const textLeft = String(left)
  const textRight = String(right)

  switch (mapping.compareOperator) {
    case "contains":
      return textLeft.includes(textRight) || textRight.includes(textLeft)
    case "starts_with":
      return textLeft.startsWith(textRight) || textRight.startsWith(textLeft)
    case "ends_with":
      return textLeft.endsWith(textRight) || textRight.endsWith(textLeft)
    case "numeric_equals":
      return Math.abs(Number(left) - Number(right)) <= (mapping.tolerance ?? 0)
    case "date_equals":
      return compareDatesWithTolerance(textLeft, textRight, mapping.tolerance ?? 0)
    case "equals":
    default:
      return textLeft === textRight
  }
}

function compareDatesWithTolerance(left: string, right: string, toleranceDays: number) {
  const leftDay = parseDateDayNumber(left)
  const rightDay = parseDateDayNumber(right)
  if (leftDay === null || rightDay === null) {
    return left === right
  }

  return Math.abs(leftDay - rightDay) <= Math.abs(toleranceDays)
}

function parseDateDayNumber(value: string) {
  const parsed = Date.parse(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed)) return null
  return Math.floor(parsed / 86400000)
}

function sortRows(rows: PreviewRow[]) {
  return [...rows].sort((left, right) => left.rowNumber - right.rowNumber)
}

function addSortedUniqueRow(rows: PreviewRow[], row: PreviewRow) {
  if (rows.some((item) => item.rowId === row.rowId)) return rows
  return sortRows([...rows, row])
}

function getMatchKey(match: Pick<PreviewMatch, "systemRowId" | "bankRowId">) {
  return `${match.systemRowId}::${match.bankRowId}`
}

function parseDragRowId(value: unknown) {
  const text = String(value ?? "")
  const separatorIndex = text.indexOf(":")
  if (separatorIndex < 1) return null

  const source = text.slice(0, separatorIndex)
  const rowId = text.slice(separatorIndex + 1)
  if ((source !== "system" && source !== "bank") || !rowId) return null

  return { source, rowId }
}

function normalizeLookupKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
}

function findRowValue(row: PreviewRow | undefined, keys: string[]) {
  if (!row) return null
  const sources = [row.normalized, row.values]

  for (const key of keys) {
    const normalizedKey = normalizeLookupKey(key)
    for (const source of sources) {
      const direct = source[key]
      if (direct !== undefined && direct !== null && String(direct).trim()) return direct

      const foundEntry = Object.entries(source).find(
        ([entryKey]) => normalizeLookupKey(entryKey) === normalizedKey
      )
      const foundValue = foundEntry?.[1]
      if (foundValue !== undefined && foundValue !== null && String(foundValue).trim()) return foundValue
    }
  }

  return null
}

function findRowText(row: PreviewRow | undefined, keys: string[]) {
  const value = findRowValue(row, keys)
  if (value === null) return undefined
  const text = String(value).trim()
  return text || undefined
}

function parseRowNumber(row: PreviewRow | undefined, keys: string[]) {
  const value = findRowValue(row, keys)
  if (typeof value === "number" && Number.isFinite(value)) return Math.abs(value)
  if (typeof value !== "string") return undefined

  const normalized = value.trim().replace(/\s/g, "")
  const numberValue = normalized.includes(",")
    ? Number(normalized.replace(/\./g, "").replace(",", "."))
    : Number(normalized)

  return Number.isFinite(numberValue) ? Math.abs(numberValue) : undefined
}

function sapSessionMessage(session: SapErpSession): string {
  switch (session.status) {
    case "active":
      return session.username
        ? `Sesion ERP activa para ${session.username}.`
        : "Sesion ERP activa."
    case "expired":
      return "La sesion ERP expiro. Inicia sesion nuevamente."
    case "invalid":
      return "La sesion ERP no es valida. Inicia sesion nuevamente."
    case "logged_out":
      return "La sesion ERP esta cerrada. Inicia sesion nuevamente."
    case "not_authenticated":
    default:
      return "No hay una sesion ERP activa. Inicia sesion para poder conciliar."
  }
}

export function summarizeRow(row: PreviewRow | undefined, mappings: LayoutMapping[]): string {
  if (!row) return "-"

  return (
    mappings
      .slice(0, 4)
      .map((mapping) => row.values[mapping.fieldKey])
      .filter(Boolean)
      .join(" | ") || row.rowId
  )
}

export type WorkbenchErpCodeFilter = "SAP_B1" | "SAP_TARJETAS"

export type UseConciliationWorkbenchOptions = {
  // Limita las configs ERP disponibles a un code (paginas dedicadas
  // "Conciliacion de banco" / "Pago de tarjeta"). Sin filtro = workbench clasico.
  erpCodeFilter?: WorkbenchErpCodeFilter
}

export default function useConciliationWorkbench(options?: UseConciliationWorkbenchOptions) {
  const erpCodeFilter = options?.erpCodeFilter
  const { role, user } = useAuth()
  // Conciliar en SAP: admin/superadmin o gestor de cobranzas (igual que el backend).
  const canReconcileErp = isAdminRole(role) || role === ROLE_VALUES.gestorCobranza
  const toast = useToast()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number>(Number(user?.id ?? 0))
  const [banks, setBanks] = useState<UserBankWithLayouts[]>([])
  const [selectedBankId, setSelectedBankId] = useState<number>(0)
  const [selectedCompanyBankAccountId, setSelectedCompanyBankAccountId] = useState<number>(0)
  const [selectedLayoutId, setSelectedLayoutId] = useState<number>(0)
  const [bankStatements, setBankStatements] = useState<BankStatementSummary[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalStatements, setTotalStatements] = useState(0)
  
  const defaultDates = useMemo(() => getDefaultEsteMesDates(), [])
  const [dateFrom, setDateFrom] = useState(defaultDates.from)
  const [dateTo, setDateTo] = useState(defaultDates.to)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedDateFrom = useDebounce(dateFrom, 350)
  const debouncedDateTo = useDebounce(dateTo, 350)
  const debouncedSearchTerm = useDebounce(searchTerm, 350)
  const [selectedBankStatementId, setSelectedBankStatementId] = useState<number>(0)
  const [systemFile, setSystemFile] = useState<File | null>(null)
  const [erpConfigs, setErpConfigs] = useState<CompanyErpConfig[]>([])
  const [isLoadingErpConfigs, setIsLoadingErpConfigs] = useState(true)
  const [selectedErpConfigId, setSelectedErpConfigId] = useState<number>(0)
  const [erpSession, setErpSession] = useState<SapErpSession | null>(null)
  const [isErpLoggingIn, setIsErpLoggingIn] = useState(false)
  const [sapB1QueryPreview, setSapB1QueryPreview] = useState<SapB1QueryPreviewResult | null>(null)
  const [isRunningSapB1Queries, setIsRunningSapB1Queries] = useState(false)
  // Modo SAP_TARJETAS: lado sistema (OCRH) por query y lado banco por CSV (no se guarda).
  const [cardFile, setCardFile] = useState<File | null>(null)
  const [cardCsvResult, setCardCsvResult] = useState<SapTarjetasCsvParseResult | null>(null)
  const [cardSystemQuery, setCardSystemQuery] = useState<SapTarjetasSystemQueryResult | null>(null)
  const [isRunningCardSystemQuery, setIsRunningCardSystemQuery] = useState(false)
  const [isParsingCardCsv, setIsParsingCardCsv] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [isSendingExternalReconciliation, setIsSendingExternalReconciliation] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [manualMatches, setManualMatches] = useState<PreviewMatch[]>([])
  const [unmatchedSystemRows, setUnmatchedSystemRows] = useState<PreviewRow[]>([])
  const [unmatchedBankRows, setUnmatchedBankRows] = useState<PreviewRow[]>([])

  const loadUsers = useCallback(async () => {
    if (!isSuperAdminRole(role)) return
    const response = await apiClient.get<AuthUser[]>("/users/list")
    setUsers(response ?? [])
    setSelectedUserId((current) => current || Number(response?.[0]?.id ?? 0))
  }, [role])

  // Cache simple en memoria del catalogo por usuario para evitar refetch al
  // cambiar de tab y volver. Se invalida explicitamente desde refreshCatalog.
  const catalogCacheRef = useRef<Map<number, UserBankWithLayouts[]>>(new Map())

  const loadCatalog = useCallback(
    async (userId: number, options?: { force?: boolean }) => {
      const cached = catalogCacheRef.current.get(userId)
      if (!options?.force && cached) {
        setBanks(cached)
        setSelectedBankId((current) => {
          if (current > 0 && cached.some((item) => item.id === current)) return current
          return cached[0]?.id ?? 0
        })
        return
      }

      // Limpiar datos previos del usuario anterior mientras carga
      setBanks([])
      setSelectedBankId(0)
      setSelectedCompanyBankAccountId(0)
      setSelectedLayoutId(0)
      setBankStatements([])
      setSelectedBankStatementId(0)

      setIsLoadingCatalog(true)
      try {
      const query = isSuperAdminRole(role) && userId ? `?userId=${userId}` : ""
      const response = await apiClient.get<UserBankWithLayouts[]>(`/conciliation/catalog${query}`)
        const nextBanks = response ?? []
        catalogCacheRef.current.set(userId, nextBanks)
        setBanks(nextBanks)
        setSelectedBankId((current) => {
          if (current > 0 && nextBanks.some((item) => item.id === current)) return current
          return nextBanks[0]?.id ?? 0
        })
      } finally {
        setIsLoadingCatalog(false)
      }
    },
    [role]
  )

  const refreshCatalog = useCallback(() => {
    catalogCacheRef.current.delete(selectedUserId)
    return loadCatalog(selectedUserId, { force: true })
  }, [loadCatalog, selectedUserId])

  useEffect(() => {
    void loadUsers().catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar usuarios.")
    })
  }, [loadUsers, toast])

  const loadErpConfigs = useCallback(async () => {
    setIsLoadingErpConfigs(true)
    try {
      const response = await apiClient.get<CompanyErpConfig[]>("/erp/configs?activeOnly=true")
      // El filtro se aplica ANTES del auto-select: asi un id guardado en
      // localStorage por la otra pagina (code distinto) cae al fallback default/primera.
      const nextConfigs = (response ?? []).filter(
        (config) => !erpCodeFilter || config.code?.toUpperCase() === erpCodeFilter
      )
      setErpConfigs(nextConfigs)
      setSelectedErpConfigId((current) => {
        const stored = getStoredSapConfigId(erpCodeFilter)
        if (current && nextConfigs.some((config) => config.id === current)) return current
        if (stored && nextConfigs.some((config) => config.id === stored)) return stored
        return nextConfigs.find((config) => config.isDefault)?.id ?? nextConfigs[0]?.id ?? 0
      })
    } finally {
      setIsLoadingErpConfigs(false)
    }
  }, [erpCodeFilter])

  const checkErpSession = useCallback(async (showFeedback = false) => {
    if (!selectedErpConfigId) {
      setErpSession(null)
      if (showFeedback) {
        toast.error("Selecciona una configuracion ERP activa.")
      }
      return null
    }

    try {
      const response = await apiClient.get<SapErpSession>(
        `/erp/sap/sessions/status?companyErpConfigId=${selectedErpConfigId}`,
        { timeoutMs: 20000 }
      )
      setErpSession(response)
      if (response.authenticated) {
        storeSapConfigId(selectedErpConfigId, erpCodeFilter)
      }
      if (showFeedback) {
        const message = sapSessionMessage(response)
        if (response.authenticated) {
          toast.success(message)
        } else {
          toast.error(message)
        }
      }
      return response
    } catch (error) {
      setErpSession(null)
      if (showFeedback) {
        toast.error(error instanceof Error ? error.message : "No se pudo validar la sesion ERP.")
        return null
      }
      throw error
    }
  }, [erpCodeFilter, selectedErpConfigId, toast])

  const loginErpSession = useCallback(
    async (username?: string, password?: string): Promise<boolean> => {
      if (!selectedErpConfigId) {
        toast.error("Selecciona una configuracion ERP activa.")
        return false
      }

      setIsErpLoggingIn(true)
      try {
        const response = await apiClient.post<SapErpSession>(
          "/erp/sap/sessions/login",
          {
            companyErpConfigId: selectedErpConfigId,
            username: username || undefined,
            password: password || undefined
          },
          { timeoutMs: 20000 }
        )
        setErpSession(response)
        if (response.authenticated) {
          storeSapConfigId(selectedErpConfigId, erpCodeFilter)
          toast.success("Sesion ERP iniciada correctamente.")
          return true
        }
        toast.error(sapSessionMessage(response))
        return false
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo iniciar sesion en el ERP.")
        return false
      } finally {
        setIsErpLoggingIn(false)
      }
    },
    [erpCodeFilter, selectedErpConfigId, toast]
  )

  useEffect(() => {
    void loadErpConfigs().catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las ERPs activas.")
    })
  }, [loadErpConfigs, toast])

  useEffect(() => {
    if (!selectedErpConfigId) {
      setErpSession(null)
      return
    }

    storeSapConfigId(selectedErpConfigId, erpCodeFilter)
    void checkErpSession().catch(() => setErpSession(null))
  }, [checkErpSession, erpCodeFilter, selectedErpConfigId])

  // Carga automatica del catalogo para todos excepto superadmin.
  useEffect(() => {
    if (!selectedUserId) return
    if (isSuperAdminRole(role)) return
    void loadCatalog(selectedUserId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo.")
    })
  }, [loadCatalog, role, selectedUserId, toast])

  const selectedBank = useMemo(
    () => banks.find((item) => item.id === selectedBankId) ?? null,
    [banks, selectedBankId]
  )

  const accounts = selectedBank?.accounts ?? []

  useEffect(() => {
    setSelectedCompanyBankAccountId((current) => {
      if (current > 0 && accounts.some((item) => item.id === current)) return current
      return accounts[0]?.id ?? 0
    })
  }, [accounts])

  const layouts = selectedBank?.layouts ?? []
  const selectedLayout = useMemo<Layout | null>(
    () => layouts.find((item) => item.id === selectedLayoutId) ?? layouts[0] ?? null,
    [layouts, selectedLayoutId]
  )

  useEffect(() => {
    if (selectedLayout) {
      setSelectedLayoutId(selectedLayout.id)
    } else {
      setSelectedLayoutId(0)
    }
  }, [selectedLayout])

  // AbortController para cancelar la request en vuelo cuando cambian filtros
  // rapidamente o al desmontar el hook.
  const statementsAbortRef = useRef<AbortController | null>(null)

  const loadBankStatements = useCallback(
    async (targetPage: number, options?: { signal?: AbortSignal }) => {
      if (!selectedBankId || !selectedCompanyBankAccountId || !selectedLayoutId) {
        setBankStatements([])
        setTotalPages(1)
        setTotalStatements(0)
        setSelectedBankStatementId(0)
        return
      }

      const params = new URLSearchParams({
        userBankId: String(selectedBankId),
        companyBankAccountId: String(selectedCompanyBankAccountId),
        layoutId: String(selectedLayoutId)
      })

      if (isSuperAdminRole(role) && selectedUserId) {
        params.set("userId", String(selectedUserId))
      }
      if (debouncedDateFrom) params.set("dateFrom", debouncedDateFrom)
      if (debouncedDateTo) params.set("dateTo", debouncedDateTo)
      const trimmedSearch = debouncedSearchTerm.trim()
      if (trimmedSearch) params.set("search", trimmedSearch)
      params.set("page", String(targetPage))
      params.set("limit", String(pageSize))

      const response = await apiClient.get<PaginatedResponse<BankStatementSummary>>(
        `/conciliation/bank-statements?${params.toString()}`,
        { signal: options?.signal }
      )
      const nextStatements = response?.data ?? []
      setBankStatements(nextStatements)
      setTotalPages(response?.lastPage ?? 1)
      setTotalStatements(response?.total ?? 0)
      setSelectedBankStatementId((current) => {
        if (current > 0 && nextStatements.some((item) => item.id === current)) return current
        return nextStatements[0]?.id ?? 0
      })
    },
    [
      role,
      selectedBankId,
      selectedCompanyBankAccountId,
      selectedLayoutId,
      selectedUserId,
      debouncedDateFrom,
      debouncedDateTo,
      debouncedSearchTerm,
      pageSize
    ]
  )

  const searchBankStatements = useCallback(() => {
    statementsAbortRef.current?.abort()
    const controller = new AbortController()
    statementsAbortRef.current = controller
    void loadBankStatements(page, { signal: controller.signal }).catch((error) => {
      if (error instanceof ApiError && error.code === "REQUEST_ABORTED") return
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar extractos.")
    })
  }, [loadBankStatements, page, toast])

  const goToPage = useCallback((targetPage: number) => {
    setPage(targetPage)
    statementsAbortRef.current?.abort()
    const controller = new AbortController()
    statementsAbortRef.current = controller
    void loadBankStatements(targetPage, { signal: controller.signal }).catch((error) => {
      if (error instanceof ApiError && error.code === "REQUEST_ABORTED") return
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar extractos.")
    })
  }, [loadBankStatements, toast])

  const selectedBankStatement = useMemo(
    () => bankStatements.find((item) => item.id === selectedBankStatementId) ?? null,
    [bankStatements, selectedBankStatementId]
  )

  const selectedErpConfig = useMemo(
    () => erpConfigs.find((config) => config.id === selectedErpConfigId) ?? null,
    [erpConfigs, selectedErpConfigId]
  )
  const isSapB1QueryMode = selectedErpConfig?.code?.toUpperCase() === "SAP_B1"
  const isSapTarjetasMode = selectedErpConfig?.code?.toUpperCase() === "SAP_TARJETAS"

  const clearPreview = useCallback(() => {
    setPreview(null)
    setManualMatches([])
    setUnmatchedSystemRows([])
    setUnmatchedBankRows([])
  }, [])

  const clearSapB1QueryPreview = useCallback(() => {
    setSapB1QueryPreview(null)
  }, [])

  // Solo el lado sistema (OCRH) depende de fechas/cuenta/ERP; el CSV es independiente.
  const clearCardSystemQuery = useCallback(() => {
    setCardSystemQuery(null)
  }, [])

  useEffect(() => {
    clearSapB1QueryPreview()
  }, [
    clearSapB1QueryPreview,
    dateFrom,
    dateTo,
    selectedBankId,
    selectedCompanyBankAccountId,
    selectedErpConfigId
  ])

  useEffect(() => {
    clearCardSystemQuery()
  }, [
    clearCardSystemQuery,
    dateFrom,
    dateTo,
    selectedBankId,
    selectedCompanyBankAccountId,
    selectedErpConfigId
  ])

  // El CSV es independiente de fechas/cuenta, pero NO debe arrastrarse entre
  // configuraciones ERP distintas (podria confundir al usuario): se limpia al
  // cambiar de configuracion seleccionada.
  useEffect(() => {
    setCardFile(null)
    setCardCsvResult(null)
  }, [selectedErpConfigId])

  const onFileChange =
    (setter: Dispatch<SetStateAction<File | null>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.files?.[0] ?? null)
    }

  const runComparison = async () => {
    const compareBlockers = [
      !selectedErpConfigId ? "No hay una configuracion ERP activa seleccionada." : null,
      !erpSession?.authenticated ? "La sesion ERP no esta autenticada." : null,
      !selectedBankStatementId ? "No hay extracto bancario guardado seleccionado." : null,
      !systemFile ? "No hay Excel del sistema cargado." : null,
      !selectedBankId ? "No hay banco seleccionado." : null,
      !selectedCompanyBankAccountId ? "No hay cuenta bancaria seleccionada." : null,
      !selectedLayoutId ? "No hay plantilla/layout seleccionada." : null
    ].filter(Boolean) as string[]

    console.groupCollapsed("[Qoncilia] Comparar - diagnostico para habilitar Conciliar ERP")
    console.table({
      puedeComparar: compareBlockers.length === 0,
      faltantes: compareBlockers.join(" | ") || "Sin faltantes para comparar",
      role,
      selectedUserId,
      selectedBankId,
      selectedBankName: selectedBank?.bankName ?? "sin banco",
      selectedCompanyBankAccountId,
      selectedLayoutId,
      selectedLayoutName: selectedLayout?.name ?? "sin plantilla",
      selectedBankStatementId,
      selectedBankStatementFile: selectedBankStatement?.fileName ?? "sin extracto",
      selectedErpConfigId,
      erpAuthenticated: Boolean(erpSession?.authenticated),
      erpStatus: erpSession?.status ?? "sin sesion",
      systemFileName: systemFile?.name ?? "sin archivo"
    })
    console.groupEnd()

    if (!selectedErpConfigId) {
      toast.error("No hay una configuracion ERP activa para conciliar.")
      return
    }

    if (!erpSession?.authenticated) {
      toast.error("Inicia sesion en el ERP antes de conciliar.")
      return
    }

    if (!selectedBankStatementId) {
      toast.error("Selecciona un extracto bancario guardado.")
      return
    }

    if (!systemFile) {
      toast.error("Sube el Excel del sistema para comparar.")
      return
    }

    const formData = new FormData()
    formData.append("bankStatementId", String(selectedBankStatementId))
    formData.append("systemFile", systemFile)

    try {
      setIsComparing(true)
      const response = await apiClient.post<PreviewResponse>(
        "/conciliation/compare-bank-statement",
        formData,
        { showBackdrop: false, timeoutMs: 45000 }
      )
      setPreview(response)
      setManualMatches([])
      setUnmatchedSystemRows(response.unmatchedSystemRows)
      setUnmatchedBankRows(response.unmatchedBankRows)
      const matchesCount = response.autoMatches.length
      const pendingSystemRows = response.unmatchedSystemRows.length
      const pendingBankRows = response.unmatchedBankRows.length
      const conciliateBlockers = [
        matchesCount === 0 ? "La comparacion no encontro coincidencias automaticas." : null,
        !erpSession?.authenticated ? "La sesion ERP no esta autenticada." : null,
        !canReconcileErp ? `El rol ${role ?? "sin rol"} no puede conciliar en ERP.` : null
      ].filter(Boolean) as string[]
      const pendingInfo = [
        pendingSystemRows > 0 ? `Quedan ${pendingSystemRows} filas pendientes del sistema.` : null,
        pendingBankRows > 0 ? `Quedan ${pendingBankRows} filas pendientes del banco.` : null
      ].filter(Boolean) as string[]
      console.groupCollapsed("[Qoncilia] Comparar - resultado y bloqueo del boton Conciliar ERP")
      console.table({
        botonVisible: true,
        botonHabilitable: conciliateBlockers.length === 0,
        bloqueos: conciliateBlockers.join(" | ") || "Sin bloqueos",
        pendientesNoEnviados: pendingInfo.join(" | ") || "Sin pendientes",
        autoMatches: response.autoMatches.length,
        manualMatches: 0,
        pendingSystemRows,
        pendingBankRows,
        totalSystemRows: response.systemRows.length,
        totalBankRows: response.bankRows.length,
        threshold: response.layout.autoMatchThreshold,
        layoutName: response.layout.name
      })
      console.groupEnd()
      toast.success("Comparacion lista.")
    } catch (error) {
      console.groupCollapsed("[Qoncilia] Comparar - error")
      console.error(error)
      console.groupEnd()
      toast.error(error instanceof Error ? error.message : "No se pudo comparar el extracto.")
    } finally {
      setIsComparing(false)
    }
  }

  const runSapB1QueryPreview = async () => {
    if (!selectedErpConfigId || !isSapB1QueryMode) {
      toast.error("Selecciona una configuracion ERP SAP_B1 activa.")
      return
    }

    if (!selectedCompanyBankAccountId) {
      toast.error("Selecciona una cuenta bancaria.")
      return
    }

    if (!dateFrom || !dateTo) {
      toast.error("Selecciona Fecha Desde y Fecha Hasta.")
      return
    }

    try {
      setIsRunningSapB1Queries(true)
      const response = await apiClient.post<SapB1QueryPreviewResult>(
        "/erp/sap/query-preview",
        {
          companyErpConfigId: selectedErpConfigId,
          companyBankAccountId: selectedCompanyBankAccountId,
          dateFrom,
          dateTo
        },
        { timeoutMs: 45000 }
      )
      setSapB1QueryPreview(response)
      clearPreview()
      toast.success("Consultas SAP_B1 ejecutadas.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron ejecutar las consultas SAP_B1.")
    } finally {
      setIsRunningSapB1Queries(false)
    }
  }

  const runSapB1QueryComparison = async ({
    columns,
    excludedBankRowIds = [],
    excludedSystemRowIds = []
  }: {
    columns: string[]
    excludedBankRowIds?: string[]
    excludedSystemRowIds?: string[]
  }) => {
    if (!selectedErpConfigId || !isSapB1QueryMode) {
      toast.error("Selecciona una configuracion ERP SAP_B1 activa.")
      return null
    }

    if (!sapB1QueryPreview) {
      toast.error("Primero ejecuta las consultas SAP_B1.")
      return null
    }

    if (columns.length === 0) {
      toast.error("No hay columnas disponibles para comparar.")
      return null
    }

    try {
      setIsComparing(true)
      const response = await apiClient.post<SapB1QueryComparisonResult>(
        "/erp/sap/query-preview/compare",
        {
          companyErpConfigId: selectedErpConfigId,
          bank: sapB1QueryPreview.bank,
          system: sapB1QueryPreview.system,
          columns,
          excludedBankRowIds,
          excludedSystemRowIds
        },
        { showBackdrop: false, timeoutMs: 45000 }
      )
      toast.success("Comparacion lista.")
      return response
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo comparar en SAP_B1.")
      return null
    } finally {
      setIsComparing(false)
    }
  }

  // === SAP_TARJETAS ========================================================
  const runCardSystemQuery = async () => {
    if (!selectedErpConfigId || !isSapTarjetasMode) {
      toast.error("Selecciona una configuracion ERP SAP_TARJETAS activa.")
      return
    }

    if (!dateFrom || !dateTo) {
      toast.error("Selecciona Fecha Desde y Fecha Hasta.")
      return
    }

    try {
      setIsRunningCardSystemQuery(true)
      const response = await apiClient.post<SapTarjetasSystemQueryResult>(
        "/erp/sap/credit-cards/system-query",
        {
          companyErpConfigId: selectedErpConfigId,
          companyBankAccountId: selectedCompanyBankAccountId || undefined,
          dateFrom,
          dateTo
        },
        { timeoutMs: 45000 }
      )
      setCardSystemQuery(response)
      clearPreview()
      toast.success("Consulta del sistema ejecutada.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo ejecutar la consulta del sistema."
      )
    } finally {
      setIsRunningCardSystemQuery(false)
    }
  }

  const parseCardCsv = async (file: File) => {
    if (!selectedErpConfigId || !isSapTarjetasMode) {
      toast.error("Selecciona una configuracion ERP SAP_TARJETAS activa.")
      return
    }

    try {
      setIsParsingCardCsv(true)
      const formData = new FormData()
      formData.append("companyErpConfigId", String(selectedErpConfigId))
      formData.append("file", file)
      const response = await apiClient.post<SapTarjetasCsvParseResult>(
        "/erp/sap/credit-cards/parse-csv",
        formData,
        { showBackdrop: false, timeoutMs: 45000 }
      )
      setCardCsvResult(response)
      toast.success(`CSV cargado: ${response.includedRows} registros.`)
    } catch (error) {
      setCardCsvResult(null)
      toast.error(
        error instanceof Error ? error.message : "No se pudo procesar el CSV de tarjetas."
      )
    } finally {
      setIsParsingCardCsv(false)
    }
  }

  const onCardFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setCardFile(file)
    if (file) {
      void parseCardCsv(file)
    } else {
      setCardCsvResult(null)
    }
  }

  const clearCardFile = () => {
    setCardFile(null)
    setCardCsvResult(null)
  }

  const runCardComparison = async ({
    columns,
    excludedBankRowIds = [],
    excludedSystemRowIds = []
  }: {
    columns: string[]
    excludedBankRowIds?: string[]
    excludedSystemRowIds?: string[]
  }): Promise<SapB1QueryComparisonResult | null> => {
    if (!selectedErpConfigId || !isSapTarjetasMode) {
      toast.error("Selecciona una configuracion ERP SAP_TARJETAS activa.")
      return null
    }

    if (!cardSystemQuery) {
      toast.error("Primero ejecuta la consulta del sistema.")
      return null
    }

    if (!cardCsvResult) {
      toast.error("Primero carga el CSV de la procesadora.")
      return null
    }

    if (columns.length === 0) {
      toast.error("No hay columnas disponibles para comparar.")
      return null
    }

    try {
      setIsComparing(true)
      const response = await apiClient.post<SapB1QueryComparisonResult>(
        "/erp/sap/query-preview/compare",
        {
          companyErpConfigId: selectedErpConfigId,
          bank: cardCsvResult.bank,
          system: cardSystemQuery.system,
          columns,
          excludedBankRowIds,
          excludedSystemRowIds,
          // SAP_TARJETAS: match de referencia por "like" (contencion) para tolerar
          // el padding de ceros del Cod. autorizacion vs VoucherNum del sistema.
          referenceMatchMode: "like"
        },
        { showBackdrop: false, timeoutMs: 45000 }
      )
      toast.success("Comparacion lista.")
      return response
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo comparar las tarjetas.")
      return null
    } finally {
      setIsComparing(false)
    }
  }

  // Deposito masivo: el backend crea UN deposito por AbsId (misma cabecera y
  // JournalRemarks). Devuelve que AbsIds se depositaron y cuales fallaron para
  // que la seccion conserve solo los fallidos; null = no se llego a enviar.
  const sendSapTarjetasDepositToErp = async (
    matches: Array<{ systemRow: PreviewRow; bankRow: PreviewRow }>,
    options: { depositAccount: string; depositDate: string; journalRemarks: string }
  ): Promise<{ succeededAbsIds: number[]; failedAbsIds: number[] } | null> => {
    if (!canReconcileErp) {
      toast.error("Tu rol no tiene permiso para depositar en SAP.")
      return null
    }

    if (!selectedErpConfigId || !isSapTarjetasMode) {
      toast.error("Selecciona una configuracion ERP SAP_TARJETAS activa.")
      return null
    }

    if (!erpSession?.authenticated) {
      toast.error("Inicia sesion en el ERP antes de depositar.")
      return null
    }

    if (!cardSystemQuery) {
      toast.error("Primero ejecuta la consulta del sistema.")
      return null
    }

    if (matches.length === 0) {
      toast.error("No hay coincidencias para depositar en SAP.")
      return null
    }

    const depositAccount = options.depositAccount.trim()
    const depositDate = options.depositDate.trim()
    const journalRemarks = options.journalRemarks.trim()
    if (!depositAccount) {
      toast.error(
        "Falta la Cuenta Deposito: selecciona una cuenta bancaria con Cuenta Mayor configurada."
      )
      return null
    }
    if (!depositDate) {
      toast.error("Selecciona la Fecha de Deposito.")
      return null
    }

    const seenAbsIds = new Set<number>()
    const creditLines: SapTarjetasDepositRequest["creditLines"] = []
    for (const match of matches) {
      const absId = parseRowNumber(match.systemRow, ["AbsId", "AbsID", "absId", "abs_id"])
      if (!absId) {
        toast.error(`Falta AbsId en la fila ${match.systemRow.rowNumber} del sistema.`)
        return null
      }
      if (!seenAbsIds.has(absId)) {
        seenAbsIds.add(absId)
        creditLines.push({ absId })
      }
    }

    const request: SapTarjetasDepositRequest = {
      companyErpConfigId: selectedErpConfigId,
      depositAccount,
      // Fecha del deposito (YYYY-MM-DD): el backend la manda como DepositDate.
      depositDate,
      // Si el usuario lo dejo vacio, el backend aplica "COMPRA P.O.S BANCARD".
      journalRemarks: journalRemarks || undefined,
      // Datos de la cuenta bancaria seleccionada en la busqueda: Cuenta Pago
      // ERP, descripcion del banco y sucursal de la cuenta.
      bankAccountNum: cardSystemQuery.paymentAccountCode ?? undefined,
      bank: cardSystemQuery.bankName ?? undefined,
      bankBranch: cardSystemQuery.bankBranch ?? undefined,
      creditLines
    }

    try {
      setIsSendingExternalReconciliation(true)
      // Un POST a SAP por cada deposito: el timeout escala con el lote.
      const response = await apiClient.post<SapTarjetasBulkDepositResult>(
        "/erp/sap/credit-cards/deposits",
        request,
        { timeoutMs: Math.min(300000, 30000 + creditLines.length * 15000) }
      )

      const failedItems = response.results.filter((item) => item.status === "error")
      const succeededAbsIds = response.results
        .filter((item) => item.status === "success")
        .map((item) => item.absId)
      const failedAbsIds = failedItems.map((item) => item.absId)
      const firstError = failedItems.find((item) => item.errorMessage)?.errorMessage

      if (response.failed === 0) {
        toast.success(
          response.total === 1
            ? "Deposito creado en SAP."
            : `${response.succeeded} depositos creados en SAP.`
        )
      } else if (response.succeeded === 0) {
        toast.error(
          `No se creo ningun deposito en SAP.${firstError ? ` ${firstError}` : ""}`
        )
      } else {
        toast.error(
          `Se crearon ${response.succeeded} de ${response.total} depositos. ` +
            `Fallaron AbsId ${failedAbsIds.join(", ")}.${firstError ? ` ${firstError}` : ""}`
        )
      }

      return { succeededAbsIds, failedAbsIds }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el deposito a SAP.")
      return null
    } finally {
      setIsSendingExternalReconciliation(false)
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    if (!preview || !selectedLayout) return
    const activeRow = parseDragRowId(event.active.id)
    const overRow = parseDragRowId(event.over?.id)
    if (!activeRow || !overRow || activeRow.source === overRow.source) return

    const systemRowId = activeRow.source === "system" ? activeRow.rowId : overRow.rowId
    const bankRowId = activeRow.source === "bank" ? activeRow.rowId : overRow.rowId

    const systemRow = unmatchedSystemRows.find((item) => item.rowId === systemRowId)
    const bankRow = unmatchedBankRows.find((item) => item.rowId === bankRowId)
    if (!systemRow || !bankRow) return

    const manualMatch = createManualMatch(selectedLayout.mappings, systemRow, bankRow)
    setManualMatches((prev) => [...prev, manualMatch])
    setUnmatchedSystemRows((prev) => prev.filter((item) => item.rowId !== systemRowId))
    setUnmatchedBankRows((prev) => prev.filter((item) => item.rowId !== bankRowId))
  }

  const removeManualMatch = (target: PreviewMatch) => {
    const systemRow = preview?.systemRows.find((item) => item.rowId === target.systemRowId)
    const bankRow = preview?.bankRows.find((item) => item.rowId === target.bankRowId)
    const targetKey = getMatchKey(target)
    setManualMatches((prev) => prev.filter((item) => getMatchKey(item) !== targetKey))
    if (systemRow) {
      setUnmatchedSystemRows((prev) => addSortedUniqueRow(prev, systemRow))
    }
    if (bankRow) {
      setUnmatchedBankRows((prev) => addSortedUniqueRow(prev, bankRow))
    }
  }

  const removeAutoMatch = (target: PreviewMatch) => {
    const systemRow = preview?.systemRows.find((item) => item.rowId === target.systemRowId)
    const bankRow = preview?.bankRows.find((item) => item.rowId === target.bankRowId)
    const targetKey = getMatchKey(target)

    setPreview((current) => {
      if (!current) return current
      return {
        ...current,
        autoMatches: current.autoMatches.filter((item) => getMatchKey(item) !== targetKey)
      }
    })

    if (systemRow) {
      setUnmatchedSystemRows((prev) => addSortedUniqueRow(prev, systemRow))
    }
    if (bankRow) {
      setUnmatchedBankRows((prev) => addSortedUniqueRow(prev, bankRow))
    }
  }

  const sendExternalReconciliationToErp = async () => {
    if (!canReconcileErp) {
      toast.error("Tu rol no tiene permiso para conciliar en SAP.")
      return
    }

    if (!selectedErpConfigId) {
      toast.error("No hay una configuracion ERP activa para conciliar.")
      return
    }

    if (!erpSession?.authenticated) {
      toast.error("Inicia sesion en el ERP antes de conciliar.")
      return
    }

    if (!preview || !selectedBankStatementId) {
      toast.error("Primero compara un extracto bancario guardado.")
      return
    }

    const matches = [...preview.autoMatches, ...manualMatches]
    if (matches.length === 0) {
      toast.error("No hay coincidencias para conciliar en el ERP.")
      return
    }

    // Indices O(1) para evitar Array.find por match cuando hay miles de filas.
    const systemRowsById = new Map(preview.systemRows.map((row) => [row.rowId, row]))
    const bankRowsById = new Map(preview.bankRows.map((row) => [row.rowId, row]))

    const bankStatementLines: NonNullable<SapExternalReconciliationRequest["bankStatementLines"]> = []
    const journalEntryLines: NonNullable<SapExternalReconciliationRequest["journalEntryLines"]> = []
    const sapMatches: NonNullable<SapExternalReconciliationRequest["matches"]> = []
    const defaultedLineNumbers: Array<{
      match: number
      systemRow: number | string
      transactionNumber: number
    }> = []

    for (const [index, match] of matches.entries()) {
      const systemRow = systemRowsById.get(match.systemRowId)
      const bankRow = bankRowsById.get(match.bankRowId)
      const transactionNumber = parseRowNumber(systemRow, [
        "TransactionNumber",
        "transactionNumber",
        "TransId",
        "transId",
        "trans_id",
        "numeroTransaccion",
        "nroTransaccion",
        "nroAsiento",
        "numeroOperacion",
        "nroOperacion",
        "Número de operación",
        "Numero de operacion",
        "asiento"
      ])
      const rawLineNumber = parseRowNumber(systemRow, [
        "LineNumber",
        "lineNumber",
        "Line_ID",
        "lineId",
        "LineNum",
        "lineNum",
        "lineaAsiento",
        "linea",
        "Ref.2 (fila)",
        "Ref.2 fila",
        "Ref2"
      ])
      const sequence =
        parseRowNumber(bankRow, [
          "Sequence",
          "sequence",
          "BankStatementLineSequence",
          "bankStatementLineSequence",
          "lineSequence",
          "secuencia",
          "lineaBanco",
          "nroLineaBanco",
          "linea"
        ])
      const bankStatementAccountCode = findRowText(bankRow, [
        "BankStatementAccountCode",
        "bankStatementAccountCode",
        "AccountCode",
        "accountCode",
        "cuentaSap",
        "cuentaSAP",
        "codigoCuenta",
        "codigoCuentaBanco"
      ])

      if (!transactionNumber) {
        toast.error(
          `Falta TransactionNumber/TransId en la fila ${systemRow?.rowNumber ?? index + 1} del sistema.`
        )
        return
      }

      const lineNumber = rawLineNumber ?? 0
      if (rawLineNumber === undefined) {
        defaultedLineNumbers.push({
          match: index + 1,
          systemRow: systemRow?.rowNumber ?? "sin fila",
          transactionNumber
        })
      }

      if (!sequence) {
        toast.error(
          `Falta Sequence/OBNK en la fila ${bankRow?.rowNumber ?? index + 1} del banco.`
        )
        return
      }

      journalEntryLines.push({
        transactionNumber,
        lineNumber
      })
      bankStatementLines.push({
        bankStatementAccountCode,
        sequence
      })
      sapMatches.push({
        systemRowId: match.systemRowId,
        bankRowId: match.bankRowId,
        transactionNumber,
        lineNumber,
        sequence,
        bankStatementAccountCode
      })
    }

    if (defaultedLineNumbers.length > 0) {
      console.warn(
        "[Qoncilia] SAP LineNumber no vino en el Excel. Se usara LineNumber = 0 para estos matches."
      )
      console.table(defaultedLineNumbers)
    }

    const request: SapExternalReconciliationRequest = {
      companyErpConfigId: selectedErpConfigId,
      bankStatementId: selectedBankStatementId,
      reconciliationAccountType: "rat_GLAccount",
      matches: sapMatches,
      bankStatementLines,
      journalEntryLines
    }

    try {
      setIsSendingExternalReconciliation(true)
      const response = await apiClient.post<SapExternalReconciliationResult>(
        "/erp/sap/external-reconciliations",
        request,
        { timeoutMs: 30000 }
      )
      toast.success(
        response.externalReconciliationNo
          ? `Conciliacion enviada a SAP. Nro ${response.externalReconciliationNo}.`
          : "Conciliacion enviada a SAP."
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo conciliar en SAP.")
    } finally {
      setIsSendingExternalReconciliation(false)
    }
  }

  const sendSapB1QueryMatchesToErp = async (
    matches: Array<{ systemRow: PreviewRow; bankRow: PreviewRow }>
  ) => {
    if (!canReconcileErp) {
      toast.error("Tu rol no tiene permiso para conciliar en SAP.")
      return
    }

    if (!selectedErpConfigId || !isSapB1QueryMode) {
      toast.error("Selecciona una configuracion ERP SAP_B1 activa.")
      return
    }

    if (!erpSession?.authenticated) {
      toast.error("Inicia sesion en el ERP antes de conciliar.")
      return
    }

    if (!sapB1QueryPreview) {
      toast.error("Primero compara los resultados SAP_B1.")
      return
    }

    if (matches.length === 0) {
      toast.error("No hay coincidencias para conciliar en SAP_B1.")
      return
    }

    const accountCode = sapB1QueryPreview.accountCode
    const journalEntryLines: NonNullable<SapExternalReconciliationRequest["journalEntryLines"]> = []
    const bankStatementLines: NonNullable<SapExternalReconciliationRequest["bankStatementLines"]> = []
    const sapMatches: NonNullable<SapExternalReconciliationRequest["matches"]> = []

    for (const match of matches) {
      const { systemRow, bankRow } = match
      const transactionNumber = parseRowNumber(systemRow, [
        "TransactionNumber",
        "transactionNumber",
        "TransId",
        "transId",
        "trans_id",
        "numeroTransaccion",
        "nroTransaccion",
        "nroAsiento",
        "asiento"
      ])
      const rawLineNumber = parseRowNumber(systemRow, [
        "LineNumber",
        "lineNumber",
        "Line_ID",
        "lineId",
        "LineNum",
        "lineNum",
        "lineaAsiento",
        "linea",
        "Ref.2 (fila)",
        "Ref.2 fila",
        "Ref2"
      ])
      const sequence = parseRowNumber(bankRow, [
        "Sequence",
        "sequence",
        "BankStatementLineSequence",
        "bankStatementLineSequence",
        "lineSequence",
        "secuencia",
        "lineaBanco",
        "nroLineaBanco",
        "linea"
      ])

      if (!transactionNumber) {
        toast.error(`Falta TransactionNumber/TransId en la fila ${systemRow.rowNumber} del sistema.`)
        return
      }

      if (rawLineNumber === undefined) {
        toast.error(`Falta LineNumber/Line_ID en la fila ${systemRow.rowNumber} del sistema.`)
        return
      }

      if (!sequence) {
        toast.error(`Falta Sequence/OBNK en la fila ${bankRow.rowNumber} del banco.`)
        return
      }

      const lineNumber = rawLineNumber
      journalEntryLines.push({
        transactionNumber,
        lineNumber
      })
      bankStatementLines.push({
        bankStatementAccountCode: accountCode,
        sequence
      })
      sapMatches.push({
        systemRowId: systemRow.rowId,
        bankRowId: bankRow.rowId,
        transactionNumber,
        lineNumber,
        sequence,
        bankStatementAccountCode: accountCode
      })
    }

    const request: SapExternalReconciliationRequest = {
      companyErpConfigId: selectedErpConfigId,
      accountCode,
      reconciliationAccountType: "rat_GLAccount",
      matches: sapMatches,
      bankStatementLines,
      journalEntryLines
    }

    try {
      setIsSendingExternalReconciliation(true)
      const response = await apiClient.post<SapExternalReconciliationResult>(
        "/erp/sap/external-reconciliations",
        request,
        { timeoutMs: 45000 }
      )
      toast.success(
        response.externalReconciliationNo
          ? `Conciliacion enviada a SAP_B1. Nro ${response.externalReconciliationNo}.`
          : "Conciliacion enviada a SAP_B1."
      )
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo conciliar en SAP_B1.")
      return false
    } finally {
      setIsSendingExternalReconciliation(false)
    }
  }

  const metrics = useMemo(() => {
    if (!preview) return null
    const paired = preview.autoMatches.length + manualMatches.length
    const totalRows = preview.systemRows.length + preview.bankRows.length
    return {
      totalSystemRows: preview.systemRows.length,
      totalBankRows: preview.bankRows.length,
      autoMatches: preview.autoMatches.length,
      manualMatches: manualMatches.length,
      unmatchedSystem: unmatchedSystemRows.length,
      unmatchedBank: unmatchedBankRows.length,
      matchPercentage: totalRows > 0 ? Math.round(((paired * 2) / totalRows) * 10000) / 100 : 0
    }
  }, [manualMatches.length, preview, unmatchedBankRows.length, unmatchedSystemRows.length])

  const clearAll = () => {
    setSystemFile(null)
    clearPreview()
    clearSapB1QueryPreview()
  }

  return {
    role,
    users,
    selectedUserId,
    setSelectedUserId,
    banks,
    selectedBankId,
    setSelectedBankId,
    accounts,
    selectedCompanyBankAccountId,
    setSelectedCompanyBankAccountId,
    selectedLayoutId,
    setSelectedLayoutId,
    layouts,
    selectedLayout,
    bankStatements,
    selectedBankStatementId,
    setSelectedBankStatementId,
    selectedBankStatement,
    systemFile,
    setSystemFile,
    erpConfigs,
    isLoadingErpConfigs,
    selectedErpConfig,
    selectedErpConfigId,
    setSelectedErpConfigId,
    erpSession,
    checkErpSession,
    loginErpSession,
    isErpLoggingIn,
    isSapB1QueryMode,
    sapB1QueryPreview,
    isRunningSapB1Queries,
    isComparing,
    runSapB1QueryPreview,
    runSapB1QueryComparison,
    isSapTarjetasMode,
    cardFile,
    cardCsvResult,
    cardSystemQuery,
    isRunningCardSystemQuery,
    isParsingCardCsv,
    runCardSystemQuery,
    onCardFileChange,
    clearCardFile,
    runCardComparison,
    isSendingExternalReconciliation,
    preview,
    manualMatches,
    unmatchedSystemRows,
    unmatchedBankRows,
    metrics,
    onFileChange,
    runComparison,
    onDragEnd,
    removeAutoMatch,
    removeManualMatch,
    sendExternalReconciliationToErp,
    sendSapB1QueryMatchesToErp,
    sendSapTarjetasDepositToErp,
    clearAll,
    reloadBankStatements: loadBankStatements,
    refreshCatalog,
    loadCatalog,
    searchBankStatements,
    isLoadingCatalog,
    page,
    setPage,
    goToPage,
    pageSize,
    totalPages,
    totalStatements,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchTerm,
    setSearchTerm
  }
}
