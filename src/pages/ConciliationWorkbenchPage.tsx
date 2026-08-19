import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiRefreshCw,
  FiSend,
  FiUploadCloud,
  FiArrowDown,
  FiLogIn,
} from "react-icons/fi";
import ComparisonBackdrop from "../components/ConciliationWorkbench/ComparisonBackdrop";
import MatchesSection from "../components/ConciliationWorkbench/MatchesSection";
import {
  Metric,
  UploadCard,
} from "../components/ConciliationWorkbench/WorkbenchControls";
import FiltersSection from "../components/ConciliationWorkbench/FiltersSection";
import SapB1QueryTableView from "../components/ConciliationWorkbench/SapB1QueryTableView";
import SapTarjetasSection from "../components/ConciliationWorkbench/SapTarjetasSection";
import DataTable from "../components/ConciliationWorkbench/DataTable";
import SmartMatchesTable from "../components/ConciliationWorkbench/SmartMatchesTable";
import StatementRow from "../components/ConciliationWorkbench/StatementRow";
import ErpFloatingPanel from "../components/ConciliationWorkbench/ErpFloatingPanel";
import ErpLoginModal from "../components/ConciliationWorkbench/ErpLoginModal";
import { formatAmountPyg, parseLooseNumber } from "../utils/format";
import {
  convertPreviewMatchesToSmartMatches,
  convertSapB1TableToPreviewRows,
  isSameSmartMatch,
  resolveErpStatus,
  resolveSapB1ComparisonColumns,
  type SmartMatch,
} from "../components/ConciliationWorkbench/workbenchHelpers";
import useConciliationWorkbench from "../hooks/useConciliationWorkbench";
import { isAdminRole, isSuperAdminRole, ROLE_VALUES } from "../utils/role";

export type ConciliationWorkbenchMode = "banco" | "tarjetas";
export type CardPaymentKind = "debit" | "credit";

function normalizeSapB1ColumnKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function findSapB1AmountColumn(columns: string[], keys: string[]) {
  const columnsByKey = new Map(
    columns.map((column) => [normalizeSapB1ColumnKey(column), column]),
  );
  return keys.map((key) => columnsByKey.get(key)).find(Boolean) ?? null;
}

function getSapB1RowNet(
  row: SmartMatch["systemRow"],
  columns: string[],
  side: "bank" | "system",
) {
  const debit = findSapB1AmountColumn(columns, [
    "debito",
    "debitos",
    "debe",
    "debit",
    "importedebito",
  ]);
  const credit = findSapB1AmountColumn(columns, [
    "credito",
    "creditos",
    "haber",
    "credit",
    "importecredito",
  ]);
  const parse = (column: string | null) => {
    if (!column) return null;
    const value = row.values[column] ?? row.normalized[column];
    return value == null || value === "" ? null : parseLooseNumber(String(value));
  };

  if (debit && credit) {
    const debitAmount = parse(debit);
    const creditAmount = parse(credit);
    if (debitAmount === null && creditAmount === null) return null;
    const debitValue = Math.abs(debitAmount ?? 0);
    const creditValue = Math.abs(creditAmount ?? 0);
    return side === "bank"
      ? creditValue - debitValue
      : debitValue - creditValue;
  }

  const single =
    findSapB1AmountColumn(columns, ["monto", "importe", "amount"]) ??
    debit ??
    credit;
  return parse(single);
}

type ConciliationWorkbenchPageProps = {
  // Fija el workbench a un solo modo ERP: "banco" (SAP_B1) o "tarjetas"
  // (SAP_TARJETAS). Sin prop, mantiene el comportamiento clasico multi-modo.
  mode?: ConciliationWorkbenchMode;
  // Permite que una empresa use su propio modulo SAP sin cambiar las rutas del
  // workbench estandar.
  sapApiBasePath?: string;
  // Fachada exclusiva de extractos/catalogos de una empresa.
  conciliationApiBasePath?: string;
  cardPaymentKind?: CardPaymentKind;
  // OCHO A permite conciliar una fila del banco contra varias lineas del
  // sistema. El resto de empresas conserva el matching uno a uno.
  allowSapB1SystemManyToOne?: boolean;
};

export default function ConciliationWorkbenchPage({
  mode,
  sapApiBasePath,
  conciliationApiBasePath,
  cardPaymentKind,
  allowSapB1SystemManyToOne = false,
}: ConciliationWorkbenchPageProps) {
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
    isLoadingErpConfigs,
    selectedErpConfig,
    selectedErpConfigId,
    setSelectedErpConfigId,
    erpSession,
    checkErpSession,
    loginErpSession,
    isErpLoggingIn,
    isSapB1QueryMode,
    sapB1QueryPreview,
    isRunningSapB1Queries,
    isComparing,
    runSapB1QueryPreview,
    runSapB1QueryComparison,
    isSapTarjetasMode,
    cardFile,
    cardCsvResult,
    cardSystemQuery,
    isRunningCardSystemQuery,
    isParsingCardCsv,
    runCardSystemQuery,
    onCardFileChange,
    clearCardFile,
    runCardComparison,
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
    sendSapTarjetasDepositToErp,
    searchBankStatements,
    loadCatalog,
    isLoadingCatalog,
    page,
    goToPage,
    totalPages,
    totalStatements,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  } = useConciliationWorkbench({
    erpCodeFilter:
      mode === "banco" ? "SAP_B1" : mode === "tarjetas" ? "SAP_TARJETAS" : undefined,
    sapApiBasePath,
    conciliationApiBasePath,
    allowSapB1SystemManyToOne,
  });

  const bankLabel =
    preview?.layout.bankLabel ?? selectedLayout?.bankLabel ?? "Banco";
  const systemLabel =
    preview?.layout.systemLabel ?? selectedLayout?.systemLabel ?? "Sistema";
  const erpStatus = resolveErpStatus(erpSession);
  const cardPaymentTitle =
    cardPaymentKind === "debit"
      ? "Pagos Débito"
      : cardPaymentKind === "credit"
        ? "Pagos Crédito"
        : "Pago de tarjeta";
  const [isErpPanelOpen, setIsErpPanelOpen] = useState(false);
  const [isErpLoginModalOpen, setIsErpLoginModalOpen] = useState(false);
  const [smartMatches, setSmartMatches] = useState<SmartMatch[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [sapB1SmartMatches, setSapB1SmartMatches] = useState<SmartMatch[]>([]);
  const [showSapB1Comparison, setShowSapB1Comparison] = useState(false);
  // Scroll automatico a "Resultados del matching" al comparar.
  const matchesRef = useRef<HTMLDivElement | null>(null);
  const [scrollToMatchesSignal, setScrollToMatchesSignal] = useState(0);
  useEffect(() => {
    if (scrollToMatchesSignal === 0) return;
    matchesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollToMatchesSignal]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [selectedSapB1BankRowIndex, setSelectedSapB1BankRowIndex] = useState<
    number | null
  >(null);
  const [selectedSapB1SystemRowIndex, setSelectedSapB1SystemRowIndex] =
    useState<number | null>(null);
  const [selectedSapB1SystemRowIndices, setSelectedSapB1SystemRowIndices] =
    useState<Set<number>>(new Set());
  const toggleSapB1SystemRow = useCallback((rowIndex: number, selected: boolean) => {
    setSelectedSapB1SystemRowIndices((current) => {
      const next = new Set(current);
      if (selected) next.add(rowIndex);
      else next.delete(rowIndex);
      return next;
    });
  }, []);
  const clearSapB1SelectedRows = () => {
    setSelectedSapB1BankRowIndex(null);
    setSelectedSapB1SystemRowIndex(null);
    setSelectedSapB1SystemRowIndices(new Set());
  };
  const selectedSapB1SystemIndices = useMemo(
    () =>
      allowSapB1SystemManyToOne
        ? [...selectedSapB1SystemRowIndices].sort((left, right) => left - right)
        : selectedSapB1SystemRowIndex === null
          ? []
          : [selectedSapB1SystemRowIndex],
    [
      allowSapB1SystemManyToOne,
      selectedSapB1SystemRowIndex,
      selectedSapB1SystemRowIndices,
    ],
  );
  const sapB1ManualSelectionSummary = useMemo(() => {
    if (
      !allowSapB1SystemManyToOne ||
      !sapB1QueryPreview ||
      selectedSapB1BankRowIndex === null ||
      selectedSapB1SystemIndices.length === 0
    ) {
      return null;
    }

    const bankRow = convertSapB1TableToPreviewRows(sapB1QueryPreview.bank)[
      selectedSapB1BankRowIndex
    ];
    const systemPreviewRows = convertSapB1TableToPreviewRows(sapB1QueryPreview.system);
    const systemRows = selectedSapB1SystemIndices
      .map((rowIndex) => systemPreviewRows[rowIndex])
      .filter((row): row is SmartMatch["systemRow"] => Boolean(row));
    if (!bankRow || systemRows.length !== selectedSapB1SystemIndices.length) return null;

    const bank = getSapB1RowNet(bankRow, sapB1QueryPreview.bank.columns, "bank");
    const systemAmounts = systemRows.map((row) =>
      getSapB1RowNet(row, sapB1QueryPreview.system.columns, "system"),
    );
    if (bank === null || systemAmounts.some((amount) => amount === null)) return null;

    const system = systemAmounts.reduce((total, amount) => total + (amount ?? 0), 0);
    return {
      bank,
      system,
      difference: bank - system,
      balanced: Math.abs(bank - system) < 0.0001,
    };
  }, [
    allowSapB1SystemManyToOne,
    sapB1QueryPreview,
    selectedSapB1BankRowIndex,
    selectedSapB1SystemIndices,
  ]);
  const isSapB1ManualSelectionBalanced =
    !allowSapB1SystemManyToOne || sapB1ManualSelectionSummary?.balanced === true;
  const sapB1ComparisonColumns = useMemo(
    () =>
      sapB1QueryPreview ? resolveSapB1ComparisonColumns(sapB1QueryPreview) : [],
    [sapB1QueryPreview],
  );

  useEffect(() => {
    if (!preview) {
      setSmartMatches([]);
      setShowComparison(false);
      return;
    }

    const fieldKeys = preview.layout.mappings
      .filter((m) => m.active)
      .map((m) => m.fieldKey)
      .slice(0, 3);
    setSmartMatches(
      convertPreviewMatchesToSmartMatches(
        preview,
        preview.autoMatches,
        fieldKeys,
      ),
    );
    setShowComparison(true);
  }, [preview]);

  const handleSearch = async () => {
    setSmartMatches([]);
    setShowComparison(false);
    setSapB1SmartMatches([]);
    setShowSapB1Comparison(false);
    clearSapB1SelectedRows();

    if (isSuperAdminRole(role) && banks.length === 0) {
      await loadCatalog(selectedUserId);
    }
    if (isSapB1QueryMode) {
      await runSapB1QueryPreview();
      return;
    }
    if (isSapTarjetasMode) {
      await runCardSystemQuery();
      return;
    }
    // En las paginas de modo fijo no existe el flujo de extractos guardados:
    // sin config ERP del code esperado no hay nada que buscar.
    if (mode) return;
    searchBankStatements();
  };
  const matchedCount = preview
    ? preview.autoMatches.length + manualMatches.length
    : 0;
  const canSendExternalReconciliation =
    isAdminRole(role) || role === ROLE_VALUES.gestorCobranza;
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
    sapB1SmartMatches.length === 0
      ? "No hay coincidencias para conciliar."
      : null,
    !selectedErpConfigId ? "No hay ERP seleccionado." : null,
    isSendingExternalReconciliation
      ? "Se esta enviando la conciliacion."
      : null,
    !erpSession?.authenticated ? "La sesion ERP no esta autenticada." : null,
    !canSendExternalReconciliation
      ? `El rol actual (${role ?? "sin rol"}) no puede enviar conciliaciones al ERP.`
      : null,
  ].filter(Boolean) as string[];
  const isSapB1ExternalReconciliationDisabled =
    sapB1ExternalReconciliationBlockers.length > 0;
  const needsErpLogin = Boolean(
    selectedErpConfigId && !erpSession?.authenticated,
  );
  const openErpLoginModal = () => {
    setIsErpPanelOpen(false);
    setIsErpLoginModalOpen(true);
  };
  const removeSmartMatchFromTable = (target: SmartMatch) => {
    setSmartMatches((current) =>
      current.filter((item) => !isSameSmartMatch(item, target)),
    );
  };
  const handleRemoveAutoMatch = (match: {
    systemRowId: string;
    bankRowId: string;
  }) => {
    const autoMatch = preview?.autoMatches.find(
      (item) =>
        item.systemRowId === match.systemRowId &&
        item.bankRowId === match.bankRowId,
    );
    if (autoMatch) {
      removeAutoMatch(autoMatch);
    }
    setSmartMatches((current) =>
      current.filter(
        (item) =>
          item.systemRow.rowId !== match.systemRowId ||
          item.bankRow.rowId !== match.bankRowId,
      ),
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
      allowSapB1SystemManyToOne
        // Quitar una linea de un grupo dejaria un banco con importe incompleto.
        // En OCHO A se quita el grupo entero y la fila bancaria queda disponible
        // para volver a seleccionarla con las lineas correctas.
        ? current.filter((item) => item.bankRow.rowId !== target.bankRow.rowId)
        : current.filter((item) => !isSameSmartMatch(item, target)),
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
      <ComparisonBackdrop
        isVisible={isComparing}
        label={
          isSapTarjetasMode
            ? "Comparando tarjetas"
            : isSapB1QueryMode
              ? "Comparando consultas"
              : "Comparando extractos"
        }
        detail="Calculando coincidencias con IA."
      />

      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          {mode === "tarjetas" ? "Conciliacion de tarjetas" : "Conciliacion bancaria"}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
          {mode === "banco"
            ? "Conciliacion de banco"
            : mode === "tarjetas"
              ? cardPaymentTitle
              : "Conciliar extracto con IA"}
        </h1>
      </div>

      <FiltersSection
        role={role}
        users={users}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        banks={banks}
        selectedBankId={selectedBankId}
        setSelectedBankId={setSelectedBankId}
        accounts={accounts}
        selectedCompanyBankAccountId={selectedCompanyBankAccountId}
        setSelectedCompanyBankAccountId={setSelectedCompanyBankAccountId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        isExpanded={isFiltersExpanded}
        setIsExpanded={setIsFiltersExpanded}
        onSearch={handleSearch}
        isSapB1QueryMode={isSapB1QueryMode || isSapTarjetasMode}
        isSearchDisabled={
          isLoadingCatalog ||
          isRunningSapB1Queries ||
          isRunningCardSystemQuery ||
          isComparing ||
          (Boolean(mode) && !selectedErpConfigId)
        }
      />

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
                  matchedIndices={
                    new Set(
                      sapB1SmartMatches.map((m) => m.bankRow.rowNumber - 1),
                    )
                  }
                />
                <SapB1QueryTableView
                  title={
                    allowSapB1SystemManyToOne
                      ? "Query sistema · selección múltiple"
                      : "Query sistema"
                  }
                  table={sapB1QueryPreview.system}
                  selectedRowIndex={
                    allowSapB1SystemManyToOne ? null : selectedSapB1SystemRowIndex
                  }
                  selectedRowIndices={
                    allowSapB1SystemManyToOne ? selectedSapB1SystemRowIndices : undefined
                  }
                  onSelectRow={
                    allowSapB1SystemManyToOne
                      ? undefined
                      : setSelectedSapB1SystemRowIndex
                  }
                  onToggleRow={
                    allowSapB1SystemManyToOne
                      ? toggleSapB1SystemRow
                      : undefined
                  }
                  matchedIndices={
                    new Set(
                      sapB1SmartMatches.map((m) => m.systemRow.rowNumber - 1),
                    )
                  }
                />
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Selecciona cuenta, fechas y pulsa buscar para ejecutar las
                consultas.
              </div>
            )}

            {sapB1QueryPreview ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSapB1Comparison(false);
                    setSapB1SmartMatches([]);
                    clearSapB1SelectedRows();
                  }}
                  disabled={!showSapB1Comparison}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiRefreshCw className="h-4 w-4" />
                </button>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {allowSapB1SystemManyToOne &&
                  selectedSapB1BankRowIndex !== null &&
                  selectedSapB1SystemIndices.length > 0 ? (
                    <div
                      className={`rounded-xl px-3 py-2 text-xs font-bold ${
                        sapB1ManualSelectionSummary?.balanced
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {sapB1ManualSelectionSummary ? (
                        <>
                          Banco {formatAmountPyg(sapB1ManualSelectionSummary.bank)}
                          {" · "}Sistema ({selectedSapB1SystemIndices.length}){" "}
                          {formatAmountPyg(sapB1ManualSelectionSummary.system)}
                          {" · "}Diferencia{" "}
                          {formatAmountPyg(
                            Math.abs(sapB1ManualSelectionSummary.difference),
                          )}
                        </>
                      ) : (
                        "No se pudo calcular el importe de la seleccion."
                      )}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    title={
                      allowSapB1SystemManyToOne && !isSapB1ManualSelectionBalanced
                        ? "La suma del sistema debe coincidir exactamente con la fila del banco."
                        : "Match Manual"
                    }
                    onClick={() => {
                      if (
                        !sapB1QueryPreview ||
                        selectedSapB1BankRowIndex === null ||
                        selectedSapB1SystemIndices.length === 0
                      )
                        return;
                      if (!isSapB1ManualSelectionBalanced) return;
                      const bankRows = convertSapB1TableToPreviewRows(
                        sapB1QueryPreview.bank,
                      );
                      const systemRows = convertSapB1TableToPreviewRows(
                        sapB1QueryPreview.system,
                      );

                      const bankRow = bankRows[selectedSapB1BankRowIndex];
                      const selectedSystemRows = selectedSapB1SystemIndices
                        .map((rowIndex) => systemRows[rowIndex])
                        .filter((row): row is SmartMatch["systemRow"] => Boolean(row));
                      if (!bankRow || selectedSystemRows.length === 0) return;

                      const manualMatches: SmartMatch[] = selectedSystemRows.map(
                        (systemRow) => ({
                          systemRow,
                          bankRow,
                          score: 1,
                          column1Match: true,
                          column2Match: true,
                          column3Match: true,
                          matchReason: "manual",
                          dateDifferenceDays: null,
                        }),
                      );

                      setSapB1SmartMatches((prev) => [...prev, ...manualMatches]);
                      setShowSapB1Comparison(true);
                      clearSapB1SelectedRows();
                    }}
                    disabled={
                      selectedSapB1BankRowIndex === null ||
                      selectedSapB1SystemIndices.length === 0 ||
                      !isSapB1ManualSelectionBalanced
                    }
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiArrowDown className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!sapB1QueryPreview) return;
                      const matchedBankRowIds = new Set(
                        sapB1SmartMatches.map((m) => m.bankRow.rowId),
                      );
                      const matchedSystemRowIds = new Set(
                        sapB1SmartMatches.map((m) => m.systemRow.rowId),
                      );

                      const result = await runSapB1QueryComparison({
                        columns: sapB1ComparisonColumns,
                        excludedBankRowIds: [...matchedBankRowIds],
                        excludedSystemRowIds: [...matchedSystemRowIds],
                      });
                      if (!result) return;

                      setSapB1SmartMatches((prev) => [
                        ...prev,
                        ...result.matches,
                      ]);
                      clearSapB1SelectedRows();
                      setShowSapB1Comparison(true);
                      setScrollToMatchesSignal((n) => n + 1);
                    }}
                    disabled={
                      !sapB1QueryPreview ||
                      sapB1QueryPreview.bank.rows.length === 0 ||
                      sapB1QueryPreview.system.rows.length === 0 ||
                      isComparing
                    }
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
              <div ref={matchesRef} className="scroll-mt-20">
                <SmartMatchesTable
                  matches={sapB1SmartMatches}
                  systemColumns={sapB1QueryPreview.system.columns.map(
                    (col) => ({
                      fieldKey: col,
                      label: col,
                    }),
                  )}
                  bankColumns={sapB1QueryPreview.bank.columns.map((col) => ({
                    fieldKey: col,
                    label: col,
                  }))}
                  amountTotalsMode={
                    allowSapB1SystemManyToOne ? "sap-b1-net" : "raw"
                  }
                  onRemove={handleRemoveSapB1SmartMatch}
                  onClear={() => {
                    setSapB1SmartMatches([]);
                    setShowSapB1Comparison(false);
                  }}
                />
                {allowSapB1SystemManyToOne ? (
                  <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                    OCHO A: una fila del banco puede estar vinculada a varias
                    lineas del sistema. La fila bancaria se repite para mostrar
                    cada linea, pero su total se contabiliza una sola vez.
                  </p>
                ) : null}
              </div>
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
                      Se enviaran {sapB1SmartMatches.length} coincidencias
                      {allowSapB1SystemManyToOne
                        ? ` de sistema contra ${new Set(sapB1SmartMatches.map((match) => match.bankRow.rowId)).size} fila(s) bancaria(s)`
                        : ""}
                    </p>
                    {isSapB1ExternalReconciliationDisabled &&
                    sapB1ExternalReconciliationBlockers.length > 0 ? (
                      <p className="mt-2 text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg inline-block">
                        {sapB1ExternalReconciliationBlockers.join(" • ")}
                      </p>
                    ) : null}
                    {needsErpLogin ? (
                      <button
                        type="button"
                        onClick={openErpLoginModal}
                        disabled={isErpLoggingIn}
                        className="mt-2 inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiLogIn className="h-3.5 w-3.5" />
                        {isErpLoggingIn ? "Iniciando..." : "Iniciar sesion ERP"}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const success =
                        await sendSapB1QueryMatchesToErp(sapB1SmartMatches);
                      if (success) {
                        setSapB1SmartMatches([]);
                        setShowSapB1Comparison(false);
                        clearSapB1SelectedRows();
                        await runSapB1QueryPreview();
                      }
                    }}
                    disabled={isSapB1ExternalReconciliationDisabled}
                    className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiSend className="h-4 w-4" />
                    {isSendingExternalReconciliation
                      ? "Conciliando..."
                      : "Conciliar"}
                  </button>
                </div>
              </section>
            </>
          ) : null}
        </>
      ) : isSapTarjetasMode ? (
        <SapTarjetasSection
          systemTable={cardSystemQuery?.system ?? null}
          bankTable={cardCsvResult?.bank ?? null}
          csvSummary={cardCsvResult}
          cardFile={cardFile}
          onCardFileChange={onCardFileChange}
          onClearCardFile={clearCardFile}
          accountCode={cardSystemQuery?.accountCode ?? null}
          isRunningSystemQuery={isRunningCardSystemQuery}
          isParsingCsv={isParsingCardCsv}
          isComparing={isComparing}
          runComparison={runCardComparison}
          isSendingDeposit={isSendingExternalReconciliation}
          sendDeposit={sendSapTarjetasDepositToErp}
          refreshSystemQuery={runCardSystemQuery}
          cardPaymentKind={cardPaymentKind}
        />
      ) : mode ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          {isLoadingErpConfigs ? (
            <p className="text-sm font-semibold text-slate-500">
              Cargando configuraciones ERP...
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">
                {mode === "banco"
                  ? "No hay una configuracion ERP SAP_B1 activa para tu empresa."
                  : "No hay una configuracion ERP SAP_TARJETAS activa para tu empresa."}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Pedi al administrador que la asigne desde Integraciones ERP.
              </p>
            </>
          )}
        </section>
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
                            No hay extractos guardados para los filtros
                            elegidos.
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
                  <FiRefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void runComparison().finally(() =>
                      setScrollToMatchesSignal((n) => n + 1),
                    );
                  }}
                  disabled={
                    !selectedBankStatementId || !systemFile || isComparing
                  }
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
              <div ref={matchesRef} className="scroll-mt-20">
                <SmartMatchesTable
                  matches={smartMatches}
                  systemColumns={selectedLayout.mappings
                    .filter((m) => m.active)
                    .slice(0, 3)
                    .map((m) => ({
                      fieldKey: m.fieldKey,
                      label: m.label,
                      dataType: m.systemDataType,
                    }))}
                  bankColumns={selectedLayout.mappings
                    .filter((m) => m.active)
                    .slice(0, 3)
                    .map((m) => ({
                      fieldKey: m.fieldKey,
                      label: m.label,
                      dataType: m.bankDataType,
                    }))}
                  onRemove={handleRemoveSmartMatch}
                  onClear={() => {
                    smartMatches.forEach((match) => {
                      const autoMatch = preview?.autoMatches.find(
                        (item) =>
                          item.systemRowId === match.systemRow.rowId &&
                          item.bankRowId === match.bankRow.rowId,
                      );
                      if (autoMatch) {
                        removeAutoMatch(autoMatch);
                      }
                    });
                    setSmartMatches([]);
                    setShowComparison(false);
                  }}
                />
              </div>
            </>
          ) : null}
        </>
      )}

      {!mode && !isSapB1QueryMode && !isSapTarjetasMode && preview && metrics ? (
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
                  Se enviaran {matchedCount} coincidencias.
                  {externalReconciliationPendingInfo.length > 0
                    ? " Las filas pendientes no se enviaran al ERP."
                    : ""}
                  {!canSendExternalReconciliation
                    ? " Disponible solo para admin y superadmin."
                    : ""}
                </p>
                {isExternalReconciliationDisabled &&
                externalReconciliationBlockers.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-600">
                      {externalReconciliationBlockers.join(" | ")}
                    </p>
                    {needsErpLogin ? (
                      <button
                        type="button"
                        onClick={openErpLoginModal}
                        disabled={isErpLoggingIn}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiLogIn className="h-3.5 w-3.5" />
                        {isErpLoggingIn ? "Iniciando..." : "Iniciar sesion ERP"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
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

      <ErpFloatingPanel
        isOpen={isErpPanelOpen}
        onToggle={() => setIsErpPanelOpen((current) => !current)}
        onClose={() => setIsErpPanelOpen(false)}
        erpStatus={erpStatus}
        erpSession={erpSession}
        erpConfigs={erpConfigs}
        selectedErpConfigId={selectedErpConfigId}
        setSelectedErpConfigId={setSelectedErpConfigId}
        checkErpSession={checkErpSession}
        onLoginClick={openErpLoginModal}
        isLoginDisabled={!selectedErpConfigId || isErpLoggingIn}
      />

      <ErpLoginModal
        open={isErpLoginModalOpen}
        onClose={() => setIsErpLoginModalOpen(false)}
        config={selectedErpConfig}
        isSubmitting={isErpLoggingIn}
        onSubmit={loginErpSession}
      />
    </section>
  );
}
