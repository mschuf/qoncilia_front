import type { IconType } from "react-icons";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

export interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export interface ToastStyle {
  icon: IconType;
  border: string;
  iconColor: string;
}
