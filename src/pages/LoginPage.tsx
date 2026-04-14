import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { FiLock, FiLogIn, FiUser } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
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
      toast.success("Inicio de sesión correcto.");
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar sesión.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Iniciar Sesión
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Bienvenido de vuelta a Qoncilia
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200/60 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={onSubmit}>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Email o usuario</span>
              <div className="flex items-center rounded-xl border border-slate-200 px-3 py-1 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
                <FiUser className="text-slate-400 ml-1" />
                <input
                  className="w-full border-0 px-3 py-2 text-sm focus:outline-none bg-transparent"
                  name="identifier"
                  value={form.identifier}
                  onChange={onChange}
                  required
                  autoComplete="username"
                />
              </div>
            </label>

            <label className="block space-y-1.5 border-none">
              <span className="text-sm font-semibold text-slate-700">Contraseña</span>
              <div className="flex items-center rounded-xl border border-slate-200 px-3 py-1 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all">
                <FiLock className="text-slate-400 ml-1" />
                <input
                  className="w-full border-0 px-3 py-2 text-sm focus:outline-none bg-transparent"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  required
                  autoComplete="current-password"
                />
              </div>
            </label>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 active:scale-[0.98]"
            >
              <FiLogIn className="h-4 w-4" /> Entrar
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  ¿No tenés cuenta?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link to="/register" className="font-bold text-slate-900 hover:text-slate-700 transition">
                Registrate ahora
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
