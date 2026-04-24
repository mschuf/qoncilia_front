import type { ChangeEvent, FormEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { apiClient } from "../api/apiClient"
import { useToast } from "../context/ToastContext"
import type {
  BankFormState,
  CompanyBankAccountFormState,
  CompanyBankingReferenceResponse,
  PublicBank,
  PublicCompanyBankAccount
} from "../types/banking"

const initialBankForm: BankFormState = {
  name: "",
  branch: "",
  active: true
}

const initialAccountForm: CompanyBankAccountFormState = {
  bankId: "",
  name: "",
  accountNumber: "",
  bankErpId: "",
  majorAccountNumber: "",
  paymentAccountNumber: "",
  active: true
}

export default function useCompanyBanking() {
  const toast = useToast()
  const [reference, setReference] = useState<CompanyBankingReferenceResponse | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(0)
  const [selectedBankId, setSelectedBankId] = useState<number>(0)
  const [bankForm, setBankForm] = useState<BankFormState>(initialBankForm)
  const [accountForm, setAccountForm] = useState<CompanyBankAccountFormState>(initialAccountForm)
  const [editingBankId, setEditingBankId] = useState<number | null>(null)
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null)

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
    void loadReference().catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo bancario.")
    })
  }, [loadReference, toast])

  const changeCompany = useCallback((companyId: number) => {
    void loadReference(companyId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo bancario.")
    })
  }, [loadReference, toast])

  const companies = reference?.companies ?? []
  const banks = reference?.banks ?? []
  const accounts = reference?.accounts ?? []
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? companies[0] ?? null

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

  const onBankFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = event.target
    const nextValue =
      type === "checkbox" && "checked" in event.target ? event.target.checked : value

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
    setBankForm(initialBankForm)
  }

  const startEditBank = (bank: PublicBank) => {
    setSelectedBankId(bank.id)
    setEditingBankId(bank.id)
    setBankForm({
      name: bank.name,
      branch: bank.branch ?? "",
      active: bank.active
    })
  }

  const saveBank = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      if (editingBankId) {
        const updated = await apiClient.patch<PublicBank>(`/company-banking/banks/${editingBankId}`, bankForm)
        toast.success("Banco actualizado.")
        resetBankForm()
        await loadReference()
        setSelectedBankId(updated.id)
        return
      }

      const created = await apiClient.post<PublicBank>("/company-banking/banks", bankForm)
      toast.success("Banco creado.")
      resetBankForm()
      await loadReference()
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
      bankId: Number(accountForm.bankId),
      name: accountForm.name,
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
      await loadReference()
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
