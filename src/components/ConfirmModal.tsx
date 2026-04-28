import AppModal from "./AppModal";
import { ReactNode } from "react";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary";
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Aceptar",
  cancelLabel = "Cancelar",
  confirmVariant = "primary",
}: ConfirmModalProps) {
  const confirmButtonClass =
    confirmVariant === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700"
      : "bg-brand-600 text-white hover:bg-brand-700";

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-slate-600">{message}</div>
    </AppModal>
  );
}
