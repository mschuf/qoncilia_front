import { useMemo } from "react";
import {
  FiAlertCircle,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDatabase,
  FiRefreshCw,
  FiSave,
  FiSend,
  FiServer,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import MatchesSection from "../components/ConciliationWorkbench/MatchesSection";
import {
  KpiCard,
  Metric,
  SelectBlock,
  UploadCard,
} from "../components/ConciliationWorkbench/WorkbenchControls";
import AppModal from "../components/AppModal";
import useConciliationWorkbench from "../hooks/useConciliationWorkbench";
import type { ReconciliationSummary } from "../types/conciliation";
import {
  getConciliationDataSummary,
  getConciliationStatusPresentation,
  isPendingConciliationStatus,
} from "../utils/conciliationStatus";
import { isAdminRole } from "../utils/role";

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
    selectedCompanyBankAccount,
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
    availableReconciliationsForUpdate,
    reconciliationsForSelectedBankAccount,
    selectedUpdateReconciliationId,
    loadSavedReconciliation,
    selectedReconciliationForUpdate,
    clearUpdateSelection,
    metrics,
    onFileChange,
    clearAll,
    runPreview,
    onDragEnd,
    removeManualMatch,
    saveReconciliation,
    saveFileData,
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
  } = useConciliationWorkbench();

  const savedReconciliations = useMemo(
    () =>
      [...reconciliationsForSelectedBankAccount].sort((left, right) => {
        const pendingDifference =
          Number(isPendingConciliationStatus(right.status)) -
          Number(isPendingConciliationStatus(left.status));
        if (pendingDifference !== 0) return pendingDifference;

        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      }),
    [reconciliationsForSelectedBankAccount]
  );

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
                  Subi dos Excel y comparalos por layout
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  A la izquierda va tu archivo del sistema y a la derecha el
                  extracto del banco. Los matches automaticos se marcan y el
                  resto se puede emparejar manualmente arrastrando.
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
              label="Auto-match"
              value={String(kpis?.totalAutoMatches ?? 0)}
              icon={FiCheckCircle}
            />
            <KpiCard
              label="Manual-match"
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
              <span className="text-sm font-semibold text-slate-700">Cuenta bancaria</span>
              <select
                value={selectedCompanyBankAccountId}
                onChange={(event) => setSelectedCompanyBankAccountId(Number(event.target.value))}
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
              label="Layout"
              value={selectedLayoutId}
              onChange={(value) => setSelectedLayoutId(Number(value))}
              options={layouts.map((item) => ({
                value: item.id,
                label: `${item.name}${item.active ? " - activo" : ""}`,
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

            <div className="flex items-end gap-2 xl:justify-end">
              <button
                type="button"
                onClick={clearAll}
                title="Limpiar todo"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <FiRefreshCw className="h-4 w-4" /> Limpiar
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Cuenta seleccionada
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {selectedCompanyBankAccount
                  ? `${selectedCompanyBankAccount.name} - ${selectedCompanyBankAccount.accountNumber}`
                  : "Selecciona una cuenta bancaria"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedCompanyBankAccount
                  ? `${selectedCompanyBankAccount.bankAlias ?? selectedCompanyBankAccount.bankName} · ${selectedCompanyBankAccount.currency}`
                  : "La conciliacion ahora se guarda por cuenta, no solo por banco."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Scope actual
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {selectedLayout ? `${selectedLayout.name} · ${selectedLayout.systemName}` : "Sin layout"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedLayout
                  ? `${selectedLayout.bankLabel} vs ${selectedLayout.systemLabel}`
                  : "Elige el layout con el que vas a comparar."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Guardadas en este layout
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {availableReconciliationsForUpdate.length} conciliacion(es)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {savedReconciliations.length > 0
                  ? "Puedes cargar una guardada para continuar conciliando o actualizarla."
                  : "Todavia no hay registros guardados para esta cuenta."}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Conciliaciones guardadas
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                  Carga rapida de sistema, banco y comparaciones parciales
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Aqui ves rapido lo que ya se guardo para el banco y la cuenta elegidos, incluso
                  si solo existe el lado del sistema o del banco.
                </p>
              </div>
              {selectedCompanyBankAccount ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">
                    {selectedCompanyBankAccount.name}
                  </p>
                  <p className="mt-1 text-xs">
                    {selectedCompanyBankAccount.accountNumber} · {selectedCompanyBankAccount.currency}
                  </p>
                </div>
              ) : null}
            </div>

            {!selectedCompanyBankAccountId ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                Selecciona una cuenta bancaria para ver conciliaciones guardadas y parciales.
              </div>
            ) : savedReconciliations.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                Todavia no hay conciliaciones guardadas para este banco y cuenta.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {savedReconciliations.map((item) => (
                  <SavedReconciliationCard
                    key={item.id}
                    reconciliation={item}
                    isCurrentLayout={item.layoutId === selectedLayoutId}
                    isSelected={item.id === selectedUpdateReconciliationId}
                    onLoad={() => void loadSavedReconciliation(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <UploadCard
              title={selectedLayout?.bankLabel ?? "Banco"}
              file={bankFile}
              onChange={onFileChange(setBankFile)}
              onClear={() => setBankFile(null)}
              onSave={() => void saveFileData("bank")}
            />
            <UploadCard
              title={selectedLayout?.systemLabel ?? "Sistema"}
              file={systemFile}
              onChange={onFileChange(setSystemFile)}
              onClear={() => setSystemFile(null)}
              onSave={() => void saveFileData("system")}
            />
          </div>

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={runPreview}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-700/25"
            >
              <FiUploadCloud className="h-4 w-4" /> Comparar
            </button>
          </div>

          {selectedReconciliationForUpdate ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div>
                <p className="font-bold">
                  Actualizando: {selectedReconciliationForUpdate.name}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-90">
                  <span>
                    <strong>Estado:</strong>{" "}
                    {getConciliationStatusPresentation(selectedReconciliationForUpdate.status).label}
                  </span>
                  <span>
                    <strong>Fecha:</strong>{" "}
                    {new Date(
                      selectedReconciliationForUpdate.createdAt,
                    ).toLocaleString()}
                  </span>
                  <span>
                    <strong>Layout:</strong>{" "}
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
                  <span>
                    <strong>Match actual:</strong>{" "}
                    {selectedReconciliationForUpdate.matchPercentage}%
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed opacity-75">
                  La conciliacion se actualizara de forma incremental para no
                  duplicar lineas ya guardadas y sumar solo los nuevos
                  movimientos.
                </p>
              </div>
              <button
                type="button"
                onClick={clearUpdateSelection}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-200"
              >
                <FiX className="h-4 w-4" /> Cancelar actualizacion
              </button>
            </div>
          ) : null}

          {lastErpShipment ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">
                    Ultimo envio ERP: {lastErpShipment.companyErpConfigName}
                  </p>
                  <p className="mt-1 text-xs opacity-90">
                    Estado {lastErpShipment.status}
                    {lastErpShipment.externalDocEntry
                      ? ` · DocEntry ${lastErpShipment.externalDocEntry}`
                      : ""}
                    {lastErpShipment.externalDocNum
                      ? ` · DocNum ${lastErpShipment.externalDocNum}`
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
        </div>

        {preview && metrics ? (
          <>
            <div className="flex flex-wrap justify-end gap-3">
              {canUseErp ? (
                <button
                  type="button"
                  onClick={openErpModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-100"
                >
                  <FiSend className="h-4 w-4" /> Guardar y enviar a ERP
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void saveReconciliation()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <FiSave className="h-4 w-4" />
                {selectedUpdateReconciliationId > 0
                  ? "Actualizar conciliacion"
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
            />

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
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
            POST
            <strong> Deposits</strong> al Service Layer del ERP seleccionado.
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
                  {selectedCompanyErpConfig.dbName ?? "-"} · TLS{" "}
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
    </>
  );
}

function SavedReconciliationCard({
  reconciliation,
  isCurrentLayout,
  isSelected,
  onLoad,
}: {
  reconciliation: ReconciliationSummary
  isCurrentLayout: boolean
  isSelected: boolean
  onLoad: () => void
}) {
  const statusPresentation = getConciliationStatusPresentation(reconciliation.status)

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        isSelected
          ? "border-brand-300 bg-brand-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{reconciliation.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {reconciliation.layoutName} · {reconciliation.systemName}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${statusPresentation.badgeClassName}`}
          >
            {statusPresentation.label}
          </span>
          {isCurrentLayout ? (
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              Layout actual
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Cuenta
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {reconciliation.companyBankAccountName ?? "Sin cuenta asociada"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {reconciliation.companyBankAccountNumber ?? "-"} ·{" "}
            {reconciliation.companyBankAccountCurrency ?? "-"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Datos guardados
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {getConciliationDataSummary(
              reconciliation.hasSystemData,
              reconciliation.hasBankData
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500">{statusPresentation.description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>Match {reconciliation.matchPercentage}%</span>
        <span>Actualizaciones {reconciliation.updateCount}</span>
        <span>Ultima carga {new Date(reconciliation.updatedAt).toLocaleString()}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {reconciliation.systemFileName || reconciliation.bankFileName
            ? `Archivos: ${reconciliation.systemFileName ?? "sin sistema"} / ${reconciliation.bankFileName ?? "sin banco"}`
            : "Sin nombres de archivo guardados"}
        </div>
        <button
          type="button"
          onClick={onLoad}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {isSelected ? <FiRefreshCw className="h-4 w-4" /> : <FiCreditCard className="h-4 w-4" />}
          {isSelected ? "Recargar en mesa" : "Cargar en mesa"}
        </button>
      </div>
    </article>
  )
}
