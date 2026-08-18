import { memo, useMemo } from "react";
import { FiCheck, FiDownload, FiX } from "react-icons/fi";
import {
  buildMatchesExportRows,
  computeMatchAmountTotals,
  formatMatchCell,
} from "./workbenchHelpers";
import type { MatchColumn, SmartMatch } from "./workbenchHelpers";
import { downloadXlsx } from "../../utils/xlsx";
import {
  formatAmountPyg,
  formatIsoToDdMmYyyy,
  parseLooseNumber,
  toIsoLoose,
} from "../../utils/format";

// Ancho fijo por columna; si el contenido se pasa, la celda hace scroll (no crece).
const COL_W = 90;
const ACTION_W = 52;

type DateSubtotal = {
  key: string;
  label: string;
  matches: number;
  bank: number;
  bankExtra: number;
  system: number;
};

function SmartMatchesTable({
  matches,
  systemColumns,
  bankColumns,
  onRemove,
  onClear,
  title = "Resultados del matching",
  exportFileName = "resultados-matching",
  dateSubtotalColumn,
  dateSubtotalLabel = "Totales por fecha",
  dateSubtotalBankExtraColumn,
  dateSubtotalBankExtraLabel = "Total Importe Neto",
  onKeepOnlyDate,
}: {
  matches: SmartMatch[];
  // Columnas a mostrar de cada lado. Sistema y Banco pueden traer columnas
  // distintas (ej. Banco: Sequence; Sistema: TransactionNumber/LineNumber).
  systemColumns: MatchColumn[];
  bankColumns: MatchColumn[];
  onRemove?: (match: SmartMatch) => void;
  onClear?: () => void;
  title?: string;
  exportFileName?: string;
  // Al indicarlo, agrega un resumen de importes agrupado por esta fecha del
  // lado Banco. Se usa para las liquidaciones de tarjetas de credito.
  dateSubtotalColumn?: string;
  dateSubtotalLabel?: string;
  // Columna monetaria auxiliar del CSV para el resumen por fecha. Credito usa
  // "Importe neto" para mostrar lo que realmente se acredita al comercio.
  dateSubtotalBankExtraColumn?: string;
  dateSubtotalBankExtraLabel?: string;
  // Conserva solamente los matches de la fecha indicada. La tabla de tarjetas
  // la usa para procesar una fecha de credito a la vez.
  onKeepOnlyDate?: (dateKey: string) => void;
}) {
  const hasActions = Boolean(onRemove || onClear);
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
  const dateSubtotalBankExtra = useMemo(
    () =>
      dateSubtotalBankExtraColumn
        ? bankColumns.find(
            (column) => column.fieldKey === dateSubtotalBankExtraColumn,
          ) ?? null
        : null,
    [bankColumns, dateSubtotalBankExtraColumn],
  );

  const dateSubtotals = useMemo(() => {
    if (!dateSubtotalColumn || !amountTotals.hasAmountColumns) return [];
    const dateColumn = bankColumns.find(
      (column) => column.fieldKey === dateSubtotalColumn,
    );
    if (!dateColumn) return [];

    const grouped = new Map<string, DateSubtotal>();
    for (const match of matches) {
      const raw = match.bankRow.values[dateColumn.fieldKey];
      const normalized = match.bankRow.normalized[dateColumn.fieldKey];
      const iso =
        typeof normalized === "string" && /^\d{4}-\d{2}-\d{2}/.test(normalized)
          ? normalized.slice(0, 10)
          : raw
            ? toIsoLoose(raw)
            : null;
      const key = iso ?? raw ?? "sin-fecha";
      const label = iso
        ? formatIsoToDdMmYyyy(iso)
        : raw || "Sin fecha de crédito";
      const current = grouped.get(key) ?? {
        key,
        label,
        matches: 0,
        bank: 0,
        bankExtra: 0,
        system: 0,
      };
      const rowTotals = computeMatchAmountTotals([match], bankColumns, systemColumns);
      const extraRaw = dateSubtotalBankExtra
        ? match.bankRow.values[dateSubtotalBankExtra.fieldKey]
        : null;
      const extraNormalized = dateSubtotalBankExtra
        ? match.bankRow.normalized[dateSubtotalBankExtra.fieldKey]
        : null;
      const extraAmount =
        typeof extraNormalized === "number"
          ? extraNormalized
          : extraRaw == null || extraRaw === ""
            ? null
            : parseLooseNumber(extraRaw);
      current.matches += 1;
      current.bank += rowTotals.bank;
      if (extraAmount !== null) current.bankExtra += extraAmount;
      current.system += rowTotals.system;
      grouped.set(key, current);
    }

    return [...grouped.values()].sort((left, right) => {
      if (left.key === "sin-fecha") return 1;
      if (right.key === "sin-fecha") return -1;
      return left.key.localeCompare(right.key);
    });
  }, [
    amountTotals.hasAmountColumns,
    bankColumns,
    dateSubtotalBankExtra,
    dateSubtotalColumn,
    matches,
    systemColumns,
  ]);

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
    downloadXlsx(`${exportFileName}-${stamp}`, rows, "Resultados");
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-extrabold text-slate-900">
            {title}
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
                    {onClear && matches.length > 0 ? (
                      <button
                        type="button"
                        onClick={onClear}
                        aria-label={`Quitar todas las coincidencias de ${title}`}
                        title={`Quitar todo el matching de ${title.replace("Resultados del matching ", "")}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-300 bg-white text-rose-600 transition hover:bg-rose-600 hover:text-white"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    ) : (
                      "Acción"
                    )}
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
                      {onRemove ? (
                        <button
                          type="button"
                          onClick={() => onRemove(match)}
                          aria-label="Quitar coincidencia"
                          title="Quitar coincidencia"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
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
      {dateSubtotals.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/40">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 bg-violet-50 px-4 py-3">
            <div>
              <h4 className="text-sm font-extrabold text-violet-950">
                {dateSubtotalLabel}
              </h4>
              <p className="text-xs font-medium text-violet-700">
                {onKeepOnlyDate && dateSubtotals.length > 1
                  ? "Conserva una fecha para procesarla y quita las demás coincidencias de crédito."
                  : "Resumen de las coincidencias por fecha de acreditación."}
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-violet-700 shadow-sm">
              {dateSubtotals.length} {dateSubtotals.length === 1 ? "fecha" : "fechas"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-violet-100/70 text-left text-[11px] uppercase tracking-wide text-violet-800">
                <tr>
                  <th className="px-4 py-2 font-bold">Fecha</th>
                  <th className="px-4 py-2 text-right font-bold">Matches</th>
                  <th className="px-4 py-2 text-right font-bold">Total Banco</th>
                  {dateSubtotalBankExtra ? (
                    <th className="px-4 py-2 text-right font-bold">
                      {dateSubtotalBankExtraLabel}
                    </th>
                  ) : null}
                  <th className="px-4 py-2 text-right font-bold">Total SAP</th>
                  <th className="px-4 py-2 text-right font-bold">Diferencia</th>
                  {onKeepOnlyDate && dateSubtotals.length > 1 ? (
                    <th className="px-4 py-2 text-right font-bold">Procesar</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100 bg-white/70 text-slate-700">
                {dateSubtotals.map((subtotal) => {
                  const difference = Math.abs(subtotal.bank - subtotal.system);
                  const balanced = difference < 0.01;
                  return (
                    <tr key={subtotal.key}>
                      <td className="px-4 py-2 font-bold text-slate-800">{subtotal.label}</td>
                      <td className="px-4 py-2 text-right font-semibold">{subtotal.matches}</td>
                      <td className="px-4 py-2 text-right font-semibold text-amber-800">
                        {formatAmountPyg(subtotal.bank)}
                      </td>
                      {dateSubtotalBankExtra ? (
                        <td className="px-4 py-2 text-right font-semibold text-emerald-800">
                          {formatAmountPyg(subtotal.bankExtra)}
                        </td>
                      ) : null}
                      <td className="px-4 py-2 text-right font-semibold text-sky-800">
                        {formatAmountPyg(subtotal.system)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-bold ${
                          balanced ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {balanced ? "Cuadrado" : formatAmountPyg(difference)}
                      </td>
                      {onKeepOnlyDate && dateSubtotals.length > 1 ? (
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => onKeepOnlyDate(subtotal.key)}
                            title={`Conservar solamente los matches de ${subtotal.label}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2 py-1 font-bold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
                          >
                            <FiCheck className="h-3.5 w-3.5" /> Conservar
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// memo: la tabla de resultados no depende de la seleccion de filas de arriba, asi
// que no debe re-renderizarse al hacer match manual / seleccionar. Requiere props
// estables (matches/columnas memoizadas y callbacks con useCallback en el padre).
export default memo(SmartMatchesTable);
