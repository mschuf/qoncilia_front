import type { AmountMode, LayoutMapping, PreviewRow } from "../types/conciliation";
import { formatAmountPyg, formatIsoToDdMmYyyy } from "./format";

// Claves de la columna de importe UNICO (mismo set que el backend en
// resolveBankPageAmounts -> singleKeys). Si un mapeo de tipo importe usa una de
// estas claves, es la columna de "importe con signo" candidata a dividirse.
const SIGNED_SINGLE_FIELD_KEYS = ["monto", "importe", "amount"];

// Columna a mostrar en el preview del extracto. Puede ser un mapeo real ("raw")
// o una columna DERIVADA (debito/credito) cuando el modo de importe es 'signed'.
export type PreviewDisplayColumn = {
  // Clave estable para React y para leer la celda.
  key: string;
  label: string;
  // Mapeo de origen (define tipo de dato, fieldKey real y, en signed, la columna
  // con signo de la que se deriva debito/credito).
  mapping: LayoutMapping;
  variant: "raw" | "signed-debit" | "signed-credit";
};

function isSignedSingleAmountMapping(mapping: LayoutMapping): boolean {
  const isAmount =
    mapping.bankDataType === "amount" || mapping.bankDataType === "number";
  return (
    isAmount &&
    SIGNED_SINGLE_FIELD_KEYS.includes(mapping.fieldKey.trim().toLowerCase())
  );
}

// Arma las columnas a mostrar en el preview. En modo 'signed' la columna de
// importe unico (monto/importe/amount) se reemplaza, EN SU MISMA POSICION, por
// dos columnas derivadas: "Debito" (valores negativos) y "Credito" (positivos).
// El resto de columnas (incluido "Saldo", que es solo-vista) no se tocan. Para
// cualquier otro modo (debit_credit, single_*, null/auto) se devuelven los mapeos
// tal cual.
export function buildPreviewColumns(
  mappings: LayoutMapping[],
  amountMode: AmountMode | null
): PreviewDisplayColumn[] {
  if (amountMode !== "signed") {
    return mappings.map((mapping) => ({
      key: mapping.fieldKey,
      label: mapping.label,
      mapping,
      variant: "raw",
    }));
  }

  const columns: PreviewDisplayColumn[] = [];
  let alreadySplit = false;
  for (const mapping of mappings) {
    if (!alreadySplit && isSignedSingleAmountMapping(mapping)) {
      columns.push({
        key: `${mapping.fieldKey}__debito`,
        label: "Debito",
        mapping,
        variant: "signed-debit",
      });
      columns.push({
        key: `${mapping.fieldKey}__credito`,
        label: "Credito",
        mapping,
        variant: "signed-credit",
      });
      alreadySplit = true;
    } else {
      columns.push({
        key: mapping.fieldKey,
        label: mapping.label,
        mapping,
        variant: "raw",
      });
    }
  }
  return columns;
}

// Formatea el valor de una celda del preview segun la columna a mostrar.
// - signed-debit/credito: deriva del valor normalizado (numero con signo) de la
//   columna de importe unico, con la MISMA regla del backend (>= 0 -> credito,
//   < 0 -> debito). El lado que no corresponde queda en "-".
// - raw: importe/numero -> miles con 3 decimales; date -> dd/mm/YYYY; resto crudo.
export function formatPreviewCell(
  row: PreviewRow,
  column: PreviewDisplayColumn
): string {
  if (column.variant === "signed-debit" || column.variant === "signed-credit") {
    const value = row.normalized[column.mapping.fieldKey];
    if (typeof value === "number" && Number.isFinite(value)) {
      if (column.variant === "signed-debit") {
        return value < 0 ? formatAmountPyg(Math.abs(value)) : "-";
      }
      return value > 0 ? formatAmountPyg(value) : "-";
    }
    // Sin valor numerico normalizado no se puede separar por signo.
    return "-";
  }

  return formatRawCell(row, column.mapping);
}

// Formateo "crudo" de una celda por su tipo de dato de banco. Igual que el
// formatCell historico del preview de extractos.
function formatRawCell(row: PreviewRow, column: LayoutMapping): string {
  const raw = row.values[column.fieldKey];
  const normalized = row.normalized[column.fieldKey];

  switch (column.bankDataType) {
    case "amount":
    case "number":
      if (typeof normalized === "number" && Number.isFinite(normalized)) {
        return formatAmountPyg(normalized);
      }
      return raw ?? "-";
    case "date":
      if (
        typeof normalized === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(normalized)
      ) {
        return formatIsoToDdMmYyyy(normalized);
      }
      return raw ?? "-";
    default:
      return raw ?? "-";
  }
}
