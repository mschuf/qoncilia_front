export interface ErpReferenceResponse {
  companies: Array<{
    id: number
    code: string
    fiscalId?: string
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
  templateId: number | null
  companyId: number
  companyCode: string
  companyName: string
  code: string
  name: string
  erpType: string
  active: boolean
  isDefault: boolean
  userSystem: string | null
  dbName: string | null
  serverNode: string | null
  queryBanco: string | null
  querySistema: string | null
  dbUser: string | null
  serviceLayerUrl: string | null
  tlsVersion: string | null
  allowSelfSigned: boolean
  settings: Record<string, unknown> | null
  hasUserPass: boolean
  hasPassword: boolean
  createdAt: string
  updatedAt: string
}

export interface ErpConfigTemplate {
  id: number
  code: string
  name: string
  erpType: string
  active: boolean
  isDefault: boolean
  userSystem: string | null
  dbName: string | null
  serverNode: string | null
  dbUser: string | null
  serviceLayerUrl: string | null
  tlsVersion: string | null
  allowSelfSigned: boolean
  settings: Record<string, unknown> | null
  hasUserPass: boolean
  hasPassword: boolean
  configs: CompanyErpConfig[]
  createdAt: string
  updatedAt: string
}

export interface CompanyErpConfigFormState {
  companyId: number
  companyIds: number[]
  code: string
  name: string
  erpType: string
  active: boolean
  isDefault: boolean
  userSystem: string
  userPass: string
  dbName: string
  serverNode: string
  queryBanco: string
  querySistema: string
  dbUser: string
  password: string
  serviceLayerUrl: string
  tlsVersion: string
  allowSelfSigned: boolean
}

export interface CompanyProfileFormState {
  name: string
  fiscalId: string
  active: boolean
  webserviceErp: string
  schemeErp: string
  tlsVersionErp: string
  cardsId: string
}
