import type { ChangeEvent, Dispatch, SetStateAction } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { DragEndEvent } from "@dnd-kit/core"
import { apiClient } from "../api/apiClient"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { getStoredSapConfigId, storeSapConfigId } from "../erp/sap"
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
import type { CompanyErpConfig, SapErpSession } from "../types/erp"
import { isAdminRole } from "../utils/role"

function createManualMatch(
  mappings: LayoutMapping[],
  systemRow: PreviewRow,
  bankRow: PreviewRow
): PreviewMatch {
  const activeMappings = mappings.filter((item) => item.active)
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
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedBankStatementId, setSelectedBankStatementId] = useState<number>(0)
  const [systemFile, setSystemFile] = useState<File | null>(null)
  const [erpConfigs, setErpConfigs] = useState<CompanyErpConfig[]>([])
  const [selectedErpConfigId, setSelectedErpConfigId] = useState<number>(0)
  const [erpSession, setErpSession] = useState<SapErpSession | null>(null)
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

  const loadCatalog = useCallback(
    async (userId: number) => {
      const query = isAdminRole(role) && userId ? `?userId=${userId}` : ""
      const response = await apiClient.get<UserBankWithLayouts[]>(`/conciliation/catalog${query}`)
      const nextBanks = response ?? []
      setBanks(nextBanks)
      setSelectedBankId((current) => {
        if (current > 0 && nextBanks.some((item) => item.id === current)) return current
        return nextBanks[0]?.id ?? 0
      })
    },
    [role]
  )

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

  const checkErpSession = useCallback(async () => {
    if (!selectedErpConfigId) {
      setErpSession(null)
      return null
    }

    const response = await apiClient.get<SapErpSession>(
      `/erp/sap/sessions/status?companyErpConfigId=${selectedErpConfigId}`,
      { timeoutMs: 20000 }
    )
    setErpSession(response)
    if (response.authenticated) {
      storeSapConfigId(selectedErpConfigId)
    }
    return response
  }, [selectedErpConfigId])

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

  const loadBankStatements = useCallback(async () => {
    if (!selectedBankId || !selectedCompanyBankAccountId || !selectedLayoutId) {
      setBankStatements([])
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
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (search.trim()) params.set("search", search.trim());
    params.set("page", String(page));
    params.set("limit", "10");

    const response = await apiClient.get<PaginatedResponse<BankStatementSummary>>(
      `/conciliation/bank-statements?${params.toString()}`
    )
    const nextStatements = response?.data ?? []
    setBankStatements(nextStatements)
    setTotalPages(response?.lastPage ?? 1)
    setSelectedBankStatementId((current) => {
      if (current > 0 && nextStatements.some((item) => item.id === current)) return current
      return nextStatements[0]?.id ?? 0
    })
  }, [
    role,
    selectedBankId,
    selectedCompanyBankAccountId,
    selectedLayoutId,
    selectedUserId,
    dateFrom,
    dateTo,
    search,
    page
  ])

  useEffect(() => {
    void loadBankStatements().catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar extractos.")
    })
  }, [loadBankStatements, toast])

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
      toast.success("Comparacion lista.")
    } catch (error) {
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
    preview,
    manualMatches,
    unmatchedSystemRows,
    unmatchedBankRows,
    metrics,
    onFileChange,
    runComparison,
    onDragEnd,
    removeManualMatch,
    clearAll,
    reloadBankStatements: loadBankStatements,
    page,
    setPage,
    totalPages,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo
  }
}
