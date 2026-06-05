import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp, FiXCircle } from "react-icons/fi";
import type {
  LayoutMapping,
  PreviewMatch,
  PreviewResponse,
  PreviewRow,
} from "../../types/conciliation";
import { summarizeRow } from "../../hooks/useConciliationWorkbench";

interface MatchesSectionProps {
  preview: PreviewResponse;
  manualMatches: PreviewMatch[];
  unmatchedSystemRows: PreviewRow[];
  unmatchedBankRows: PreviewRow[];
  onDragEnd: (event: DragEndEvent) => void;
  onRemoveAutoMatch: (match: PreviewMatch) => void;
  onRemoveManualMatch: (match: PreviewMatch) => void;
  manualMatcherInitiallyOpen?: boolean;
}

export default function MatchesSection({
  preview,
  manualMatches,
  unmatchedSystemRows,
  unmatchedBankRows,
  onDragEnd,
  onRemoveAutoMatch,
  onRemoveManualMatch,
  manualMatcherInitiallyOpen = true,
}: MatchesSectionProps) {
  const [isManualMatcherOpen, setIsManualMatcherOpen] = useState(
    manualMatcherInitiallyOpen,
  );

  // Indices O(1) para los lookups por rowId. Sin esto, cada celda hace
  // Array.find sobre potencialmente miles de filas en cada render.
  const systemRowsById = useMemo(() => {
    const map = new Map<string, PreviewRow>();
    for (const row of preview.systemRows) map.set(row.rowId, row);
    return map;
  }, [preview.systemRows]);

  const bankRowsById = useMemo(() => {
    const map = new Map<string, PreviewRow>();
    for (const row of preview.bankRows) map.set(row.rowId, row);
    return map;
  }, [preview.bankRows]);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-extrabold text-slate-900">
            Coincidencias
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {preview.autoMatches.length + manualMatches.length}
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Sistema</th>
                <th className="px-4 py-3">Banco</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {preview.autoMatches.map((match) => (
                <tr
                  key={`auto-${match.systemRowId}-${match.bankRowId}`}
                  className="border-t border-slate-100"
                >
                  <td className="px-4 py-3">
                    {summarizeRow(
                      systemRowsById.get(match.systemRowId),
                      preview.layout.mappings,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {summarizeRow(
                      bankRowsById.get(match.bankRowId),
                      preview.layout.mappings,
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold">{match.score}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      Auto
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveAutoMatch(match)}
                      aria-label="Quitar coincidencia automatica"
                      title="Quitar coincidencia"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <FiXCircle className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {manualMatches.map((match) => (
                <tr
                  key={`manual-${match.systemRowId}-${match.bankRowId}`}
                  className="border-t border-slate-100"
                >
                  <td className="px-4 py-3">
                    {summarizeRow(
                      systemRowsById.get(match.systemRowId),
                      preview.layout.mappings,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {summarizeRow(
                      bankRowsById.get(match.bankRowId),
                      preview.layout.mappings,
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold">{match.score}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                      Manual
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveManualMatch(match)}
                      aria-label="Quitar coincidencia manual"
                      title="Quitar coincidencia"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <FiXCircle className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {preview.autoMatches.length === 0 && manualMatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    No hay coincidencias registradas todavia.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>



      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Emparejar
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Arrastra una fila del banco sobre una fila del sistema para crear
              una coincidencia manual.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsManualMatcherOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {isManualMatcherOpen ? (
              <FiChevronUp className="h-4 w-4" />
            ) : (
              <FiChevronDown className="h-4 w-4" />
            )}
            {isManualMatcherOpen ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {isManualMatcherOpen ? (
          <DndContext onDragEnd={onDragEnd}>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <UnmatchedColumn
                title={preview.layout.systemLabel}
                rows={unmatchedSystemRows}
                mappings={preview.layout.mappings}
                variant="system"
              />
              <UnmatchedColumn
                title={preview.layout.bankLabel}
                rows={unmatchedBankRows}
                mappings={preview.layout.mappings}
                variant="bank"
              />
            </div>
          </DndContext>
        ) : null}
      </section>
    </div>
  );
}


function UnmatchedColumn({
  title,
  rows,
  mappings,
  variant,
}: {
  title: string;
  rows: PreviewRow[];
  mappings: LayoutMapping[];
  variant: "system" | "bank";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <div className="mt-4 space-y-3">
        {rows.map((row) =>
          variant === "system" ? (
            <DroppableRow
              key={row.rowId}
              id={`system:${row.rowId}`}
              label={summarizeRow(row, mappings)}
            />
          ) : (
            <DraggableRow
              key={row.rowId}
              id={`bank:${row.rowId}`}
              label={summarizeRow(row, mappings)}
            />
          ),
        )}
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            Sin pendientes.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DraggableRow({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {label}
    </div>
  );
}

function DroppableRow({ id, label }: { id: string; label: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 text-sm shadow-sm transition ${
        isOver ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white"
      }`}
    >
      {label}
    </div>
  );
}
