import type { CompareOperator, LayoutDataType } from "../conciliation";
// Re-export for convenience
export type { CompareOperator, LayoutDataType } from "../conciliation";

export type MappingFormRow = {
  id: string;
  fieldKey: string;
  label: string;
  active: boolean;
  required: boolean;
  compareOperator: CompareOperator;
  weight: string;
  tolerance: string;
  sortOrder: string;
  systemSheet: string;
  systemColumn: string;
  systemStartRow: string;
  systemEndRow: string;
  systemDataType: LayoutDataType;
  bankSheet: string;
  bankColumn: string;
  bankStartRow: string;
  bankEndRow: string;
  bankDataType: LayoutDataType;
};

export type BankFormState = {
  bankName: string;
  alias: string;
  currency: string;
  accountNumber: string;
  description: string;
  active: boolean;
};

export type LayoutFormState = {
  name: string;
  description: string;
  systemLabel: string;
  bankLabel: string;
  autoMatchThreshold: string;
  active: boolean;
  mappings: MappingFormRow[];
};

export type TemplateLayoutFormState = LayoutFormState & {
  referenceBankName: string;
};

export const compareOperatorOptions: Array<{ value: CompareOperator; label: string }> = [
  { value: "equals", label: "Igual" },
  { value: "contains", label: "Contiene" },
  { value: "starts_with", label: "Empieza con" },
  { value: "ends_with", label: "Termina con" },
  { value: "numeric_equals", label: "Numero igual" },
  { value: "date_equals", label: "Fecha igual (+/- dias)" }
];

export const dataTypeOptions: Array<{ value: LayoutDataType; label: string }> = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Numero" },
  { value: "amount", label: "Monto" },
  { value: "date", label: "Fecha" }
];

export const defaultBankForm: BankFormState = {
  bankName: "",
  alias: "",
  currency: "GS",
  accountNumber: "",
  description: "",
  active: true
};
