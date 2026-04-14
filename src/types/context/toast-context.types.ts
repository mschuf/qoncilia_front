import type { ReactNode } from "react";
import type { ToastType } from "../components/toast-container.types";

export interface AddToastInput {
  title: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastContextValue {
  addToast: (input: AddToastInput) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

export interface ToastProviderProps {
  children: ReactNode;
}
