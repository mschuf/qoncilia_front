import { FiLoader } from "react-icons/fi";
import type { BackdropProps } from "../types/components/backdrop.types";

export default function Backdrop({ isVisible }: BackdropProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px]">
      <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-glow">
        <FiLoader className="h-5 w-5 animate-spin text-brand-600" />
        <p className="text-sm font-semibold text-slate-700">Procesando...</p>
      </div>
    </div>
  );
}
