import type {
  LayoutMapping,
  PreviewMatch,
  PreviewResponse,
  PreviewRow,
} from "../../types/conciliation";
import type {
  SapB1QueryPreviewResult,
  SapB1QueryTable,
  SapB1SmartMatch,
  SapErpSession,
} from "../../erp/sap";
import {
  formatAmountPyg,
  formatIsoToDdMmYyyy,
  parseLooseNumber,
  toIsoLoose,
} from "../../utils/format";

export type SmartMatch = SapB1SmartMatch;

export type MatchColumn = { fieldKey: string; label: string; dataType?: string };

type MatchRow = SmartMatch["systemRow"];

// Decide el tipo de una columna del matching: usa dataType si viene; si no,
// heuristica por nombre de fieldKey/label (sirve para el modo SAP_B1 por query).
function resolveMatchColumnType(column: MatchColumn): "amount" | "date" | "text" {
  const dt = column.dataType;
  if (dt === "amount" || dt === "number") return "amount";
  if (dt === "date") return "date";
  const key = `${column.fieldKey} ${column.label}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (/fecha|date|vencim/.test(key)) return "date";
  if (/debito|credito|debe|haber|monto|importe|saldo|amount|deb|cred/.test(key)) {
    return "amount";
  }
  return "text";
}

// Formatea una celda de la tabla de Resultados del matching segun el tipo:
// amount -> 5.500.200,233 ; date -> dd/mm/YYYY ; resto -> crudo.
export function formatMatchCell(row: MatchRow, column: MatchColumn): string {
  const raw = row.values[column.fieldKey];
  const normalized = row.normalized[column.fieldKey];
  if (raw == null || raw === "") return "-";

  const type = resolveMatchColumnType(column);
  if (type === "amount") {
    const num =
      typeof normalized === "number" ? normalized : parseLooseNumber(raw);
    return num !== null ? formatAmountPyg(num) : raw;
  }
  if (type === "date") {
    const iso =
      typeof normalized === "string" && /^\d{4}-\d{2}-\d{2}/.test(normalized)
        ? normalized
        : toIsoLoose(raw);
    return iso ? formatIsoToDdMmYyyy(iso) : raw;
  }
  return raw;
}

// Arma la matriz (cabecera + filas) para exportar la tabla de Resultados del
// matching a Excel. Usa el mismo formateo que se muestra en pantalla, y prefija
// cada columna con su grupo (Banco / Sistema) para no perder el contexto al
// aplanar las dos cabeceras de la tabla en una sola fila.
export function buildMatchesExportRows(
  matches: SmartMatch[],
  bankColumns: MatchColumn[],
  systemColumns: MatchColumn[]
): string[][] {
  const header = [
    ...bankColumns.map((c) => `Banco - ${c.label}`),
    ...systemColumns.map((c) => `Sistema (SAP) - ${c.label}`),
  ];
  const body = matches.map((match) => [
    ...bankColumns.map((c) => formatMatchCell(match.bankRow, c)),
    ...systemColumns.map((c) => formatMatchCell(match.systemRow, c)),
  ]);
  return [header, ...body];
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function formatQueryValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("es-PY");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
}

export function isSameSmartMatch(left: SmartMatch, right: SmartMatch) {
  return (
    left.systemRow.rowId === right.systemRow.rowId &&
    left.bankRow.rowId === right.bankRow.rowId
  );
}

export function convertPreviewMatchesToSmartMatches(
  preview: PreviewResponse,
  matches: PreviewMatch[],
  fieldKeys: string[]
): SmartMatch[] {
  const systemRowsById = new Map(preview.systemRows.map((row) => [row.rowId, row]));
  const bankRowsById = new Map(preview.bankRows.map((row) => [row.rowId, row]));

  return matches
    .map((match) => {
      const systemRow = systemRowsById.get(match.systemRowId);
      const bankRow = bankRowsById.get(match.bankRowId);
      if (!systemRow || !bankRow) return null;

      const rulePassed = (fieldKey: string | undefined) =>
        Boolean(fieldKey && match.ruleResults.find((rule) => rule.fieldKey === fieldKey)?.passed);
      const column1Match = rulePassed(fieldKeys[0]);
      const column2Match = rulePassed(fieldKeys[1]);
      const column3Match = rulePassed(fieldKeys[2]);

      return {
        systemRow,
        bankRow,
        score: match.score,
        column1Match,
        column2Match,
        column3Match,
        matchReason: column1Match ? "reference" : "date_amount",
        dateDifferenceDays: null,
      } as SmartMatch;
    })
    .filter((match): match is SmartMatch => match !== null);
}

export function convertSapB1TableToPreviewRows(table: SapB1QueryTable): PreviewRow[] {
  return table.rows.map((row, index) => {
    const values: Record<string, string | null> = {};
    const normalized: Record<string, string | number | null> = {};

    for (const col of table.columns) {
      const raw = row[col];
      const str = raw == null ? null : String(raw);
      values[col] = str;
      normalized[col] = str == null
        ? null
        : str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    }

    return {
      rowId: `sap-b1-${index}`,
      rowNumber: index + 1,
      values,
      normalized,
    };
  });
}

function normalizeColumnKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export function resolveSapB1ComparisonColumns(preview: SapB1QueryPreviewResult): string[] {
  const systemColumnsByKey = new Map(
    preview.system.columns.map((column) => [normalizeColumnKey(column), column])
  );
  const bankColumnsByKey = new Map(
    preview.bank.columns.map((column) => [normalizeColumnKey(column), column])
  );
  const lookup = (...keys: string[]): string | null => {
    for (const key of keys) {
      const found = bankColumnsByKey.get(key) ?? systemColumnsByKey.get(key);
      if (found) return found;
    }
    return null;
  };

  const reference = lookup("referencia", "reference", "ref");
  const fecha = lookup("fecha", "date");
  const debito = lookup("debito", "debitos", "debe", "debit", "importedebito");
  const credito = lookup("credito", "creditos", "haber", "credit", "importecredito");
  const monto = lookup("monto", "importe", "amount");

  const preferred: Array<string | null> = [reference, fecha];
  if (debito || credito) {
    preferred.push(debito, credito);
  } else if (monto) {
    preferred.push(monto);
  }
  const cleaned = preferred.filter((column): column is string => Boolean(column));
  if (cleaned.length >= 3) return cleaned;

  const commonColumns = preview.bank.columns.filter((column) =>
    systemColumnsByKey.has(normalizeColumnKey(column))
  );

  return (commonColumns.length > 0 ? commonColumns : preview.bank.columns).slice(0, 4);
}

export type ErpStatus = {
  label: string;
  title: string;
  detail: string;
  badgeClass: string;
  panelClass: string;
};

export function resolveErpStatus(session: SapErpSession | null): ErpStatus {
  if (!session) {
    return {
      label: "ERP sin validar",
      title: "Todavia no se valido la sesion ERP.",
      detail:
        "Presiona Validar para consultar si hay una sesion activa antes de conciliar.",
      badgeClass: "bg-slate-100 text-slate-600",
      panelClass: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (session.authenticated) {
    return {
      label: "ERP conectado",
      title: session.username
        ? `Sesion activa para ${session.username}.`
        : "Sesion ERP activa.",
      detail: session.lastValidatedAt
        ? `Validada el ${formatDateTime(session.lastValidatedAt)}.`
        : `Validada el ${formatDateTime(session.checkedAt)}.`,
      badgeClass: "bg-emerald-100 text-emerald-700",
      panelClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  const messages: Record<
    SapErpSession["status"],
    { title: string; detail: string }
  > = {
    active: {
      title: "Sesion ERP activa.",
      detail: "La sesion esta lista para conciliar.",
    },
    not_authenticated: {
      title: "No hay una sesion ERP activa.",
      detail: "Inicia sesion para poder conciliar sin salir de esta pantalla.",
    },
    expired: {
      title: "La sesion ERP expiro.",
      detail: "Inicia sesion nuevamente para poder conciliar.",
    },
    invalid: {
      title: "La sesion ERP no es valida.",
      detail: "Inicia sesion nuevamente para poder conciliar.",
    },
    logged_out: {
      title: "La sesion ERP esta cerrada.",
      detail: "Inicia sesion para poder conciliar.",
    },
  };

  const message = messages[session.status] ?? messages.not_authenticated;
  return {
    label: "ERP sin sesion",
    ...message,
    badgeClass: "bg-amber-100 text-amber-700",
    panelClass: "border-amber-200 bg-amber-50 text-amber-700",
  };
}
