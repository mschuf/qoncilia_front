import type { InputHTMLAttributes } from "react"
import {
  FiBriefcase,
  FiCheckCircle,
  FiCreditCard,
  FiEdit3,
  FiMapPin,
  FiRefreshCcw,
  FiSave,
  FiShield
} from "react-icons/fi"
import useCompanyBanking from "../hooks/useCompanyBanking"

export default function AdminBankingPage() {
  const {
    selectedCompany,
    selectedCompanyId,
    companies,
    changeCompany,
    banks,
    selectedBankId,
    selectedBank,
    visibleAccounts,
    accountCountByBank,
    bankForm,
    accountForm,
    editingBankId,
    editingAccountId,
    onBankFieldChange,
    onAccountFieldChange,
    selectBank,
    startEditBank,
    saveBank,
    resetBankForm,
    startEditAccount,
    saveAccount,
    resetAccountForm,
    reload,
    stats
  } = useCompanyBanking()

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
            Admin Operativo
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
            Bancos y cuentas bancarias
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Crea bancos, define su sucursal una sola vez y administra las cuentas de tu empresa
            dentro de cada banco desde un flujo mas claro.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <MetricCard label="Bancos" value={String(stats.banks)} icon={FiBriefcase} />
          <MetricCard label="Bancos activos" value={String(stats.activeBanks)} icon={FiCheckCircle} accent="emerald" />
          <MetricCard label="Cuentas" value={String(stats.accounts)} icon={FiCreditCard} />
          <MetricCard label="Cuentas activas" value={String(stats.activeAccounts)} icon={FiShield} accent="brand" />
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          {companies.length > 1 ? (
            <label className="min-w-[280px] flex-1 space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Empresa</span>
              <select
                value={selectedCompanyId}
                onChange={(e) => changeCompany(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} (ID: {company.fiscalId})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="min-w-[280px] flex-1 rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Mi empresa</p>
              <p className="mt-2 text-lg font-extrabold text-slate-900">
                {selectedCompany?.name ?? "Sin empresa"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                ID fiscal: {selectedCompany?.fiscalId ?? "-"}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void reload(selectedCompanyId)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FiRefreshCcw className="h-4 w-4" /> Recargar
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Paso 1
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">Bancos de la empresa</h3>
              </div>
              <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
                <FiBriefcase className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {banks.map((bank) => {
                const isSelected = bank.id === selectedBankId
                const accountCount = accountCountByBank.get(bank.id) ?? 0

                return (
                  <article
                    key={bank.id}
                    className={`rounded-2xl border p-4 transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                        : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => selectBank(bank.id)}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm font-bold">{bank.name}</p>
                        <p className={`mt-1 text-xs ${isSelected ? "text-white/75" : "text-slate-500"}`}>
                          {bank.branch ? `Sucursal ${bank.branch}` : "Sin sucursal definida"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                          <span className={`rounded-full px-3 py-1 ${isSelected ? "bg-white/15 text-white" : "bg-white text-slate-600"}`}>
                            {accountCount} cuenta(s)
                          </span>
                          <span className={`rounded-full px-3 py-1 ${bank.active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {bank.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditBank(bank)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          isSelected
                            ? "border-white/20 text-white hover:bg-white/10"
                            : "border-slate-200 text-slate-600 hover:bg-white"
                        }`}
                      >
                        <FiEdit3 className="h-4 w-4" /> Editar
                      </button>
                    </div>
                  </article>
                )
              })}

              {banks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Todavia no hay bancos cargados. Usa el formulario de abajo para crear el primero.
                </div>
              ) : null}
            </div>
          </div>

          <form onSubmit={saveBank} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {editingBankId ? "Edicion" : "Alta"}
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                  {editingBankId ? "Editar banco" : "Crear banco"}
                </h3>
              </div>

              {editingBankId ? (
                <button
                  type="button"
                  onClick={resetBankForm}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
              ) : null}
            </div>

            <div className="mt-6 space-y-4">
              <Field
                label="Nombre del banco"
                name="name"
                value={bankForm.name}
                onChange={onBankFieldChange}
                placeholder="Banco Familiar"
                required
              />

              <Field
                label="Sucursal"
                name="branch"
                value={bankForm.branch}
                onChange={onBankFieldChange}
                placeholder="Casa matriz"
              />

              <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" name="active" checked={bankForm.active} onChange={onBankFieldChange} />
                Banco activo
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <FiSave className="h-4 w-4" /> {editingBankId ? "Guardar banco" : "Crear banco"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Paso 2
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                  Cuentas del banco seleccionado
                </h3>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {selectedBank ? `${visibleAccounts.length} cuenta(s) en ${selectedBank.name}` : "Selecciona un banco"}
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-brand-50/40 p-5">
              {selectedBank ? (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Banco activo
                    </p>
                    <h4 className="mt-2 text-2xl font-extrabold text-slate-900">{selectedBank.name}</h4>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
                        <FiMapPin className="h-4 w-4" />
                        {selectedBank.branch ?? "Sin sucursal"}
                      </span>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${
                        selectedBank.active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {selectedBank.active ? "Banco activo" : "Banco inactivo"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => startEditBank(selectedBank)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <FiEdit3 className="h-4 w-4" /> Editar banco
                  </button>
                </div>
              ) : (
                <div className="text-sm leading-6 text-slate-600">
                  Primero crea o selecciona un banco. La sucursal ya no vive en la cuenta bancaria:
                  ahora se administra directamente en la ficha del banco.
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3">
              {selectedBank && visibleAccounts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Este banco todavia no tiene cuentas cargadas.
                </div>
              ) : null}

              {!selectedBank ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Selecciona un banco para ver y administrar sus cuentas.
                </div>
              ) : null}

              {visibleAccounts.map((account) => (
                <article key={account.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{account.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Cuenta {account.accountNumber}
                        {account.bankBranch ? ` | Sucursal ${account.bankBranch}` : ""}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        ERP: {account.bankErpId} | Mayor: {account.majorAccountNumber}
                        {account.paymentAccountNumber ? ` | Pago: ${account.paymentAccountNumber}` : ""}
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
            </div>
          </div>

          <form onSubmit={saveAccount} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {editingAccountId ? "Edicion" : "Alta"}
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                  {editingAccountId ? "Editar cuenta bancaria" : "Crear cuenta bancaria"}
                </h3>
              </div>

              {editingAccountId ? (
                <button
                  type="button"
                  onClick={resetAccountForm}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
              ) : null}
            </div>

            <div className="mt-6 space-y-4">
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">Banco</span>
                <select
                  name="bankId"
                  value={accountForm.bankId}
                  onChange={onAccountFieldChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  required
                >
                  <option value="">Selecciona un banco</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}{bank.branch ? ` - ${bank.branch}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Nombre de la cuenta"
                  name="name"
                  value={accountForm.name}
                  onChange={onAccountFieldChange}
                  required
                />
                <Field
                  label="Numero de cuenta"
                  name="accountNumber"
                  value={accountForm.accountNumber}
                  onChange={onAccountFieldChange}
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="ID banco ERP"
                  name="bankErpId"
                  value={accountForm.bankErpId}
                  onChange={onAccountFieldChange}
                  required
                />
                <Field
                  label="Cuenta mayor"
                  name="majorAccountNumber"
                  value={accountForm.majorAccountNumber}
                  onChange={onAccountFieldChange}
                  required
                />
              </div>

              <Field
                label="Cuenta de pago"
                name="paymentAccountNumber"
                value={accountForm.paymentAccountNumber}
                onChange={onAccountFieldChange}
              />

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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <FiSave className="h-4 w-4" /> {editingAccountId ? "Guardar cuenta" : "Crear cuenta"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent = "slate"
}: {
  label: string
  value: string
  icon: typeof FiBriefcase
  accent?: "slate" | "emerald" | "brand"
}) {
  const accentClasses = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    brand: "border-brand-200 bg-brand-50 text-brand-800"
  } as const

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClasses[accent]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3 text-slate-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
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
