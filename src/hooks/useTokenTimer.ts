import { useEffect, useRef } from "react";

export function useTokenTimer(expiresAt: number | null, onExpired: () => void): void {
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!expiresAt) return;

    if (Date.now() >= expiresAt) {
      onExpiredRef.current();
      return;
    }

    const id = setInterval(() => {
      if (Date.now() >= expiresAt) {
        onExpiredRef.current();
        clearInterval(id);
      }
    }, 1_000);

    return () => clearInterval(id);
  }, [expiresAt]);
}
