export type CompareOperator =
  | "equals"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "numeric_equals"
  | "date_equals";

export type LayoutDataType = "text" | "number" | "amount" | "date";

export interface UserBankSummary {
  id: number;
  bankName: string;
  alias: string | null;
  currency: string;
  accountNumber: string | null;
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
  name: string;
  description: string | null;
  systemLabel: string;
  bankLabel: string;
  autoMatchThreshold: number;
  active: boolean;
  mappings: LayoutMapping[];
}

export interface TemplateLayout {
  id: number;
  name: string;
  description: string | null;
  referenceBankName: string | null;
  systemLabel: string;
  bankLabel: string;
  autoMatchThreshold: number;
  active: boolean;
  mappings: LayoutMapping[];
}

export interface UserBankWithLayouts extends UserBankSummary {
  userId: number;
  userLogin: string;
  layouts: Layout[];
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
  layout: Layout;
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

export interface ReconciliationSummary {
  id: number;
  name: string;
  status: string;
  updateCount: number;
  userId: number;
  userLogin: string;
  userBankId: number;
  bankName: string;
  bankAlias: string | null;
  layoutId: number;
  layoutName: string;
  systemFileName: string | null;
  bankFileName: string | null;
  totalSystemRows: number;
  totalBankRows: number;
  autoMatches: number;
  manualMatches: number;
  unmatchedSystem: number;
  unmatchedBank: number;
  matchPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationSnapshot {
  userBank: UserBankSummary;
  layout: Layout;
  systemRows: PreviewRow[];
  bankRows: PreviewRow[];
  autoMatches: PreviewMatch[];
  manualMatches: PreviewMatch[];
  unmatchedSystemRows: PreviewRow[];
  unmatchedBankRows: PreviewRow[];
  metrics: PreviewMetrics;
}

export interface ReconciliationDetail extends ReconciliationSummary {
  summarySnapshot: ReconciliationSnapshot | null;
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
    alias: string | null;
    totalReconciliations: number;
    averageMatchPercentage: number;
  }>;
  recentReconciliations: Array<{
    id: number;
    name: string;
    bankName: string;
    alias: string | null;
    layoutName: string;
    matchPercentage: number;
    autoMatches: number;
    manualMatches: number;
    unmatchedSystem: number;
    unmatchedBank: number;
    createdAt: string;
  }>;
}
