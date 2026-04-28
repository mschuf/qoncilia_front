import AppModal from "./AppModal";
import { ReactNode } from "react";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  buttonLabel?: string;
}

export default function AlertModal({
  open,
  onClose,
  title,
  message,
  buttonLabel = "Entendido",
}: AlertModalProps) {
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
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {buttonLabel}
          </button>
        </div>
      }
    >
      <div className="text-slate-600">{message}</div>
    </AppModal>
  );
}
