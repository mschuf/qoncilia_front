import { createContext, useContext, useMemo, useState } from "react";
import Backdrop from "@/Backdrop";
import type {
  LoadingContextValue,
  LoadingProviderProps
} from "../types/context/loading-context.types";

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [pendingRequests, setPendingRequests] = useState(0);

  const value = useMemo<LoadingContextValue>(
    () => ({
      startLoading() {
        setPendingRequests((prev) => prev + 1);
      },
      stopLoading() {
        setPendingRequests((prev) => (prev > 0 ? prev - 1 : 0));
      },
      isLoading: pendingRequests > 0
    }),
    [pendingRequests]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <Backdrop isVisible={pendingRequests > 0} />
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading debe usarse dentro de LoadingProvider");
  }

  return context;
}
