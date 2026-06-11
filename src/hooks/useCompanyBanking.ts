import type { ChangeEvent, FormEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { apiClient } from "../api/apiClient"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import type { AuthUser } from "../types/auth"
import type {
  BankFormState,
  CompanyBankAccountFormState,
  CompanyBankingReferenceResponse,
  DeleteBankingEntityResponse,
  PaginatedResponse,
  PublicBank,
  PublicCompany,
  PublicCompanyBankAccount,
  PublicCurrency
} from "../types/banking"
import { isSuperAdminRole } from "../utils/role"

const PAGE_SIZE = 10

const initialBankForm: BankFormState = {
  userId: "",
  name: "",
  description: "",
  branch: "",
  active: true
}

const initialAccountForm: CompanyBankAccountFormState = {
  bankId: "",
  name: "",
  currency: "PYG",
  accountNumber: "",
  bankErpId: "",
  majorAccountNumber: "",
  paymentAccountNumber: "",
  active: true
}

type PaginationState = {
  total: number
  page: number
  limit: number
  lastPage: number
}

type LoadBanksOptions = {
  companyId?: number
  page?: number
  limit?: number
  search?: string
  preferredBankId?: number
}

type LoadAccountsOptions = {
  companyId?: number
  bankId?: number
  page?: number
  limit?: number
  search?: string
}

type UseCompanyBankingOptions = {
  loadAccounts?: boolean
  manualLoad?: boolean
}

const EMPTY_COMPANIES: PublicCompany[] = []
const EMPTY_BANKS: PublicBank[] = []
const EMPTY_ACCOUNTS: PublicCompanyBankAccount[] = []
const EMPTY_CURRENCIES: PublicCurrency[] = []
const EMPTY_USERS: AuthUser[] = []

function emptyPagination(limit = PAGE_SIZE): PaginationState {
  return {
    total: 0,
    page: 1,
    limit,
    lastPage: 1
  }
}

function paginationFromResponse<T>(response: PaginatedResponse<T>): PaginationState {
  return {
    total: response.total ?? 0,
    page: response.page ?? 1,
    limit: response.limit ?? PAGE_SIZE,
    lastPage: response.lastPage ?? 1
  }
}

function toFormBankId(value?: number | "" | null): number | "" {
  return typeof value === "number" && value > 0 ? value : ""
}

function buildQueryString(params: {
  companyId?: number
  bankId?: number
  page?: number
  limit?: number
  search?: string
}) {
  const query = new URLSearchParams()

  if (params.companyId) query.set("companyId", String(params.companyId))
  if (params.bankId) query.set("bankId", String(params.bankId))
  if (params.page) query.set("page", String(params.page))
  if (params.limit) query.set("limit", String(params.limit))
  if (params.search?.trim()) query.set("search", params.search.trim())

  const value = query.toString()
  return value ? `?${value}` : ""
}

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs)
    return () => window.clearTimeout(timeoutId)
  }, [delayMs, value])

  return debouncedValue
}

export default function useCompanyBanking({
  loadAccounts = true,
  manualLoad = false
}: UseCompanyBankingOptions = {}) {
  const toast = useToast()
  const { role, user } = useAuth()
  const [reference, setReference] = useState<CompanyBankingReferenceResponse | null>(null)
  const [users, setUsers] = useState<AuthUser[]>([])
  const [banks, setBanks] = useState<PublicBank[]>([])
  const [accounts, setAccounts] = useState<PublicCompanyBankAccount[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(0)
  const [selectedBankId, setSelectedBankId] = useState<number>(0)
  const [bankSearch, setBankSearchValue] = useState("")
  const [accountSearch, setAccountSearchValue] = useState("")
  const [bankPagination, setBankPaginationState] = useState<PaginationState>(() => emptyPagination())
  const [accountPagination, setAccountPaginationState] = useState<PaginationState>(() =>
    emptyPagination()
  )
  const [isLoadingReference, setIsLoadingReference] = useState(false)
  const [isLoadingBanks, setIsLoadingBanks] = useState(false)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [bankForm, setBankForm] = useState<BankFormState>(initialBankForm)
  const [accountForm, setAccountForm] =
    useState<CompanyBankAccountFormState>(initialAccountForm)
  const [editingBankId, setEditingBankId] = useState<number | null>(null)
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null)

  const selectedCompanyIdRef = useRef(selectedCompanyId)
  selectedCompanyIdRef.current = selectedCompanyId
  const selectedBankIdRef = useRef(selectedBankId)
  selectedBankIdRef.current = selectedBankId
  const bankPaginationRef = useRef(bankPagination)
  bankPaginationRef.current = bankPagination
  const accountPaginationRef = useRef(accountPagination)
  accountPaginationRef.current = accountPagination
  const bankSearchRef = useRef(bankSearch)
  bankSearchRef.current = bankSearch
  const accountSearchRef = useRef(accountSearch)
  accountSearchRef.current = accountSearch
  const bankRequestIdRef = useRef(0)
  const accountRequestIdRef = useRef(0)

  const debouncedBankSearch = useDebouncedValue(bankSearch)
  const debouncedAccountSearch = useDebouncedValue(accountSearch)

  const companies = reference?.companies ?? EMPTY_COMPANIES
  const currencies = reference?.currencies ?? EMPTY_CURRENCIES

  const loadUsers = useCallback(async () => {
    if (!isSuperAdminRole(role)) {
      setUsers(user ? [user] : [])
      return
    }

    const response = await apiClient.get<AuthUser[]>("/users/list")
    setUsers(response ?? [])
  }, [role, user])

  const loadReference = useCallback(async (companyId?: number) => {
    setIsLoadingReference(true)

    try {
      const response = await apiClient.get<CompanyBankingReferenceResponse>(
        `/company-banking/reference${buildQueryString({ companyId })}`
      )

      setReference(response)

      const nextCompanyId = companyId || response.companies?.[0]?.id || 0
      if (nextCompanyId && nextCompanyId !== selectedCompanyIdRef.current) {
        setSelectedCompanyId(nextCompanyId)
      }

      return response
    } finally {
      setIsLoadingReference(false)
    }
  }, [])

  const loadBanksPage = useCallback(async ({
    companyId = selectedCompanyIdRef.current,
    page = bankPaginationRef.current.page,
    limit = bankPaginationRef.current.limit,
    search = bankSearchRef.current,
    preferredBankId = selectedBankIdRef.current
  }: LoadBanksOptions = {}) => {
    if (!companyId) {
      bankRequestIdRef.current += 1
      setBanks(EMPTY_BANKS)
      setBankPaginationState(emptyPagination())
      return null
    }

    const requestId = bankRequestIdRef.current + 1
    bankRequestIdRef.current = requestId
    setIsLoadingBanks(true)

    try {
      const response = await apiClient.get<PaginatedResponse<PublicBank>>(
        `/company-banking/banks${buildQueryString({ companyId, page, limit, search })}`,
        { showBackdrop: false }
      )

      if (requestId !== bankRequestIdRef.current) {
        return response
      }

      const nextPagination = paginationFromResponse(response)
      if (response.data.length === 0 && response.total > 0 && response.page > nextPagination.lastPage) {
        setBankPaginationState({
          ...nextPagination,
          page: nextPagination.lastPage
        })
        return response
      }

      setBanks(response.data ?? EMPTY_BANKS)
      setBankPaginationState(nextPagination)

      const nextSelectedBankId =
        preferredBankId > 0 && response.data.some((bank) => bank.id === preferredBankId)
          ? preferredBankId
          : response.data[0]?.id ?? 0

      if (nextSelectedBankId !== selectedBankIdRef.current) {
        setSelectedBankId(nextSelectedBankId)
        setAccounts(EMPTY_ACCOUNTS)
        setAccountPaginationState(emptyPagination(accountPaginationRef.current.limit))
      }

      return response
    } finally {
      if (requestId === bankRequestIdRef.current) {
        setIsLoadingBanks(false)
      }
    }
  }, [])

  const loadAccountsPage = useCallback(async ({
    companyId = selectedCompanyIdRef.current,
    bankId = selectedBankIdRef.current,
    page = accountPaginationRef.current.page,
    limit = accountPaginationRef.current.limit,
    search = accountSearchRef.current
  }: LoadAccountsOptions = {}) => {
    if (!companyId || !bankId) {
      accountRequestIdRef.current += 1
      setAccounts(EMPTY_ACCOUNTS)
      setAccountPaginationState(emptyPagination())
      return null
    }

    const requestId = accountRequestIdRef.current + 1
    accountRequestIdRef.current = requestId
    setIsLoadingAccounts(true)

    try {
      const response = await apiClient.get<PaginatedResponse<PublicCompanyBankAccount>>(
        `/company-banking/accounts${buildQueryString({
          companyId,
          bankId,
          page,
          limit,
          search
        })}`,
        { showBackdrop: false }
      )

      if (requestId !== accountRequestIdRef.current) {
        return response
      }

      const nextPagination = paginationFromResponse(response)
      if (response.data.length === 0 && response.total > 0 && response.page > nextPagination.lastPage) {
        setAccountPaginationState({
          ...nextPagination,
          page: nextPagination.lastPage
        })
        return response
      }

      setAccounts(response.data ?? EMPTY_ACCOUNTS)
      setAccountPaginationState(nextPagination)
      return response
    } finally {
      if (requestId === accountRequestIdRef.current) {
        setIsLoadingAccounts(false)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void Promise.all([loadReference(), loadUsers()]).catch((error) => {
      if (cancelled) return
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo bancario.")
    })

    return () => {
      cancelled = true
    }
  }, [loadReference, loadUsers, toast])

  useEffect(() => {
    if (!selectedCompanyId) {
      bankRequestIdRef.current += 1
      setBanks(EMPTY_BANKS)
      setBankPaginationState(emptyPagination())
      return
    }

    void loadBanksPage({
      companyId: selectedCompanyId,
      page: bankPagination.page,
      limit: bankPagination.limit,
      search: debouncedBankSearch
    }).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los bancos.")
    })
  }, [
    bankPagination.limit,
    bankPagination.page,
    debouncedBankSearch,
    loadBanksPage,
    manualLoad,
    selectedCompanyId,
    toast
  ])

  useEffect(() => {
    if (!loadAccounts || !selectedCompanyId || !selectedBankId) {
      accountRequestIdRef.current += 1
      setAccounts(EMPTY_ACCOUNTS)
      setAccountPaginationState(emptyPagination())
      return
    }

    if (manualLoad) return

    void loadAccountsPage({
      companyId: selectedCompanyId,
      bankId: selectedBankId,
      page: accountPagination.page,
      limit: accountPagination.limit,
      search: debouncedAccountSearch
    }).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las cuentas.")
    })
  }, [
    accountPagination.limit,
    accountPagination.page,
    debouncedAccountSearch,
    loadAccounts,
    loadAccountsPage,
    manualLoad,
    selectedBankId,
    selectedCompanyId,
    toast
  ])

  const changeCompany = useCallback((companyId: number) => {
    setSelectedCompanyId(companyId)
    setSelectedBankId(0)
    setBanks(EMPTY_BANKS)
    setAccounts(EMPTY_ACCOUNTS)
    setBankSearchValue("")
    setAccountSearchValue("")
    setBankPaginationState(emptyPagination())
    setAccountPaginationState(emptyPagination())

    void loadReference(companyId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo bancario.")
    })
  }, [loadReference, toast])

  const setBankSearch = useCallback((value: string) => {
    setBankSearchValue(value)
    setBankPaginationState((current) =>
      current.page === 1 ? current : { ...current, page: 1 }
    )
  }, [])

  const setAccountSearch = useCallback((value: string) => {
    setAccountSearchValue(value)
    setAccountPaginationState((current) =>
      current.page === 1 ? current : { ...current, page: 1 }
    )
  }, [])

  const setBankPage = useCallback((page: number) => {
    setBankPaginationState((current) => {
      const nextPage = Math.min(Math.max(page, 1), current.lastPage || 1)
      return current.page === nextPage ? current : { ...current, page: nextPage }
    })
  }, [])

  const setAccountPage = useCallback((page: number) => {
    setAccountPaginationState((current) => {
      const nextPage = Math.min(Math.max(page, 1), current.lastPage || 1)
      return current.page === nextPage ? current : { ...current, page: nextPage }
    })
  }, [])

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) ?? companies[0] ?? null,
    [companies, selectedCompanyId]
  )

  const availableUsers = useMemo(
    () =>
      isSuperAdminRole(role)
        ? users.filter((item) => Number(item.companyId ?? 0) === selectedCompanyId)
        : users,
    [role, selectedCompanyId, users]
  )

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.id === selectedBankId) ?? null,
    [banks, selectedBankId]
  )

  const visibleAccounts = selectedBankId > 0 ? accounts : EMPTY_ACCOUNTS

  const accountCountByBank = useMemo(() => {
    const counts = new Map<number, number>()
    for (const bank of banks) {
      counts.set(bank.id, bank.accountCount ?? 0)
    }
    return counts
  }, [banks])

  const buildAccountName = useCallback(
    (form: CompanyBankAccountFormState) => {
      const bank = banks.find((item) => item.id === Number(form.bankId || 0))
      const parts = [bank?.name ?? "Cuenta bancaria"]
      const accountNumber = form.accountNumber.trim()

      if (accountNumber) parts.push(accountNumber)
      if (form.currency) parts.push(form.currency)

      return parts.join(" | ")
    },
    [banks]
  )

  useEffect(() => {
    if (editingBankId) return

    setBankForm((current) => {
      const currentUserId = Number(current.userId || 0)
      const isCurrentValid =
        currentUserId > 0 && availableUsers.some((item) => Number(item.id) === currentUserId)
      if (isCurrentValid) return current

      const nextUserId = Number(availableUsers[0]?.id ?? 0) || ""
      if (current.userId === nextUserId) return current

      return { ...current, userId: nextUserId }
    })
  }, [availableUsers, editingBankId])

  useEffect(() => {
    if (editingAccountId) return

    setAccountForm((current) => {
      const currentBankId = Number(current.bankId || 0)
      const currentBankIsAvailable = banks.some((bank) => bank.id === currentBankId)
      const fallbackBankId = selectedBankId || banks[0]?.id || 0
      const nextBankId = currentBankIsAvailable ? currentBankId : fallbackBankId
      const nextFormBankId = toFormBankId(nextBankId)
      const draft = { ...current, bankId: nextFormBankId }
      const nextName = current.name || buildAccountName(draft)

      if (current.bankId === nextFormBankId && current.name === nextName) {
        return current
      }

      return { ...draft, name: nextName }
    })
  }, [banks, buildAccountName, editingAccountId, selectedBankId])

  const selectBank = useCallback((bankId: number) => {
    setSelectedBankId(bankId)
    setAccounts(EMPTY_ACCOUNTS)
    setAccountPaginationState(emptyPagination(accountPaginationRef.current.limit))

    setAccountForm((current) => {
      if (editingAccountId) return current
      const nextBankId = toFormBankId(bankId)
      if (current.bankId === nextBankId) return current
      return { ...current, bankId: nextBankId }
    })
  }, [editingAccountId])

  const onBankFieldChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target
    const nextValue =
      type === "checkbox" && "checked" in event.target
        ? event.target.checked
        : name === "userId"
          ? (value ? Number(value) : "")
          : value

    setBankForm((current) => ({
      ...current,
      [name]: nextValue
    }))
  }, [])

  const onAccountFieldChange = useCallback((
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target
    const nextValue =
      type === "checkbox" && "checked" in event.target
        ? event.target.checked
        : name === "bankId"
          ? (value ? Number(value) : "")
          : value

    setAccountForm((current) => {
      const nextForm = {
        ...current,
        [name]: nextValue
      }

      if (name === "bankId" || name === "accountNumber" || name === "currency") {
        nextForm.name = buildAccountName(nextForm)
      }

      return nextForm
    })
  }, [buildAccountName])

  const resetBankForm = useCallback(() => {
    setEditingBankId(null)
    const nextUserId = Number(availableUsers[0]?.id ?? 0) || ""
    setBankForm({ ...initialBankForm, userId: nextUserId })
  }, [availableUsers])

  const startEditBank = useCallback((bank: PublicBank) => {
    setSelectedBankId(bank.id)
    setEditingBankId(bank.id)
    setBankForm({
      userId: bank.userId,
      name: bank.name,
      description: bank.description ?? "",
      branch: bank.branch ?? "",
      active: bank.active
    })
  }, [])

  const saveBank = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!bankForm.userId) {
      toast.error("No hay un usuario responsable disponible para asignar el banco.")
      return false
    }

    const companyId = selectedCompanyIdRef.current || undefined
    const payload = {
      companyId,
      userId: Number(bankForm.userId),
      name: bankForm.name,
      description: bankForm.description,
      branch: bankForm.branch,
      active: bankForm.active
    }

    try {
      if (editingBankId) {
        const updated = await apiClient.patch<PublicBank>(
          `/company-banking/banks/${editingBankId}`,
          payload
        )
        toast.success("Banco actualizado.")
        resetBankForm()
        await loadBanksPage({
          companyId,
          page: bankPaginationRef.current.page,
          search: bankSearchRef.current,
          preferredBankId: updated.id
        })
        return true
      }

      const created = await apiClient.post<PublicBank>("/company-banking/banks", payload)
      toast.success("Banco creado.")
      resetBankForm()
      setBankSearchValue("")
      setBankPaginationState(emptyPagination())
      await loadBanksPage({
        companyId,
        page: 1,
        search: "",
        preferredBankId: created.id
      })
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el banco.")
      return false
    }
  }, [bankForm, editingBankId, loadBanksPage, resetBankForm, toast])

  const deleteBank = useCallback(async (bankId: number) => {
    try {
      const response = await apiClient.delete<DeleteBankingEntityResponse>(
        `/company-banking/banks/${bankId}`
      )

      if (editingBankId === bankId) {
        resetBankForm()
      }
      if (selectedBankIdRef.current === bankId) {
        setSelectedBankId(0)
        setAccounts(EMPTY_ACCOUNTS)
      }

      await loadBanksPage({
        companyId: selectedCompanyIdRef.current,
        page: bankPaginationRef.current.page,
        search: bankSearchRef.current
      })
      toast.success(response.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el banco.")
    }
  }, [editingBankId, loadBanksPage, resetBankForm, toast])

  const resetAccountForm = useCallback(() => {
    const nextBankId = toFormBankId(selectedBankIdRef.current || banks[0]?.id || 0)
    const nextForm = { ...initialAccountForm, bankId: nextBankId }
    setEditingAccountId(null)
    setAccountForm({ ...nextForm, name: buildAccountName(nextForm) })
  }, [banks, buildAccountName])

  const startEditAccount = useCallback((account: PublicCompanyBankAccount) => {
    setSelectedBankId(account.bankId)
    setEditingAccountId(account.id)
    setAccountForm({
      bankId: account.bankId,
      name: account.name,
      currency: account.currency,
      accountNumber: account.accountNumber,
      bankErpId: account.bankErpId,
      majorAccountNumber: account.majorAccountNumber,
      paymentAccountNumber: account.paymentAccountNumber ?? "",
      active: account.active
    })
  }, [])

  const saveAccount = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!accountForm.bankId) {
      toast.error("Debes seleccionar un banco.")
      return false
    }

    const companyId = selectedCompanyIdRef.current || undefined
    const bankId = Number(accountForm.bankId)
    const payload = {
      companyId,
      bankId,
      name: accountForm.name || buildAccountName(accountForm),
      currency: accountForm.currency,
      accountNumber: accountForm.accountNumber,
      majorAccountNumber: accountForm.majorAccountNumber,
      paymentAccountNumber: accountForm.paymentAccountNumber,
      active: accountForm.active
    }

    try {
      if (editingAccountId) {
        await apiClient.patch(`/company-banking/accounts/${editingAccountId}`, payload)
        toast.success("Cuenta bancaria actualizada.")
      } else {
        await apiClient.post("/company-banking/accounts", payload)
        toast.success("Cuenta bancaria creada.")
        setAccountSearchValue("")
        setAccountPaginationState(emptyPagination())
      }

      resetAccountForm()
      setSelectedBankId(bankId)

      await Promise.all([
        loadBanksPage({
          companyId,
          page: bankPaginationRef.current.page,
          search: bankSearchRef.current,
          preferredBankId: bankId
        }),
        loadAccountsPage({
          companyId,
          bankId,
          page: editingAccountId ? accountPaginationRef.current.page : 1,
          search: editingAccountId ? accountSearchRef.current : ""
        })
      ])
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la cuenta bancaria.")
      return false
    }
  }, [
    accountForm,
    buildAccountName,
    editingAccountId,
    loadAccountsPage,
    loadBanksPage,
    resetAccountForm,
    toast
  ])

  const deleteAccount = useCallback(async (accountId: number) => {
    try {
      const response = await apiClient.delete<DeleteBankingEntityResponse>(
        `/company-banking/accounts/${accountId}`
      )

      if (editingAccountId === accountId) {
        resetAccountForm()
      }

      await Promise.all([
        loadAccountsPage({
          companyId: selectedCompanyIdRef.current,
          bankId: selectedBankIdRef.current,
          page: accountPaginationRef.current.page,
          search: accountSearchRef.current
        }),
        loadBanksPage({
          companyId: selectedCompanyIdRef.current,
          page: bankPaginationRef.current.page,
          search: bankSearchRef.current,
          preferredBankId: selectedBankIdRef.current
        })
      ])
      toast.success(response.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la cuenta bancaria.")
    }
  }, [editingAccountId, loadAccountsPage, loadBanksPage, resetAccountForm, toast])

  const reload = useCallback(async (companyId?: number) => {
    const targetCompanyId = companyId || selectedCompanyIdRef.current || undefined
    const response = await loadReference(targetCompanyId)
    const resolvedCompanyId = targetCompanyId || response.companies?.[0]?.id || 0

    if (!resolvedCompanyId) {
      return response
    }

    const bankResponse = await loadBanksPage({
      companyId: resolvedCompanyId,
      page: bankPaginationRef.current.page,
      search: bankSearchRef.current,
      preferredBankId: selectedBankIdRef.current
    })
    const resolvedBankId = selectedBankIdRef.current || bankResponse?.data?.[0]?.id || 0

    if (resolvedBankId) {
      await loadAccountsPage({
        companyId: resolvedCompanyId,
        bankId: resolvedBankId,
        page: accountPaginationRef.current.page,
        search: accountSearchRef.current
      })
    }

    return response
  }, [loadAccountsPage, loadBanksPage, loadReference])

  const stats = useMemo(
    () => ({
      banks: bankPagination.total,
      activeBanks: banks.filter((bank) => bank.active).length,
      accounts: accountPagination.total,
      activeAccounts: accounts.filter((account) => account.active).length
    }),
    [accountPagination.total, accounts, bankPagination.total, banks]
  )

  return {
    selectedCompany,
    selectedCompanyId,
    companies,
    availableUsers,
    changeCompany,
    banks,
    currencies,
    selectedBankId,
    selectedBank,
    visibleAccounts,
    accountCountByBank,
    bankSearch,
    setBankSearch,
    accountSearch,
    setAccountSearch,
    bankPagination,
    accountPagination,
    setBankPage,
    setAccountPage,
    isLoadingReference,
    isLoadingBanks,
    isLoadingAccounts,
    bankForm,
    accountForm,
    editingBankId,
    editingAccountId,
    onBankFieldChange,
    onAccountFieldChange,
    selectBank,
    startEditBank,
    saveBank,
    deleteBank,
    resetBankForm,
    startEditAccount,
    saveAccount,
    deleteAccount,
    resetAccountForm,
    reload,
    stats
  }
}
