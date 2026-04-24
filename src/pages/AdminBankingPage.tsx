import type { InputHTMLAttributes } from "react"
import { FiBriefcase, FiEdit3, FiPlus, FiRefreshCcw, FiSave } from "react-icons/fi"
import useCompanyBanking from "../hooks/useCompanyBanking"

export default function AdminBankingPage() {
  const {
    selectedCompany,
    banks,
    accounts,
    bankForm,
    accountForm,
    editingBankId,
    editingAccountId,
    onBankFieldChange,
    onAccountFieldChange,
    startCreateBank,
    startEditBank,
    saveBank,
    startCreateAccount,
    startEditAccount,
    saveAccount,
    reload,
    stats
  } = useCompanyBanking()

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
            Admin Operativo
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
            ABM de Bancos y Cuentas Bancarias
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Administra el catalogo de bancos y las cuentas de tu empresa con sus IDs ERP,
            sucursal y cuentas contables asociadas.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <MetricCard label="Bancos" value={String(stats.banks)} />
          <MetricCard label="Activos" value={String(stats.activeBanks)} accent="emerald" />
          <MetricCard label="Cuentas" value={String(stats.accounts)} accent="brand" />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="inline-flex min-w-[280px] flex-1 items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <FiBriefcase className="h-4 w-4" />
            {selectedCompany ? `${selectedCompany.name} (${selectedCompany.fiscalId})` : "Sin empresa"}
          </div>

          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FiRefreshCcw className="h-4 w-4" /> Recargar
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Bancos
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-slate-900">Catalogo de Bancos</h3>
            </div>
            <button
              type="button"
              onClick={startCreateBank}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <FiPlus className="h-4 w-4" /> Nuevo banco
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {banks.map((bank) => (
              <article key={bank.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{bank.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{bank.active ? "Activo" : "Inactivo"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditBank(bank)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
                  >
                    <FiEdit3 className="h-4 w-4" /> Editar
                  </button>
                </div>
              </article>
            ))}

            {banks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Todavia no hay bancos cargados.
              </div>
            ) : null}
          </div>

          <form onSubmit={saveBank} className="mt-6 space-y-4 rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-bold text-slate-900">
              {editingBankId ? "Editar banco" : "Crear banco"}
            </p>

            <Field
              label="Nombre Banco"
              name="name"
              value={bankForm.name}
              onChange={onBankFieldChange}
              placeholder="Banco Familiar"
              required
            />

            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="active" checked={bankForm.active} onChange={onBankFieldChange} />
              Banco activo
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <FiSave className="h-4 w-4" /> {editingBankId ? "Guardar banco" : "Crear banco"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Cuentas
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-slate-900">Cuentas Bancarias</h3>
            </div>
            <button
              type="button"
              onClick={startCreateAccount}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <FiPlus className="h-4 w-4" /> Nueva cuenta
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {accounts.map((account) => (
              <article key={account.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{account.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {account.bankName} · {account.accountNumber}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      ERP: {account.bankErpId} · Mayor: {account.majorAccountNumber}
                      {account.paymentAccountNumber ? ` · Pago: ${account.paymentAccountNumber}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditAccount(account)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
                  >
                    <FiEdit3 className="h-4 w-4" /> Editar
                  </button>
                </div>
              </article>
            ))}

            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Todavia no hay cuentas bancarias cargadas.
              </div>
            ) : null}
          </div>

          <form onSubmit={saveAccount} className="mt-6 space-y-4 rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-bold text-slate-900">
              {editingAccountId ? "Editar cuenta bancaria" : "Crear cuenta bancaria"}
            </p>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">ID Banco</span>
              <select
                name="bankId"
                value={accountForm.bankId}
                onChange={onAccountFieldChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                required
              >
                <option value="">Selecciona un banco</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Sucursal" name="branch" value={accountForm.branch} onChange={onAccountFieldChange} />
              <Field
                label="Nombre"
                name="name"
                value={accountForm.name}
                onChange={onAccountFieldChange}
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Nro de Cuenta"
                name="accountNumber"
                value={accountForm.accountNumber}
                onChange={onAccountFieldChange}
                required
              />
              <Field
                label="ID Banco ERP"
                name="bankErpId"
                value={accountForm.bankErpId}
                onChange={onAccountFieldChange}
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Nro de Cuenta Mayor"
                name="majorAccountNumber"
                value={accountForm.majorAccountNumber}
                onChange={onAccountFieldChange}
                required
              />
              <Field
                label="Nro de Cuenta Pago"
                name="paymentAccountNumber"
                value={accountForm.paymentAccountNumber}
                onChange={onAccountFieldChange}
              />
            </div>

            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                name="active"
                checked={accountForm.active}
                onChange={onAccountFieldChange}
              />
              Cuenta activa
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <FiSave className="h-4 w-4" /> {editingAccountId ? "Guardar cuenta" : "Crear cuenta"}
            </button>
          </form>
        </section>
      </div>
    </section>
  )
}

function MetricCard({
  label,
  value,
  accent = "slate"
}: {
  label: string
  value: string
  accent?: "slate" | "emerald" | "brand"
}) {
  const accentClasses = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    brand: "border-brand-200 bg-brand-50 text-brand-800"
  } as const

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClasses[accent]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  )
}

function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />
    </label>
  )
}
