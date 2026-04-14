import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiUserPlus } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { CompanyOption, RegisterPayload } from "../types/auth";
import type { RegisterPageFieldProps } from "../types/pages/register-page.types";

const initialState: RegisterPayload = {
  usrNombre: "",
  usrApellido: "",
  usrEmail: "",
  usrCelular: "",
  usrLogin: "",
  usrLegajo: "",
  password: "",
  empresaId: 0
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<RegisterPayload>(initialState);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await apiClient.get<CompanyOption[]>("/companies/options", {
          auth: false,
          showBackdrop: false
        });

        setCompanies(response ?? []);
        setForm((prev) => ({
          ...prev,
          empresaId: prev.empresaId > 0 ? prev.empresaId : (response?.[0]?.id ?? 0)
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar empresas.";
        toast.error(message);
      } finally {
        setLoadingCompanies(false);
      }
    };

    void loadCompanies();
  }, [toast]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof RegisterPayload;
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onCompanyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, empresaId: Number(event.target.value) }));
  };

  const onPhoneChange = (value?: string) => {
    setForm((prev) => ({ ...prev, usrCelular: value || "" }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.empresaId || form.empresaId <= 0) {
      toast.error("Debes seleccionar una empresa.");
      return;
    }

    if (form.usrCelular && !isValidPhoneNumber(form.usrCelular)) {
      toast.error("El numero de celular ingresado no es valido.");
      return;
    }

    try {
      await register(form);
      toast.success(
        "Tu cuenta fue creada como inactiva. Un admin o superadmin debe activarla.",
        "Registro exitoso"
      );
      navigate("/login", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar el registro.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Registro de Usuario</h2>
        <p className="mt-2 text-center text-sm text-slate-600">Unete a nuestra plataforma de forma segura</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200/60 sm:rounded-2xl sm:px-10">
          <form className="grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
            <Field label="Nombre" name="usrNombre" value={form.usrNombre ?? ""} onChange={onChange} />
            <Field label="Apellido" name="usrApellido" value={form.usrApellido ?? ""} onChange={onChange} />
            <Field label="Email" name="usrEmail" type="email" value={form.usrEmail ?? ""} onChange={onChange} />

            <label className="block space-y-1.5 focus-within:text-slate-900 text-slate-700 transition-colors">
              <span className="text-sm font-semibold">Empresa</span>
              <select
                name="empresaId"
                value={form.empresaId}
                onChange={onCompanyChange}
                required
                disabled={loadingCompanies || companies.length === 0}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all outline-none disabled:bg-slate-100 disabled:text-slate-500"
              >
                {companies.length === 0 ? (
                  <option value={0}>Sin empresas disponibles</option>
                ) : (
                  companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.nombre}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Celular</span>
              <div className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all bg-white">
                <PhoneInput
                  international
                  defaultCountry="PY"
                  value={form.usrCelular}
                  onChange={onPhoneChange}
                  className="outline-none w-full"
                />
              </div>
            </label>

            <Field
              label="Usuario (login)"
              name="usrLogin"
              value={form.usrLogin}
              onChange={onChange}
              required
            />
            <Field label="Legajo" name="usrLegajo" value={form.usrLegajo} onChange={onChange} required />
            <div className="md:col-span-2">
              <Field
                label="Contrasena"
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                required
              />
              <p className="mt-2 text-xs text-slate-500">
                La contrasena debe tener al menos 6 caracteres, mayusculas, minusculas, numeros y simbolo.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 md:col-span-2">
              <Link
                to="/login"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 px-4 py-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50"
              >
                <FiArrowLeft className="h-4 w-4" /> Volver al login
              </Link>

              <button
                type="submit"
                disabled={companies.length === 0}
                className="inline-flex w-full sm:w-auto justify-center flex-1 sm:flex-none items-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiUserPlus className="h-4 w-4" /> Crear cuenta
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required = false, ...props }: RegisterPageFieldProps) {
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
