export interface ErpReferenceResponse {
  companies: Array<{
    id: number
    code: string
    name: string
    active: boolean
  }>
  erpTypes: Array<{
    code: string
    label: string
  }>
  tlsVersions: string[]
}

export interface CompanyErpConfig {
  id: number
  companyId: number
  companyCode: string
  companyName: string
  code: string
  name: string
  erpType: string
  description: string | null
  active: boolean
  isDefault: boolean
  sapUsername: string | null
  dbName: string | null
  cmpName: string | null
  serverNode: string | null
  dbUser: string | null
  serviceLayerUrl: string | null
  tlsVersion: string | null
  allowSelfSigned: boolean
  settings: Record<string, unknown> | null
  hasPassword: boolean
  createdAt: string
  updatedAt: string
}

export interface CompanyErpConfigFormState {
  companyId: number
  code: string
  name: string
  erpType: string
  description: string
  active: boolean
  isDefault: boolean
  sapUsername: string
  dbName: string
  cmpName: string
  serverNode: string
  dbUser: string
  password: string
  serviceLayerUrl: string
  tlsVersion: string
  allowSelfSigned: boolean
}

export interface ErpShipmentResult {
  id: number
  reconciliationId: number
  companyErpConfigId: number
  companyErpConfigName: string
  documentType: string
  status: string
  endpoint: string | null
  httpStatus: number | null
  responsePayload: Record<string, unknown> | null
  errorMessage: string | null
  externalDocEntry: string | null
  externalDocNum: string | null
  createdAt: string
  updatedAt: string
}
