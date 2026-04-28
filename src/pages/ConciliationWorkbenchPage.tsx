import { useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiDatabase,
  FiEye,
  FiRefreshCw,
  FiSave,
  FiSend,
  FiServer,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import MatchesSection from "../components/ConciliationWorkbench/MatchesSection";
import {
  CompactFilePanel,
  KpiCard,
  Metric,
  SelectBlock,
  UploadCard,
} from "../components/ConciliationWorkbench/WorkbenchControls";
import AppModal from "../components/AppModal";
import ConfirmModal from "../components/ConfirmModal";
import useConciliationWorkbench from "../hooks/useConciliationWorkbench";
import type {
  ReconciliationSource,
  ReconciliationSummary,
} from "../types/conciliation";
import {
  getConciliationDataSummary,
  getConciliationStatusPresentation,
  isPendingConciliationStatus,
} from "../utils/conciliationStatus";
import { isAdminRole } from "../utils/role";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function buildFilesSummary(reconciliation: ReconciliationSummary) {
  return `${reconciliation.systemFileName ?? "sin sistema"} / ${reconciliation.bankFileName ?? "sin banco"}`;
}

export default function ConciliationWorkbenchPage() {
  const {
    role,
    canUseErp,
    users,
    selectedUserId,
    setSelectedUserId,
    banks,
    selectedBankId,
    setSelectedBankId,
    accounts,
    selectedCompanyBankAccountId,
    setSelectedCompanyBankAccountId,
    selectedLayoutId,
    setSelectedLayoutId,
    layouts,
    selectedLayout,
    reconciliationName,
    setReconciliationName,
    systemFile,
    setSystemFile,
    bankFile,
    setBankFile,
    preview,
    manualMatches,
    unmatchedSystemRows,
    unmatchedBankRows,
    kpis,
    reconciliationsForSelectedBankAccount,
    selectedUpdateReconciliationId,
    loadSavedReconciliation,
    openLoadedWorkbench,
    goBackToEditorWorkbench,
    selectedReconciliationForUpdate,
    metrics,
    onFileChange,
    clearAll,
    runPreview,
    onDragEnd,
    removeManualMatch,
    saveReconciliation,
    saveWorkbenchFiles,
    deleteSavedSource,
    deleteSavedReconciliation,
    companyErpConfigs,
    selectedCompanyErpConfigId,
    setSelectedCompanyErpConfigId,
    selectedCompanyErpConfig,
    isErpModalOpen,
    openErpModal,
    closeErpModal,
    erpPayloadText,
    setErpPayloadText,
    sendToErp,
    lastErpShipment,
    workbenchViewMode,
  } = useConciliationWorkbench();

  const savedReconciliations = useMemo(
    () =>
      [...reconciliationsForSelectedBankAccount].sort((left, right) => {
        const pendingDifference =
          Number(isPendingConciliationStatus(right.status)) -
          Number(isPendingConciliationStatus(left.status));
        if (pendingDifference !== 0) return pendingDifference;

        return (
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime()
        );
      }),
    [reconciliationsForSelectedBankAccount],
  );

  const isLoadedWorkbench =
    workbenchViewMode === "loaded" &&
    Boolean(selectedReconciliationForUpdate) &&
    Boolean(preview);

  const showPreviewResults =
    Boolean(preview && metrics) &&
    (workbenchViewMode === "loaded" || selectedUpdateReconciliationId === 0);

  const systemLabel =
    preview?.layout.systemLabel ?? selectedLayout?.systemLabel ?? "Sistema";
  const bankLabel = preview?.layout.bankLabel ?? selectedLayout?.bankLabel ?? "Banco";

  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmVariant: "danger" | "primary";
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "",
    confirmVariant: "danger",
    onConfirm: () => {},
  });

  const handleDeleteSource = (source: ReconciliationSource) => {
    if (!selectedReconciliationForUpdate) return;

    const sourceLabel = source === "system" ? "sistema" : "banco";
    
    setConfirmConfig({
      open: true,
      title: "Eliminar datos guardados",
      message: `¿Estas seguro de eliminar los datos guardados de ${sourceLabel} para la conciliacion "${selectedReconciliationForUpdate.name}"? Esta accion no se puede deshacer.`,
      confirmLabel: "Eliminar datos",
      confirmVariant: "danger",
      onConfirm: () => void deleteSavedSource(source),
    });
  };

  const handleDeleteReconciliation = (
    reconciliation: ReconciliationSummary,
  ) => {
    setConfirmConfig({
      open: true,
      title: "Eliminar conciliacion",
      message: `¿Estas seguro de eliminar por completo la conciliacion "${reconciliation.name}" y sus resultados guardados? Esta accion no se puede deshacer.`,
      confirmLabel: "Eliminar conciliacion",
      confirmVariant: "danger",
      onConfirm: () => void deleteSavedReconciliation(reconciliation.id),
    });
  };

  return (
    <>
      <section className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
                  Mesa de Conciliacion
                </p>
                <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
                  Sube, guarda, compara y recarga conciliaciones con mas control
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Puedes guardar archivos sin comparar, abrir conciliaciones ya
                  guardadas, volver al formulario cuando lo necesites y eliminar
                  solo sistema, solo banco o toda la conciliacion.
                </p>
              </div>

              <Link
                to="/conciliation/history"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <FiClock className="h-4 w-4" /> Ver historial
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <KpiCard
              label="Conciliaciones"
              value={String(kpis?.totalReconciliations ?? 0)}
              icon={FiBarChart2}
            />
            <KpiCard
              label="Coinc. auto"
              value={String(kpis?.totalAutoMatches ?? 0)}
              icon={FiCheckCircle}
            />
            <KpiCard
              label="Coinc. manual"
              value={String(kpis?.totalManualMatches ?? 0)}
              icon={FiDatabase}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-6">
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
                label: item.alias ?? item.bankName,
              }))}
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

            <SelectBlock
              label="Plantilla"
              value={selectedLayoutId}
              onChange={(value) => setSelectedLayoutId(Number(value))}
              options={layouts.map((item) => ({
                value: item.id,
                label: `${item.name}${item.active ? " - activa" : ""}`,
              }))}
            />

            <label className="space-y-1.5 xl:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Alias o descripcion de la conciliacion
              </span>
              <input
                value={reconciliationName}
                onChange={(event) => setReconciliationName(event.target.value)}
                placeholder="Ej. Cierre abril cuenta principal"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </label>
          </div>
        </div>


        {isLoadedWorkbench && preview && selectedReconciliationForUpdate ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600">
                  Conciliacion cargada
                </p>
                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                  {selectedReconciliationForUpdate.name}
                </h3>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span>
                    <strong>Estado:</strong>{" "}
                    {
                      getConciliationStatusPresentation(
                        selectedReconciliationForUpdate.status,
                      ).label
                    }
                  </span>
                  <span>
                    <strong>Fecha:</strong>{" "}
                    {formatDateTime(selectedReconciliationForUpdate.updatedAt)}
                  </span>
                  <span>
                    <strong>Plantilla:</strong>{" "}
                    {selectedReconciliationForUpdate.layoutName}
                  </span>
                  <span>
                    <strong>Cuenta:</strong>{" "}
                    {selectedReconciliationForUpdate.companyBankAccountName ??
                      "Sin cuenta"}{" "}
                    {selectedReconciliationForUpdate.companyBankAccountNumber
                      ? `- ${selectedReconciliationForUpdate.companyBankAccountNumber}`
                      : ""}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={goBackToEditorWorkbench}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <FiArrowLeft className="h-4 w-4" /> Volver al formulario
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <FiRefreshCw className="h-4 w-4" /> Limpiar mesa
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <CompactFilePanel
                title={bankLabel}
                file={bankFile}
                currentFileName={
                  selectedReconciliationForUpdate.bankFileName ??
                  preview?.bankFileName
                }
                hasSavedData={selectedReconciliationForUpdate.hasBankData}
                onChange={onFileChange(setBankFile)}
                onClearSelected={() => setBankFile(null)}
                onDeleteSaved={() => void handleDeleteSource("bank")}
              />
              <CompactFilePanel
                title={systemLabel}
                file={systemFile}
                currentFileName={
                  selectedReconciliationForUpdate.systemFileName ??
                  preview?.systemFileName
                }
                hasSavedData={selectedReconciliationForUpdate.hasSystemData}
                onChange={onFileChange(setSystemFile)}
                onClearSelected={() => setSystemFile(null)}
                onDeleteSaved={() => void handleDeleteSource("system")}
              />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => void saveWorkbenchFiles()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <FiSave className="h-4 w-4" /> Guardar archivos
              </button>
              <button
                type="button"
                onClick={runPreview}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-700/25"
              >
                <FiUploadCloud className="h-4 w-4" /> Comparar
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleDeleteReconciliation(selectedReconciliationForUpdate)
                }
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
              >
                <FiTrash2 className="h-4 w-4" /> Eliminar conciliacion
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            {selectedReconciliationForUpdate ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">
                      Conciliacion lista para seguir trabajando:{" "}
                      {selectedReconciliationForUpdate.name}
                    </p>
                    <p className="mt-1 text-xs opacity-90">
                      Puedes volver a la vista cargada para revisar
                      coincidencias y tablas, o limpiar la mesa para empezar una
                      conciliacion nueva.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openLoadedWorkbench}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                    >
                      <FiEye className="h-4 w-4" /> Ver conciliacion cargada
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-200"
                    >
                      <FiRefreshCw className="h-4 w-4" /> Quitar de la mesa
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <UploadCard
                title={bankLabel}
                file={bankFile}
                onChange={onFileChange(setBankFile)}
                onClear={() => setBankFile(null)}
              />
              <UploadCard
                title={systemLabel}
                file={systemFile}
                onChange={onFileChange(setSystemFile)}
                onClear={() => setSystemFile(null)}
              />
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void saveWorkbenchFiles()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <FiSave className="h-4 w-4" /> Guardar archivos
              </button>
              <button
                type="button"
                onClick={runPreview}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-700/25"
              >
                <FiUploadCloud className="h-4 w-4" /> Comparar
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <FiRefreshCw className="h-4 w-4" /> Limpiar
              </button>
            </div>
          </section>
        )}



        {lastErpShipment ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">
                  Ultimo envio ERP: {lastErpShipment.companyErpConfigName}
                </p>
                <p className="mt-1 text-xs opacity-90">
                  Estado {lastErpShipment.status}
                  {lastErpShipment.externalDocEntry
                    ? ` - DocEntry ${lastErpShipment.externalDocEntry}`
                    : ""}
                  {lastErpShipment.externalDocNum
                    ? ` - DocNum ${lastErpShipment.externalDocNum}`
                    : ""}
                </p>
              </div>
              {lastErpShipment.httpStatus ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  HTTP {lastErpShipment.httpStatus}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {showPreviewResults && preview && metrics ? (
          <>
            <div className="flex flex-wrap justify-end gap-3">

              <button
                type="button"
                onClick={() => void saveReconciliation()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <FiSave className="h-4 w-4" />
                {selectedUpdateReconciliationId > 0
                  ? "Guardar comparacion"
                  : "Guardar conciliacion"}
              </button>
            </div>

            <MatchesSection
              preview={preview}
              manualMatches={manualMatches}
              unmatchedSystemRows={unmatchedSystemRows}
              unmatchedBankRows={unmatchedBankRows}
              onDragEnd={onDragEnd}
              onRemoveManualMatch={removeManualMatch}
              manualMatcherInitiallyOpen={!isLoadedWorkbench}
            />

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
              <Metric label="Sistema" value={String(metrics.totalSystemRows)} />
              <Metric label="Banco" value={String(metrics.totalBankRows)} />
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

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Conciliaciones guardadas
              </p>
              <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                Tabla de conciliaciones por cuenta
              </h3>
            </div>
          </div>

          {!selectedCompanyBankAccountId ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              Selecciona una cuenta bancaria para ver conciliaciones guardadas
              y parciales.
            </div>
          ) : savedReconciliations.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              Todavia no hay conciliaciones guardadas para esta cuenta.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Descripcion</th>
                      <th className="px-3 py-2">Plantilla</th>
                      <th className="px-3 py-2">Datos</th>
                      <th className="px-3 py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedReconciliations.map((item) => (
                      <SavedReconciliationRow
                        key={item.id}
                        reconciliation={item}
                        isCurrentLayout={item.layoutId === selectedLayoutId}
                        isSelected={item.id === selectedUpdateReconciliationId}
                        onLoad={() => void loadSavedReconciliation(item.id)}
                        onDelete={() => void handleDeleteReconciliation(item)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </section>

      <AppModal
        open={isErpModalOpen}
        onClose={closeErpModal}
        title="Guardar y enviar deposito al ERP"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={closeErpModal}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void sendToErp()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <FiSend className="h-4 w-4" /> Guardar y enviar
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Este flujo primero persiste la conciliacion actual y luego hace el
            POST <strong>Deposits</strong> al Service Layer del ERP
            seleccionado.
          </div>

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">
              Configuracion ERP
            </span>
            <select
              value={selectedCompanyErpConfigId}
              onChange={(event) =>
                setSelectedCompanyErpConfigId(Number(event.target.value))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              {companyErpConfigs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name}
                  {config.isDefault ? " - default" : ""}
                </option>
              ))}
            </select>
          </label>

          {selectedCompanyErpConfig ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Service Layer
                </p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                  {selectedCompanyErpConfig.serviceLayerUrl ?? "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  DB / TLS
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {selectedCompanyErpConfig.dbName ?? "-"} - TLS{" "}
                  {selectedCompanyErpConfig.tlsVersion ?? "-"}
                </p>
              </div>
            </div>
          ) : null}

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">
              Payload JSON para Deposits
            </span>
            <textarea
              value={erpPayloadText}
              onChange={(event) => setErpPayloadText(event.target.value)}
              rows={14}
              spellCheck={false}
              className="w-full rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-slate-100"
            />
          </label>

          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
            <div className="flex items-center gap-2 font-bold">
              <FiServer className="h-4 w-4" /> Endpoint fijo de esta primera
              version
            </div>
            <p className="mt-2 text-xs leading-6">
              El backend autentica contra <code>/Login</code> del Service Layer
              configurado y luego publica en <code>/Deposits</code> usando la
              configuracion ERP de la empresa.
            </p>
          </div>
        </div>
      </AppModal>
      <ConfirmModal
        open={confirmConfig.open}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, open: false }))}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        confirmVariant={confirmConfig.confirmVariant}
        onConfirm={confirmConfig.onConfirm}
      />
    </>
  );
}

function SavedReconciliationRow({
  reconciliation,
  isCurrentLayout,
  isSelected,
  onLoad,
  onDelete,
}: {
  reconciliation: ReconciliationSummary;
  isCurrentLayout: boolean;
  isSelected: boolean;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const statusPresentation = getConciliationStatusPresentation(
    reconciliation.status,
  );

  return (
    <tr
      className={`border-t border-slate-100 ${
        isSelected ? "bg-brand-50" : "bg-white hover:bg-slate-50"
      }`}
    >
      <td className="px-3 py-3 text-slate-600">
        {formatDateTime(reconciliation.updatedAt)}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${statusPresentation.badgeClassName}`}
          >
            {statusPresentation.label}
          </span>
          {isCurrentLayout ? (
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              Plantilla actual
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3">
        <p className="font-semibold text-slate-900">{reconciliation.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {reconciliation.companyBankAccountName ?? "Sin cuenta asociada"}{" "}
          {reconciliation.companyBankAccountNumber
            ? `- ${reconciliation.companyBankAccountNumber}`
            : ""}
        </p>
      </td>
      <td className="px-3 py-3 text-slate-600">
        <p>{reconciliation.layoutName}</p>
        <p className="mt-1 text-xs text-slate-500">{reconciliation.systemName}</p>
      </td>
      <td className="px-3 py-3 text-slate-600">
        {getConciliationDataSummary(
          reconciliation.hasSystemData,
          reconciliation.hasBankData,
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onLoad}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FiEye className="h-4 w-4" /> Cargar
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <FiTrash2 className="h-4 w-4" /> Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}
