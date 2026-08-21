import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SapB1QueryTable } from "../../erp/sap";
import { formatQueryCell } from "./workbenchHelpers";

// Ancho fijo por columna; si el contenido se pasa, la celda hace scroll (no crece).
const COL_W = 90;
const SEL_W = 30;

type TableRowProps = {
  cells: string[];
  index: number;
  isSelected: boolean;
  isMatched: boolean;
  hasSelection: boolean;
  selectionMode: "single" | "multiple";
  onSelectRow?: (index: number | null) => void;
  onToggleRow?: (index: number, selected: boolean) => void;
  onActivateRow?: (index: number) => void;
  onMoveSelection?: (index: number, direction: -1 | 1) => void;
};

type SortState = {
  column: string;
  direction: "asc" | "desc";
};

function toSortableDate(value: string): number | null {
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  const dayFirstMatch = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/.exec(value);
  const parts = isoMatch
    ? [isoMatch[1], isoMatch[2], isoMatch[3]]
    : dayFirstMatch
      ? [dayFirstMatch[3], dayFirstMatch[2], dayFirstMatch[1]]
      : null;

  if (!parts) return null;
  const timestamp = Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return Number.isNaN(timestamp) ? null : timestamp;
}

function compareTableValues(left: unknown, right: unknown): number {
  const leftText = String(left ?? "").trim();
  const rightText = String(right ?? "").trim();
  const leftDate = toSortableDate(leftText);
  const rightDate = toSortableDate(rightText);
  const leftNumber = Number(leftText.replace(/\./g, "").replace(",", "."));
  const rightNumber = Number(rightText.replace(/\./g, "").replace(",", "."));

  if (leftDate !== null && rightDate !== null) {
    return leftDate - rightDate;
  }

  if (leftText && rightText && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return leftText.localeCompare(rightText, "es", {
    numeric: true,
    sensitivity: "base",
  });
}

// Fila memoizada: al seleccionar/deseleccionar, React solo re-renderiza las filas
// cuyo estado cambia (la anterior y la nueva), no las N filas de la tabla. Las
// celdas llegan ya formateadas (string[]) para no recalcular nada por render.
const TableRow = memo(function TableRow({
  cells,
  index,
  isSelected,
  isMatched,
  hasSelection,
  selectionMode,
  onSelectRow,
  onToggleRow,
  onActivateRow,
  onMoveSelection,
}: TableRowProps) {
  return (
    <tr
      className={`border-t border-slate-100 ${
        isMatched
          ? "bg-slate-50 opacity-50 cursor-not-allowed"
          : isSelected
            ? "bg-brand-50"
            : hasSelection
              ? "text-slate-700 cursor-pointer hover:bg-slate-50"
              : "text-slate-700"
      }`}
      data-row-index={index}
      tabIndex={hasSelection && !isMatched ? -1 : undefined}
      aria-selected={hasSelection ? isSelected : undefined}
      title={
        hasSelection
          ? "Shift + flecha arriba/abajo para agregar o desmarcar filas rapidamente."
          : undefined
      }
      onClick={(event) => {
        if (hasSelection && !isMatched) {
          if (onToggleRow) {
            onToggleRow(index, !isSelected);
          } else {
            onSelectRow?.(isSelected ? null : index);
          }
          onActivateRow?.(index);
          event.currentTarget.focus();
        }
      }}
      onKeyDown={(event) => {
        if (!event.shiftKey || !hasSelection || isMatched) return;

        const direction =
          event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : null;
        if (direction === null) return;

        event.preventDefault();
        onMoveSelection?.(index, direction);
      }}
    >
      {hasSelection ? (
        <td className="px-2 py-1 text-center" style={{ width: SEL_W }}>
          <input
            type={selectionMode === "multiple" ? "checkbox" : "radio"}
            checked={isSelected}
            disabled={isMatched}
            readOnly
            className="cursor-pointer"
          />
        </td>
      ) : null}
      {cells.map((cell, i) => (
        <td key={i} className="px-2 py-1" style={{ width: COL_W }}>
          <div className="no-scrollbar overflow-x-auto whitespace-nowrap">
            {cell}
          </div>
        </td>
      ))}
    </tr>
  );
});

function SapB1QueryTableView({
  title,
  table,
  selectedRowIndex,
  selectedRowIndices,
  onSelectRow,
  onToggleRow,
  matchedIndices,
}: {
  title: string;
  table: SapB1QueryTable;
  selectedRowIndex?: number | null;
  selectedRowIndices?: ReadonlySet<number>;
  onSelectRow?: (index: number | null) => void;
  onToggleRow?: (index: number, selected: boolean) => void;
  matchedIndices?: Set<number>;
}) {
  const columns = useMemo(() => table.columns, [table.columns]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [keyboardActiveRowIndex, setKeyboardActiveRowIndex] = useState<number | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const matchedIndicesRef = useRef(matchedIndices);
  const selectedRowIndicesRef = useRef(selectedRowIndices);
  const keyboardRangeAnchorRef = useRef<number | null>(null);
  const keyboardSelectionDirectionRef = useRef<-1 | 1 | null>(null);
  matchedIndicesRef.current = matchedIndices;
  selectedRowIndicesRef.current = selectedRowIndices;
  const hasSelection = onSelectRow !== undefined || onToggleRow !== undefined;
  const selectionMode = onToggleRow ? "multiple" : "single";
  const tableWidth = (hasSelection ? SEL_W : 0) + columns.length * COL_W;

  // Formateo precomputado de TODAS las celdas: corre solo cuando cambian los datos
  // o las columnas, no en cada render (seleccionar filas no lo recalcula).
  // formatQueryCell hace regex + parseo numerico por celda, asi que esto evita
  // miles de operaciones repetidas al interactuar con la tabla.
  const formattedRows = useMemo(
    () =>
      table.rows.map((row, rowIndex) => ({
        row,
        rowIndex,
        cells: columns.map((col) => formatQueryCell(col, row[col])),
      })),
    [table.rows, columns],
  );

  const sortedRows = useMemo(() => {
    if (!sort) return formattedRows;

    return [...formattedRows].sort((left, right) => {
      const comparison = compareTableValues(
        left.row[sort.column],
        right.row[sort.column],
      );
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [formattedRows, sort]);

  const toggleSort = (column: string) => {
    setSort((current) => ({
      column,
      direction:
        current?.column === column && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const activateRow = useCallback((rowIndex: number) => {
    keyboardRangeAnchorRef.current = rowIndex;
    keyboardSelectionDirectionRef.current = null;
    setKeyboardActiveRowIndex(rowIndex);
  }, []);

  const moveSelection = useCallback(
    (currentRowIndex: number, direction: -1 | 1) => {
      const currentPosition = sortedRows.findIndex(
        ({ rowIndex }) => rowIndex === currentRowIndex,
      );
      if (currentPosition < 0) return;

      // La navegacion sigue el orden que ve el usuario y omite las filas ya
      // conciliadas, que no pueden volver a seleccionarse.
      for (
        let position = currentPosition + direction;
        position >= 0 && position < sortedRows.length;
        position += direction
      ) {
        const nextRowIndex = sortedRows[position].rowIndex;
        if (matchedIndicesRef.current?.has(nextRowIndex)) continue;

        if (onToggleRow) {
          const anchorRowIndex = keyboardRangeAnchorRef.current ?? currentRowIndex;
          const previousDirection = keyboardSelectionDirectionRef.current;
          const isReturningToAnchor =
            previousDirection !== null &&
            direction !== previousDirection &&
            currentRowIndex !== anchorRowIndex &&
            (selectedRowIndicesRef.current?.has(currentRowIndex) ?? false);

          if (isReturningToAnchor) {
            // Al invertir la direccion se contrae el rango: se quita la fila
            // actual y se mueve el foco hacia la anterior del grupo.
            onToggleRow(currentRowIndex, false);
          } else {
            // En la direccion original (o al partir del ancla) se extiende el
            // rango con la siguiente fila visible no conciliada.
            keyboardRangeAnchorRef.current = anchorRowIndex;
            keyboardSelectionDirectionRef.current = direction;
            onToggleRow(nextRowIndex, true);
          }
        } else {
          onSelectRow?.(nextRowIndex);
        }
        setKeyboardActiveRowIndex(nextRowIndex);
        return;
      }
    },
    [onSelectRow, onToggleRow, sortedRows],
  );

  useEffect(() => {
    if (keyboardActiveRowIndex === null) return;

    const row = tableContainerRef.current?.querySelector<HTMLTableRowElement>(
      `tr[data-row-index="${keyboardActiveRowIndex}"]`,
    );
    if (!row) return;

    row.focus({ preventScroll: true });
    row.scrollIntoView({ block: "nearest" });
  }, [keyboardActiveRowIndex, sortedRows]);

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
          {table.rows.length} filas
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div ref={tableContainerRef} className="max-h-[300px] overflow-auto">
          <table className="table-fixed text-xs" style={{ width: tableWidth }}>
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                {hasSelection ? (
                  <th className="px-2 py-1" style={{ width: SEL_W }} />
                ) : null}
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-2 py-1"
                    style={{ width: COL_W }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      title={`Ordenar por ${column}`}
                      className="flex w-full items-center gap-1 text-left hover:text-slate-900"
                    >
                      <span className="no-scrollbar overflow-x-auto whitespace-nowrap">
                        {column}
                      </span>
                      <span className="shrink-0 text-[9px] text-slate-400">
                        {sort?.column === column
                          ? sort.direction === "asc"
                            ? "▲"
                            : "▼"
                          : "↕"}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(({ cells, rowIndex }) => (
                <TableRow
                  key={rowIndex}
                  cells={cells}
                  index={rowIndex}
                  isSelected={
                    selectedRowIndices?.has(rowIndex) ?? selectedRowIndex === rowIndex
                  }
                  isMatched={matchedIndices?.has(rowIndex) ?? false}
                  hasSelection={hasSelection}
                  selectionMode={selectionMode}
                  onSelectRow={onSelectRow}
                  onToggleRow={onToggleRow}
                  onActivateRow={activateRow}
                  onMoveSelection={moveSelection}
                />
              ))}
              {table.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(
                      columns.length + (hasSelection ? 1 : 0),
                      1,
                    )}
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
    </div>
  );
}

// memo: al seleccionar una fila en una tabla, la OTRA tabla (props sin cambios)
// no se vuelve a renderizar.
export default memo(SapB1QueryTableView);
