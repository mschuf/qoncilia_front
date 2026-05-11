import { memo, useEffect, useState } from "react";
import {
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import MatchesSection from "../components/ConciliationWorkbench/MatchesSection";
import {
  Metric,
  SelectBlock,
  UploadCard,
} from "../components/ConciliationWorkbench/WorkbenchControls";
import useConciliationWorkbench from "../hooks/useConciliationWorkbench";
import type { BankStatementSummary } from "../types/conciliation";
import type { SapErpSession } from "../erp/sap";
import { isAdminRole } from "../utils/role";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
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
    selectedErpConfigId,
    setSelectedErpConfigId,
    erpSession,
    checkErpSession,
    isSendingExternalReconciliation,
    preview,
    manualMatches,
    unmatchedSystemRows,
    unmatchedBankRows,
    metrics,
    onFileChange,
    runComparison,
    onDragEnd,
    removeManualMatch,
    sendExternalReconciliationToErp,
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

  const handleSearch = async () => {
    if (isAdminRole(role) && banks.length === 0) {
      await loadCatalog(selectedUserId);
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
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1fr)_auto]">
          {isAdminRole(role) ? (
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
                  {account.name} - {account.accountNumber} ({account.currency}
                  )
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

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Buscar</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Alias, archivo, banco..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoadingCatalog}
              aria-label="Buscar extractos"
              title="Buscar extractos"
              className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSearch className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Extractos encontrados
            </p>
            <h3 className="mt-2 text-lg font-extrabold text-slate-900">
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
                  <th className="px-3 py-2">Layout</th>
                  <th className="px-3 py-2">Filas</th>
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
                      colSpan={6}
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
                ·{" "}
                <span className="font-semibold">{totalStatements}</span>{" "}
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
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
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
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runComparison()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700"
              >
                <FiUploadCloud className="h-4 w-4" /> Comparar
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <FiRefreshCw className="h-4 w-4" /> Limpiar
              </button>
            </div>
          </div>
        </div>
      </section>

      {preview && metrics ? (
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
                ERP activo
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
      <td className="px-3 py-3 text-slate-600">{statement.layoutName}</td>
      <td className="px-3 py-3 font-semibold text-slate-800">
        {statement.rowCount}
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
