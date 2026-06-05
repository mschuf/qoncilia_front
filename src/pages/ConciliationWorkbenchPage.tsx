import { memo, useEffect, useMemo, useState } from "react";
import {
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiUploadCloud,
  FiX,
  FiArrowDown,
} from "react-icons/fi";
import MatchesSection from "../components/ConciliationWorkbench/MatchesSection";
import {
  Metric,
  SelectBlock,
  UploadCard,
} from "../components/ConciliationWorkbench/WorkbenchControls";
import useConciliationWorkbench from "../hooks/useConciliationWorkbench";
import type { BankStatementSummary, LayoutMapping, PreviewRow } from "../types/conciliation";
import type {
  SapB1QueryPreviewResult,
  SapB1QueryTable,
  SapErpSession,
} from "../erp/sap";
import { isAdminRole, isSuperAdminRole } from "../utils/role";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

interface SmartMatch {
  systemRow: PreviewRow;
  bankRow: PreviewRow;
  score: number;
  column1Match: boolean;
  column2Match: boolean;
  column3Match: boolean;
  matchReason: "reference" | "date_amount" | "manual";
  dateDifferenceDays: number | null;
}

const SAP_B1_DATE_TOLERANCE_DAYS = 7;

function getRowValue(row: PreviewRow, fieldKey: string | undefined): string | number | null {
  if (!fieldKey) return null;
  return row.normalized[fieldKey] ?? row.values[fieldKey] ?? null;
}

function getRowRawValue(row: PreviewRow, fieldKey: string | undefined): string | number | null {
  if (!fieldKey) return null;
  return row.values[fieldKey] ?? row.normalized[fieldKey] ?? null;
}

function normalizeComparableText(value: string | number | null): string | null {
  if (value == null) return null;
  const text = String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return text || null;
}

function exactMatch(a: string | number | null, b: string | number | null): boolean {
  const sa = normalizeComparableText(a);
  const sb = normalizeComparableText(b);
  if (!sa || !sb) return false;
  return sa === sb;
}

function normalizeNumericText(value: string) {
  if (!value) return null;

  const sign = value.startsWith("-") ? "-" : value.startsWith("+") ? "+" : "";
  const unsigned = value.replace(/^[-+]/, "");
  const lastDot = unsigned.lastIndexOf(".");
  const lastComma = unsigned.lastIndexOf(",");

  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSeparator = lastDot > lastComma ? "." : ",";
    const thousandsSeparator = decimalSeparator === "." ? "," : ".";
    return `${sign}${unsigned
      .replace(new RegExp(`\\${thousandsSeparator}`, "g"), "")
      .replace(decimalSeparator, ".")}`;
  }

  if (lastComma >= 0) {
    const groups = unsigned.split(",");
    const isThousandsOnly =
      groups.length > 1 && groups.slice(1).every((group) => group.length === 3);
    return `${sign}${isThousandsOnly ? groups.join("") : unsigned.replace(",", ".")}`;
  }

  if (lastDot >= 0) {
    const groups = unsigned.split(".");
    const isThousandsOnly =
      groups.length > 1 && groups.slice(1).every((group) => group.length === 3);
    return `${sign}${isThousandsOnly ? groups.join("") : unsigned}`;
  }

  return `${sign}${unsigned}`;
}

function parseAmountValue(value: string | number | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null) return null;

  const text = String(value).trim();
  if (!text || text === "-") return null;

  const cleaned = text
    .replace(/[A-Za-z$%]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^\d,.\-+]/g, "");
  const normalized = normalizeNumericText(cleaned);
  if (!normalized || !/^[-+]?\d+(\.\d+)?$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountMatch(a: string | number | null, b: string | number | null): boolean {
  const left = parseAmountValue(a);
  const right = parseAmountValue(b);
  if (left === null || right === null) return exactMatch(a, b);
  return Math.abs(left - right) < 0.0001;
}

function parseDateDayNumber(value: string | number | null) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return buildUtcDayNumber(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const slashMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if (slashMatch) {
    let year = Number(slashMatch[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return buildUtcDayNumber(year, Number(slashMatch[2]), Number(slashMatch[1]));
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 86400000);
}

function buildUtcDayNumber(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(date.getTime() / 86400000);
}

function dateMatchWithinDays(
  a: string | number | null,
  b: string | number | null,
  toleranceDays: number
) {
  const left = parseDateDayNumber(a);
  const right = parseDateDayNumber(b);
  if (left === null || right === null) {
    return {
      matched: exactMatch(a, b),
      differenceDays: null,
    };
  }

  const differenceDays = Math.abs(left - right);
  return {
    matched: differenceDays <= toleranceDays,
    differenceDays,
  };
}

function calculateSmartMatches(
  systemRows: PreviewRow[],
  bankRows: PreviewRow[],
  fieldKeys: string[]
): SmartMatch[] {
  const keys = fieldKeys.slice(0, 3);
  if (keys.length === 0) return [];

  const col1 = keys[0];
  const col2 = keys[1];
  const col3 = keys[2];

  const matches: SmartMatch[] = [];
  const usedBankRows = new Set<string>();

  for (const sysRow of systemRows) {
    const candidates = bankRows
      .filter((bankRow) => !usedBankRows.has(bankRow.rowId))
      .map((bankRow) => {
        const referenceMatched = exactMatch(getRowValue(sysRow, col1), getRowValue(bankRow, col1));
        const dateResult = col2
          ? dateMatchWithinDays(
              getRowRawValue(sysRow, col2),
              getRowRawValue(bankRow, col2),
              SAP_B1_DATE_TOLERANCE_DAYS
            )
          : { matched: false, differenceDays: null };
        const amountMatched = col3
          ? amountMatch(getRowRawValue(sysRow, col3), getRowRawValue(bankRow, col3))
          : false;
        const matchReason: SmartMatch["matchReason"] | null = referenceMatched
          ? "reference"
          : dateResult.matched && amountMatched
            ? "date_amount"
            : null;

        if (!matchReason) return null;

        return {
          bankRow,
          score: matchReason === "reference" ? 1 : 0.95,
          column1Match: referenceMatched,
          column2Match: dateResult.matched,
          column3Match: amountMatched,
          matchReason,
          dateDifferenceDays: dateResult.differenceDays,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => {
        if (left.matchReason !== right.matchReason) {
          return left.matchReason === "reference" ? -1 : 1;
        }
        if (left.score !== right.score) return right.score - left.score;

        const leftDateDiff = left.dateDifferenceDays ?? Number.MAX_SAFE_INTEGER;
        const rightDateDiff = right.dateDifferenceDays ?? Number.MAX_SAFE_INTEGER;
        return leftDateDiff - rightDateDiff;
      });

    const chosen = candidates[0];
    if (!chosen) continue;
    usedBankRows.add(chosen.bankRow.rowId);

    matches.push({
      systemRow: sysRow,
      bankRow: chosen.bankRow,
      score: chosen.score,
      column1Match: chosen.column1Match,
      column2Match: chosen.column2Match,
      column3Match: chosen.column3Match,
      matchReason: chosen.matchReason,
      dateDifferenceDays: chosen.dateDifferenceDays,
    });
  }

  return matches;
}

function isSameSmartMatch(left: SmartMatch, right: SmartMatch) {
  return (
    left.systemRow.rowId === right.systemRow.rowId &&
    left.bankRow.rowId === right.bankRow.rowId
  );
}

function convertSapB1TableToPreviewRows(table: SapB1QueryTable): PreviewRow[] {
  return table.rows.map((row, index) => {
    const values: Record<string, string | null> = {};
    const normalized: Record<string, string | number | null> = {};

    for (const col of table.columns) {
      const raw = row[col];
      const str = raw == null ? null : String(raw);
      values[col] = str;
      normalized[col] = str == null
        ? null
        : str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function resolveSapB1ComparisonColumns(preview: SapB1QueryPreviewResult): string[] {
  const systemColumnsByKey = new Map(
    preview.system.columns.map((column) => [normalizeColumnKey(column), column])
  );
  const bankColumnsByKey = new Map(
    preview.bank.columns.map((column) => [normalizeColumnKey(column), column])
  );
  const preferredKeys = ["referencia", "fecha", "monto"];
  const preferredColumns = preferredKeys
    .map((key) => bankColumnsByKey.get(key) ?? systemColumnsByKey.get(key) ?? null)
    .filter((column): column is string => Boolean(column));

  if (preferredColumns.length === 3) return preferredColumns;

  const commonColumns = preview.bank.columns.filter((column) =>
    systemColumnsByKey.has(normalizeColumnKey(column))
  );

  return (commonColumns.length > 0 ? commonColumns : preview.bank.columns).slice(0, 3);
}

function resolveErpStatus(session: SapErpSession | null) {
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
      detail: "Inicia sesion desde Configurar ERP y luego vuelve a validar.",
    },
    expired: {
      title: "La sesion ERP expiro.",
      detail: "Inicia sesion nuevamente desde Configurar ERP.",
    },
    invalid: {
      title: "La sesion ERP no es valida.",
      detail: "Inicia sesion nuevamente desde Configurar ERP.",
    },
    logged_out: {
      title: "La sesion ERP esta cerrada.",
      detail: "Inicia sesion desde Configurar ERP para poder conciliar.",
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

export default function ConciliationWorkbenchPage() {
  const {
    role,
    users,
    selectedUserId,
    setSelectedUserId,
    banks,
    selectedBankId,
    setSelectedBankId,
    accounts,
    selectedCompanyBankAccountId,
    setSelectedCompanyBankAccountId,
    selectedLayout,
    bankStatements,
    selectedBankStatementId,
    setSelectedBankStatementId,
    selectedBankStatement,
    systemFile,
    setSystemFile,
    erpConfigs,
    selectedErpConfig,
    selectedErpConfigId,
    setSelectedErpConfigId,
    erpSession,
    checkErpSession,
    isSapB1QueryMode,
    sapB1QueryPreview,
    isRunningSapB1Queries,
    runSapB1QueryPreview,
    isSendingExternalReconciliation,
    preview,
    manualMatches,
    unmatchedSystemRows,
    unmatchedBankRows,
    metrics,
    onFileChange,
    runComparison,
    onDragEnd,
    removeAutoMatch,
    removeManualMatch,
    sendExternalReconciliationToErp,
    sendSapB1QueryMatchesToErp,
    clearAll,
    searchBankStatements,
    loadCatalog,
    isLoadingCatalog,
    page,
    goToPage,
    pageSize,
    totalPages,
    totalStatements,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchTerm,
    setSearchTerm,
  } = useConciliationWorkbench();

  const bankLabel =
    preview?.layout.bankLabel ?? selectedLayout?.bankLabel ?? "Banco";
  const systemLabel =
    preview?.layout.systemLabel ?? selectedLayout?.systemLabel ?? "Sistema";
  const erpStatus = resolveErpStatus(erpSession);
  const [isErpPanelOpen, setIsErpPanelOpen] = useState(false);
  const [smartMatches, setSmartMatches] = useState<SmartMatch[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [sapB1SmartMatches, setSapB1SmartMatches] = useState<SmartMatch[]>([]);
  const [showSapB1Comparison, setShowSapB1Comparison] = useState(false);
  const [selectedSapB1BankRowIndex, setSelectedSapB1BankRowIndex] = useState<number | null>(null);
  const [selectedSapB1SystemRowIndex, setSelectedSapB1SystemRowIndex] = useState<number | null>(null);
  const sapB1ComparisonColumns = useMemo(
    () => (sapB1QueryPreview ? resolveSapB1ComparisonColumns(sapB1QueryPreview) : []),
    [sapB1QueryPreview]
  );

  useEffect(() => {
    if (!preview || !selectedLayout) {
      setSmartMatches([]);
      setShowComparison(false);
      return;
    }

    const fieldKeys = selectedLayout.mappings
      .filter((m) => m.active)
      .map((m) => m.fieldKey)
      .slice(0, 3);
    const matches = calculateSmartMatches(
      preview.systemRows,
      preview.bankRows,
      fieldKeys
    );
    setSmartMatches(matches);
    setShowComparison(true);
  }, [preview?.bankRows, preview?.systemRows, selectedLayout]);

  const handleSearch = async () => {
    if (isSuperAdminRole(role) && banks.length === 0) {
      await loadCatalog(selectedUserId);
    }
    if (isSapB1QueryMode) {
      await runSapB1QueryPreview();
      return;
    }
    searchBankStatements();
  };
  const matchedCount = preview
    ? preview.autoMatches.length + manualMatches.length
    : 0;
  const canSendExternalReconciliation = isAdminRole(role);
  const isExternalReconciliationPanelVisible = Boolean(preview && metrics);
  const externalReconciliationPendingInfo = [
    unmatchedSystemRows.length > 0
      ? `Quedan ${unmatchedSystemRows.length} filas pendientes del sistema.`
      : null,
    unmatchedBankRows.length > 0
      ? `Quedan ${unmatchedBankRows.length} filas pendientes del banco.`
      : null,
  ].filter(Boolean) as string[];
  const externalReconciliationBlockers = [
    !preview
      ? "El panel/boton no se muestra porque todavia no hay resultado de comparacion."
      : null,
    preview && !metrics
      ? "El panel/boton no se muestra porque todavia no hay metricas de comparacion."
      : null,
    !selectedErpConfigId ? "No hay ERP seleccionado." : null,
    isSendingExternalReconciliation
      ? "Se esta enviando la conciliacion."
      : null,
    !erpSession?.authenticated ? "La sesion ERP no esta autenticada." : null,
    matchedCount === 0 ? "No hay coincidencias conciliadas." : null,
    !canSendExternalReconciliation
      ? `El rol actual (${role ?? "sin rol"}) no puede enviar conciliaciones al ERP.`
      : null,
  ].filter(Boolean) as string[];
  const externalReconciliationBlockersText =
    externalReconciliationBlockers.join(" | ") || "Sin bloqueos";
  const externalReconciliationPendingInfoText =
    externalReconciliationPendingInfo.join(" | ") ||
    "Sin pendientes fuera del envio";
  const isExternalReconciliationDisabled =
    externalReconciliationBlockers.length > 0;
  const sapB1ExternalReconciliationBlockers = [
    !showSapB1Comparison ? "Primero compara las consultas SAP_B1." : null,
    sapB1SmartMatches.length === 0 ? "No hay coincidencias para conciliar." : null,
    !selectedErpConfigId ? "No hay ERP seleccionado." : null,
    isSendingExternalReconciliation ? "Se esta enviando la conciliacion." : null,
    !erpSession?.authenticated ? "La sesion ERP no esta autenticada." : null,
    !canSendExternalReconciliation
      ? `El rol actual (${role ?? "sin rol"}) no puede enviar conciliaciones al ERP.`
      : null,
  ].filter(Boolean) as string[];
  const isSapB1ExternalReconciliationDisabled =
    sapB1ExternalReconciliationBlockers.length > 0;
  const removeSmartMatchFromTable = (target: SmartMatch) => {
    setSmartMatches((current) =>
      current.filter((item) => !isSameSmartMatch(item, target))
    );
  };
  const handleRemoveAutoMatch = (match: {
    systemRowId: string;
    bankRowId: string;
  }) => {
    const autoMatch = preview?.autoMatches.find(
      (item) =>
        item.systemRowId === match.systemRowId &&
        item.bankRowId === match.bankRowId
    );
    if (autoMatch) {
      removeAutoMatch(autoMatch);
    }
    setSmartMatches((current) =>
      current.filter(
        (item) =>
          item.systemRow.rowId !== match.systemRowId ||
          item.bankRow.rowId !== match.bankRowId
      )
    );
  };
  const handleRemoveSmartMatch = (target: SmartMatch) => {
    handleRemoveAutoMatch({
      systemRowId: target.systemRow.rowId,
      bankRowId: target.bankRow.rowId,
    });
    removeSmartMatchFromTable(target);
  };
  const handleRemoveSapB1SmartMatch = (target: SmartMatch) => {
    setSapB1SmartMatches((current) =>
      current.filter((item) => !isSameSmartMatch(item, target))
    );
  };

  useEffect(() => {
    if (!preview) return;

    console.groupCollapsed(
      `[Qoncilia] Boton Conciliar ERP ${
        isExternalReconciliationDisabled ? "deshabilitado" : "habilitado"
      }`,
    );
    console.table({
      panelVisible: isExternalReconciliationPanelVisible,
      disabled: isExternalReconciliationDisabled,
      blockers: externalReconciliationBlockersText,
      pendingInfo: externalReconciliationPendingInfoText,
      role,
      canSendExternalReconciliation,
      erpAuthenticated: Boolean(erpSession?.authenticated),
      erpStatus: erpSession?.status ?? "sin sesion",
      selectedErpConfigId,
      erpConfigsCount: erpConfigs.length,
      matchedCount,
      autoMatches: preview.autoMatches.length,
      manualMatches: manualMatches.length,
      pendingSystemRows: unmatchedSystemRows.length,
      pendingBankRows: unmatchedBankRows.length,
      selectedBankStatementId,
      selectedCompanyBankAccountId,
      selectedLayout: selectedLayout?.name ?? "sin plantilla",
    });
    console.groupEnd();
  }, [
    canSendExternalReconciliation,
    erpConfigs.length,
    erpSession?.authenticated,
    erpSession?.status,
    externalReconciliationBlockersText,
    externalReconciliationPendingInfoText,
    isExternalReconciliationPanelVisible,
    isExternalReconciliationDisabled,
    manualMatches.length,
    matchedCount,
    preview,
    role,
    selectedBankStatementId,
    selectedCompanyBankAccountId,
    selectedErpConfigId,
    selectedLayout?.name,
    unmatchedBankRows.length,
    unmatchedSystemRows.length,
  ]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Conciliacion bancaria
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
          Conciliar extracto bancario
        </h1>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1fr)_auto]">
          {isSuperAdminRole(role) ? (
            <SelectBlock
              label="Usuario"
              value={selectedUserId}
              onChange={(value) => setSelectedUserId(Number(value))}
              options={users.map((item) => ({
                value: Number(item.id),
                label: `${item.usrLogin}${item.usrNombre ? ` - ${item.usrNombre}` : ""}`,
              }))}
            />
          ) : null}

          <SelectBlock
            label="Banco"
            value={selectedBankId}
            onChange={(value) => setSelectedBankId(Number(value))}
            options={banks.map((item) => ({
              value: item.id,
              label: item.bankName,
            }))}
            disabled={banks.length === 0}
          />

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">
              Cuenta bancaria
            </span>
            <select
              value={selectedCompanyBankAccountId}
              onChange={(event) =>
                setSelectedCompanyBankAccountId(Number(event.target.value))
              }
              disabled={accounts.length === 0}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {accounts.length === 0 ? (
                <option value={0}>Sin cuentas para este banco</option>
              ) : null}
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.accountNumber} ({account.currency})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Desde</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Hasta</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoadingCatalog || isRunningSapB1Queries}
              aria-label={
                isSapB1QueryMode ? "Ejecutar consultas" : "Buscar extractos"
              }
              title={
                isSapB1QueryMode ? "Ejecutar consultas" : "Buscar extractos"
              }
              className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSearch className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {isSapB1QueryMode ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              {sapB1QueryPreview ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                  {sapB1QueryPreview.accountCode}
                </span>
              ) : null}
            </div>

            {isRunningSapB1Queries ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Ejecutando consultas...
              </div>
            ) : sapB1QueryPreview ? (
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <SapB1QueryTableView 
                  title="Query banco" 
                  table={sapB1QueryPreview.bank} 
                  selectedRowIndex={selectedSapB1BankRowIndex}
                  onSelectRow={setSelectedSapB1BankRowIndex}
                  matchedIndices={new Set(sapB1SmartMatches.map(m => m.bankRow.rowNumber - 1))}
                />
                <SapB1QueryTableView 
                  title="Query sistema" 
                  table={sapB1QueryPreview.system} 
                  selectedRowIndex={selectedSapB1SystemRowIndex}
                  onSelectRow={setSelectedSapB1SystemRowIndex}
                  matchedIndices={new Set(sapB1SmartMatches.map(m => m.systemRow.rowNumber - 1))}
                />
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Selecciona cuenta, fechas y pulsa buscar para ejecutar las consultas.
              </div>
            )}

            {sapB1QueryPreview ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSapB1Comparison(false);
                    setSapB1SmartMatches([]);
                    setSelectedSapB1BankRowIndex(null);
                    setSelectedSapB1SystemRowIndex(null);
                  }}
                  disabled={!showSapB1Comparison}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiRefreshCw className="h-4 w-4" /> Limpiar
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    title="Match Manual"
                    onClick={() => {
                      if (!sapB1QueryPreview || selectedSapB1BankRowIndex === null || selectedSapB1SystemRowIndex === null) return;
                      const bankRows = convertSapB1TableToPreviewRows(sapB1QueryPreview.bank);
                      const systemRows = convertSapB1TableToPreviewRows(sapB1QueryPreview.system);
                      
                      const bankRow = bankRows[selectedSapB1BankRowIndex];
                      const systemRow = systemRows[selectedSapB1SystemRowIndex];
                      
                      const manualMatch: SmartMatch = {
                        systemRow,
                        bankRow,
                        score: 1,
                        column1Match: true,
                        column2Match: true,
                        column3Match: true,
                        matchReason: "manual",
                        dateDifferenceDays: null,
                      };
                      
                      setSapB1SmartMatches(prev => [...prev, manualMatch]);
                      setShowSapB1Comparison(true);
                      setSelectedSapB1BankRowIndex(null);
                      setSelectedSapB1SystemRowIndex(null);
                    }}
                    disabled={selectedSapB1BankRowIndex === null || selectedSapB1SystemRowIndex === null}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiArrowDown className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!sapB1QueryPreview) return;
                      const bankRows = convertSapB1TableToPreviewRows(sapB1QueryPreview.bank);
                      const systemRows = convertSapB1TableToPreviewRows(sapB1QueryPreview.system);
                      const matchedBankRowIds = new Set(sapB1SmartMatches.map(m => m.bankRow.rowId));
                      const matchedSystemRowIds = new Set(sapB1SmartMatches.map(m => m.systemRow.rowId));
                      
                      const pendingBankRows = bankRows.filter(r => !matchedBankRowIds.has(r.rowId));
                      const pendingSystemRows = systemRows.filter(r => !matchedSystemRowIds.has(r.rowId));

                      const matches = calculateSmartMatches(
                        pendingSystemRows,
                        pendingBankRows,
                        sapB1ComparisonColumns
                      );
                      setSapB1SmartMatches(prev => [...prev, ...matches]);
                      setShowSapB1Comparison(true);
                    }}
                    disabled={!sapB1QueryPreview || sapB1QueryPreview.bank.rows.length === 0 || sapB1QueryPreview.system.rows.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiUploadCloud className="h-4 w-4" /> Comparar
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {showSapB1Comparison && sapB1QueryPreview ? (
            <>
              <SmartMatchesTable
                matches={sapB1SmartMatches}
                columns={sapB1ComparisonColumns.map((col) => ({ fieldKey: col, label: col }))}
                onRemove={handleRemoveSapB1SmartMatch}
              />
              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Envio ERP
                    </p>
                    <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                      Conciliacion externa SAP B1
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Se enviaran {sapB1SmartMatches.length} coincidencias a
                      ExternalReconciliationsService_Reconcile.
                    </p>
                    {isSapB1ExternalReconciliationDisabled && sapB1ExternalReconciliationBlockers.length > 0 ? (
                      <p className="mt-2 text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg inline-block">
                        {sapB1ExternalReconciliationBlockers.join(" • ")}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const success = await sendSapB1QueryMatchesToErp(sapB1SmartMatches);
                      if (success) {
                        setSapB1SmartMatches([]);
                        setShowSapB1Comparison(false);
                        setSelectedSapB1BankRowIndex(null);
                        setSelectedSapB1SystemRowIndex(null);
                        await runSapB1QueryPreview();
                      }
                    }}
                    disabled={isSapB1ExternalReconciliationDisabled}
                    className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiSend className="h-4 w-4" />
                    {isSendingExternalReconciliation ? "Conciliando..." : "Conciliar"}
                  </button>
                </div>
              </section>
            </>
          ) : null}
        </>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Extractos encontrados
                  </p>
                  <h3 className="mt-2 text-lg font-extrabold text-center text-slate-900">
                    Elige el extracto bancario para comparar
                  </h3>
                </div>
                {selectedBankStatement ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                    {selectedBankStatement.rowCount} filas
                  </span>
                ) : null}
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2">Banco y Cuenta</th>
                        <th className="px-3 py-2">Alias del Extracto</th>
                        <th className="px-3 py-2 text-right">Seleccionar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankStatements.map((statement) => (
                        <StatementRow
                          key={statement.id}
                          statement={statement}
                          selected={statement.id === selectedBankStatementId}
                          onSelect={setSelectedBankStatementId}
                        />
                      ))}
                      {bankStatements.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-sm text-slate-500"
                          >
                            No hay extractos guardados para los filtros elegidos.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <span>
                  Página <span className="font-semibold">{page}</span> de{" "}
                  <span className="font-semibold">{totalPages}</span>
                  {totalStatements > 0 ? (
                    <>
                      {" "}
                      · <span className="font-semibold">
                        {totalStatements}
                      </span>{" "}
                      extractos
                    </>
                  ) : null}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowComparison(false);
                    setSmartMatches([]);
                  }}
                  disabled={!showComparison}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiRefreshCw className="h-4 w-4" /> Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => void runComparison()}
                  disabled={!selectedBankStatementId || !systemFile}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiUploadCloud className="h-4 w-4" /> Comparar
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="space-y-4">
                <UploadCard
                  title={`Excel del ${systemLabel}`}
                  file={systemFile}
                  onChange={onFileChange(setSystemFile)}
                  onClear={() => setSystemFile(null)}
                />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Extracto seleccionado
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedBankStatement?.name ?? "Selecciona un extracto"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedBankStatement
                      ? `${bankLabel}: ${selectedBankStatement.fileName}`
                      : "Busca y elige un extracto bancario guardado para habilitar la comparacion."}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {showComparison && preview && selectedLayout ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <DataTable
                  title={bankLabel}
                  rows={preview.bankRows}
                  mappings={selectedLayout.mappings}
                />
                <DataTable
                  title={systemLabel}
                  rows={preview.systemRows}
                  mappings={selectedLayout.mappings}
                />
              </div>
              <SmartMatchesTable
                matches={smartMatches}
                columns={selectedLayout.mappings
                  .filter((m) => m.active)
                  .slice(0, 3)
                  .map((m) => ({ fieldKey: m.fieldKey, label: m.label }))}
                onRemove={handleRemoveSmartMatch}
              />
            </>
          ) : null}
        </>
      )}

      {!isSapB1QueryMode && preview && metrics ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Envio ERP
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                  Conciliacion externa SAP B1
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Se enviaran {matchedCount} coincidencias a
                  ExternalReconciliationsService_Reconcile.
                  {externalReconciliationPendingInfo.length > 0
                    ? " Las filas pendientes no se enviaran al ERP."
                    : ""}
                  {!canSendExternalReconciliation
                    ? " Disponible solo para admin y superadmin."
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <button
                  type="button"
                  onClick={() => void sendExternalReconciliationToErp()}
                  disabled={isExternalReconciliationDisabled}
                  className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiSend className="h-4 w-4" />
                  {isSendingExternalReconciliation
                    ? "Conciliando..."
                    : "Conciliar"}
                </button>
              </div>
            </div>
          </section>

          <MatchesSection
            preview={preview}
            manualMatches={manualMatches}
            unmatchedSystemRows={unmatchedSystemRows}
            unmatchedBankRows={unmatchedBankRows}
            onDragEnd={onDragEnd}
            onRemoveAutoMatch={handleRemoveAutoMatch}
            onRemoveManualMatch={removeManualMatch}
          />

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <Metric
              label={systemLabel}
              value={String(metrics.totalSystemRows)}
            />
            <Metric label={bankLabel} value={String(metrics.totalBankRows)} />
            <Metric
              label="Auto"
              value={String(metrics.autoMatches)}
              tone="emerald"
            />
            <Metric
              label="Manual"
              value={String(metrics.manualMatches)}
              tone="amber"
            />
            <Metric
              label="Pend. sistema"
              value={String(metrics.unmatchedSystem)}
              tone="rose"
            />
            <Metric
              label="Pend. banco"
              value={String(metrics.unmatchedBank)}
              tone="amber"
            />
            <Metric label="Match %" value={`${metrics.matchPercentage}%`} />
          </div>
        </>
      ) : null}

      {/* ERP Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {isErpPanelOpen ? (
          <div className="w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                ERP
              </p>
              <button
                type="button"
                onClick={() => setIsErpPanelOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
            <select
              value={selectedErpConfigId}
              onChange={(event) =>
                setSelectedErpConfigId(Number(event.target.value))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {erpConfigs.length === 0 ? (
                <option value={0}>Sin ERPs activas</option>
              ) : null}
              {erpConfigs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name} - {config.dbName ?? config.code}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-xs font-bold ${erpStatus.badgeClass}`}
              >
                {erpStatus.label}
              </span>
              <button
                type="button"
                onClick={() => void checkErpSession(true)}
                disabled={!selectedErpConfigId}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <FiRefreshCw className="h-3.5 w-3.5" /> Validar
              </button>
            </div>
            <div
              className={`mt-2 rounded-xl border px-3 py-2 text-xs ${erpStatus.panelClass}`}
            >
              <p className="font-bold">{erpStatus.title}</p>
              <p className="mt-0.5 text-[11px]">{erpStatus.detail}</p>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setIsErpPanelOpen((current) => !current)}
          title="ERP"
          className={`inline-flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition hover:scale-105 ${
            erpSession?.authenticated
              ? "bg-emerald-600 text-white shadow-emerald-600/30"
              : "bg-slate-900 text-white shadow-slate-900/30"
          }`}
        >
          <FiRefreshCw className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}

function SapB1QueryTableView({
  title,
  table,
  selectedRowIndex,
  onSelectRow,
  matchedIndices,
}: {
  title: string;
  table: SapB1QueryTable;
  selectedRowIndex?: number | null;
  onSelectRow?: (index: number | null) => void;
  matchedIndices?: Set<number>;
}) {
  const columns = table.columns.slice(0, 12);
  const hasSelection = onSelectRow !== undefined;

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {table.rows.length} filas
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                {hasSelection ? <th className="px-3 py-2 w-10"></th> : null}
                {columns.map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-2">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => {
                const isMatched = matchedIndices?.has(index);
                const isSelected = selectedRowIndex === index;
                return (
                  <tr
                    key={index}
                    className={`border-t border-slate-100 ${
                      isMatched
                        ? "bg-slate-50 opacity-50 cursor-not-allowed"
                        : isSelected
                          ? "bg-brand-50"
                          : hasSelection ? "text-slate-700 cursor-pointer hover:bg-slate-50" : "text-slate-700"
                    }`}
                    onClick={() => {
                      if (hasSelection && !isMatched) {
                        onSelectRow(isSelected ? null : index);
                      }
                    }}
                  >
                    {hasSelection ? (
                      <td className="px-3 py-2 w-10 text-center">
                        <input
                          type="radio"
                          checked={isSelected}
                          disabled={isMatched}
                          readOnly
                          className="cursor-pointer"
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={column} className="whitespace-nowrap px-3 py-2">
                        {formatQueryValue(row[column])}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {table.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length + (hasSelection ? 1 : 0), 1)}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    La consulta no devolvio filas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      {table.columns.length > columns.length ? (
        <p className="mt-2 text-xs text-slate-500">
          Mostrando las primeras {columns.length} columnas de{" "}
          {table.columns.length}.
        </p>
      ) : null}
    </div>
  );
}

function formatQueryValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("es-PY");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
}

function DataTable({
  title,
  rows,
  mappings,
}: {
  title: string;
  rows: PreviewRow[];
  mappings: LayoutMapping[];
}) {
  const activeMappings = mappings.filter((m) => m.active);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {rows.length} filas
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                {activeMappings.map((m) => (
                  <th key={m.fieldKey} className="whitespace-nowrap px-3 py-2">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.rowId}
                  className="border-t border-slate-100 text-slate-700"
                >
                  {activeMappings.map((m) => (
                    <td
                      key={m.fieldKey}
                      className="whitespace-nowrap px-3 py-2"
                    >
                      {row.values[m.fieldKey] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(activeMappings.length, 1)}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Sin filas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

type MatchColumn = { fieldKey: string; label: string };

function SmartMatchesTable({
  matches,
  columns,
  onRemove,
}: {
  matches: SmartMatch[];
  columns: MatchColumn[];
  onRemove?: (match: SmartMatch) => void;
}) {
  const visibleColumns = columns.slice(0, 3);
  const hasActions = Boolean(onRemove);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-slate-900">
          Resultados del matching
        </h3>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
          {matches.length} coincidencias
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2 text-center text-slate-400" colSpan={visibleColumns.length}>
                  Sistema
                </th>
                <th className="px-3 py-2 text-center text-slate-400" colSpan={visibleColumns.length}>
                  Banco
                </th>
                <th className="px-3 py-2">Regla</th>
                <th className="px-3 py-2 text-right">Score</th>
                {hasActions ? <th className="px-3 py-2" /> : null}
              </tr>
              <tr>
                {visibleColumns.map((c) => (
                  <th key={`sys-${c.fieldKey}`} className="px-3 py-2">
                    {c.label}
                  </th>
                ))}
                {visibleColumns.map((c) => (
                  <th key={`bank-${c.fieldKey}`} className="px-3 py-2">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2 text-right">%</th>
                {hasActions ? <th className="px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {matches.map((match, idx) => (
                <tr
                  key={idx}
                  className="border-t border-slate-100 text-slate-700"
                >
                  {visibleColumns.map((c) => (
                    <td
                      key={`sys-${c.fieldKey}`}
                      className="px-3 py-2 whitespace-nowrap"
                    >
                      {match.systemRow.values[c.fieldKey] ?? "-"}
                    </td>
                  ))}
                  {visibleColumns.map((c) => (
                    <td
                      key={`bank-${c.fieldKey}`}
                      className="px-3 py-2 whitespace-nowrap"
                    >
                      {match.bankRow.values[c.fieldKey] ?? "-"}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-slate-600">
                    {match.matchReason === "reference"
                      ? "Referencia"
                      : match.matchReason === "manual"
                        ? "Manual"
                        : match.dateDifferenceDays === null
                          ? "Fecha + monto"
                          : `Fecha +/- ${match.dateDifferenceDays}d + monto`}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">
                    {Math.round(match.score * 100)}%
                  </td>
                  {hasActions ? (
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove?.(match)}
                        aria-label="Quitar coincidencia"
                        title="Quitar coincidencia"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {matches.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length * 2 + 2 + (hasActions ? 1 : 0)}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No se encontraron coincidencias con las reglas actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// Memoized para evitar re-render de filas al cambiar filtros/paginacion sin
// que las props de la fila cambien.
const StatementRow = memo(function StatementRow({
  statement,
  selected,
  onSelect,
}: {
  statement: BankStatementSummary;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <tr
      className={`border-t border-slate-100 ${selected ? "bg-brand-50" : "bg-white hover:bg-slate-50"}`}
    >
      <td className="px-3 py-3 text-slate-600">
        {formatDateTime(statement.createdAt)}
      </td>
      <td className="px-3 py-3">
        <p className="font-semibold text-slate-900">{statement.bankName}</p>
        <p className="mt-1 text-xs text-slate-500">
          {statement.companyBankAccountName} -{" "}
          {statement.companyBankAccountNumber}
        </p>
      </td>
      <td className="px-3 py-3">
        <p className="font-semibold text-slate-900">{statement.name}</p>
        <p className="mt-1 text-xs text-slate-500">{statement.fileName}</p>
      </td>
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={() => onSelect(statement.id)}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition cursor-pointer ${
            selected
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {selected ? "Seleccionado" : "Usar"}
        </button>
      </td>
    </tr>
  );
});
