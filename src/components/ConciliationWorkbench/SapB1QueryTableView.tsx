import type { SapB1QueryTable } from "../../erp/sap";
import { formatQueryValue } from "./workbenchHelpers";

export default function SapB1QueryTableView({
  title,
  table,
  selectedRowIndex,
  onSelectRow,
  matchedIndices,
}: {
  title: string;
  table: SapB1QueryTable;
  selectedRowIndex?: number | null;
  onSelectRow?: (index: number | null) => void;
  matchedIndices?: Set<number>;
}) {
  const columns = table.columns.slice(0, 12);
  const hasSelection = onSelectRow !== undefined;

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {table.rows.length} filas
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                {hasSelection ? <th className="px-3 py-2 w-10"></th> : null}
                {columns.map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-2">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => {
                const isMatched = matchedIndices?.has(index);
                const isSelected = selectedRowIndex === index;
                return (
                  <tr
                    key={index}
                    className={`border-t border-slate-100 ${isMatched
                        ? "bg-slate-50 opacity-50 cursor-not-allowed"
                        : isSelected
                          ? "bg-brand-50"
                          : hasSelection ? "text-slate-700 cursor-pointer hover:bg-slate-50" : "text-slate-700"
                      }`}
                    onClick={() => {
                      if (hasSelection && !isMatched) {
                        onSelectRow(isSelected ? null : index);
                      }
                    }}
                  >
                    {hasSelection ? (
                      <td className="px-3 py-2 w-10 text-center">
                        <input
                          type="radio"
                          checked={isSelected}
                          disabled={isMatched}
                          readOnly
                          className="cursor-pointer"
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={column} className="whitespace-nowrap px-3 py-2">
                        {formatQueryValue(row[column])}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {table.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length + (hasSelection ? 1 : 0), 1)}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    La consulta no devolvio filas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      {table.columns.length > columns.length ? (
        <p className="mt-2 text-xs text-slate-500">
          Mostrando las primeras {columns.length} columnas de{" "}
          {table.columns.length}.
        </p>
      ) : null}
    </div>
  );
}
