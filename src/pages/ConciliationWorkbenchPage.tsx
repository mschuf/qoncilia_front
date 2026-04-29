import { FiRefreshCw, FiSearch, FiUploadCloud } from "react-icons/fi";
import MatchesSection from "../components/ConciliationWorkbench/MatchesSection";
import {
  Metric,
  SelectBlock,
  UploadCard,
} from "../components/ConciliationWorkbench/WorkbenchControls";
import useConciliationWorkbench from "../hooks/useConciliationWorkbench";
import type { BankStatementSummary } from "../types/conciliation";
import { isAdminRole } from "../utils/role";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
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
    selectedLayoutId,
    setSelectedLayoutId,
    layouts,
    selectedLayout,
    bankStatements,
    selectedBankStatementId,
    setSelectedBankStatementId,
    selectedBankStatement,
    systemFile,
    setSystemFile,
    preview,
    manualMatches,
    unmatchedSystemRows,
    unmatchedBankRows,
    metrics,
    onFileChange,
    runComparison,
    onDragEnd,
    removeManualMatch,
    clearAll,
    reloadBankStatements,
    page,
    setPage,
    totalPages,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  } = useConciliationWorkbench();

  const bankLabel = preview?.layout.bankLabel ?? selectedLayout?.bankLabel ?? "Banco";
  const systemLabel = preview?.layout.systemLabel ?? selectedLayout?.systemLabel ?? "Sistema";

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
          Conciliar
        </p>
        <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
          Comparar contra un extracto bancario guardado
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Selecciona banco, cuenta y layout, busca el extracto guardado, sube el Excel del sistema y revisa las coincidencias sin persistir datos del sistema.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
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
              {accounts.length === 0 ? <option value={0}>Sin cuentas para este banco</option> : null}
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
              label: `${item.name}${item.active ? " - activa" : ""}`,
            }))}
          />

          <div className="flex items-end xl:col-span-2">
            <button
              type="button"
              onClick={() => void reloadBankStatements()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <FiSearch className="h-4 w-4" /> Buscar extractos
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

        <div className="mt-5 grid gap-3 lg:grid-cols-4 items-end border-b border-slate-100 pb-5">
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Buscar extracto</span>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ej. Extracto Enero..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Desde</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Hasta</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <button
            type="button"
            onClick={() => { setPage(1); void reloadBankStatements(); }}
            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700"
          >
            <FiSearch className="h-4 w-4" /> Buscar
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
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
                    onSelect={() => setSelectedBankStatementId(statement.id)}
                  />
                ))}
                {bankStatements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                      No hay extractos guardados para los filtros elegidos.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
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
          <MatchesSection
            preview={preview}
            manualMatches={manualMatches}
            unmatchedSystemRows={unmatchedSystemRows}
            unmatchedBankRows={unmatchedBankRows}
            onDragEnd={onDragEnd}
            onRemoveManualMatch={removeManualMatch}
          />

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <Metric label={systemLabel} value={String(metrics.totalSystemRows)} />
            <Metric label={bankLabel} value={String(metrics.totalBankRows)} />
            <Metric label="Auto" value={String(metrics.autoMatches)} tone="emerald" />
            <Metric label="Manual" value={String(metrics.manualMatches)} tone="amber" />
            <Metric label="Pend. sistema" value={String(metrics.unmatchedSystem)} tone="rose" />
            <Metric label="Pend. banco" value={String(metrics.unmatchedBank)} tone="amber" />
            <Metric label="Match %" value={`${metrics.matchPercentage}%`} />
          </div>
        </>
      ) : null}
    </section>
  );
}

function StatementRow({
  statement,
  selected,
  onSelect,
}: {
  statement: BankStatementSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr className={`border-t border-slate-100 ${selected ? "bg-brand-50" : "bg-white hover:bg-slate-50"}`}>
      <td className="px-3 py-3 text-slate-600">{formatDateTime(statement.createdAt)}</td>
      <td className="px-3 py-3">
        <p className="font-semibold text-slate-900">{statement.bankAlias ?? statement.bankName}</p>
        <p className="mt-1 text-xs text-slate-500">{statement.companyBankAccountName} - {statement.companyBankAccountNumber}</p>
      </td>
      <td className="px-3 py-3">
        <p className="font-semibold text-slate-900">{statement.name}</p>
        <p className="mt-1 text-xs text-slate-500">{statement.fileName}</p>
      </td>
      <td className="px-3 py-3 text-slate-600">{statement.layoutName}</td>
      <td className="px-3 py-3 font-semibold text-slate-800">{statement.rowCount}</td>
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={onSelect}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
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
}
