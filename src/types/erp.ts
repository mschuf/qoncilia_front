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

export type SapSessionStatus =
  | "active"
  | "not_authenticated"
  | "expired"
  | "invalid"
  | "logged_out"

export interface SapErpSession {
  companyErpConfigId: number
  companyErpConfigName: string
  erpType: string
  authenticated: boolean
  status: SapSessionStatus
  username: string | null
  expiresAt: string | null
  lastValidatedAt: string | null
  checkedAt: string
}

export interface SapLoginFormState {
  username: string
  password: string
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
