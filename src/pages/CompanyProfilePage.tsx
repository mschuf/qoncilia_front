import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { FiBriefcase, FiCamera, FiSave, FiSettings, FiDatabase, FiAlertCircle, FiTrash2 } from "react-icons/fi";
import { apiClient } from "../api/apiClient";
import CompanyCountrySelect from "../components/forms/CompanyCountrySelect";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { isSuperAdminRole, isAdminRole } from "../utils/role";
import type { PublicCompany } from "../types/access-control";
import { Navigate } from "react-router-dom"; // Make sure it contains address and validityDate

interface CompanyProfileForm {
  name: string;
  fiscalId: string;
  logo: string | null;
  address: string;
  region: string;
  country: string;
  validityDate: string;
  active: boolean;
  webserviceErp: string;
  schemeErp: string;
}

export default function CompanyProfilePage() {
  const { user, role, updateUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const [form, setForm] = useState<CompanyProfileForm>({
    name: "",
    fiscalId: "",
    logo: null,
    address: "",
    region: "",
    country: "",
    validityDate: "",
    active: true,
    webserviceErp: "",
    schemeErp: "",
  });

  const isSuperAdmin = isSuperAdminRole(role);
  const isAdmin = isAdminRole(role);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        if (isSuperAdmin) {
          const res = await apiClient.get<{ companies: PublicCompany[] }>("/access-control/reference");
          if (res?.companies) {
            setCompanies(res.companies);
            if (res.companies.length > 0) {
              const firstCompany = res.companies[0];
              setSelectedCompanyId(firstCompany.id);
              populateForm(firstCompany);
            }
          }
        } else {
          const company = await apiClient.get<any>("/access-control/company-profile");
          if (company) {
            setSelectedCompanyId(company.id);
            populateForm(company);
          }
        }
      } catch (error) {
        toast.error("Error al cargar la información de la empresa.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchInitialData();
  }, [isSuperAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const populateForm = (company: any) => {
    let dateStr = "";
    if (company.validityDate) {
      dateStr = new Date(company.validityDate).toISOString().split('T')[0];
    }
    setForm({
      name: company.name || "",
      fiscalId: company.fiscalId || company.code || "",
      logo: company.logo || null,
      address: company.address || "",
      region: company.region || "",
      country: company.country || "",
      validityDate: dateStr,
      active: company.active ?? true,
      webserviceErp: company.webserviceErp || "",
      schemeErp: company.schemeErp || "",
    });
  };

  const handleCompanySelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const companyId = Number(event.target.value);
    setSelectedCompanyId(companyId);
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      populateForm(company);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setForm((prev) => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setForm((prev) => ({ ...prev, logo: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCompanyId) return;

    const payload = {
      name: form.name,
      fiscalId: form.fiscalId,
      logo: form.logo,
      address: form.address,
      region: form.region,
      country: form.country,
      validityDate: form.validityDate || null,
      active: form.active,
    };

    const superAdminPayload = isSuperAdmin
      ? {
        ...payload,
        webserviceErp: form.webserviceErp,
        schemeErp: form.schemeErp,
      }
      : payload;

    try {
      if (isSuperAdmin) {
        const updated = await apiClient.patch<any>(`/access-control/companies/${selectedCompanyId}`, superAdminPayload);
        toast.success("Empresa actualizada correctamente.");
        
        // Update local companies list
        setCompanies((prev) =>
          prev.map((c) => (c.id === selectedCompanyId ? { ...c, ...updated, fiscalId: updated.code } : c))
        );
      } else {
        const updated = await apiClient.put<any>("/access-control/company-profile", superAdminPayload);
        toast.success("Perfil de empresa actualizado.");
        
        // Update context if it's the current user's company
        if (user && user.companyId === selectedCompanyId) {
          updateUser({
            ...user,
            companyName: updated.name,
            companyCode: updated.code,
            companyLogo: updated.logo,
          });
        }
      }
    } catch (error) {
      toast.error("No se pudo actualizar la empresa.");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Cargando...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand-100 p-2 text-brand-700">
          <FiBriefcase className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Perfil de Empresa</h1>
          <p className="text-sm font-semibold text-slate-500">
            Administra los datos generales y la configuración de {isSuperAdmin ? "las empresas" : "tu empresa"}.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isSuperAdmin && companies.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Seleccionar Empresa</span>
              <select
                value={selectedCompanyId ?? ""}
                onChange={handleCompanySelect}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.fiscalId})
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          
          {/* SECCION GENERAL */}
          <div className="grid gap-8 sm:grid-cols-12">
            <div className="sm:col-span-4 flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors group-hover:border-brand-400 group-hover:bg-brand-50">
                  {form.logo ? (
                    <img src={form.logo} alt="Logo de empresa" className="h-full w-full object-contain p-2" />
                  ) : (
                    <FiBriefcase className="h-8 w-8 text-slate-300 transition-colors group-hover:text-brand-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:scale-105 hover:bg-slate-800"
                  aria-label="Cambiar logo"
                >
                  <FiCamera className="h-4 w-4" />
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/svg+xml"
                className="hidden"
              />
              <p className="text-center text-xs font-semibold text-slate-500">
                Formatos: JPG, PNG, SVG<br />
                Max: 2MB
              </p>
              {form.logo ? (
                <button
                  type="button"
                  onClick={handleClearLogo}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  <FiTrash2 className="h-3.5 w-3.5" /> Quitar logo
                </button>
              ) : null}
            </div>

            <div className="sm:col-span-8 space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-4">
                Información General
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Nombre de la Empresa</span>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Ej: Qoncilia S.A."
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">ID fiscal</span>
                  <input
                    type="text"
                    name="fiscalId"
                    value={form.fiscalId}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Ej: 80012345-6"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Fecha de Vigencia</span>
                  <input
                    type="date"
                    name="validityDate"
                    value={form.validityDate}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>

                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Dirección Física</span>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Av. Principal 123, Ciudad"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">Región</span>
                  <input
                    type="text"
                    name="region"
                    value={form.region}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Ej: Central"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">País</span>
                  <CompanyCountrySelect
                    value={form.country}
                    onChange={(country) => setForm((prev) => ({ ...prev, country }))}
                    placeholder="Ej: Paraguay"
                  />
                </label>
              </div>

              {isSuperAdmin && (
                <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    name="active"
                    checked={form.active}
                    onChange={handleInputChange}
                    className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 transition"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">
                      {form.active ? "Empresa Activa" : "Empresa Inactiva"}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Si se desactiva, los usuarios de esta empresa no podrán operar.
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* SECCION INTEGRACION */}
          {isSuperAdmin && (
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <FiDatabase className="h-5 w-5 text-slate-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Datos de Integración
              </h3>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-slate-50 border border-slate-200 p-5">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">Webservice ERP (URL)</span>
                <input
                  type="text"
                  name="webserviceErp"
                  value={form.webserviceErp}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="https://api.empresa.com/erp"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">Esquema BBDD (Scheme)</span>
                <input
                  type="text"
                  name="schemeErp"
                  value={form.schemeErp}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="dbo"
                />
              </label>
              
              <div className="sm:col-span-2 mt-2 flex gap-2 items-start text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-100">
                <FiAlertCircle className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
                <p>
                  Estos datos son utilizados internamente para sincronizar Qoncilia con el sistema central ERP y la Base de Datos subyacente. Asegúrate de ingresar parámetros válidos.
                </p>
              </div>
            </div>
          </div>
          )}

          <div className="pt-6 flex justify-end border-t border-slate-100">
            <button
              type="submit"
              disabled={!selectedCompanyId}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-700 hover:shadow-lg disabled:opacity-50"
            >
              <FiSave className="h-4 w-4" /> Guardar Cambios de Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
