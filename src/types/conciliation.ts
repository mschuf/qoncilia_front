export type CompareOperator =
  | "equals"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "numeric_equals"
  | "date_equals";

export type LayoutDataType = "text" | "number" | "amount" | "date";

// Modo de interpretacion del importe del extracto para generar BankPages.
// null = autodeteccion.
export type AmountMode =
  | "debit_credit"
  | "signed"
  | "single_credit"
  | "single_debit";

export const AMOUNT_MODE_OPTIONS: Array<{ value: AmountMode | ""; label: string }> = [
  { value: "", label: "Auto (detectar)" },
  { value: "debit_credit", label: "Debito / Credito separados" },
  { value: "signed", label: "Importe con signo (+ credito / - debito)" },
  { value: "single_credit", label: "Solo credito" },
  { value: "single_debit", label: "Solo debito" },
];

export interface CompanyBankAccountSummary {
  id: number;
  bankId: number;
  bankName: string;
  name: string;
  currency: string;
  accountNumber: string;
  active: boolean;
}

export interface UserBankSummary {
  id: number;
  bankName: string;
  branch: string | null;
  description: string | null;
  active: boolean;
}

export interface LayoutMapping {
  id: number;
  fieldKey: string;
  label: string;
  active: boolean;
  required: boolean;
  compareOperator: CompareOperator;
  weight: number;
  tolerance: number | null;
  sortOrder: number;
  systemSheet: string | null;
  systemColumn: string | null;
  systemStartRow: number | null;
  systemEndRow: number | null;
  systemDataType: LayoutDataType;
  bankSheet: string | null;
  bankColumn: string | null;
  bankStartRow: number | null;
  bankEndRow: number | null;
  bankDataType: LayoutDataType;
}

export interface Layout {
  id: number;
  userBankId: number;
  templateLayoutId: number | null;
  systemName: string;
  name: string;
  description: string | null;
  systemLabel: string;
  bankLabel: string;
  autoMatchThreshold: number;
  active: boolean;
  amountMode: AmountMode | null;
  mappings: LayoutMapping[];
}

export interface TemplateLayout {
  id: number;
  systemName: string;
  name: string;
  description: string | null;
  referenceBankName: string | null;
  systemLabel: string;
  bankLabel: string;
  autoMatchThreshold: number;
  active: boolean;
  amountMode: AmountMode | null;
  mappings: LayoutMapping[];
}

export interface UserBankWithLayouts extends UserBankSummary {
  userId: number;
  userLogin: string;
  accounts: CompanyBankAccountSummary[];
  layouts: Layout[];
  availableTemplateIds: number[];
}

export interface BankWithAvailableTemplates extends UserBankSummary {
  userId: number;
  userLogin: string;
  companyId: number;
  companyName: string;
  layouts: Layout[];
  availableTemplates: TemplateLayout[];
}

export interface BankDeletionPreviewBank extends UserBankSummary {
  userId: number;
  userLogin: string;
}

export interface BankDeletionLayout {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
}

export interface BankDeletionAccount {
  id: number;
  name: string;
  currency: string;
  accountNumber: string;
  bankErpId: string;
  majorAccountNumber: string;
  paymentAccountNumber: string | null;
  active: boolean;
}

export interface BankDeletionPreview {
  bank: BankDeletionPreviewBank;
  layouts: BankDeletionLayout[];
  accounts: BankDeletionAccount[];
  reconciliationCount: number;
  bankStatementCount: number;
}

export interface DeleteBankResponse {
  message: string;
  deletedLayouts: number;
  deletedAccounts: number;
  deletedReconciliations: number;
  deletedBankStatements: number;
}

export interface PreviewRow {
  rowId: string;
  rowNumber: number;
  values: Record<string, string | null>;
  normalized: Record<string, string | number | null>;
}

export interface PreviewRuleResult {
  fieldKey: string;
  label: string;
  passed: boolean;
  compareOperator: CompareOperator;
  systemValue: string | number | null;
  bankValue: string | number | null;
}

export interface PreviewMatch {
  systemRowId: string;
  bankRowId: string;
  systemRowNumber: number;
  bankRowNumber: number;
  score: number;
  status: "auto" | "manual";
  ruleResults: PreviewRuleResult[];
}

export interface PreviewMetrics {
  totalSystemRows: number;
  totalBankRows: number;
  autoMatches: number;
  manualMatches: number;
  unmatchedSystem: number;
  unmatchedBank: number;
  matchPercentage: number;
}

export interface PreviewResponse {
  userBank: UserBankSummary;
  companyBankAccount: CompanyBankAccountSummary;
  layout: Layout;
  bankStatement?: BankStatementSummary;
  systemFileName: string;
  bankFileName: string;
  systemRows: PreviewRow[];
  bankRows: PreviewRow[];
  autoMatches: PreviewMatch[];
  manualMatches: PreviewMatch[];
  unmatchedSystemRows: PreviewRow[];
  unmatchedBankRows: PreviewRow[];
  metrics: PreviewMetrics;
}

export interface GestorAssignmentCatalog {
  gestorUsers: Array<{
    id: number;
    login: string;
    fullName: string | null;
    creatorUserId: number | null;
    creatorUserLogin: string | null;
  }>;
  sourceBanks: UserBankWithLayouts[];
}

export interface SyncGestorBankAssignmentResponse {
  gestorUserId: number;
  sourceBankId: number;
  targetBankId: number;
  targetBankName: string;
  syncedLayoutIds: number[];
  syncedAccountIds: number[];
}

export interface ConciliationKpis {
  totalReconciliations: number;
  totalAutoMatches: number;
  totalManualMatches: number;
  totalUnmatchedSystem: number;
  totalUnmatchedBank: number;
  averageMatchPercentage: number;
  bankBreakdown: Array<{
    userBankId: number;
    bankName: string;
    totalReconciliations: number;
    averageMatchPercentage: number;
  }>;
  recentReconciliations: Array<{
    id: number;
    name: string;
    bankName: string;
    companyBankAccountName: string | null;
    companyBankAccountNumber: string | null;
    layoutName: string;
    systemName: string;
    matchPercentage: number;
    autoMatches: number;
    manualMatches: number;
    unmatchedSystem: number;
    unmatchedBank: number;
    createdAt: string;
  }>;
}

export interface BankStatementSummary {
  id: number;
  name: string;
  fileName: string;
  status: string;
  rowCount: number;
  userId: number;
  userLogin: string;
  userBankId: number;
  bankName: string;
  companyBankAccountId: number;
  companyBankAccountName: string;
  companyBankAccountNumber: string;
  companyBankAccountCurrency: string;
  layoutId: number;
  layoutName: string;
  systemName: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankStatementDetail extends BankStatementSummary {
  userBank: UserBankSummary;
  companyBankAccount: CompanyBankAccountSummary;
  layout: Layout;
  rows: PreviewRow[];
}

export interface BankStatementPreviewResponse {
  userBank: UserBankSummary;
  companyBankAccount: CompanyBankAccountSummary;
  layout: Layout;
  fileName: string;
  rowCount: number;
  rows: PreviewRow[];
}

export interface DeleteBankStatementResponse {
  id: number;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  lastPage: number;
}
