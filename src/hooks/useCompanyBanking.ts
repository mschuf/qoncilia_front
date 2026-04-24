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
  active: true
}

const initialAccountForm: CompanyBankAccountFormState = {
  bankId: "",
  branch: "",
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
  const [bankForm, setBankForm] = useState<BankFormState>(initialBankForm)
  const [accountForm, setAccountForm] = useState<CompanyBankAccountFormState>(initialAccountForm)
  const [editingBankId, setEditingBankId] = useState<number | null>(null)
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null)

  const loadReference = useCallback(async () => {
    const response = await apiClient.get<CompanyBankingReferenceResponse>("/company-banking/reference")
    setReference(response)
  }, [])

  useEffect(() => {
    void loadReference().catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo bancario.")
    })
  }, [loadReference, toast])

  const companies = reference?.companies ?? []
  const banks = reference?.banks ?? []
  const accounts = reference?.accounts ?? []
  const selectedCompany = companies[0] ?? null

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

  const startCreateBank = () => {
    setEditingBankId(null)
    setBankForm(initialBankForm)
  }

  const startEditBank = (bank: PublicBank) => {
    setEditingBankId(bank.id)
    setBankForm({
      name: bank.name,
      active: bank.active
    })
  }

  const saveBank = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      if (editingBankId) {
        await apiClient.patch(`/company-banking/banks/${editingBankId}`, bankForm)
        toast.success("Banco actualizado.")
      } else {
        await apiClient.post("/company-banking/banks", bankForm)
        toast.success("Banco creado.")
      }

      startCreateBank()
      await loadReference()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el banco.")
    }
  }

  const startCreateAccount = () => {
    setEditingAccountId(null)
    setAccountForm({
      ...initialAccountForm,
      bankId: banks[0]?.id ?? ""
    })
  }

  const startEditAccount = (account: PublicCompanyBankAccount) => {
    setEditingAccountId(account.id)
    setAccountForm({
      bankId: account.bankId,
      branch: account.branch ?? "",
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
      branch: accountForm.branch,
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

      startCreateAccount()
      await loadReference()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la cuenta bancaria.")
    }
  }

  const stats = useMemo(
    () => ({
      banks: banks.length,
      activeBanks: banks.filter((bank) => bank.active).length,
      accounts: accounts.length
    }),
    [accounts, banks]
  )

  return {
    selectedCompany,
    banks,
    accounts,
    bankForm,
    accountForm,
    editingBankId,
    editingAccountId,
    onBankFieldChange,
    onAccountFieldChange,
    startCreateBank,
    startEditBank,
    saveBank,
    startCreateAccount,
    startEditAccount,
    saveAccount,
    reload: loadReference,
    stats
  }
}
