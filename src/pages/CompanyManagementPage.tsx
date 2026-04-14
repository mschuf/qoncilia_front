import type { ChangeEvent, FormEvent, InputHTMLAttributes } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import AppModal from "@/AppModal";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import type { Company, CompanyBank } from "../types/auth";
import type {
  CompanyBankForm,
  CompanyForm
} from "../types/pages/company-management-page.types";

interface ErrorLike {
  code?: string;
  message?: string;
}

const initialCompanyForm: CompanyForm = {
  nombre: "",
  ruc: "",
  email: "",
  telefono: "",
  direccion: "",
  activo: true
};

const initialBankForm: CompanyBankForm = {
  bancoNombre: "",
  tipoCuenta: "",
  moneda: "PYG",
  numeroCuenta: "",
  titular: "",
  sucursal: "",
  activo: true
};

export default function CompanyManagementPage() {
  const toast = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingBank, setEditingBank] = useState<CompanyBank | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState<number | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(initialCompanyForm);
  const [bankForm, setBankForm] = useState<CompanyBankForm>(initialBankForm);

  const notifyError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const apiError = (error ?? null) as ErrorLike | null;
      if (apiError?.code === "TOKEN_EXPIRED") return;
      toast.error(apiError?.message ?? fallbackMessage);
    },
    [toast]
  );

  const loadCompanies = useCallback(async () => {
    try {
      const response = await apiClient.get<Company[]>("/companies");
      setCompanies(response ?? []);
    } catch (error) {
      notifyError(error, "No se pudieron cargar las empresas.");
    }
  }, [notifyError]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const companyModalTitle = useMemo(
    () => (editingCompany ? "Editar empresa" : "Nueva empresa"),
    [editingCompany]
  );

  const bankModalTitle = useMemo(
    () => (editingBank ? "Editar banco" : "Agregar banco"),
    [editingBank]
  );

  const openCreateCompanyModal = () => {
    setEditingCompany(null);
    setCompanyForm(initialCompanyForm);
    setCompanyModalOpen(true);
  };

  const openEditCompanyModal = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      nombre: company.nombre ?? "",
      ruc: company.ruc ?? "",
      email: company.email ?? "",
      telefono: company.telefono ?? "",
      direccion: company.direccion ?? "",
      activo: Boolean(company.activo)
    });
    setCompanyModalOpen(true);
  };

  const openAddBankModal = (companyId: number) => {
    setTargetCompanyId(companyId);
    setEditingBank(null);
    setBankForm(initialBankForm);
    setBankModalOpen(true);
  };

  const openEditBankModal = (companyId: number, bank: CompanyBank) => {
    setTargetCompanyId(companyId);
    setEditingBank(bank);
    setBankForm({
      bancoNombre: bank.bancoNombre,
      tipoCuenta: bank.tipoCuenta,
      moneda: bank.moneda,
      numeroCuenta: bank.numeroCuenta,
      titular: bank.titular ?? "",
      sucursal: bank.sucursal ?? "",
      activo: Boolean(bank.activo)
    });
    setBankModalOpen(true);
  };

  const onCompanyFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof CompanyForm;
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setCompanyForm((prev) => ({ ...prev, [key]: value }) as CompanyForm);
  };

  const onBankFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof CompanyBankForm;
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setBankForm((prev) => ({ ...prev, [key]: value }) as CompanyBankForm);
  };

  const submitCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (editingCompany) {
        await apiClient.patch(`/companies/${editingCompany.id}`, companyForm);
        toast.success("Empresa actualizada.");
      } else {
        await apiClient.post("/companies", companyForm);
        toast.success("Empresa creada.");
      }

      setCompanyModalOpen(false);
      setEditingCompany(null);
      setCompanyForm(initialCompanyForm);
      await loadCompanies();
    } catch (error) {
      notifyError(error, "No se pudo guardar la empresa.");
    }
  };

  const submitBank = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!targetCompanyId) {
      toast.error("No se encontro la empresa objetivo.");
      return;
    }

    try {
      if (editingBank) {
        await apiClient.patch(
          `/companies/${targetCompanyId}/banks/${editingBank.id}`,
          bankForm
        );
        toast.success("Banco actualizado.");
      } else {
        await apiClient.post(`/companies/${targetCompanyId}/banks`, bankForm);
        toast.success("Banco agregado.");
      }

      setBankModalOpen(false);
      setEditingBank(null);
      setTargetCompanyId(null);
      setBankForm(initialBankForm);
      await loadCompanies();
    } catch (error) {
      notifyError(error, "No se pudo guardar el banco.");
    }
  };

  const removeBank = async (companyId: number, bankId: number) => {
    try {
      await apiClient.delete(`/companies/${companyId}/banks/${bankId}`);
      toast.success("Banco eliminado.");
      await loadCompanies();
    } catch (error) {
      notifyError(error, "No se pudo eliminar el banco.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Empresas y Bancos</h2>
          <p className="text-sm text-slate-600">
            Administra datos basicos de empresa y sus cuentas bancarias.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateCompanyModal}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          <FiPlus className="h-4 w-4" /> Nueva empresa
        </button>
      </div>

      <div className="space-y-4">
        {companies.map((company) => (
          <article
            key={company.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{company.nombre}</h3>
                <p className="text-sm text-slate-500">
                  RUC: {company.ruc || "-"} | Email: {company.email || "-"} | Telefono:{" "}
                  {company.telefono || "-"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Direccion: {company.direccion || "-"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    company.activo
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {company.activo ? "Activa" : "Inactiva"}
                </span>
                <button
                  type="button"
                  onClick={() => openEditCompanyModal(company)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  <FiEdit2 className="h-3.5 w-3.5" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => openAddBankModal(company.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  <FiPlus className="h-3.5 w-3.5" /> Agregar banco
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Banco</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Moneda</th>
                    <th className="px-3 py-2">Numero</th>
                    <th className="px-3 py-2">Titular</th>
                    <th className="px-3 py-2">Activo</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(company.bancos ?? []).map((bank) => (
                    <tr key={bank.id} className="border-t border-slate-100 text-slate-700">
                      <td className="px-3 py-2">{bank.bancoNombre}</td>
                      <td className="px-3 py-2">{bank.tipoCuenta}</td>
                      <td className="px-3 py-2">{bank.moneda}</td>
                      <td className="px-3 py-2">{bank.numeroCuenta}</td>
                      <td className="px-3 py-2">{bank.titular || "-"}</td>
                      <td className="px-3 py-2">{bank.activo ? "Si" : "No"}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditBankModal(company.id, bank)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                          >
                            <FiEdit2 className="h-3.5 w-3.5" /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBank(company.id, bank.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(company.bancos ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-sm text-slate-500">
                        Esta empresa aun no tiene bancos cargados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        ))}

        {companies.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No hay empresas registradas.
          </div>
        )}
      </div>

      <AppModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        title={companyModalTitle}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCompanyModalOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              form="company-form"
              type="submit"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              Guardar
            </button>
          </div>
        }
      >
        <form id="company-form" onSubmit={submitCompany} className="grid gap-3 md:grid-cols-2">
          <Field
            label="Nombre"
            name="nombre"
            value={companyForm.nombre}
            onChange={onCompanyFieldChange}
            required
          />
          <Field label="RUC" name="ruc" value={companyForm.ruc} onChange={onCompanyFieldChange} />
          <Field
            label="Email"
            name="email"
            type="email"
            value={companyForm.email}
            onChange={onCompanyFieldChange}
          />
          <Field
            label="Telefono"
            name="telefono"
            value={companyForm.telefono}
            onChange={onCompanyFieldChange}
          />
          <div className="md:col-span-2">
            <Field
              label="Direccion"
              name="direccion"
              value={companyForm.direccion}
              onChange={onCompanyFieldChange}
            />
          </div>
          <label className="md:col-span-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="activo"
              checked={companyForm.activo}
              onChange={onCompanyFieldChange}
            />
            Empresa activa
          </label>
        </form>
      </AppModal>

      <AppModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        title={bankModalTitle}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBankModalOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              form="bank-form"
              type="submit"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              Guardar
            </button>
          </div>
        }
      >
        <form id="bank-form" onSubmit={submitBank} className="grid gap-3 md:grid-cols-2">
          <Field
            label="Banco"
            name="bancoNombre"
            value={bankForm.bancoNombre}
            onChange={onBankFieldChange}
            required
          />
          <Field
            label="Tipo de cuenta"
            name="tipoCuenta"
            value={bankForm.tipoCuenta}
            onChange={onBankFieldChange}
            required
          />
          <Field
            label="Moneda"
            name="moneda"
            value={bankForm.moneda}
            onChange={onBankFieldChange}
            required
          />
          <Field
            label="Numero de cuenta"
            name="numeroCuenta"
            value={bankForm.numeroCuenta}
            onChange={onBankFieldChange}
            required
          />
          <Field
            label="Titular"
            name="titular"
            value={bankForm.titular}
            onChange={onBankFieldChange}
          />
          <Field
            label="Sucursal"
            name="sucursal"
            value={bankForm.sucursal}
            onChange={onBankFieldChange}
          />
          <label className="md:col-span-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="activo"
              checked={bankForm.activo}
              onChange={onBankFieldChange}
            />
            Banco activo
          </label>
        </form>
      </AppModal>
    </section>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

function Field({ label, required = false, ...props }: FieldProps) {
  return (
    <label className="block space-y-1.5 focus-within:text-slate-900 text-slate-700 transition-colors">
      <span className="text-sm font-semibold">{label}</span>
      <input
        {...props}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all outline-none"
      />
    </label>
  );
}
