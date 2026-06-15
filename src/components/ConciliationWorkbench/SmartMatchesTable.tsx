import { FiX } from "react-icons/fi";
import type { MatchColumn, SmartMatch } from "./workbenchHelpers";

export default function SmartMatchesTable({
  matches,
  columns,
  onRemove,
  onClear,
}: {
  matches: SmartMatch[];
  columns: MatchColumn[];
  onRemove?: (match: SmartMatch) => void;
  onClear?: () => void;
}) {
  const visibleColumns = columns.slice(0, 4);
  const hasActions = Boolean(onRemove);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-extrabold text-slate-900">
            Resultados del matching
          </h3>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
            {matches.length} coincidencias
          </span>
        </div>
        {onClear && matches.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
          >
            <FiX className="h-3.5 w-3.5" /> Limpiar tabla
          </button>
        ) : null}
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2 text-center text-slate-400" colSpan={visibleColumns.length}>
                  Sistema
                </th>
                <th className="px-3 py-2 text-center text-slate-400" colSpan={visibleColumns.length}>
                  Banco
                </th>
                <th className="px-3 py-2">Regla</th>
                <th className="px-3 py-2 text-right">Score</th>
                {hasActions ? <th className="px-3 py-2" /> : null}
              </tr>
              <tr>
                {visibleColumns.map((c) => (
                  <th key={`sys-${c.fieldKey}`} className="px-3 py-2">
                    {c.label}
                  </th>
                ))}
                {visibleColumns.map((c) => (
                  <th key={`bank-${c.fieldKey}`} className="px-3 py-2">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2 text-right">%</th>
                {hasActions ? <th className="px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {matches.map((match, idx) => (
                <tr
                  key={idx}
                  className="border-t border-slate-100 text-slate-700"
                >
                  {visibleColumns.map((c) => (
                    <td
                      key={`sys-${c.fieldKey}`}
                      className="px-3 py-2 whitespace-nowrap"
                    >
                      {match.systemRow.values[c.fieldKey] ?? "-"}
                    </td>
                  ))}
                  {visibleColumns.map((c) => (
                    <td
                      key={`bank-${c.fieldKey}`}
                      className="px-3 py-2 whitespace-nowrap"
                    >
                      {match.bankRow.values[c.fieldKey] ?? "-"}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-slate-600">
                    {match.matchReason === "reference"
                      ? "Referencia"
                      : match.matchReason === "manual"
                        ? "Manual"
                        : match.dateDifferenceDays === null
                          ? "Fecha + monto"
                          : `Fecha +/- ${match.dateDifferenceDays}d + monto`}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">
                    {Math.round(match.score * 100)}%
                  </td>
                  {hasActions ? (
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove?.(match)}
                        aria-label="Quitar coincidencia"
                        title="Quitar coincidencia"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {matches.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length * 2 + 2 + (hasActions ? 1 : 0)}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No se encontraron coincidencias con las reglas actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
