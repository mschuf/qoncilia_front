import type { ChangeEvent, FormEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { apiClient } from "../api/apiClient"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import type {
  CompanyErpConfig,
  CompanyErpConfigFormState,
  ErpReferenceResponse
} from "../types/erp"
import { isSuperAdminRole } from "../utils/role"

const initialForm: CompanyErpConfigFormState = {
  companyId: 0,
  code: "",
  name: "",
  erpType: "sap_b1",
  description: "",
  active: true,
  isDefault: false,
  sapUsername: "",
  dbName: "",
  cmpName: "",
  serverNode: "",
  dbUser: "",
  password: "",
  serviceLayerUrl: "",
  tlsVersion: "1.2",
  allowSelfSigned: false
}

function buildFormState(
  companyId: number,
  config?: CompanyErpConfig | null,
  tlsVersion = "1.2"
): CompanyErpConfigFormState {
  if (!config) {
    return {
      ...initialForm,
      companyId,
      tlsVersion
    }
  }

  return {
    companyId: config.companyId,
    code: config.code,
    name: config.name,
    erpType: config.erpType,
    description: config.description ?? "",
    active: config.active,
    isDefault: config.isDefault,
    sapUsername: config.sapUsername ?? "",
    dbName: config.dbName ?? "",
    cmpName: config.cmpName ?? "",
    serverNode: config.serverNode ?? "",
    dbUser: config.dbUser ?? "",
    password: "",
    serviceLayerUrl: config.serviceLayerUrl ?? "",
    tlsVersion: config.tlsVersion ?? tlsVersion,
    allowSelfSigned: config.allowSelfSigned
  }
}

export default function useErpManagement() {
  const { role, user } = useAuth()
  const toast = useToast()
  const canManage = isSuperAdminRole(role)
  const [reference, setReference] = useState<ErpReferenceResponse | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(Number(user?.companyId ?? 0))
  const [configs, setConfigs] = useState<CompanyErpConfig[]>([])
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null)
  const [form, setForm] = useState<CompanyErpConfigFormState>({
    ...initialForm,
    companyId: Number(user?.companyId ?? 0)
  })

  const notifyError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      toast.error(error instanceof Error ? error.message : fallbackMessage)
    },
    [toast]
  )

  const defaultTlsVersion = useMemo(
    () => reference?.tlsVersions.find((item) => item === "1.2") ?? reference?.tlsVersions[0] ?? "1.2",
    [reference?.tlsVersions]
  )

  const loadReference = useCallback(async () => {
    try {
      const response = await apiClient.get<ErpReferenceResponse>("/erp/reference")
      setReference(response)
      setSelectedCompanyId((current) => current || Number(response.companies[0]?.id ?? user?.companyId ?? 0))
    } catch (error) {
      notifyError(error, "No se pudo cargar la referencia ERP.")
    }
  }, [notifyError, user?.companyId])

  const loadConfigs = useCallback(
    async (companyId: number) => {
      if (!companyId) {
        setConfigs([])
        return
      }

      try {
        const query = new URLSearchParams({ companyId: String(companyId) })
        const response = await apiClient.get<CompanyErpConfig[]>(`/erp/configs?${query.toString()}`)
        setConfigs(response ?? [])
      } catch (error) {
        notifyError(error, "No se pudieron cargar las configuraciones ERP.")
      }
    },
    [notifyError]
  )

  useEffect(() => {
    void loadReference()
  }, [loadReference])

  useEffect(() => {
    if (!selectedCompanyId) return
    setForm((current) =>
      current.companyId === selectedCompanyId ? current : { ...current, companyId: selectedCompanyId }
    )
    void loadConfigs(selectedCompanyId)
  }, [loadConfigs, selectedCompanyId])

  useEffect(() => {
    if (!editingConfigId) {
      setForm((current) =>
        current.companyId === selectedCompanyId && current.tlsVersion
          ? current
          : buildFormState(selectedCompanyId, null, defaultTlsVersion)
      )
      return
    }

    const editingConfig = configs.find((config) => config.id === editingConfigId)
    if (!editingConfig) {
      setEditingConfigId(null)
      setForm(buildFormState(selectedCompanyId, null, defaultTlsVersion))
    }
  }, [configs, defaultTlsVersion, editingConfigId, selectedCompanyId])

  const selectedCompany =
    reference?.companies.find((company) => company.id === selectedCompanyId) ?? null

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

  const startCreate = useCallback(() => {
    setEditingConfigId(null)
    setForm(buildFormState(selectedCompanyId, null, defaultTlsVersion))
  }, [defaultTlsVersion, selectedCompanyId])

  const startEdit = useCallback(
    (config: CompanyErpConfig) => {
      setEditingConfigId(config.id)
      setForm(buildFormState(selectedCompanyId, config, defaultTlsVersion))
    },
    [defaultTlsVersion, selectedCompanyId]
  )

  const saveConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage) return

    const payload = {
      ...form,
      description: form.description.trim(),
      password: form.password.trim()
    }

    try {
      if (editingConfigId) {
        await apiClient.patch<CompanyErpConfig>(`/erp/configs/${editingConfigId}`, payload)
        toast.success("Configuracion ERP actualizada.")
      } else {
        await apiClient.post<CompanyErpConfig>("/erp/configs", payload)
        toast.success("Configuracion ERP creada.")
      }

      await loadConfigs(selectedCompanyId)
      startCreate()
    } catch (error) {
      notifyError(error, "No se pudo guardar la configuracion ERP.")
    }
  }

  const metrics = useMemo(
    () => ({
      total: configs.length,
      active: configs.filter((config) => config.active).length,
      defaults: configs.filter((config) => config.isDefault).length
    }),
    [configs]
  )

  return {
    canManage,
    reference,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompany,
    configs,
    metrics,
    editingConfigId,
    form,
    onFormFieldChange,
    saveConfig,
    startCreate,
    startEdit,
    reloadConfigs: () => loadConfigs(selectedCompanyId)
  }
}
