import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { FiBriefcase, FiCamera, FiSave, FiSettings } from "react-icons/fi";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { isAdminRole, isSuperAdminRole } from "../utils/role";
import type { PublicCompany } from "../types/auth"; // Need to make sure this type is correct

interface CompanyProfileForm {
  name: string;
  fiscalId?: string;
  logo: string | null;
}

export default function CompanyProfilePage() {
  const { user, role, setUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const [form, setForm] = useState<CompanyProfileForm>({
    name: "",
    fiscalId: "",
    logo: null,
  });

  const isSuperAdmin = isSuperAdminRole(role);

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
              setForm({
                name: firstCompany.name,
                fiscalId: firstCompany.fiscalId,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                logo: (firstCompany as any).logo ?? null,
              });
            }
          }
        } else {
          const company = await apiClient.get<any>("/access-control/company-profile");
          if (company) {
            setSelectedCompanyId(company.id);
            setForm({
              name: company.name,
              fiscalId: company.fiscalId ?? company.code,
              logo: company.logo ?? null,
            });
          }
        }
      } catch (error) {
        toast.error("Error al cargar la informacion de la empresa.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchInitialData();
  }, [isSuperAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompanySelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const companyId = Number(event.target.value);
    setSelectedCompanyId(companyId);
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      setForm({
        name: company.name,
        fiscalId: company.fiscalId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        logo: (company as any).logo ?? null,
      });
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCompanyId) return;

    try {
      if (isSuperAdmin) {
        const updated = await apiClient.patch<any>(`/access-control/companies/${selectedCompanyId}`, {
          name: form.name,
          fiscalId: form.fiscalId,
          logo: form.logo,
        });
        toast.success("Empresa actualizada correctamente.");
        
        // Update local companies list
        setCompanies((prev) =>
          prev.map((c) => (c.id === selectedCompanyId ? { ...c, name: updated.name, fiscalId: updated.code, logo: updated.logo } as any : c))
        );
      } else {
        const updated = await apiClient.put<any>("/access-control/company-profile", {
          name: form.name,
          fiscalId: form.fiscalId,
          logo: form.logo,
        });
        toast.success("Perfil de empresa actualizado.");
        
        // Update context if it's the current user's company
        if (user && user.companyId === selectedCompanyId) {
          setUser({
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand-100 p-2 text-brand-700">
          <FiBriefcase className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Perfil de Empresa</h1>
          <p className="text-sm font-semibold text-slate-500">
            Administra los datos y el logo de {isSuperAdmin ? "las empresas" : "tu empresa"}.
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

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
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
                  aria-label="Subir logo"
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
            </div>

            <div className="sm:col-span-8 space-y-5">
              <label className="block space-y-1.5">
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
                <span className="text-sm font-semibold text-slate-700">ID Fiscal</span>
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

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedCompanyId}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-50"
                >
                  <FiSave className="h-4 w-4" /> Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
