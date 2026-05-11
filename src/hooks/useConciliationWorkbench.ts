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
  type SapExternalReconciliationRequest,
  type SapExternalReconciliationResult,
  type SapErpSession,
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
import { isAdminRole } from "../utils/role"

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
      return "La sesion ERP expiro. Inicia sesion nuevamente desde Configurar ERP."
    case "invalid":
      return "La sesion ERP no es valida. Inicia sesion nuevamente desde Configurar ERP."
    case "logged_out":
      return "La sesion ERP esta cerrada. Inicia sesion desde Configurar ERP."
    case "not_authenticated":
    default:
      return "No hay una sesion ERP activa. Inicia sesion desde Configurar ERP."
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

export default function useConciliationWorkbench() {
  const { role, user } = useAuth()
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
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedDateFrom = useDebounce(dateFrom, 350)
  const debouncedDateTo = useDebounce(dateTo, 350)
  const debouncedSearchTerm = useDebounce(searchTerm, 350)
  const [selectedBankStatementId, setSelectedBankStatementId] = useState<number>(0)
  const [systemFile, setSystemFile] = useState<File | null>(null)
  const [erpConfigs, setErpConfigs] = useState<CompanyErpConfig[]>([])
  const [selectedErpConfigId, setSelectedErpConfigId] = useState<number>(0)
  const [erpSession, setErpSession] = useState<SapErpSession | null>(null)
  const [isSendingExternalReconciliation, setIsSendingExternalReconciliation] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [manualMatches, setManualMatches] = useState<PreviewMatch[]>([])
  const [unmatchedSystemRows, setUnmatchedSystemRows] = useState<PreviewRow[]>([])
  const [unmatchedBankRows, setUnmatchedBankRows] = useState<PreviewRow[]>([])

  const loadUsers = useCallback(async () => {
    if (!isAdminRole(role)) return
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

      const query = isAdminRole(role) && userId ? `?userId=${userId}` : ""
      const response = await apiClient.get<UserBankWithLayouts[]>(`/conciliation/catalog${query}`)
      const nextBanks = response ?? []
      catalogCacheRef.current.set(userId, nextBanks)
      setBanks(nextBanks)
      setSelectedBankId((current) => {
        if (current > 0 && nextBanks.some((item) => item.id === current)) return current
        return nextBanks[0]?.id ?? 0
      })
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
    const response = await apiClient.get<CompanyErpConfig[]>("/erp/configs?activeOnly=true")
    const nextConfigs = response ?? []
    setErpConfigs(nextConfigs)
    setSelectedErpConfigId((current) => {
      const stored = getStoredSapConfigId()
      if (current && nextConfigs.some((config) => config.id === current)) return current
      if (stored && nextConfigs.some((config) => config.id === stored)) return stored
      return nextConfigs.find((config) => config.isDefault)?.id ?? nextConfigs[0]?.id ?? 0
    })
  }, [])

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
        storeSapConfigId(selectedErpConfigId)
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
  }, [selectedErpConfigId, toast])

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

    storeSapConfigId(selectedErpConfigId)
    void checkErpSession().catch(() => setErpSession(null))
  }, [checkErpSession, selectedErpConfigId])

  useEffect(() => {
    if (!selectedUserId) return
    void loadCatalog(selectedUserId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo.")
    })
  }, [loadCatalog, selectedUserId, toast])

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
    async (targetPage = page, options?: { signal?: AbortSignal }) => {
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

      if (isAdminRole(role) && selectedUserId) {
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
      pageSize,
      page
    ]
  )

  useEffect(() => {
    // Cancela cualquier request en curso antes de disparar la nueva.
    statementsAbortRef.current?.abort()
    const controller = new AbortController()
    statementsAbortRef.current = controller

    void loadBankStatements(undefined, { signal: controller.signal }).catch((error) => {
      if (error instanceof ApiError && error.code === "REQUEST_ABORTED") return
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar extractos.")
    })

    return () => controller.abort()
  }, [loadBankStatements, toast])

  // Resetea a pagina 1 cuando cambian los filtros (y no es el primer render).
  const isFirstFilterRender = useRef(true)
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false
      return
    }
    setPage(1)
  }, [debouncedDateFrom, debouncedDateTo, debouncedSearchTerm, pageSize])

  const searchBankStatements = useCallback(() => {
    if (page === 1) {
      statementsAbortRef.current?.abort()
      const controller = new AbortController()
      statementsAbortRef.current = controller
      void loadBankStatements(1, { signal: controller.signal }).catch((error) => {
        if (error instanceof ApiError && error.code === "REQUEST_ABORTED") return
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar extractos.")
      })
      return
    }

    setPage(1)
  }, [loadBankStatements, page, toast])

  const selectedBankStatement = useMemo(
    () => bankStatements.find((item) => item.id === selectedBankStatementId) ?? null,
    [bankStatements, selectedBankStatementId]
  )

  const clearPreview = useCallback(() => {
    setPreview(null)
    setManualMatches([])
    setUnmatchedSystemRows([])
    setUnmatchedBankRows([])
  }, [])

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
      const response = await apiClient.post<PreviewResponse>(
        "/conciliation/compare-bank-statement",
        formData
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
        !isAdminRole(role) ? `El rol ${role ?? "sin rol"} no puede conciliar en ERP.` : null
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
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    if (!preview || !selectedLayout) return
    const systemRowId = String(event.active.id).replace("system:", "")
    const bankRowId = String(event.over?.id ?? "").replace("bank:", "")
    if (!systemRowId || !bankRowId) return

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
    setManualMatches((prev) => prev.filter((item) => item !== target))
    if (systemRow) {
      setUnmatchedSystemRows((prev) => sortRows([...prev, systemRow]))
    }
    if (bankRow) {
      setUnmatchedBankRows((prev) => sortRows([...prev, bankRow]))
    }
  }

  const sendExternalReconciliationToErp = async () => {
    if (!isAdminRole(role)) {
      toast.error("Solo usuarios admin o superadmin pueden conciliar en SAP.")
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

    const bankStatementLines: SapExternalReconciliationRequest["bankStatementLines"] = []
    const journalEntryLines: SapExternalReconciliationRequest["journalEntryLines"] = []
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
    selectedErpConfigId,
    setSelectedErpConfigId,
    erpSession,
    checkErpSession,
    isSendingExternalReconciliation,
    preview,
    manualMatches,
    unmatchedSystemRows,
    unmatchedBankRows,
    metrics,
    onFileChange,
    runComparison,
    onDragEnd,
    removeManualMatch,
    sendExternalReconciliationToErp,
    clearAll,
    reloadBankStatements: loadBankStatements,
    refreshCatalog,
    searchBankStatements,
    page,
    setPage,
    pageSize,
    setPageSize,
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
