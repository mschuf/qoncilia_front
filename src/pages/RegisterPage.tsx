import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiShield, FiUserPlus } from "react-icons/fi";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Link, useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { RegisterPayload } from "../types/auth";
import type { RegisterPageFieldProps } from "../types/pages/register-page.types";
import { isValidInternationalPhoneNumber } from "../utils/phone";

const initialState: RegisterPayload = {
  usrNombre: "",
  usrEmail: "",
  usrCelular: "",
  usrLogin: "",
  password: ""
};

const phoneLabels = {
  country: "Prefijo pais",
  phone: "Celular",
  ZZ: "Elija una opcion"
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<RegisterPayload>(initialState);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof RegisterPayload;
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onPhoneChange = (value?: string) => {
    setForm((prev) => ({ ...prev, usrCelular: value || "" }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.usrCelular && !isValidInternationalPhoneNumber(form.usrCelular)) {
      toast.error("El numero de celular ingresado no es valido.");
      return;
    }

    try {
      await register(form);
      toast.success(
        "Se registro tu empresa junto con su usuario admin. Queda inactiva hasta aprobacion del superadmin.",
        "Solicitud enviada"
      );
      navigate("/login", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo completar el registro.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0%,_#eff6ff_28%,_#f8fafc_62%,_#ffffff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.05fr]">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-slate-950 p-8 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.95)] sm:p-10">
          <div className="absolute" />
          <BrandMark size="lg" />
          <p className="mt-8 max-w-xl text-sm leading-7 text-slate-300">
            Registra tu empresa en Qoncilia. Se crea un usuario administrador asociado para
            que luego puedas gestionar usuarios, bancos y cuentas bancarias.
          </p>

          <div className="mt-10 space-y-4">
            <InfoTile
              icon={<FiShield className="h-4 w-4" />}
              title="Alta inicial"
              description="La empresa nace inactiva y queda pendiente de aprobacion."
            />
            <InfoTile
              icon={<FiUserPlus className="h-4 w-4" />}
              title="Usuario administrador"
              description="El usuario empresa se crea con rol admin para operar tu organizacion."
            />
            <InfoTile
              icon={<FiCheckCircle className="h-4 w-4" />}
              title="Contrasena simple"
              description="Solo pedimos minimo 6 caracteres, sin complejidad adicional."
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-600">
            Registro
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950">
            Alta de Empresa
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Completa estos datos para registrar tu empresa y crear su usuario administrador.
          </p>

          <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="md:col-span-2">
              <Field
                label="Nombre Empresa"
                name="usrNombre"
                value={form.usrNombre ?? ""}
                onChange={onChange}
                required
                autoComplete="organization"
              />
            </div>

            <Field
              label="Email"
              name="usrEmail"
              type="email"
              value={form.usrEmail ?? ""}
              onChange={onChange}
              autoComplete="email"
            />

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Celular</span>
              <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900">
                <PhoneInput
                  international
                  value={form.usrCelular ?? ""}
                  onChange={onPhoneChange}
                  labels={phoneLabels}
                  countrySelectProps={{
                    "aria-label": "Prefijo pais"
                  }}
                  className="w-full"
                />
              </div>
            </label>

            <Field
              label="Usuario Empresa"
              name="usrLogin"
              value={form.usrLogin}
              onChange={onChange}
              required
              autoComplete="username"
            />

            <Field
              label="Contrasena"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              required
              autoComplete="new-password"
            />

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
              El celular debe ir con prefijo internacional. La contrasena necesita al menos 6
              caracteres.
            </div>

            <div className="mt-2 flex flex-col-reverse items-center justify-between gap-4 md:col-span-2 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
              >
                <FiArrowLeft className="h-4 w-4" /> Volver al login
              </Link>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-900 sm:w-auto"
              >
                <FiUserPlus className="h-4 w-4" /> Registrar empresa
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  title,
  description
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white/10 p-2 text-cyan-200">{icon}</div>
        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required = false, ...props }: RegisterPageFieldProps) {
  return (
    <label className="block space-y-1.5 text-slate-700 transition-colors focus-within:text-slate-950">
      <span className="text-sm font-semibold">{label}</span>
      <input
        {...props}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />
    </label>
  );
}
