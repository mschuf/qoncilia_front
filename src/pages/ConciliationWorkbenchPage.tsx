import {
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiDatabase,
  FiRefreshCw,
  FiSave,
  FiSend,
  FiServer,
  FiUploadCloud,
  FiX
} from "react-icons/fi"
import { Link } from "react-router-dom"
import MatchesSection from "../components/ConciliationWorkbench/MatchesSection"
import {
  KpiCard,
  Metric,
  SelectBlock,
  UploadCard
} from "../components/ConciliationWorkbench/WorkbenchControls"
import AppModal from "../components/AppModal"
import useConciliationWorkbench from "../hooks/useConciliationWorkbench"
import { isAdminRole } from "../utils/role"

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
    selectedLayoutId,
    setSelectedLayoutId,
    layouts,
    selectedLayout,
    systemFile,
    setSystemFile,
    bankFile,
    setBankFile,
    preview,
    manualMatches,
    unmatchedSystemRows,
    unmatchedBankRows,
    kpis,
    selectedUpdateReconciliationId,
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
    lastErpShipment
  } = useConciliationWorkbench()

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
                  A la izquierda va tu archivo del sistema y a la derecha el extracto del
                  banco. Los matches automaticos se marcan y el resto se puede emparejar
                  manualmente arrastrando.
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
          <div className="grid gap-3 lg:grid-cols-4">
            {isAdminRole(role) ? (
              <SelectBlock
                label="Usuario"
                value={selectedUserId}
                onChange={(value) => setSelectedUserId(Number(value))}
                options={users.map((item) => ({
                  value: Number(item.id),
                  label: `${item.usrLogin}${item.usrNombre ? ` - ${item.usrNombre}` : ""}`
                }))}
              />
            ) : null}

            <SelectBlock
              label="Banco"
              value={selectedBankId}
              onChange={(value) => setSelectedBankId(Number(value))}
              options={banks.map((item) => ({
                value: item.id,
                label: item.alias ?? item.bankName
              }))}
            />

            <SelectBlock
              label="Layout"
              value={selectedLayoutId}
              onChange={(value) => setSelectedLayoutId(Number(value))}
              options={layouts.map((item) => ({
                value: item.id,
                label: `${item.name}${item.active ? " - activo" : ""}`
              }))}
            />

            <div className="flex items-end gap-2">
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
                <p className="font-bold">Actualizando: {selectedReconciliationForUpdate.name}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-90">
                  <span>
                    <strong>Fecha:</strong>{" "}
                    {new Date(selectedReconciliationForUpdate.createdAt).toLocaleString()}
                  </span>
                  <span>
                    <strong>Layout:</strong> {selectedReconciliationForUpdate.layoutName}
                  </span>
                  <span>
                    <strong>Match actual:</strong>{" "}
                    {selectedReconciliationForUpdate.matchPercentage}%
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed opacity-75">
                  La conciliacion se actualizara de forma incremental para no duplicar lineas
                  ya guardadas y sumar solo los nuevos movimientos.
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
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Metric label="Sistema" value={String(metrics.totalSystemRows)} />
              <Metric label="Banco" value={String(metrics.totalBankRows)} />
              <Metric label="Auto" value={String(metrics.autoMatches)} tone="emerald" />
              <Metric label="Manual" value={String(metrics.manualMatches)} tone="amber" />
              <Metric label="Pendientes" value={String(metrics.unmatchedSystem)} tone="rose" />
              <Metric label="Match %" value={`${metrics.matchPercentage}%`} />
            </div>

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
            Este flujo primero persiste la conciliacion actual y luego hace el POST
            <strong> Deposits</strong> al Service Layer del ERP seleccionado.
          </div>

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Configuracion ERP</span>
            <select
              value={selectedCompanyErpConfigId}
              onChange={(event) => setSelectedCompanyErpConfigId(Number(event.target.value))}
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
            <span className="text-sm font-semibold text-slate-700">Payload JSON para Deposits</span>
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
              <FiServer className="h-4 w-4" /> Endpoint fijo de esta primera version
            </div>
            <p className="mt-2 text-xs leading-6">
              El backend autentica contra <code>/Login</code> del Service Layer configurado y
              luego publica en <code>/Deposits</code> usando la configuracion ERP de la empresa.
            </p>
          </div>
        </div>
      </AppModal>
    </>
  )
}
