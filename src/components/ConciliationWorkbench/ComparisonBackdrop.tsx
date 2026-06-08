import { FiActivity } from "react-icons/fi";

interface ComparisonBackdropProps {
  isVisible: boolean;
  label?: string;
  detail?: string;
}

export default function ComparisonBackdrop({
  isVisible,
  label = "Comparando extractos",
  detail = "Calculando coincidencias en el servidor."
}: ComparisonBackdropProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <style>
        {`
          @keyframes qoncilia-comparison-bar {
            0% { transform: translateX(-115%); }
            50% { transform: translateX(35%); }
            100% { transform: translateX(215%); }
          }
        `}
      </style>
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-600">
            <FiActivity className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{label}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-sm border border-slate-200 bg-slate-100">
          <div
            className="h-full w-1/2 rounded-sm bg-sky-500 shadow-[0_0_14px_rgba(14,165,233,0.45)]"
            style={{
              animation: "qoncilia-comparison-bar 1.35s cubic-bezier(0.45, 0, 0.2, 1) infinite"
            }}
          />
        </div>
      </div>
    </div>
  );
}
