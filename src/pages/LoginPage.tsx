import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { FiLock, FiLogIn, FiUser } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { LoginPayload } from "../types/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<LoginPayload>({ identifier: "", password: "" });

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await login(form);
      toast.success("Inicio de sesion correcto.");
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar sesion.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#eff6ff_30%,_#f8fafc_62%,_#ffffff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-sm sm:p-10">
          <BrandMark size="lg" />
          <div className="mt-10 max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-600">
              Plataforma
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-slate-950 sm:text-5xl">
              La conciliacion empieza con una Q que se ve de lejos.
            </h1>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Ingresa con tu usuario o email para operar tu empresa dentro de Qoncilia.
              El acceso respeta tus permisos, modulos y configuraciones activas.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <FeatureStat label="Empresas" value="1 acceso" helper="Administra tu operacion" />
            <FeatureStat label="Bancos" value="ABM" helper="Catalogos y cuentas" />
            <FeatureStat label="Layouts" value="Match" helper="Tolerancias configurables" />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-slate-950 p-6 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.95)] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
            Acceso
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-white">
            Iniciar Sesion
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Usa tu usuario empresa o tu email para entrar.
          </p>

          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-200">Email o usuario</span>
              <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1 transition-all focus-within:border-cyan-300 focus-within:ring-1 focus-within:ring-cyan-300">
                <FiUser className="ml-1 text-slate-400" />
                <input
                  className="w-full border-0 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  name="identifier"
                  value={form.identifier}
                  onChange={onChange}
                  required
                  autoComplete="username"
                  placeholder="empresa.admin"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-200">Contrasena</span>
              <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1 transition-all focus-within:border-cyan-300 focus-within:ring-1 focus-within:ring-cyan-300">
                <FiLock className="ml-1 text-slate-400" />
                <input
                  className="w-full border-0 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  required
                  autoComplete="current-password"
                  placeholder="Minimo 6 caracteres"
                />
              </div>
            </label>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
            >
              <FiLogIn className="h-4 w-4" /> Entrar
            </button>
          </form>

          <div className="mt-8 border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-slate-400">Todavia no tienes empresa registrada?</p>
            <Link to="/register" className="mt-3 inline-block font-bold text-cyan-300 transition hover:text-cyan-200">
              Registrar empresa
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureStat({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-extrabold text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}
