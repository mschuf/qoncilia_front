import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiShield, FiUserPlus } from "react-icons/fi";
import "react-phone-number-input/style.css";
import { Link, useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import InternationalPhoneField from "../components/forms/InternationalPhoneField";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { RegisterPayload } from "../types/auth";
import type { RegisterPageFieldProps } from "../types/pages/register-page.types";
import { isValidInternationalPhoneNumber } from "../utils/phone";

const initialState: RegisterPayload = {
  companyName: "",
  usrNombre: "",
  usrApellido: "",
  usrEmail: "",
  usrCelular: "",
  usrLogin: "",
  password: ""
};

type RegisterStep = 1 | 2;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<RegisterPayload>(initialState);
  const [step, setStep] = useState<RegisterStep>(1);

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

    if (step === 1) {
      setStep(2);
      return;
    }

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

  const isCompanyStep = step === 1;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0%,_#eff6ff_28%,_#f8fafc_62%,_#ffffff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.05fr]">
        <section className="hidden overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 p-8 text-slate-900 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.25)] backdrop-blur-sm lg:block sm:p-10">
          <div className="absolute" />
          <BrandMark size="lg" />
          <p className="mt-8 max-w-xl text-sm leading-7 text-slate-500">
            Registra tu empresa en Qoncilia con un flujo guiado. Primero damos de alta la
            empresa y luego creamos el usuario administrador que va a ingresar al sistema.
          </p>

          <div className="mt-10 space-y-4">
            <InfoTile
              icon={<FiShield className="h-4 w-4" />}
              title="Paso 1: Empresa"
              description="Primero registras la empresa que quedara pendiente de aprobacion."
            />
            <InfoTile
              icon={<FiUserPlus className="h-4 w-4" />}
              title="Paso 2: Usuario admin"
              description="Despues cargas la persona que administrara la organizacion."
            />
            <InfoTile
              icon={<FiCheckCircle className="h-4 w-4" />}
              title="Activacion"
              description="La empresa y su usuario admin quedan inactivos hasta aprobacion."
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-600">
              Registro
            </p>
            <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
              Paso {step} de 2
            </span>
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950">
            {isCompanyStep ? "Alta de Empresa" : "Usuario Administrador"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {isCompanyStep
              ? "Primero registra la empresa. En el siguiente paso cargaras el usuario que iniciara sesion."
              : "Ahora completa los datos del usuario administrador que ingresara a Qoncilia."}
          </p>

          <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
            {isCompanyStep ? (
              <>
                <div className="md:col-span-2">
                  <Field
                    label="Nombre Empresa"
                    name="companyName"
                    value={form.companyName ?? ""}
                    onChange={onChange}
                    required
                    autoComplete="organization"
                  />
                </div>

                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
                  En el siguiente paso vas a cargar el usuario administrador que quedara
                  asociado a esta empresa y luego podra iniciar sesion cuando sea aprobado.
                </div>
              </>
            ) : (
              <>
                <div className="md:col-span-2 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-700">
                    Empresa a registrar
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-950">
                    {form.companyName?.trim() || "-"}
                  </p>
                </div>

                <Field
                  label="Nombre"
                  name="usrNombre"
                  value={form.usrNombre ?? ""}
                  onChange={onChange}
                  required
                  autoComplete="given-name"
                />

                <Field
                  label="Apellido"
                  name="usrApellido"
                  value={form.usrApellido ?? ""}
                  onChange={onChange}
                  autoComplete="family-name"
                />

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
                    <InternationalPhoneField
                      value={form.usrCelular ?? ""}
                      onChange={onPhoneChange}
                      countrySelectAriaLabel="Pais"
                      requireCountrySelection
                      className="w-full"
                    />
                  </div>
                </label>

                <Field
                  label="Usuario de acceso"
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
                  placeholder="Minimo 6 caracteres"
                />

                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
                  Selecciona un pais y luego carga el celular. El prefijo internacional se
                  completa automaticamente. La contrasena necesita al menos 6 caracteres.
                </div>
              </>
            )}

            <div className="mt-2 flex flex-col-reverse items-center justify-between gap-4 md:col-span-2 sm:flex-row">
              {isCompanyStep ? (
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                >
                  <FiArrowLeft className="h-4 w-4" /> Volver al login
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                >
                  <FiArrowLeft className="h-4 w-4" /> Anterior
                </button>
              )}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-700/25 sm:w-auto"
              >
                {isCompanyStep ? (
                  <>
                    <FiArrowRight className="h-4 w-4" /> Siguiente
                  </>
                ) : (
                  <>
                    <FiUserPlus className="h-4 w-4" /> Registrar
                  </>
                )}
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-brand-50 p-2 text-brand-600">{icon}</div>
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
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
