import {
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiDatabase,
  FiRefreshCw,
  FiSave,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import MatchesSection from "../components/ConciliationWorkbench/MatchesSection";
import { isAdminRole } from "../utils/role";
import {
  KpiCard,
  Metric,
  SelectBlock,
  UploadCard,
} from "../components/ConciliationWorkbench/WorkbenchControls";
import useConciliationWorkbench from "../hooks/useConciliationWorkbench";

export default function ConciliationWorkbenchPage() {
  const {
    role,
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
    history,
    availableReconciliationsForUpdate,
    selectedUpdateReconciliationId,
    setSelectedUpdateReconciliationId,
    selectedReconciliationForUpdate,
    clearUpdateSelection,
    metrics,
    onFileChange,
    clearAll,
    runPreview,
    onDragEnd,
    removeManualMatch,
    saveReconciliation,
  } = useConciliationWorkbench();

  return (
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
                A la izquierda va tu archivo del sistema y a la derecha el extracto
                del banco. Los matches automaticos se marcan y el resto se puede
                emparejar manualmente arrastrando.
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

          <SelectBlock
            label="Layout"
            value={selectedLayoutId}
            onChange={(value) => setSelectedLayoutId(Number(value))}
            options={layouts.map((item) => ({
              value: item.id,
              label: `${item.name}${item.active ? " - activo" : ""}`,
            }))}
          />



          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={runPreview}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <FiUploadCloud className="h-4 w-4" /> Conciliar
            </button>
            <button
              type="button"
              onClick={clearAll}
              title="Limpiar todo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <UploadCard
            title={selectedLayout?.systemLabel ?? "Sistema"}
            file={systemFile}
            onChange={onFileChange(setSystemFile)}
            onClear={() => setSystemFile(null)}
          />
          <UploadCard
            title={selectedLayout?.bankLabel ?? "Banco"}
            file={bankFile}
            onChange={onFileChange(setBankFile)}
            onClear={() => setBankFile(null)}
          />
        </div>

        {selectedReconciliationForUpdate ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div>
              <p className="font-bold">
                Actualizando: {selectedReconciliationForUpdate.name}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-90">
                <span>
                  <strong>Fecha:</strong>{" "}
                  {new Date(selectedReconciliationForUpdate.createdAt).toLocaleString()}
                </span>
                <span>
                  <strong>Layout:</strong> {selectedReconciliationForUpdate.layoutName}
                </span>
                <span>
                  <strong>Match actual:</strong> {selectedReconciliationForUpdate.matchPercentage}%
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed opacity-75">
                La conciliacion se actualizara de forma incremental para no
                duplicar lineas ya guardadas y sumar solo los nuevos movimientos.
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveReconciliation}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <FiSave className="h-4 w-4" />{" "}
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
  );
}
