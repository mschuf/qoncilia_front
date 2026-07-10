import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import {
  FiBriefcase,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiEdit3,
  FiPlus,
  FiSave,
  FiSearch,
  FiShield,
  FiTrash2,
} from "react-icons/fi";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import useCompanyBanking from "../hooks/useCompanyBanking";
import type { PublicBank, PublicCompanyBankAccount } from "../types/banking";
import { isSuperAdminRole } from "../utils/role";

type BankingWorkspaceMode = "combined" | "banks" | "accounts";

export default function AdminBankingPage({
  mode = "combined",
}: {
  mode?: BankingWorkspaceMode;
}) {
  const [deleteBankTarget, setDeleteBankTarget] = useState<PublicBank | null>(
    null,
  );
  const [deleteAccountTarget, setDeleteAccountTarget] =
    useState<PublicCompanyBankAccount | null>(null);
  const [bankFormVisible, setBankFormVisible] = useState(false);
  const [accountFormVisible, setAccountFormVisible] = useState(false);
  const { role } = useAuth();
  const showBanks = mode !== "accounts";
  const showAccounts = mode !== "banks";
  const {
    selectedCompanyId,
    companies,
    changeCompany,
    banks,
    currencies,
    selectedBankId,
    selectedBank,
    visibleAccounts,
    accountCountByBank,
    bankSearch,
    setBankSearch,
    accountSearch,
    setAccountSearch,
    bankPagination,
    accountPagination,
    setBankPage,
    setAccountPage,
    isLoadingReference,
    isLoadingBanks,
    isLoadingAccounts,
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
    stats,
  } = useCompanyBanking({
    loadAccounts: showAccounts,
    manualLoad: mode === "accounts",
  });

  const handleDeleteBank = async () => {
    if (!deleteBankTarget) return;
    await deleteBank(deleteBankTarget.id);
    setDeleteBankTarget(null);
    setBankFormVisible(false);
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccountTarget) return;
    await deleteAccount(deleteAccountTarget.id);
    setDeleteAccountTarget(null);
    setAccountFormVisible(false);
  };

  const openNewBankForm = () => {
    resetBankForm();
    setBankFormVisible(true);
  };

  const openEditBankForm = (bank: PublicBank) => {
    startEditBank(bank);
    setBankFormVisible(true);
  };

  const closeBankForm = () => {
    resetBankForm();
    setBankFormVisible(false);
  };

  const handleSaveBank = async (event: FormEvent<HTMLFormElement>) => {
    const saved = await saveBank(event);
    if (saved) {
      setBankFormVisible(false);
    }
  };

  const openNewAccountForm = () => {
    resetAccountForm();
    setAccountFormVisible(true);
  };

  const openEditAccountForm = (account: PublicCompanyBankAccount) => {
    startEditAccount(account);
    setAccountFormVisible(true);
  };

  const closeAccountForm = () => {
    resetAccountForm();
    setAccountFormVisible(false);
  };

  const handleSaveAccount = async (event: FormEvent<HTMLFormElement>) => {
    const saved = await saveAccount(event);
    if (saved) {
      setAccountFormVisible(false);
    }
  };

  return (
    <>
      <section className="space-y-6">
        {mode === "accounts" ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              {isSuperAdminRole(role) && companies.length > 1 ? (
                <label className="min-w-[280px] flex-1 space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Empresa
                  </span>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      setAccountFormVisible(false);
                      changeCompany(Number(e.target.value));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name} (ID: {company.fiscalId})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <SearchField
                label="Buscar banco"
                value={bankSearch}
                onChange={setBankSearch}
                placeholder="Nombre o sucursal"
              />

              <label className="min-w-[280px] flex-1 space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Banco
                </span>
                <select
                  value={selectedBankId || ""}
                  onChange={(event) => {
                    setAccountFormVisible(false);
                    selectBank(
                      event.target.value ? Number(event.target.value) : 0,
                    );
                  }}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="">Selecciona un banco</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                      {bank.branch ? ` - ${bank.branch}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => void reload(selectedCompanyId)}
                disabled={
                  isLoadingReference || isLoadingBanks || isLoadingAccounts
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiSearch className="h-4 w-4" /> Buscar
              </button>
            </div>
          </div>
        ) : null}

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
                mode === "banks" && bankFormVisible
                  ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start"
                  : "space-y-4"
              }
            >
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Paso 1
                    </p>
                    <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                      Bancos de la empresa
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {isSuperAdminRole(role) && companies.length > 1 ? (
                      <select
                        value={selectedCompanyId}
                        onChange={(e) => {
                          setAccountFormVisible(false);
                          changeCompany(Number(e.target.value));
                        }}
                        className="min-w-[200px] rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      >
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name} (ID: {company.fiscalId})
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <button
                      type="button"
                      onClick={openNewBankForm}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      <FiPlus className="h-4 w-4" /> Nuevo
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <SearchField
                    label="Buscar banco"
                    value={bankSearch}
                    onChange={setBankSearch}
                    placeholder="Nombre, sucursal o descripcion"
                  />
                  <p className="pb-3 text-xs font-semibold text-slate-500">
                    {isLoadingBanks
                      ? "Cargando bancos..."
                      : `${bankPagination.total} banco(s) encontrado(s)`}
                  </p>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Banco</th>
                          <th className="px-4 py-3">Sucursal</th>
                          <th className="px-4 py-3">Cuentas</th>
                          <th className="px-4 py-3">Plantilla</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {banks.map((bank) => {
                          const isSelected = bank.id === selectedBankId;
                          const accountCount =
                            accountCountByBank.get(bank.id) ?? 0;

                          return (
                            <tr
                              key={bank.id}
                              onClick={() => selectBank(bank.id)}
                              className={`cursor-pointer border-t border-slate-100 transition ${isSelected ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                            >
                              <td className="px-4 py-3">
                                <p
                                  className={`font-semibold ${isSelected ? "text-white" : "text-slate-900"}`}
                                >
                                  {bank.name}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                {bank.branch ?? "-"}
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                {accountCount}
                              </td>
                              <td className="px-4 py-3">
                                {bank.activeLayoutName ? (
                                  <span
                                    className={
                                      isSelected
                                        ? "text-white"
                                        : "text-slate-700"
                                    }
                                  >
                                    {bank.activeLayoutName}
                                  </span>
                                ) : (
                                  <span
                                    className={`font-bold ${isSelected ? "text-rose-200" : "text-rose-600"}`}
                                  >
                                    No Asignado
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${bank.active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                                >
                                  {bank.active ? "Activo" : "Inactivo"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openEditBankForm(bank);
                                    }}
                                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                      isSelected
                                        ? "border-white/20 text-white hover:bg-white/10"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                    }`}
                                  >
                                    <FiEdit3 className="h-4 w-4" /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setDeleteBankTarget(bank);
                                    }}
                                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                      isSelected
                                        ? "border-rose-200/40 text-rose-100 hover:bg-white/10"
                                        : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    }`}
                                  >
                                    <FiTrash2 className="h-4 w-4" /> Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {banks.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-6 text-center text-sm text-slate-500"
                            >
                              {bankSearch.trim()
                                ? "No se encontraron bancos con ese filtro."
                                : "Todavia no hay bancos cargados. Usa Nuevo para crear el primero."}
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <PaginationControls
                  label="Bancos"
                  pagination={bankPagination}
                  loading={isLoadingBanks}
                  onPageChange={setBankPage}
                />
              </div>

              {bankFormVisible ? (
                <form
                  onSubmit={handleSaveBank}
                  className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        {editingBankId ? "Edicion" : "Alta"}
                      </p>
                      <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                        {editingBankId ? "Editar banco" : "Crear banco"}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={closeBankForm}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
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

                    <Field
                      label="Descripcion"
                      name="description"
                      value={bankForm.description}
                      onChange={onBankFieldChange}
                      placeholder="Banco principal para plantillas y cuentas"
                    />

                    <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        name="active"
                        checked={bankForm.active}
                        onChange={onBankFieldChange}
                      />
                      Banco activo
                    </label>

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      <FiSave className="h-4 w-4" />{" "}
                      {editingBankId ? "Guardar banco" : "Crear banco"}
                    </button>
                  </div>
                </form>
              ) : null}
            </section>
          ) : null}

          {showAccounts ? (
            <section
              className={
                mode === "accounts" && accountFormVisible
                  ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start"
                  : "space-y-4"
              }
            >
              {showBanks ? (
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
                      {selectedBank
                        ? `${accountPagination.total} cuenta(s) en ${selectedBank.name}`
                        : "Selecciona un banco"}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-end gap-3">
                    <SearchField
                      label="Buscar cuenta"
                      value={accountSearch}
                      onChange={setAccountSearch}
                      placeholder="Nro cuenta, mayor, moneda"
                      disabled={!selectedBank}
                    />
                    <p className="pb-3 text-xs font-semibold text-slate-500">
                      {isLoadingAccounts
                        ? "Cargando cuentas..."
                        : `${accountPagination.total} cuenta(s) encontrada(s)`}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {selectedBank && visibleAccounts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        {accountSearch.trim()
                          ? "No se encontraron cuentas con ese filtro."
                          : "Este banco todavia no tiene cuentas cargadas."}
                      </div>
                    ) : null}

                    {selectedBank ? (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {visibleAccounts.map((account) => (
                          <article
                            key={account.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900">
                                  {account.name}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">
                                    {account.currency}
                                  </span>
                                  <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">
                                    Cuenta {account.accountNumber}
                                  </span>
                                  <span
                                    className={`rounded-full px-2.5 py-1 font-semibold ${
                                      account.active
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {account.active ? "Activa" : "Inactiva"}
                                  </span>
                                </div>
                                <p className="mt-3 text-xs leading-5 text-slate-500">
                                  Mayor: {account.majorAccountNumber}
                                  {account.paymentAccountNumber
                                    ? ` | Pago: ${account.paymentAccountNumber}`
                                    : ""}
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
                                  onClick={() =>
                                    setDeleteAccountTarget(account)
                                  }
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

                  <PaginationControls
                    label="Cuentas"
                    pagination={accountPagination}
                    loading={isLoadingAccounts}
                    onPageChange={setAccountPage}
                  />
                </div>
              ) : (
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        Cuentas bancarias
                      </p>
                      <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                        {selectedBank
                          ? selectedBank.name
                          : "Selecciona un banco"}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
                        {accountPagination.total} cuenta(s)
                      </span>
                      <button
                        type="button"
                        onClick={openNewAccountForm}
                        disabled={!selectedBank}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <FiPlus className="h-4 w-4" /> Nuevo
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-end gap-3">
                    <SearchField
                      label="Buscar cuenta"
                      value={accountSearch}
                      onChange={setAccountSearch}
                      placeholder="Nro cuenta, mayor, moneda"
                      disabled={!selectedBank}
                    />
                    <p className="pb-3 text-xs font-semibold text-slate-500">
                      {isLoadingAccounts
                        ? "Cargando cuentas..."
                        : `${accountPagination.total} resultado(s)`}
                    </p>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Nro Cuenta</th>
                            <th className="px-3 py-2">Moneda</th>
                            <th className="px-3 py-2">Descripcion</th>
                            <th className="px-3 py-2">Cuenta Mayor</th>
                            <th className="px-3 py-2">Cuenta Pago</th>
                            <th className="px-3 py-2">Sucursal</th>
                            <th className="px-3 py-2">Estado</th>
                            <th className="px-3 py-2 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleAccounts.map((account) => (
                            <tr
                              key={account.id}
                              className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                            >
                              <td className="px-3 py-3 font-semibold text-slate-900">
                                {account.accountNumber}
                              </td>
                              <td className="px-3 py-3">{account.currency}</td>
                              <td className="px-3 py-3">{account.name}</td>
                              <td className="px-3 py-3">
                                {account.majorAccountNumber}
                              </td>
                              <td className="px-3 py-3">
                                {account.paymentAccountNumber ?? "-"}
                              </td>
                              <td className="px-3 py-3">
                                {account.branchName ?? "-"}
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${account.active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                                >
                                  {account.active ? "Activa" : "Inactiva"}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditAccountForm(account)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                                  >
                                    <FiEdit3 className="h-4 w-4" /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteAccountTarget(account)
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                                  >
                                    <FiTrash2 className="h-4 w-4" /> Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {visibleAccounts.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="px-4 py-6 text-center text-sm text-slate-500"
                              >
                                {selectedBank
                                  ? accountSearch.trim()
                                    ? "No se encontraron cuentas con ese filtro."
                                    : "Este banco todavia no tiene cuentas cargadas."
                                  : "Selecciona un banco para ver sus cuentas."}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <PaginationControls
                    label="Cuentas"
                    pagination={accountPagination}
                    loading={isLoadingAccounts}
                    onPageChange={setAccountPage}
                  />
                </div>
              )}

              {accountFormVisible ? (
                <form
                  onSubmit={handleSaveAccount}
                  className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        {editingAccountId ? "Edicion" : "Alta"}
                      </p>
                      <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                        {editingAccountId
                          ? "Editar cuenta bancaria"
                          : "Crear cuenta bancaria"}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={closeAccountForm}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="mt-6 space-y-4">
                    <Field
                      label="Nro Cuenta"
                      name="accountNumber"
                      value={accountForm.accountNumber}
                      onChange={onAccountFieldChange}
                      required
                    />

                    <label className="space-y-1.5">
                      <span className="text-sm font-semibold text-slate-700">
                        Moneda
                      </span>
                      <select
                        name="currency"
                        value={accountForm.currency}
                        onChange={onAccountFieldChange}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        required
                      >
                        {currencies.length === 0 ? (
                          <option value="PYG">PYG - Guarani paraguayo</option>
                        ) : null}
                        {currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <Field
                      label="Descripcion"
                      name="name"
                      value={accountForm.name}
                      onChange={onAccountFieldChange}
                      readOnly
                      required
                    />

                    <Field
                      label="Cuenta Mayor"
                      name="majorAccountNumber"
                      value={accountForm.majorAccountNumber}
                      onChange={onAccountFieldChange}
                      placeholder="1.01.02.001.002"
                      required
                    />

                    <Field
                      label="Cuenta Pago ERP"
                      name="paymentAccountNumber"
                      value={accountForm.paymentAccountNumber}
                      onChange={onAccountFieldChange}
                      placeholder="Opcional"
                    />

                    <Field
                      label="Sucursal"
                      name="branchName"
                      value={accountForm.branchName}
                      onChange={onAccountFieldChange}
                      placeholder=""
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
                      <FiSave className="h-4 w-4" />{" "}
                      {editingAccountId ? "Guardar cuenta" : "Crear cuenta"}
                    </button>
                  </div>
                </form>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>

      <ConfirmModal
        open={Boolean(deleteBankTarget)}
        onClose={() => setDeleteBankTarget(null)}
        title="Eliminar banco"
        message={`Seguro que quieres eliminar el banco "${deleteBankTarget?.name ?? ""}"? Tambien se eliminaran sus datos dependientes cuando la base lo permita.`}
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
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent = "slate",
}: {
  label: string;
  value: string;
  icon: typeof FiBriefcase;
  accent?: "slate" | "emerald" | "brand";
}) {
  const accentClasses = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    brand: "border-brand-200 bg-brand-50 text-brand-800",
  } as const;

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${accentClasses[accent]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-extrabold">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3 text-slate-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function BankContextTile({
  icon: Icon,
  label,
  value,
  helper,
  accent = "slate",
}: {
  icon: typeof FiBriefcase;
  label: string;
  value: string;
  helper: string;
  accent?: "slate" | "emerald" | "amber";
}) {
  const accentClasses = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  } as const;

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
  );
}

function SearchField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="min-w-[260px] flex-1 space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm transition focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900">
        <FiSearch className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed disabled:text-slate-400"
        />
      </span>
    </label>
  );
}

function PaginationControls({
  label,
  pagination,
  loading = false,
  compact = false,
  onPageChange,
}: {
  label: string;
  pagination: { total: number; page: number; limit: number; lastPage: number };
  loading?: boolean;
  compact?: boolean;
  onPageChange: (page: number) => void;
}) {
  const firstItem =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 ${
        compact ? "min-w-[260px]" : "mt-4"
      }`}
    >
      <span className="font-semibold">
        {label}: {firstItem}-{lastItem} de {pagination.total}
      </span>

      <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={loading || pagination.page <= 1}
          className="inline-flex h-10 items-center gap-1 px-3 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          <FiChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <span className="border-x border-slate-200 px-3 py-2 font-bold text-slate-700">
          {pagination.page}/{pagination.lastPage}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={loading || pagination.page >= pagination.lastPage}
          className="inline-flex h-10 items-center gap-1 px-3 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          Siguiente
          <FiChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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
  );
}
