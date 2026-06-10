import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FiLogIn } from "react-icons/fi";
import AppModal from "../AppModal";
import type { CompanyErpConfig } from "../../types/erp";

interface ErpLoginModalProps {
  open: boolean;
  onClose: () => void;
  config: CompanyErpConfig | null;
  isSubmitting: boolean;
  onSubmit: (username?: string, password?: string) => Promise<boolean>;
}

export default function ErpLoginModal({
  open,
  onClose,
  config,
  isSubmitting,
  onSubmit,
}: ErpLoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setUsername(config?.userSystem ?? "");
      setPassword("");
    }
  }, [open, config?.userSystem]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await onSubmit(username.trim() || undefined, password || undefined);
    if (success) {
      setPassword("");
      onClose();
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Iniciar sesion ERP"
      closeOnBackdrop={false}
      widthClass="max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            form="erp-login-form"
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiLogIn className="h-4 w-4" />
            {isSubmitting ? "Iniciando sesion..." : "Iniciar sesion"}
          </button>
        </div>
      }
    >
      <form id="erp-login-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            Configuracion ERP
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {config ? `${config.name} - ${config.dbName ?? config.code}` : "Sin ERP seleccionado"}
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">Usuario SAP</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={config?.hasUserPass ? "Dejar vacio para usar el usuario guardado" : ""}
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all outline-none"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">Contrasena SAP</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={config?.hasUserPass ? "Dejar vacio para usar la contrasena guardada" : ""}
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all outline-none"
          />
        </label>

        {config?.hasUserPass ? (
          <p className="text-xs text-slate-500">
            Esta configuracion tiene credenciales guardadas: podes dejar los campos vacios para
            usarlas.
          </p>
        ) : null}
      </form>
    </AppModal>
  );
}
