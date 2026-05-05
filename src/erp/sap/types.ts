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

export interface SapCreditDepositLineInput {
  absId?: number
  systemRowId?: string
  bankRowId?: string
  creditCard?: number
  paymentMethodCode?: number
  voucherNumber?: string
  ref3?: string
  payDate?: string
  customer?: string
  total?: number
  creditCurrency?: string
  reference?: string
}

export interface SapDepositRequest {
  companyErpConfigId: number
  bankStatementId?: number
  depositDate?: string
  bankReference?: string
  journalRemarks?: string
  creditLines: SapCreditDepositLineInput[]
}

export interface SapErpShipmentResult {
  id: number
  reconciliationId: number | null
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
