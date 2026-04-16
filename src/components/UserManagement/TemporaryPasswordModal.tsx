import { FiRefreshCw } from "react-icons/fi";
import AppModal from "../AppModal";

interface TemporaryPasswordModalProps {
  temporaryPassword: string;
  onClose: () => void;
}

export default function TemporaryPasswordModal({
  temporaryPassword,
  onClose,
}: TemporaryPasswordModalProps) {
  return (
    <AppModal
      open={Boolean(temporaryPassword)}
      onClose={onClose}
      title="Contrasena temporal generada"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          Cerrar
        </button>
      }
    >
      <p className="text-sm text-slate-600">
        Comparte esta contrasena temporal con el usuario y pedile cambiarla al ingresar.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 p-4">
        <FiRefreshCw className="h-4 w-4 text-brand-700" />
        <code className="text-lg font-bold text-brand-800">{temporaryPassword}</code>
      </div>
    </AppModal>
  );
}
