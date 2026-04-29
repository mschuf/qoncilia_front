import { useState, type InputHTMLAttributes } from "react"
import {
  FiBriefcase,
  FiCheckCircle,
  FiCreditCard,
  FiEdit3,
  FiMapPin,
  FiRefreshCcw,
  FiSave,
  FiShield,
  FiTrash2,
  FiUsers
} from "react-icons/fi"
import ConfirmModal from "../components/ConfirmModal"
import useCompanyBanking from "../hooks/useCompanyBanking"
import type { PublicBank, PublicCompanyBankAccount } from "../types/banking"

type BankingWorkspaceMode = "combined" | "banks" | "accounts"

export default function AdminBankingPage({
  mode = "combined"
}: {
  mode?: BankingWorkspaceMode
}) {
  const [deleteBankTarget, setDeleteBankTarget] = useState<PublicBank | null>(null)
  const [deleteAccountTarget, setDeleteAccountTarget] =
    useState<PublicCompanyBankAccount | null>(null)
  const {
    selectedCompany,
    selectedCompanyId,
    companies,
    availableUsers,
    changeCompany,
    banks,
    currencies,
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
    deleteBank,
    resetBankForm,
    startEditAccount,
    saveAccount,
    deleteAccount,
    resetAccountForm,
    reload,
    stats
  } = useCompanyBanking()

  const showBanks = mode !== "accounts"
  const showAccounts = mode !== "banks"
  const headerCopy = {
    combined: {
      eyebrow: "Admin Operativo",
      title: "Bancos y cuentas bancarias",
      description:
        "Crea bancos vinculados a un usuario responsable, define su sucursal una sola vez y administra las cuentas de tu empresa dentro de cada banco desde un flujo mas claro."
    },
    banks: {
      eyebrow: "Banco",
      title: "Cargar Banco",
      description:
        "Registra y administra los bancos disponibles para operar extractos y plantillas."
    },
    accounts: {
      eyebrow: "Banco",
      title: "Cuentas Bancarias",
      description:
        "Administra las cuentas asociadas a cada banco, su moneda y sus datos contables para ERP."
    }
  }[mode]

  const handleDeleteBank = async () => {
    if (!deleteBankTarget) return
    await deleteBank(deleteBankTarget.id)
    setDeleteBankTarget(null)
  }

  const handleDeleteAccount = async () => {
    if (!deleteAccountTarget) return
    await deleteAccount(deleteAccountTarget.id)
    setDeleteAccountTarget(null)
  }

  return (
    <>
      <section className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
              {headerCopy.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
              {headerCopy.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {headerCopy.description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            {showBanks ? (
              <>
                <MetricCard label="Bancos" value={String(stats.banks)} icon={FiBriefcase} />
                <MetricCard label="Bancos activos" value={String(stats.activeBanks)} icon={FiCheckCircle} accent="emerald" />
              </>
            ) : null}
            {showAccounts ? (
              <>
                <MetricCard label="Cuentas" value={String(stats.accounts)} icon={FiCreditCard} />
                <MetricCard label="Cuentas activas" value={String(stats.activeAccounts)} icon={FiShield} accent="brand" />
              </>
            ) : null}
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

        <div
          className={
            showBanks && showAccounts
              ? "grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]"
              : "grid gap-6"
          }
        >
          {showBanks ? (
            <section
              className={
                mode === "banks"
                  ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start"
                  : "space-y-4"
              }
            >
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
                        className={`rounded-2xl border p-4 transition ${isSelected
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
                              {bank.alias ?? `Responsable ${bank.userLogin}`}
                            </p>
                            <p className={`mt-1 text-xs ${isSelected ? "text-white/60" : "text-slate-400"}`}>
                              {bank.userLogin}
                              {bank.branch ? ` | Sucursal ${bank.branch}` : ""}
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

                          <div className="flex shrink-0 flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => startEditBank(bank)}
                              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${isSelected
                                  ? "border-white/20 text-white hover:bg-white/10"
                                  : "border-slate-200 text-slate-600 hover:bg-white"
                                }`}
                            >
                              <FiEdit3 className="h-4 w-4" /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteBankTarget(bank)}
                              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${isSelected
                                  ? "border-rose-200/40 text-rose-100 hover:bg-white/10"
                                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                }`}
                            >
                              <FiTrash2 className="h-4 w-4" /> Eliminar
                            </button>
                          </div>
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
                  <label className="space-y-1.5">
                    <span className="text-sm font-semibold text-slate-700">Usuario responsable</span>
                    <select
                      name="userId"
                      value={bankForm.userId}
                      onChange={onBankFieldChange}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      required
                    >
                      <option value="">Selecciona un usuario</option>
                      {availableUsers.map((item) => (
                        <option key={item.id} value={Number(item.id)}>
                          {item.usrLogin}
                          {item.usrNombre ? ` - ${item.usrNombre}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Field
                    label="Nombre del banco"
                    name="name"
                    value={bankForm.name}
                    onChange={onBankFieldChange}
                    placeholder="Banco Familiar"
                    required
                  />

                  <Field
                    label="Alias"
                    name="alias"
                    value={bankForm.alias}
                    onChange={onBankFieldChange}
                    placeholder="Familiar GS"
                  />

                  <Field
                    label="Sucursal"
                    name="branch"
                    value={bankForm.branch}
                    onChange={onBankFieldChange}
                    placeholder="Casa matriz"
                  />

                  <Field
                    label="Descripcion"
                    name="description"
                    value={bankForm.description}
                    onChange={onBankFieldChange}
                    placeholder="Banco principal para plantillas y cuentas"
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
          ) : null}

          {showAccounts ? (
            <section
              className={
                mode === "accounts"
                  ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start"
                  : "space-y-4"
              }
            >
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

                <div className="mt-5 space-y-4">
                  {selectedBank && visibleAccounts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                      Este banco todavia no tiene cuentas cargadas.
                    </div>
                  ) : null}

                  {selectedBank ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {visibleAccounts.map((account) => (
                        <article key={account.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900">{account.name}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">
                                  {account.currency}
                                </span>
                                <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">
                                  Cuenta {account.accountNumber}
                                </span>
                                <span className={`rounded-full px-2.5 py-1 font-semibold ${account.active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                  }`}>
                                  {account.active ? "Activa" : "Inactiva"}
                                </span>
                              </div>
                              <p className="mt-3 text-xs leading-5 text-slate-500">
                                ERP: {account.bankErpId} | Mayor: {account.majorAccountNumber}
                                {account.paymentAccountNumber ? ` | Pago: ${account.paymentAccountNumber}` : ""}
                              </p>
                            </div>

                            <div className="flex shrink-0 flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => startEditAccount(account)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                              >
                                <FiEdit3 className="h-4 w-4" /> Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteAccountTarget(account)}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                <FiTrash2 className="h-4 w-4" /> Eliminar
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
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
                          {bank.alias ?? bank.name} - {bank.userLogin}
                          {bank.branch ? ` - ${bank.branch}` : ""}
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
                    <label className="space-y-1.5">
                      <span className="text-sm font-semibold text-slate-700">Moneda</span>
                      <select
                        name="currency"
                        value={accountForm.currency}
                        onChange={onAccountFieldChange}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        required
                      >
                        {currencies.length === 0 ? <option value="PYG">PYG - Guarani paraguayo</option> : null}
                        {currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
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
          ) : null}
        </div>
      </section>

      <ConfirmModal
        open={Boolean(deleteBankTarget)}
        onClose={() => setDeleteBankTarget(null)}
        title="Eliminar banco"
        message={`Seguro que quieres eliminar el banco "${deleteBankTarget?.alias ?? deleteBankTarget?.name ?? ""}"? Tambien se eliminaran sus datos dependientes cuando la base lo permita.`}
        confirmLabel="Eliminar banco"
        confirmVariant="danger"
        onConfirm={() => void handleDeleteBank()}
      />

      <ConfirmModal
        open={Boolean(deleteAccountTarget)}
        onClose={() => setDeleteAccountTarget(null)}
        title="Eliminar cuenta bancaria"
        message={`Seguro que quieres eliminar la cuenta "${deleteAccountTarget?.name ?? ""}"? No se podra eliminar si tiene extractos o conciliaciones asociadas.`}
        confirmLabel="Eliminar cuenta"
        confirmVariant="danger"
        onConfirm={() => void handleDeleteAccount()}
      />
    </>
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

function BankContextTile({
  icon: Icon,
  label,
  value,
  helper,
  accent = "slate"
}: {
  icon: typeof FiBriefcase
  label: string
  value: string
  helper: string
  accent?: "slate" | "emerald" | "amber"
}) {
  const accentClasses = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900"
  } as const

  return (
    <div className={`rounded-2xl border p-4 ${accentClasses[accent]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-sm font-extrabold">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-2 text-slate-600 shadow-sm">
          <Icon className="h-4 w-4" />
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
