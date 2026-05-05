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
  ErpReferenceResponse
} from "../types/erp"
import { isSuperAdminRole } from "../utils/role"

const initialConfigForm: CompanyErpConfigFormState = {
  companyId: 0,
  code: "SAP_B1",
  name: "SAP Business One",
  erpType: "sap_b1",
  description: "",
  active: true,
  isDefault: true,
  sapUsername: "",
  dbName: "",
  cmpName: "",
  serverNode: "",
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
    tlsVersion: config.tlsVersion ?? "1.2",
    allowSelfSigned: config.allowSelfSigned
  }
}

function createConfigForm(companyId: number): CompanyErpConfigFormState {
  return {
    ...initialConfigForm,
    companyId
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
  const [reference, setReference] = useState<ErpReferenceResponse | null>(null)
  const [configs, setConfigs] = useState<CompanyErpConfig[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(0)
  const [selectedConfigId, setSelectedConfigId] = useState<number>(0)
  const [configForm, setConfigForm] = useState<CompanyErpConfigFormState>(
    createConfigForm(0)
  )
  const [loginForm, setLoginForm] = useState<SapLoginFormState>(initialLoginForm)
  const [sapSession, setSapSession] = useState<SapErpSession | null>(null)
  const [isCreatingConfig, setIsCreatingConfig] = useState(false)

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
      if (!companyId) {
        setConfigs([])
        setSelectedConfigId(0)
        return
      }

      const params = new URLSearchParams()
      if (isSuperAdmin) {
        params.set("companyId", String(companyId))
      }
      if (!isSuperAdmin) {
        params.set("activeOnly", "true")
      }

      const response = await apiClient.get<CompanyErpConfig[]>(
        `/erp/configs${params.toString() ? `?${params.toString()}` : ""}`
      )
      const nextConfigs = response ?? []
      setConfigs(nextConfigs)
      setSelectedConfigId((current) => {
        const requested = Number(searchParams.get("configId") ?? 0)
        const stored = getStoredSapConfigId()
        const candidates = [requested, current, stored]
        const existing = candidates.find((id) => nextConfigs.some((config) => config.id === id))

        return existing ?? nextConfigs.find((config) => config.isDefault)?.id ?? nextConfigs[0]?.id ?? 0
      })
    },
    [isSuperAdmin, searchParams]
  )

  useEffect(() => {
    void loadReference().catch((error) => notifyError(error, "No se pudo cargar la referencia ERP."))
  }, [loadReference, notifyError])

  useEffect(() => {
    if (!selectedCompanyId) return
    void loadConfigs(selectedCompanyId).catch((error) =>
      notifyError(error, "No se pudieron cargar las configuraciones ERP.")
    )
  }, [loadConfigs, notifyError, selectedCompanyId])

  useEffect(() => {
    if (isCreatingConfig) {
      setConfigForm(createConfigForm(selectedCompanyId))
      return
    }

    if (selectedConfig) {
      setConfigForm(configToForm(selectedConfig))
      setLoginForm((current) => ({
        ...current,
        username: current.username || selectedConfig.sapUsername || ""
      }))
      return
    }

    setConfigForm(createConfigForm(selectedCompanyId))
  }, [isCreatingConfig, selectedCompanyId, selectedConfig])

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

  const startCreateConfig = () => {
    setIsCreatingConfig(true)
    setSelectedConfigId(0)
    setSapSession(null)
  }

  const cancelCreateConfig = () => {
    setIsCreatingConfig(false)
    setSelectedConfigId(configs[0]?.id ?? 0)
  }

  const saveConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSuperAdmin) return

    const payload = {
      companyId: configForm.companyId || selectedCompanyId,
      code: configForm.code,
      name: configForm.name,
      erpType: configForm.erpType,
      description: configForm.description || undefined,
      active: configForm.active,
      isDefault: configForm.isDefault,
      sapUsername: configForm.sapUsername || undefined,
      dbName: configForm.dbName,
      cmpName: configForm.cmpName || undefined,
      serverNode: configForm.serverNode || undefined,
      dbUser: configForm.dbUser || undefined,
      password: configForm.password || undefined,
      serviceLayerUrl: configForm.serviceLayerUrl,
      tlsVersion: configForm.tlsVersion,
      allowSelfSigned: configForm.allowSelfSigned
    }

    try {
      const saved =
        isCreatingConfig || !selectedConfigId
          ? await apiClient.post<CompanyErpConfig>("/erp/configs", payload)
          : await apiClient.patch<CompanyErpConfig>(`/erp/configs/${selectedConfigId}`, payload)

      toast.success("Configuracion ERP guardada correctamente.")
      setIsCreatingConfig(false)
      await loadConfigs(saved.companyId)
      setSelectedCompanyId(saved.companyId)
      setSelectedConfigId(saved.id)
    } catch (error) {
      notifyError(error, "No se pudo guardar la configuracion ERP.")
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
          username: loginForm.username,
          password: loginForm.password
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
    reference,
    companies: reference?.companies ?? [],
    configs,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompany,
    selectedConfigId,
    setSelectedConfigId,
    selectedConfig,
    configForm,
    onConfigFormChange,
    saveConfig,
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
    reload: () => loadConfigs(selectedCompanyId)
  }
}
