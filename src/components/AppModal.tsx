import { FiX } from "react-icons/fi";
import useEscapeKey from "../hooks/useEscapeKey";
import type { AppModalProps } from "../types/components/app-modal.types";

export default function AppModal({
  open,
  onClose,
  title,
  children,
  footer,
  closeOnBackdrop = true,
  widthClass = "max-w-2xl",
  contentClassName = "max-h-[70vh] overflow-y-auto px-6 py-5",
}: AppModalProps) {
  useEscapeKey(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`w-full rounded-2xl bg-white shadow-glow ${widthClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar modal"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className={contentClassName}>{children}</div>

        {footer ? <div className="border-t border-slate-100 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
