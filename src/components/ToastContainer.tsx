import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";
import type {
  Toast,
  ToastContainerProps,
  ToastStyle,
  ToastType
} from "../types/components/toast-container.types";

const styles: Record<ToastType, ToastStyle> = {
  success: {
    icon: FiCheckCircle,
    border: "border-emerald-200",
    iconColor: "text-emerald-600"
  },
  error: {
    icon: FiAlertCircle,
    border: "border-rose-200",
    iconColor: "text-rose-600"
  },
  info: {
    icon: FiInfo,
    border: "border-sky-200",
    iconColor: "text-sky-600"
  }
};

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(92vw,24rem)] flex-col gap-3">
      {toasts.map((toast) => {
        const config = styles[toast.type] ?? styles.info;
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border bg-white p-4 shadow-lg transition-all ${config.border}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">{toast.title}</p>
                <p className="text-sm text-slate-600">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar notificacion"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
