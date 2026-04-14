import type { ReactNode } from "react";

export interface LoadingContextValue {
  startLoading: () => void;
  stopLoading: () => void;
  isLoading: boolean;
}

export interface LoadingProviderProps {
  children: ReactNode;
}
