import { useEffect } from "react";

export default function useEscapeKey(enabled: boolean, onEscape?: () => void): void {
  useEffect(() => {
    if (!enabled) return undefined;

    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape?.();
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled, onEscape]);
}
