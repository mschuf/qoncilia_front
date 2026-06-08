import { useEffect, useRef, useState } from "react";
import { FiCalendar, FiChevronDown } from "react-icons/fi";

type PredefinedRange =
  | "hoy"
  | "ayer"
  | "esta_semana"
  | "semana_pasada"
  | "este_mes"
  | "mes_pasado"
  | "este_anio"
  | "anio_pasado"
  | "personalizado";

const RANGE_LABELS: Record<PredefinedRange, string> = {
  hoy: "Hoy",
  ayer: "Ayer",
  esta_semana: "Esta semana",
  semana_pasada: "Semana pasada",
  este_mes: "Este mes",
  mes_pasado: "Mes pasado",
  este_anio: "Este año",
  anio_pasado: "Año pasado",
  personalizado: "Personalizado"
};

function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getRangeDates(range: PredefinedRange): { from: string; to: string } | null {
  if (range === "personalizado") return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case "hoy":
      return { from: formatDate(today), to: formatDate(today) };
    case "ayer": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: formatDate(yesterday), to: formatDate(yesterday) };
    }
    case "esta_semana": {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(today.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: formatDate(monday), to: formatDate(sunday) };
    }
    case "semana_pasada": {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1) - 7; // Last Monday
      const monday = new Date(today.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: formatDate(monday), to: formatDate(sunday) };
    }
    case "este_mes": {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: formatDate(firstDay), to: formatDate(lastDay) };
    }
    case "mes_pasado": {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: formatDate(firstDay), to: formatDate(lastDay) };
    }
    case "este_anio": {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      return { from: formatDate(firstDay), to: formatDate(lastDay) };
    }
    case "anio_pasado": {
      const firstDay = new Date(today.getFullYear() - 1, 0, 1);
      const lastDay = new Date(today.getFullYear() - 1, 11, 31);
      return { from: formatDate(firstDay), to: formatDate(lastDay) };
    }
    default:
      return null;
  }
}

export function getDefaultEsteMesDates() {
  return getRangeDates("este_mes")!;
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<PredefinedRange>("este_mes");
  const containerRef = useRef<HTMLDivElement>(null);

  // Determinar si es personalizado al inicio o si las fechas no coinciden con la opción seleccionada
  useEffect(() => {
    const dates = getRangeDates(selectedRange);
    if (dates) {
      if (dates.from !== dateFrom || dates.to !== dateTo) {
        setSelectedRange("personalizado");
      }
    }
  }, [dateFrom, dateTo, selectedRange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectRange = (range: PredefinedRange) => {
    setSelectedRange(range);
    const dates = getRangeDates(range);
    if (dates) {
      onChange(dates.from, dates.to);
      setIsOpen(false);
    }
  };

  const isCustom = selectedRange === "personalizado";

  const formatDisplayDate = (value: string) => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const rangeLabel = RANGE_LABELS[selectedRange];

  return (
    <div className="relative" ref={containerRef}>
      <label className="space-y-1.5 block">
        <span className="text-sm font-semibold text-slate-700">Fecha</span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          <div className="flex min-w-0 items-center gap-2">
            <FiCalendar className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-900">{rangeLabel}</span>
            {dateFrom && dateTo ? (
              <>
                <span className="text-slate-300">-</span>
                <span className="text-xs font-medium text-slate-500">
                  {formatDisplayDate(dateFrom)} – {formatDisplayDate(dateTo)}
                </span>
              </>
            ) : null}
          </div>
          <FiChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </label>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-full min-w-[320px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(RANGE_LABELS) as PredefinedRange[])
              .filter((range) => range !== "personalizado")
              .map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => handleSelectRange(range)}
                  className={`flex items-center rounded-xl px-3 py-2.5 text-sm transition ${selectedRange === range
                      ? "bg-brand-50 font-bold text-brand-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  {RANGE_LABELS[range]}
                </button>
              ))}
          </div>

          <div className="my-2 border-t border-slate-100"></div>

          <button
            type="button"
            onClick={() => handleSelectRange("personalizado")}
            className={`flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm transition ${selectedRange === "personalizado"
                ? "bg-brand-50 font-bold text-brand-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
          >
            {RANGE_LABELS["personalizado"]}
          </button>

          {isCustom && (
            <div className="mt-2 border-t border-slate-100 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Desde</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => onChange(e.target.value, dateTo)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hasta</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => onChange(dateFrom, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
