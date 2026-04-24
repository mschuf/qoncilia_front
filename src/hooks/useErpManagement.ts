import type { ChangeEvent, FormEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { apiClient } from "../api/apiClient"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import type { PublicCompany } from "../types/access-control"
import type { CompanyProfileFormState } from "../types/erp"
import { isSuperAdminRole } from "../utils/role"

const initialForm: CompanyProfileFormState = {
  name: "",
  fiscalId: "",
  active: true,
  webserviceErp: "",
  schemeErp: "",
  tlsVersionErp: "1.2",
  cardsId: ""
}

function companyToForm(company?: PublicCompany | null): CompanyProfileFormState {
  if (!company) {
    return initialForm
  }

  return {
    name: company.name ?? "",
    fiscalId: company.fiscalId ?? company.code ?? "",
    active: company.active ?? true,
    webserviceErp: company.webserviceErp ?? "",
    schemeErp: company.schemeErp ?? "",
    tlsVersionErp: company.tlsVersionErp ?? "1.2",
    cardsId: company.cardsId ?? ""
  }
}

export default function useErpManagement() {
  const { role } = useAuth()
  const toast = useToast()
  const isSuperAdmin = isSuperAdminRole(role)
  const [companies, setCompanies] = useState<PublicCompany[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(0)
  const [form, setForm] = useState<CompanyProfileFormState>(initialForm)
  const [isCreating, setIsCreating] = useState(false)

  const notifyError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      toast.error(error instanceof Error ? error.message : fallbackMessage)
    },
    [toast]
  )

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  )

  const syncSelection = useCallback((nextCompanies: PublicCompany[]) => {
    setCompanies(nextCompanies)
    setSelectedCompanyId((current) => {
      if (current > 0 && nextCompanies.some((company) => company.id === current)) {
        return current
      }

      return nextCompanies[0]?.id ?? 0
    })
  }, [])

  const loadSuperAdminCompanies = useCallback(async () => {
    try {
      const response = await apiClient.get<{ companies: PublicCompany[] }>("/access-control/reference")
      syncSelection(response.companies ?? [])
    } catch (error) {
      notifyError(error, "No se pudieron cargar las empresas.")
    }
  }, [notifyError, syncSelection])

  const loadOwnCompany = useCallback(async () => {
    try {
      const response = await apiClient.get<PublicCompany>("/access-control/company-profile")
      setCompanies([response])
      setSelectedCompanyId(response.id)
      setForm(companyToForm(response))
    } catch (error) {
      notifyError(error, "No se pudo cargar la empresa.")
    }
  }, [notifyError])

  useEffect(() => {
    if (isSuperAdmin) {
      void loadSuperAdminCompanies()
      return
    }

    void loadOwnCompany()
  }, [isSuperAdmin, loadOwnCompany, loadSuperAdminCompanies])

  useEffect(() => {
    if (!isSuperAdmin || isCreating) return
    setForm(companyToForm(selectedCompany))
  }, [isCreating, isSuperAdmin, selectedCompany])

  const onFormFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target
    const nextValue =
      type === "checkbox" && "checked" in event.target ? event.target.checked : value

    setForm((current) => ({
      ...current,
      [name]: nextValue
    }))
  }

  const startCreate = () => {
    setIsCreating(true)
    setForm(initialForm)
  }

  const cancelCreate = () => {
    setIsCreating(false)
    setForm(companyToForm(selectedCompany))
  }

  const saveCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      if (isSuperAdmin) {
        const payload = {
          name: form.name,
          fiscalId: form.fiscalId,
          active: form.active,
          webserviceErp: form.webserviceErp,
          schemeErp: form.schemeErp,
          tlsVersionErp: form.tlsVersionErp,
          cardsId: form.cardsId
        }

        if (isCreating || !selectedCompanyId) {
          const created = await apiClient.post<PublicCompany>("/access-control/companies", payload)
          toast.success("Empresa creada correctamente.")
          await loadSuperAdminCompanies()
          setSelectedCompanyId(created.id)
          setIsCreating(false)
          return
        }

        const updated = await apiClient.patch<PublicCompany>(
          `/access-control/companies/${selectedCompanyId}`,
          payload
        )
        toast.success("Empresa actualizada correctamente.")
        await loadSuperAdminCompanies()
        setSelectedCompanyId(updated.id)
        return
      }

      const updated = await apiClient.put<PublicCompany>("/access-control/company-profile", {
        name: form.name,
        fiscalId: form.fiscalId
      })
      setCompanies([updated])
      setSelectedCompanyId(updated.id)
      setForm(companyToForm(updated))
      toast.success("Empresa actualizada correctamente.")
    } catch (error) {
      notifyError(error, "No se pudo guardar la empresa.")
    }
  }

  const metrics = useMemo(
    () => ({
      total: companies.length,
      active: companies.filter((company) => company.active).length,
      withErp: companies.filter((company) => company.webserviceErp || company.schemeErp || company.cardsId).length
    }),
    [companies]
  )

  return {
    isSuperAdmin,
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompany,
    form,
    onFormFieldChange,
    saveCompany,
    startCreate,
    cancelCreate,
    isCreating,
    metrics,
    reload: isSuperAdmin ? loadSuperAdminCompanies : loadOwnCompany
  }
}
