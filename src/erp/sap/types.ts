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

export type SapExternalReconciliationAccountType = "rat_GLAccount" | "rat_BusinessPartner"

export interface SapExternalReconciliationMatchInput {
  systemRowId?: string
  bankRowId?: string
  transactionNumber?: number
  lineNumber?: number
  sequence?: number
  bankStatementAccountCode?: string
}

export interface SapExternalReconciliationBankStatementLineInput {
  bankStatementAccountCode?: string
  sequence: number
}

export interface SapExternalReconciliationJournalEntryLineInput {
  transactionNumber: number
  lineNumber: number
}

export interface SapExternalReconciliationRequest {
  companyErpConfigId: number
  reconciliationId?: number
  bankStatementId?: number
  accountCode?: string
  reconciliationAccountType?: SapExternalReconciliationAccountType
  matches?: SapExternalReconciliationMatchInput[]
  bankStatementLines: SapExternalReconciliationBankStatementLineInput[]
  journalEntryLines: SapExternalReconciliationJournalEntryLineInput[]
}

export interface SapExternalReconciliationResult {
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
  externalReconciliationNo: string | null
  externalReference: string | null
  createdAt: string
  updatedAt: string
}
