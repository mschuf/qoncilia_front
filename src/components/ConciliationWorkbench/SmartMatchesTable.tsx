import { memo, useMemo } from "react";
import { FiDownload, FiX } from "react-icons/fi";
import { FaBroom } from "react-icons/fa";
import {
  buildMatchesExportRows,
  computeMatchAmountTotals,
  formatMatchCell,
} from "./workbenchHelpers";
import type { MatchColumn, SmartMatch } from "./workbenchHelpers";
import { downloadXlsx } from "../../utils/xlsx";
import { formatAmountPyg } from "../../utils/format";

// Ancho fijo por columna; si el contenido se pasa, la celda hace scroll (no crece).
const COL_W = 90;
const ACTION_W = 52;

function SmartMatchesTable({
  matches,
  systemColumns,
  bankColumns,
  onRemove,
  onClear,
}: {
  matches: SmartMatch[];
  // Columnas a mostrar de cada lado. Sistema y Banco pueden traer columnas
  // distintas (ej. Banco: Sequence; Sistema: TransactionNumber/LineNumber).
  systemColumns: MatchColumn[];
  bankColumns: MatchColumn[];
  onRemove?: (match: SmartMatch) => void;
  onClear?: () => void;
}) {
  const hasActions = Boolean(onRemove);
  // Divisor vertical entre el bloque Banco y el bloque Sistema.
  const divider = "border-l-2 border-slate-300";
  const totalCols =
    systemColumns.length + bankColumns.length + (hasActions ? 1 : 0);
  const tableWidth =
    (hasActions ? ACTION_W : 0) +
    (bankColumns.length + systemColumns.length) * COL_W;

  // Totales visuales de importes (banco vs sistema) para comparar a simple vista.
  // Suma todas las columnas de monto combinadas. Es solo informativo: no se
  // procesa ni se envia.
  const amountTotals = useMemo(
    () => computeMatchAmountTotals(matches, bankColumns, systemColumns),
    [matches, bankColumns, systemColumns]
  );
  const showTotals = matches.length > 0 && amountTotals.hasAmountColumns;

  // Formateo precomputado de las celdas (banco/sistema) por fila. formatMatchCell
  // hace regex + parseo; con esto corre solo cuando cambian matches/columnas, no en
  // cada render (p.ej. al seleccionar filas en las tablas de arriba).
  const formattedRows = useMemo(
    () =>
      matches.map((match) => ({
        bank: bankColumns.map((c) => formatMatchCell(match.bankRow, c)),
        system: systemColumns.map((c) => formatMatchCell(match.systemRow, c)),
      })),
    [matches, bankColumns, systemColumns]
  );

  // Descarga la tabla actual (mismas columnas y formato que se ven) a un .xlsx.
  const handleDownload = () => {
    const rows = buildMatchesExportRows(matches, bankColumns, systemColumns);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadXlsx(`resultados-matching-${stamp}`, rows, "Resultados");
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-extrabold text-slate-900">
            Resultados del matching
          </h3>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
            {matches.length} coincidencias
          </span>
          {/* Leyenda de colores: Banco vs Sistema */}
          <span className="ml-1 hidden items-center gap-3 text-xs font-semibold sm:flex">
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> Banco
            </span>
            <span className="inline-flex items-center gap-1.5 text-sky-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-300" /> Sistema
              (SAP)
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {matches.length > 0 ? (
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Descargar resultados en Excel"
              title="Descargar Excel"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <FiDownload className="h-4 w-4" />
            </button>
          ) : null}
          {onClear && matches.length > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
            >
              <FaBroom className="h-3.5 w-3.5" /> Limpiar
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
        <div className="max-h-[340px] overflow-auto">
          <table className="table-fixed text-xs" style={{ width: tableWidth }}>
            <colgroup>
              {hasActions ? <col style={{ width: ACTION_W }} /> : null}
              {bankColumns.map((c) => (
                <col key={`bcol-${c.fieldKey}`} style={{ width: COL_W }} />
              ))}
              {systemColumns.map((c) => (
                <col key={`scol-${c.fieldKey}`} style={{ width: COL_W }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-20 text-left text-[11px] uppercase tracking-wide">
              {/* Fila 1: cabeceras de grupo */}
              <tr>
                {hasActions ? (
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-30 border-r border-rose-200 bg-rose-100 px-2 py-1 text-center font-bold text-rose-700"
                  >
                    Acción
                  </th>
                ) : null}
                <th
                  colSpan={Math.max(1, bankColumns.length)}
                  className="bg-amber-100 px-2 py-1 text-center font-extrabold text-amber-700"
                >
                  Banco
                </th>
                <th
                  colSpan={Math.max(1, systemColumns.length)}
                  className={`bg-sky-100 px-2 py-1 text-center font-extrabold text-sky-700 ${divider}`}
                >
                  Sistema (SAP)
                </th>
              </tr>
              {/* Fila 2: etiquetas de columna */}
              <tr>
                {bankColumns.map((c) => (
                  <th
                    key={`bank-${c.fieldKey}`}
                    className="bg-amber-50 px-2 py-1 font-semibold text-amber-800"
                  >
                    <div className="no-scrollbar overflow-x-auto whitespace-nowrap">
                      {c.label}
                    </div>
                  </th>
                ))}
                {systemColumns.map((c, i) => (
                  <th
                    key={`sys-${c.fieldKey}`}
                    className={`bg-sky-50 px-2 py-1 font-semibold text-sky-800 ${i === 0 ? divider : ""}`}
                  >
                    <div className="no-scrollbar overflow-x-auto whitespace-nowrap">
                      {c.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matches.map((match, idx) => (
                <tr
                  key={idx}
                  className="border-t border-slate-100 text-slate-700"
                >
                  {hasActions ? (
                    <td className="sticky left-0 z-10 border-r border-rose-100 bg-rose-50 px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => onRemove?.(match)}
                        aria-label="Quitar coincidencia"
                        title="Quitar coincidencia"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <FiX className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  ) : null}
                  {bankColumns.map((c, i) => (
                    <td
                      key={`bank-${c.fieldKey}`}
                      className="bg-amber-50/40 px-2 py-1"
                    >
                      <div className="no-scrollbar overflow-x-auto whitespace-nowrap">
                        {formattedRows[idx].bank[i]}
                      </div>
                    </td>
                  ))}
                  {systemColumns.map((c, i) => (
                    <td
                      key={`sys-${c.fieldKey}`}
                      className={`bg-sky-50/40 px-2 py-1 ${i === 0 ? divider : ""}`}
                    >
                      <div className="no-scrollbar overflow-x-auto whitespace-nowrap">
                        {formattedRows[idx].system[i]}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {matches.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, totalCols)}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No se encontraron coincidencias con las reglas actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
            {showTotals ? (
              <tfoot className="sticky bottom-0 z-20">
                <tr className="border-t-2 border-slate-300 text-[11px] font-bold">
                  {hasActions ? (
                    <td className="sticky left-0 z-30 border-r border-slate-200 bg-slate-100 px-2 py-1.5 text-center text-slate-500">
                      Total
                    </td>
                  ) : null}
                  <td
                    colSpan={Math.max(1, bankColumns.length)}
                    className="bg-amber-100 px-2 py-1.5 text-amber-800"
                  >
                    <div className="no-scrollbar flex items-center justify-end gap-1.5 overflow-x-auto whitespace-nowrap">
                      <span className="font-semibold uppercase tracking-wide text-amber-700">
                        Total banco
                      </span>
                      <span
                        className={
                          amountTotals.balanced ? "text-emerald-700" : "text-rose-700"
                        }
                      >
                        {formatAmountPyg(amountTotals.bank)}
                      </span>
                    </div>
                  </td>
                  <td
                    colSpan={Math.max(1, systemColumns.length)}
                    className={`bg-sky-100 px-2 py-1.5 text-sky-800 ${divider}`}
                  >
                    <div className="no-scrollbar flex items-center justify-end gap-1.5 overflow-x-auto whitespace-nowrap">
                      <span className="font-semibold uppercase tracking-wide text-sky-700">
                        Total sistema
                      </span>
                      <span
                        className={
                          amountTotals.balanced ? "text-emerald-700" : "text-rose-700"
                        }
                      >
                        {formatAmountPyg(amountTotals.system)}
                      </span>
                      {!amountTotals.balanced ? (
                        <span className="text-rose-700">
                          (Δ{" "}
                          {formatAmountPyg(
                            Math.abs(amountTotals.bank - amountTotals.system)
                          )}
                          )
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </section>
  );
}

// memo: la tabla de resultados no depende de la seleccion de filas de arriba, asi
// que no debe re-renderizarse al hacer match manual / seleccionar. Requiere props
// estables (matches/columnas memoizadas y callbacks con useCallback en el padre).
export default memo(SmartMatchesTable);
