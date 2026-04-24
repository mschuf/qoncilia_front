import type { ChangeEvent, FormEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { apiClient } from "../api/apiClient"
import { useToast } from "../context/ToastContext"
import type { AuthUser } from "../types/auth"
import type {
  BankFormState,
  CompanyBankAccountFormState,
  CompanyBankingReferenceResponse,
  PublicBank,
  PublicCompanyBankAccount
} from "../types/banking"

const initialBankForm: BankFormState = {
  userId: "",
  name: "",
  alias: "",
  description: "",
  branch: "",
  active: true
}

const initialAccountForm: CompanyBankAccountFormState = {
  bankId: "",
  name: "",
  currency: "GS",
  accountNumber: "",
  bankErpId: "",
  majorAccountNumber: "",
  paymentAccountNumber: "",
  active: true
}

export default function useCompanyBanking() {
  const toast = useToast()
  const [reference, setReference] = useState<CompanyBankingReferenceResponse | null>(null)
  const [users, setUsers] = useState<AuthUser[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(0)
  const [selectedBankId, setSelectedBankId] = useState<number>(0)
  const [bankForm, setBankForm] = useState<BankFormState>(initialBankForm)
  const [accountForm, setAccountForm] = useState<CompanyBankAccountFormState>(initialAccountForm)
  const [editingBankId, setEditingBankId] = useState<number | null>(null)
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null)

  const loadUsers = useCallback(async () => {
    const response = await apiClient.get<AuthUser[]>("/users/list")
    setUsers(response ?? [])
  }, [])

  const loadReference = useCallback(async (companyId?: number) => {
    const params = companyId ? `?companyId=${companyId}` : ""
    const response = await apiClient.get<CompanyBankingReferenceResponse>(`/company-banking/reference${params}`)
    setReference(response)
    if (companyId) {
      setSelectedCompanyId(companyId)
    } else if (response.companies?.[0]) {
      setSelectedCompanyId(response.companies[0].id)
    }
    setSelectedBankId((current) => {
      if (current > 0 && (response.banks ?? []).some((bank) => bank.id === current)) {
        return current
      }

      return response.banks?.[0]?.id ?? 0
    })
    return response
  }, [])

  useEffect(() => {
    void Promise.all([loadReference(), loadUsers()]).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo bancario.")
    })
  }, [loadReference, loadUsers, toast])

  const changeCompany = useCallback((companyId: number) => {
    void loadReference(companyId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo bancario.")
    })
  }, [loadReference, toast])

  const companies = reference?.companies ?? []
  const banks = reference?.banks ?? []
  const accounts = reference?.accounts ?? []
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? companies[0] ?? null

  const availableUsers = useMemo(
    () => users.filter((item) => Number(item.companyId ?? 0) === selectedCompanyId),
    [selectedCompanyId, users]
  )

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.id === selectedBankId) ?? null,
    [banks, selectedBankId]
  )

  const visibleAccounts = useMemo(
    () =>
      selectedBankId > 0 ? accounts.filter((account) => account.bankId === selectedBankId) : accounts,
    [accounts, selectedBankId]
  )

  const accountCountByBank = useMemo(() => {
    const counts = new Map<number, number>()
    for (const account of accounts) {
      counts.set(account.bankId, (counts.get(account.bankId) ?? 0) + 1)
    }
    return counts
  }, [accounts])

  useEffect(() => {
    if (editingBankId) return

    setBankForm((current) => ({
      ...current,
      userId:
        Number(current.userId || 0) > 0 &&
        availableUsers.some((item) => Number(item.id) === Number(current.userId))
          ? current.userId
          : (Number(availableUsers[0]?.id ?? 0) || "")
    }))
  }, [availableUsers, editingBankId])

  useEffect(() => {
    if (!editingAccountId && selectedBankId > 0) {
      setAccountForm((current) => ({
        ...current,
        bankId: Number(current.bankId || 0) > 0 ? current.bankId : selectedBankId
      }))
    }
  }, [editingAccountId, selectedBankId])

  const selectBank = (bankId: number) => {
    setSelectedBankId(bankId)

    if (!editingAccountId) {
      setAccountForm((current) => ({
        ...current,
        bankId
      }))
    }
  }

  const onBankFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
  }

  const onAccountFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target
    const nextValue =
      type === "checkbox" && "checked" in event.target
        ? event.target.checked
        : name === "bankId"
          ? (value ? Number(value) : "")
          : value

    setAccountForm((current) => ({
      ...current,
      [name]: nextValue
    }))
  }

  const resetBankForm = () => {
    setEditingBankId(null)
    setBankForm({
      ...initialBankForm,
      userId: Number(availableUsers[0]?.id ?? 0) || ""
    })
  }

  const startEditBank = (bank: PublicBank) => {
    setSelectedBankId(bank.id)
    setEditingBankId(bank.id)
    setBankForm({
      userId: bank.userId,
      name: bank.name,
      alias: bank.alias ?? "",
      description: bank.description ?? "",
      branch: bank.branch ?? "",
      active: bank.active
    })
  }

  const saveBank = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!bankForm.userId) {
      toast.error("Debes seleccionar un usuario responsable.")
      return
    }

    const payload = {
      companyId: selectedCompanyId || undefined,
      userId: Number(bankForm.userId),
      name: bankForm.name,
      alias: bankForm.alias,
      description: bankForm.description,
      branch: bankForm.branch,
      active: bankForm.active
    }

    try {
      if (editingBankId) {
        const updated = await apiClient.patch<PublicBank>(`/company-banking/banks/${editingBankId}`, payload)
        toast.success("Banco actualizado.")
        resetBankForm()
        await loadReference(selectedCompanyId)
        setSelectedBankId(updated.id)
        return
      }

      const created = await apiClient.post<PublicBank>("/company-banking/banks", payload)
      toast.success("Banco creado.")
      resetBankForm()
      await loadReference(selectedCompanyId)
      setSelectedBankId(created.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el banco.")
    }
  }

  const resetAccountForm = () => {
    setEditingAccountId(null)
    setAccountForm({
      ...initialAccountForm,
      bankId: selectedBankId || banks[0]?.id || ""
    })
  }

  const startEditAccount = (account: PublicCompanyBankAccount) => {
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
  }

  const saveAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!accountForm.bankId) {
      toast.error("Debes seleccionar un banco.")
      return
    }

    const payload = {
      companyId: selectedCompanyId || undefined,
      bankId: Number(accountForm.bankId),
      name: accountForm.name,
      currency: accountForm.currency,
      accountNumber: accountForm.accountNumber,
      bankErpId: accountForm.bankErpId,
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
      }

      resetAccountForm()
      await loadReference(selectedCompanyId)
      setSelectedBankId(payload.bankId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la cuenta bancaria.")
    }
  }

  const stats = useMemo(
    () => ({
      banks: banks.length,
      activeBanks: banks.filter((bank) => bank.active).length,
      accounts: accounts.length,
      activeAccounts: accounts.filter((account) => account.active).length
    }),
    [accounts, banks]
  )

  return {
    selectedCompany,
    selectedCompanyId,
    companies,
    availableUsers,
    changeCompany,
    banks,
    selectedBankId,
    selectedBank,
    visibleAccounts,
    accountCountByBank,
    bankForm,
    accountForm,
    editingBankId,
    editingAccountId,
    onBankFieldChange,
    onAccountFieldChange,
    selectBank,
    startEditBank,
    saveBank,
    resetBankForm,
    startEditAccount,
    saveAccount,
    resetAccountForm,
    reload: loadReference,
    stats
  }
}
