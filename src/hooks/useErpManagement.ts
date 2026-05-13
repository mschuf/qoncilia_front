import type { ChangeEvent, FormEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { apiClient } from "../api/apiClient"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import {
  getStoredSapConfigId,
  storeSapConfigId,
  type SapErpSession,
  type SapLoginFormState
} from "../erp/sap"
import type {
  CompanyErpConfig,
  CompanyErpConfigFormState,
  ErpConfigTemplate,
  ErpReferenceResponse
} from "../types/erp"
import { isAdminRole, isSuperAdminRole } from "../utils/role"

const initialConfigForm: CompanyErpConfigFormState = {
  companyId: 0,
  companyIds: [],
  code: "SAP_B1",
  name: "SAP Business One",
  erpType: "sap_b1",
  active: false,
  isDefault: false,
  userSystem: "",
  userPass: "",
  dbName: "",
  serverNode: "",
  queryBanco: "",
  querySistema: "",
  dbUser: "",
  password: "",
  serviceLayerUrl: "",
  tlsVersion: "1.2",
  allowSelfSigned: true
}

const initialLoginForm: SapLoginFormState = {
  username: "",
  password: ""
}

function configToForm(config: CompanyErpConfig): CompanyErpConfigFormState {
  return {
    companyId: config.companyId,
    companyIds: [config.companyId],
    code: config.code,
    name: config.name,
    erpType: config.erpType,
    active: config.active,
    isDefault: config.isDefault,
    userSystem: config.userSystem ?? "",
    userPass: "",
    dbName: config.dbName ?? "",
    serverNode: config.serverNode ?? "",
    queryBanco: config.queryBanco ?? "",
    querySistema: config.querySistema ?? "",
    dbUser: config.dbUser ?? "",
    password: "",
    serviceLayerUrl: config.serviceLayerUrl ?? "",
    tlsVersion: config.tlsVersion ?? "1.2",
    allowSelfSigned: config.allowSelfSigned
  }
}

function templateToForm(template: ErpConfigTemplate): CompanyErpConfigFormState {
  return {
    companyId: 0,
    companyIds: [],
    code: template.code,
    name: template.name,
    erpType: template.erpType,
    active: template.active,
    isDefault: template.isDefault,
    userSystem: template.userSystem ?? "",
    userPass: "",
    dbName: template.dbName ?? "",
    serverNode: template.serverNode ?? "",
    queryBanco: "",
    querySistema: "",
    dbUser: template.dbUser ?? "",
    password: "",
    serviceLayerUrl: template.serviceLayerUrl ?? "",
    tlsVersion: template.tlsVersion ?? "1.2",
    allowSelfSigned: template.allowSelfSigned
  }
}

function createConfigForm(companyId: number): CompanyErpConfigFormState {
  return {
    ...initialConfigForm,
    companyId,
    companyIds: companyId ? [companyId] : []
  }
}

function sessionLabel(status?: SapErpSession["status"]) {
  switch (status) {
    case "active":
      return "Conectado"
    case "expired":
      return "Expirada"
    case "invalid":
      return "Invalida"
    case "logged_out":
      return "Cerrada"
    case "not_authenticated":
    default:
      return "Sin sesion"
  }
}

export default function useErpManagement() {
  const { role, user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const isSuperAdmin = isSuperAdminRole(role)
  const canEditConfig = isAdminRole(role)
  const [reference, setReference] = useState<ErpReferenceResponse | null>(null)
  const [configs, setConfigs] = useState<CompanyErpConfig[]>([])
  const [templates, setTemplates] = useState<ErpConfigTemplate[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(0)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(0)
  const [selectedConfigId, setSelectedConfigId] = useState<number>(0)
  const [configForm, setConfigForm] = useState<CompanyErpConfigFormState>(
    createConfigForm(0)
  )
  const [loginForm, setLoginForm] = useState<SapLoginFormState>(initialLoginForm)
  const [sapSession, setSapSession] = useState<SapErpSession | null>(null)
  const [isCreatingConfig, setIsCreatingConfig] = useState(false)
  const [copyCompanyIds, setCopyCompanyIds] = useState<number[]>([])

  const notifyError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      toast.error(error instanceof Error ? error.message : fallbackMessage)
    },
    [toast]
  )

  const selectedCompany = useMemo(
    () => reference?.companies.find((company) => company.id === selectedCompanyId) ?? null,
    [reference?.companies, selectedCompanyId]
  )

  const selectedConfig = useMemo(
    () => configs.find((config) => config.id === selectedConfigId) ?? null,
    [configs, selectedConfigId]
  )

  const selectedTemplate = useMemo(() => {
    if (!isSuperAdmin) return null
    return templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null
  }, [isSuperAdmin, selectedTemplateId, templates])

  const selectedTemplateConfigs = selectedTemplate?.configs ?? []

  const availableCompaniesForCopy = useMemo(() => {
    if (!selectedTemplate) return []
    const assignedIds = new Set(selectedTemplate.configs.map((config) => config.companyId))
    return (reference?.companies ?? []).filter((company) => !assignedIds.has(company.id))
  }, [reference?.companies, selectedTemplate])

  const loadReference = useCallback(async () => {
    const response = await apiClient.get<ErpReferenceResponse>("/erp/reference")
    setReference(response)
    setSelectedCompanyId((current) => {
      if (current && response.companies.some((company) => company.id === current)) {
        return current
      }

      const ownCompany = response.companies.find((company) => company.id === user?.companyId)
      return ownCompany?.id ?? response.companies[0]?.id ?? 0
    })
  }, [user?.companyId])

  const loadConfigs = useCallback(
    async (companyId: number) => {
      if (!companyId && !isSuperAdmin) {
        setConfigs([])
        setSelectedConfigId(0)
        return
      }

      const params = new URLSearchParams()
      if (isSuperAdmin && companyId) {
        params.set("companyId", String(companyId))
      }
      if (!isAdminRole(role)) {
        params.set("activeOnly", "true")
      }

      const response = await apiClient.get<CompanyErpConfig[]>(
        `/erp/configs${params.toString() ? `?${params.toString()}` : ""}`
      )
      const nextConfigs = response ?? []
      setConfigs(nextConfigs)
      setSelectedConfigId((current) => {
        if (isSuperAdmin) {
          return current && nextConfigs.some((config) => config.id === current) ? current : 0
        }

        const requested = Number(searchParams.get("configId") ?? 0)
        const stored = getStoredSapConfigId()
        const candidates = [requested, current, stored]
        const existing = candidates.find((id) => nextConfigs.some((config) => config.id === id))

        return existing ?? nextConfigs.find((config) => config.isDefault)?.id ?? nextConfigs[0]?.id ?? 0
      })
    },
    [isSuperAdmin, role, searchParams]
  )

  const loadTemplates = useCallback(async () => {
    if (!isSuperAdmin) return

    const response = await apiClient.get<ErpConfigTemplate[]>("/erp/config-templates")
    const nextTemplates = response ?? []
    setTemplates(nextTemplates)
    setSelectedTemplateId((current) => {
      if (current && nextTemplates.some((template) => template.id === current)) {
        return current
      }

      return nextTemplates[0]?.id ?? 0
    })
  }, [isSuperAdmin])

  useEffect(() => {
    void loadReference().catch((error) => notifyError(error, "No se pudo cargar la referencia ERP."))
  }, [loadReference, notifyError])

  useEffect(() => {
    if (!isSuperAdmin) return
    void loadTemplates().catch((error) =>
      notifyError(error, "No se pudieron cargar las plantillas ERP.")
    )
  }, [isSuperAdmin, loadTemplates, notifyError])

  useEffect(() => {
    if (!isSuperAdmin && !selectedCompanyId) return
    void loadConfigs(isSuperAdmin ? 0 : selectedCompanyId).catch((error) =>
      notifyError(error, "No se pudieron cargar las configuraciones ERP.")
    )
  }, [isSuperAdmin, loadConfigs, notifyError, selectedCompanyId])

  useEffect(() => {
    if (!selectedTemplate) {
      setCopyCompanyIds([])
      return
    }

    const availableIds = new Set(availableCompaniesForCopy.map((company) => company.id))
    setCopyCompanyIds((current) => current.filter((companyId) => availableIds.has(companyId)))
  }, [availableCompaniesForCopy, selectedTemplate])

  useEffect(() => {
    if (isCreatingConfig) {
      setConfigForm(createConfigForm(isSuperAdmin ? 0 : selectedCompanyId))
      return
    }

    if (selectedConfig) {
      setConfigForm(configToForm(selectedConfig))
      setLoginForm((current) => ({
        ...current,
        username: current.username || selectedConfig.userSystem || ""
      }))
      return
    }

    if (isSuperAdmin && selectedTemplate) {
      setConfigForm(templateToForm(selectedTemplate))
      return
    }

    setConfigForm(createConfigForm(isSuperAdmin ? 0 : selectedCompanyId))
  }, [isCreatingConfig, isSuperAdmin, selectedCompanyId, selectedConfig, selectedTemplate])

  const checkSapSession = useCallback(async () => {
    if (!selectedConfigId) {
      setSapSession(null)
      return null
    }

    const response = await apiClient.get<SapErpSession>(
      `/erp/sap/sessions/status?companyErpConfigId=${selectedConfigId}`,
      { timeoutMs: 20000 }
    )
    setSapSession(response)
    if (response.authenticated) {
      storeSapConfigId(response.companyErpConfigId)
    }
    return response
  }, [selectedConfigId])

  useEffect(() => {
    if (!selectedConfigId) {
      setSapSession(null)
      setSearchParams((current) => {
        if (!current.has("configId")) return current
        const next = new URLSearchParams(current)
        next.delete("configId")
        return next
      }, { replace: true })
      return
    }

    storeSapConfigId(selectedConfigId)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set("configId", String(selectedConfigId))
      return next
    }, { replace: true })
    void checkSapSession().catch(() => {
      setSapSession(null)
    })
  }, [checkSapSession, selectedConfigId, setSearchParams])

  const onConfigFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target
    const nextValue =
      type === "checkbox" && "checked" in event.target ? event.target.checked : value

    setConfigForm((current) => ({
      ...current,
      [name]: name === "companyId" ? Number(nextValue) : nextValue
    }))
  }

  const onLoginFormChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setLoginForm((current) => ({
      ...current,
      [name]: value
    }))
  }

  const toggleConfigCompany = (companyId: number) => {
    setConfigForm((current) => {
      const ids = new Set(current.companyIds)
      if (ids.has(companyId)) {
        ids.delete(companyId)
      } else {
        ids.add(companyId)
      }

      const companyIds = Array.from(ids)
      return {
        ...current,
        companyIds,
        companyId: current.companyId || companyIds[0] || 0
      }
    })
  }

  const toggleCopyCompany = (companyId: number) => {
    setCopyCompanyIds((current) =>
      current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId]
    )
  }

  const selectTemplate = (templateId: number) => {
    setIsCreatingConfig(false)
    setSelectedTemplateId(templateId)
    setSelectedConfigId(0)
    setSapSession(null)
  }

  const startCreateConfig = () => {
    setIsCreatingConfig(true)
    setSelectedConfigId(0)
    setSapSession(null)
    setCopyCompanyIds([])
  }

  const cancelCreateConfig = () => {
    setIsCreatingConfig(false)
    setSelectedConfigId(0)
    setSelectedTemplateId((current) => current || templates[0]?.id || 0)
  }

  const saveConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEditConfig) return

    if (isSuperAdmin && !isCreatingConfig && !selectedConfigId && !selectedTemplate) {
      toast.error("Selecciona una plantilla ERP para editar.")
      return
    }

    const editableCredentials = {
      name: configForm.name,
      active: configForm.active,
      isDefault: configForm.isDefault,
      userSystem: configForm.userSystem || undefined,
      userPass: configForm.userPass || undefined,
      dbName: configForm.dbName || undefined,
      serverNode: configForm.serverNode || undefined,
      queryBanco: configForm.queryBanco || undefined,
      querySistema: configForm.querySistema || undefined,
      dbUser: configForm.dbUser || undefined,
      password: configForm.password || undefined,
      serviceLayerUrl: configForm.serviceLayerUrl || undefined,
      tlsVersion: configForm.tlsVersion || undefined
    }

    const payload = isSuperAdmin
      ? {
          code: configForm.code,
          allowSelfSigned: configForm.allowSelfSigned,
          ...editableCredentials
        }
      : editableCredentials

    if (!isSuperAdmin && !selectedConfigId) {
      toast.error("Selecciona una configuracion ERP para editar.")
      return
    }

    try {
      if (isSuperAdmin && isCreatingConfig) {
        const savedTemplate = await apiClient.post<ErpConfigTemplate>("/erp/config-templates", payload)
        toast.success("Plantilla ERP creada correctamente.")
        setIsCreatingConfig(false)
        setSelectedTemplateId(savedTemplate.id)
        setSelectedConfigId(0)
        await loadTemplates()
        await loadConfigs(0)
        return
      }

      if (isSuperAdmin && selectedConfigId) {
        const savedConfig = await apiClient.patch<CompanyErpConfig>(
          `/erp/configs/${selectedConfigId}`,
          payload
        )
        toast.success("Configuracion ERP guardada correctamente.")
        await loadTemplates()
        await loadConfigs(0)
        setSelectedConfigId(savedConfig.id)
        setSelectedTemplateId(savedConfig.templateId ?? selectedTemplate?.id ?? 0)
        return
      }

      if (isSuperAdmin && selectedTemplate) {
        const savedTemplate = await apiClient.patch<ErpConfigTemplate>(
          `/erp/config-templates/${selectedTemplate.id}`,
          payload
        )
        toast.success("Plantilla ERP guardada correctamente.")
        await loadTemplates()
        await loadConfigs(0)
        setSelectedTemplateId(savedTemplate.id)
        setSelectedConfigId(0)
        return
      }

      const savedConfig = await apiClient.patch<CompanyErpConfig>(`/erp/configs/${selectedConfigId}`, payload)
      toast.success("Configuracion ERP guardada correctamente.")
      setIsCreatingConfig(false)
      await loadConfigs(savedConfig.companyId)
      setSelectedCompanyId(savedConfig.companyId)
      setSelectedConfigId(savedConfig.id)
    } catch (error) {
      notifyError(error, "No se pudo guardar la configuracion ERP.")
    }
  }

  const copyTemplateToCompanies = async () => {
    if (!isSuperAdmin || !selectedTemplate || copyCompanyIds.length === 0) {
      toast.error("Selecciona una plantilla y al menos una empresa destino.")
      return
    }

    try {
      const copiedConfigs = await apiClient.post<CompanyErpConfig[]>(
        `/erp/config-templates/${selectedTemplate.id}/copies`,
        { companyIds: copyCompanyIds }
      )
      toast.success(
        copiedConfigs.length > 1
          ? `${copiedConfigs.length} copias creadas correctamente.`
          : "Copia creada correctamente."
      )
      setCopyCompanyIds([])
      await loadTemplates()
      await loadConfigs(0)
      if (copiedConfigs[0]) {
        setSelectedConfigId(copiedConfigs[0].id)
        setSelectedTemplateId(copiedConfigs[0].templateId ?? selectedTemplate.id)
      }
    } catch (error) {
      notifyError(error, "No se pudo copiar la plantilla ERP.")
    }
  }

  const deleteConfig = async (config: CompanyErpConfig) => {
    if (!isSuperAdmin) return
    const confirmed = window.confirm(
      `Seguro que queres quitar "${config.name}" de ${config.companyName}?`
    )
    if (!confirmed) return

    try {
      await apiClient.delete(`/erp/configs/${config.id}`)
      toast.success("Configuracion ERP quitada de la empresa.")
      await loadTemplates()
      await loadConfigs(0)
      setSelectedConfigId(0)
      setSelectedTemplateId(config.templateId ?? selectedTemplate?.id ?? 0)
    } catch (error) {
      notifyError(error, "No se pudo quitar la configuracion ERP.")
    }
  }

  const loginSap = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedConfigId) {
      toast.error("Selecciona una configuracion ERP activa.")
      return
    }

    try {
      const response = await apiClient.post<SapErpSession>(
        "/erp/sap/sessions/login",
        {
          companyErpConfigId: selectedConfigId,
          username: loginForm.username || undefined,
          password: loginForm.password || undefined
        },
        { timeoutMs: 20000 }
      )
      setSapSession(response)
      setLoginForm((current) => ({ ...current, password: "" }))
      storeSapConfigId(selectedConfigId)
      toast.success("Sesion SAP iniciada correctamente.")
    } catch (error) {
      notifyError(error, "No se pudo iniciar sesion en SAP.")
    }
  }

  const logoutSap = async () => {
    if (!selectedConfigId) return

    try {
      const response = await apiClient.post<SapErpSession>("/erp/sap/sessions/logout", {
        companyErpConfigId: selectedConfigId
      })
      setSapSession(response)
      toast.info("Sesion SAP cerrada.")
    } catch (error) {
      notifyError(error, "No se pudo cerrar la sesion SAP.")
    }
  }

  const metrics = useMemo(
    () => ({
      total: configs.length,
      active: configs.filter((config) => config.active).length,
      connected: sapSession?.authenticated ? 1 : 0
    }),
    [configs, sapSession?.authenticated]
  )

  return {
    isSuperAdmin,
    canEditConfig,
    reference,
    companies: reference?.companies ?? [],
    configs,
    templates,
    selectedTemplate,
    selectedTemplateConfigs,
    availableCompaniesForCopy,
    copyCompanyIds,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompany,
    selectedConfigId,
    setSelectedConfigId,
    selectedConfig,
    configForm,
    toggleConfigCompany,
    toggleCopyCompany,
    setCopyCompanyIds,
    selectTemplate,
    onConfigFormChange,
    saveConfig,
    copyTemplateToCompanies,
    deleteConfig,
    startCreateConfig,
    cancelCreateConfig,
    isCreatingConfig,
    loginForm,
    onLoginFormChange,
    loginSap,
    logoutSap,
    checkSapSession,
    sapSession,
    sessionLabel: sessionLabel(sapSession?.status),
    metrics,
    reload: () => loadConfigs(isSuperAdmin ? 0 : selectedCompanyId)
  }
}
