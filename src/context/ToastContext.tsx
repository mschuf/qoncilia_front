import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import ToastContainer from "@/ToastContainer";
import type { Toast } from "../types/components/toast-container.types";
import type {
  AddToastInput,
  ToastContextValue,
  ToastProviderProps
} from "../types/context/toast-context.types";

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function buildId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutMap = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: string) => {
    const timeout = timeoutMap.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutMap.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, message, type = "info", duration = 4500 }: AddToastInput): string => {
      const id = buildId();
      setToasts((prev) => [...prev, { id, title, message, type }]);

      const timeout = setTimeout(() => removeToast(id), duration);
      timeoutMap.current.set(id, timeout);

      return id;
    },
    [removeToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      addToast,
      success(message, title = "Éxito") {
        return addToast({ title, message, type: "success" });
      },
      error(message, title = "Error") {
        return addToast({ title, message, type: "error" });
      },
      info(message, title = "Aviso") {
        return addToast({ title, message, type: "info" });
      }
    }),
    [addToast]
  );

  useEffect(
    () => () => {
      timeoutMap.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutMap.current.clear();
    },
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }

  return context;
}
