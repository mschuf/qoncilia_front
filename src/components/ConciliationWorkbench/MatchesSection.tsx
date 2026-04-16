import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { FiXCircle } from "react-icons/fi";
import type { LayoutMapping, PreviewMatch, PreviewResponse, PreviewRow } from "../../types/conciliation";
import { summarizeRow } from "../../hooks/useConciliationWorkbench";

interface MatchesSectionProps {
  preview: PreviewResponse;
  manualMatches: PreviewMatch[];
  unmatchedSystemRows: PreviewRow[];
  unmatchedBankRows: PreviewRow[];
  onDragEnd: (event: DragEndEvent) => void;
  onRemoveManualMatch: (match: PreviewMatch) => void;
}

export default function MatchesSection({
  preview,
  manualMatches,
  unmatchedSystemRows,
  unmatchedBankRows,
  onDragEnd,
  onRemoveManualMatch,
}: MatchesSectionProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-6">
      {/* Auto matches */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <h3 className="text-lg font-extrabold text-emerald-900">
          Matches automaticos
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.12em] text-emerald-700">
              <tr>
                <th className="px-3 py-2">Sistema</th>
                <th className="px-3 py-2">Banco</th>
                <th className="px-3 py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {preview.autoMatches.map((match) => (
                <tr
                  key={`${match.systemRowId}-${match.bankRowId}`}
                  className="border-t border-emerald-200"
                >
                  <td className="px-3 py-2">
                    {summarizeRow(
                      preview.systemRows.find(
                        (item) => item.rowId === match.systemRowId,
                      ),
                      preview.layout.mappings,
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {summarizeRow(
                      preview.bankRows.find(
                        (item) => item.rowId === match.bankRowId,
                      ),
                      preview.layout.mappings,
                    )}
                  </td>
                  <td className="px-3 py-2 font-bold">{match.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual matches list */}
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70">
        <div className="border-b border-amber-200 px-4 py-3 text-sm font-bold text-amber-900">
          Matches manuales
          <span className="ml-2 rounded-full bg-amber-200/60 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {manualMatches.length}
          </span>
        </div>
        <div className="divide-y divide-amber-200">
          {manualMatches.map((match) => (
            <div
              key={`${match.systemRowId}-${match.bankRowId}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">
                  {summarizeRow(
                    preview.systemRows.find(
                      (item) => item.rowId === match.systemRowId,
                    ),
                    preview.layout.mappings,
                  )}
                </p>
                <p className="mt-1 text-slate-500">
                  {summarizeRow(
                    preview.bankRows.find(
                      (item) => item.rowId === match.bankRowId,
                    ),
                    preview.layout.mappings,
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveManualMatch(match)}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-white"
              >
                <FiXCircle className="h-4 w-4" /> Deshacer
              </button>
            </div>
          ))}
          {manualMatches.length === 0 ? (
            <div className="px-4 py-5 text-sm text-slate-500">
              Todavia no agregaste matches manuales.
            </div>
          ) : null}
        </div>
      </div>

      {/* Drag & drop */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Emparejar manualmente
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Arrastra una fila del sistema hacia una fila del banco para
              vincularlas.
            </p>
          </div>
        </div>

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
      </div>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <div className="mt-4 space-y-3">
        {rows.map((row) =>
          variant === "system" ? (
            <DraggableRow
              key={row.rowId}
              id={`system:${row.rowId}`}
              label={summarizeRow(row, mappings)}
            />
          ) : (
            <DroppableRow
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
      className={`rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm ${isDragging ? "opacity-50" : ""}`}
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
      className={`rounded-xl border p-3 text-sm shadow-sm transition ${isOver ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white"}`}
    >
      {label}
    </div>
  );
}
