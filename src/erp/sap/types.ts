import type { PreviewRow } from "../../types/conciliation"

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

export interface SapB1QueryTable {
  columns: string[]
  rows: Array<Record<string, unknown>>
}

export interface SapB1QueryPreviewResult {
  companyErpConfigId: number
  companyErpConfigName: string
  companyDb: string
  accountCode: string
  dateFrom: string
  dateTo: string
  bank: SapB1QueryTable
  system: SapB1QueryTable
}

// Modo SAP_TARJETAS: resultado del query del sistema (OCRH). Espeja el lado
// "system" de SapB1QueryPreviewResult; el lado "bank" lo aporta el CSV parseado.
export interface SapTarjetasSystemQueryResult {
  companyErpConfigId: number
  companyErpConfigName: string
  companyDb: string
  accountCode: string | null
  // "Cuenta Pago ERP" de la cuenta bancaria: viaja como bankAccountNum en el deposito.
  paymentAccountCode: string | null
  // Descripcion del banco: viaja como Bank (cabecera) en el deposito.
  bankName: string | null
  // Sucursal de la CUENTA bancaria (no la del banco): viaja como BankBranch.
  bankBranch: string | null
  dateFrom: string
  dateTo: string
  system: SapB1QueryTable
}

// Resultado de parsear el archivo de la procesadora (no se guarda en el backend).
// includedRows = operaciones de debito y credito incluidas para el match.
export interface SapTarjetasCsvParseResult {
  fileName: string
  totalRows: number
  includedRows: number
  bank: SapB1QueryTable
}

export interface SapB1SmartMatch {
  systemRow: PreviewRow
  bankRow: PreviewRow
  score: number
  column1Match: boolean
  column2Match: boolean
  column3Match: boolean
  matchReason: "reference" | "date_amount" | "manual"
  dateDifferenceDays: number | null
}

export interface SapB1QueryComparisonResult {
  columns: string[]
  matches: SapB1SmartMatch[]
  unmatchedSystemRows: PreviewRow[]
  unmatchedBankRows: PreviewRow[]
  metrics: {
    totalSystemRows: number
    totalBankRows: number
    matches: number
    unmatchedSystem: number
    unmatchedBank: number
    matchPercentage: number
  }
}

export interface SapTarjetasDepositCreditLineInput {
  absId: number
}

export interface SapTarjetasDepositRequest {
  companyErpConfigId: number
  depositAccount: string
  // Fecha del deposito (YYYY-MM-DD, obligatoria): cabecera DepositDate.
  depositDate: string
  // Comentario del asiento (JournalRemarks); el backend aplica el default
  // "COMPRA P.O.S BANCARD" si va vacio.
  journalRemarks?: string
  // "Cuenta Pago ERP" de la cuenta bancaria (cabecera BankAccountNum).
  bankAccountNum?: string
  // Descripcion del banco (cabecera Bank).
  bank?: string
  // Sucursal de la cuenta bancaria (cabecera BankBranch).
  bankBranch?: string
  // Solo credito de OCHO A: suma de Importe - Importe neto del lote.
  commission?: number
  creditLines: SapTarjetasDepositCreditLineInput[]
}

// Deposito masivo: el backend crea UN deposito con todos los AbsId del lote y
// devuelve el detalle por registro para conservar los fallidos y reintentarlos.
export interface SapTarjetasDepositItemResult {
  absId: number
  status: "success" | "error"
  httpStatus: number | null
  externalReference: string | null
  errorMessage: string | null
}

export interface SapTarjetasBulkDepositResult {
  companyErpConfigId: number
  companyErpConfigName: string
  endpoint: string
  total: number
  succeeded: number
  failed: number
  results: SapTarjetasDepositItemResult[]
}

export type SapExternalReconciliationAccountType =
  | "rat_Account"
  | "rat_GLAccount"
  | "rat_BusinessPartner"

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
  bankStatementLines?: SapExternalReconciliationBankStatementLineInput[]
  journalEntryLines?: SapExternalReconciliationJournalEntryLineInput[]
  payload?: Record<string, unknown>
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
