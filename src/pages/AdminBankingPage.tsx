import type { InputHTMLAttributes } from "react"
import {
  FiBriefcase,
  FiCheckCircle,
  FiCheckSquare,
  FiCreditCard,
  FiEdit3,
  FiLayers,
  FiLink2,
  FiMapPin,
  FiRefreshCcw,
  FiSave,
  FiShield,
  FiSquare,
  FiUsers
} from "react-icons/fi"
import useCompanyBanking from "../hooks/useCompanyBanking"
import useGestorBankAssignments from "../hooks/useGestorBankAssignments"

export default function AdminBankingPage() {
  const {
    selectedCompany,
    selectedCompanyId,
    companies,
    availableUsers,
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
  const {
    gestorUsers,
    sourceBanks,
    selectedGestorUser,
    selectedGestorUserId,
    setSelectedGestorUserId,
    selectedSourceBank,
    selectedSourceBankId,
    setSelectedSourceBankId,
    selectedLayouts,
    selectedLayoutIds,
    mirroredAccounts,
    allLayoutsSelected,
    toggleLayout,
    toggleAllLayouts,
    syncAssignments,
    loadCatalog: loadGestorCatalog,
    lastSyncResult,
    syncing
  } = useGestorBankAssignments()

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
            Crea bancos vinculados a un usuario responsable, define su sucursal una sola vez
            y administra las cuentas de tu empresa dentro de cada banco desde un flujo mas claro.
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
                placeholder="Banco principal para layouts y cuentas"
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
                      {selectedBank.alias ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
                          Alias {selectedBank.alias}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
                        <FiMapPin className="h-4 w-4" />
                        {selectedBank.branch ?? "Sin sucursal"}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
                        Responsable {selectedBank.userLogin}
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
                        Cuenta {account.accountNumber} | {account.currency}
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
                <Field
                  label="Moneda"
                  name="currency"
                  value={accountForm.currency}
                  onChange={onAccountFieldChange}
                  required
                />
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
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Paso 3
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900">
              Asignacion de bancos y layouts a gestores
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              El admin puede tomar uno de sus bancos, elegir que layouts habilitar y replicar
              automaticamente ese banco con sus mismas cuentas sobre un usuario gestor.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadGestorCatalog()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FiRefreshCcw className="h-4 w-4" /> Recargar asignaciones
          </button>
        </div>

        {gestorUsers.length === 0 || sourceBanks.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {gestorUsers.length === 0
              ? "No hay usuarios gestores disponibles para asignar."
              : "No hay bancos origen disponibles para sincronizar a gestores."}
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
            <section className="space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
                    <FiUsers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Gestor destino
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedGestorUser?.login ?? "Selecciona un gestor"}
                    </p>
                  </div>
                </div>

                <label className="mt-4 block space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Usuario gestor</span>
                  <select
                    value={selectedGestorUserId}
                    onChange={(event) => setSelectedGestorUserId(Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    {gestorUsers.map((gestor) => (
                      <option key={gestor.id} value={gestor.id}>
                        {gestor.login}
                        {gestor.fullName ? ` - ${gestor.fullName}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">
                    {selectedGestorUser?.fullName ?? "Sin nombre completo"}
                  </p>
                  <p className="mt-1 text-xs">
                    {selectedGestorUser?.creatorUserLogin
                      ? `Creado por ${selectedGestorUser.creatorUserLogin}`
                      : "Sin admin creador visible"}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
                    <FiBriefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Banco origen
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedSourceBank?.alias ?? selectedSourceBank?.bankName ?? "Selecciona un banco"}
                    </p>
                  </div>
                </div>

                <label className="mt-4 block space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Banco a replicar</span>
                  <select
                    value={selectedSourceBankId}
                    onChange={(event) => setSelectedSourceBankId(Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    {sourceBanks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.alias ?? bank.bankName} - {bank.userLogin}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>
                    <strong>Layouts:</strong> {selectedLayouts.length}
                  </p>
                  <p>
                    <strong>Cuentas a espejar:</strong> {mirroredAccounts.length}
                  </p>
                  <p>
                    <strong>Sucursal:</strong> {selectedSourceBank?.branch ?? "Sin sucursal"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-brand-50/30 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Layouts habilitados
                  </p>
                  <h4 className="mt-2 text-lg font-extrabold text-slate-900">
                    Elige que layouts hereda el gestor
                  </h4>
                  <p className="mt-2 text-sm text-slate-600">
                    Las cuentas del banco se replican completas. Aqui decides solo los layouts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleAllLayouts}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  {allLayoutsSelected ? <FiSquare className="h-4 w-4" /> : <FiCheckSquare className="h-4 w-4" />}
                  {allLayoutsSelected ? "Quitar todos" : "Seleccionar todos"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {selectedLayouts.map((layout) => {
                  const checked = selectedLayoutIds.includes(layout.id)

                  return (
                    <label
                      key={layout.id}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        checked
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLayout(layout.id)}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold">{layout.name}</p>
                          <p className={`mt-1 text-xs ${checked ? "text-white/75" : "text-slate-500"}`}>
                            {layout.systemName} · {layout.bankLabel}
                          </p>
                          <p className={`mt-2 text-xs leading-5 ${checked ? "text-white/70" : "text-slate-500"}`}>
                            {layout.description ?? "Sin descripcion"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
                            <span className={`rounded-full px-2.5 py-1 ${checked ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>
                              {layout.active ? "Activo" : "Secundario"}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 ${checked ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>
                              {layout.mappings.length} mapping(s)
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
                    <FiLink2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Resumen
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-slate-900">
                      Banco del admin hacia gestor
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Destino</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {selectedGestorUser?.login ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Banco fuente</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {selectedSourceBank?.alias ?? selectedSourceBank?.bankName ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Layouts elegidos</p>
                    <p className="mt-2 font-semibold text-slate-900">{selectedLayoutIds.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Cuentas a replicar</p>
                    <p className="mt-2 font-semibold text-slate-900">{mirroredAccounts.length}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void syncAssignments()}
                  disabled={syncing}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <FiLayers className="h-4 w-4" />
                  {syncing ? "Sincronizando..." : "Sincronizar con gestor"}
                </button>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Cuentas que se espejan
                </p>
                <div className="mt-4 space-y-3">
                  {mirroredAccounts.map((account) => (
                    <div key={account.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">{account.name}</p>
                      <p className="mt-1 text-xs">
                        {account.accountNumber} · {account.currency}
                      </p>
                    </div>
                  ))}
                  {mirroredAccounts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      El banco origen no tiene cuentas cargadas.
                    </div>
                  ) : null}
                </div>
              </div>

              {lastSyncResult ? (
                <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                  <p className="font-bold">Ultima sincronizacion completada</p>
                  <p className="mt-2">
                    Banco destino #{lastSyncResult.targetBankId}: {lastSyncResult.targetBankName}
                  </p>
                  <p className="mt-1">
                    Layouts sincronizados: {lastSyncResult.syncedLayoutIds.length} · Cuentas
                    sincronizadas: {lastSyncResult.syncedAccountIds.length}
                  </p>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </section>
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
