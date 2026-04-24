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
      {/* Matches */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-extrabold text-slate-900">
            Matches
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {preview.autoMatches.length + manualMatches.length}
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
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
                      preview.systemRows.find(
                        (item) => item.rowId === match.systemRowId,
                      ),
                      preview.layout.mappings,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {summarizeRow(
                      preview.bankRows.find(
                        (item) => item.rowId === match.bankRowId,
                      ),
                      preview.layout.mappings,
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold">{match.score}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      Auto
                    </span>
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
              {manualMatches.map((match) => (
                <tr
                  key={`manual-${match.systemRowId}-${match.bankRowId}`}
                  className="border-t border-slate-100"
                >
                  <td className="px-4 py-3">
                    {summarizeRow(
                      preview.systemRows.find(
                        (item) => item.rowId === match.systemRowId,
                      ),
                      preview.layout.mappings,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {summarizeRow(
                      preview.bankRows.find(
                        (item) => item.rowId === match.bankRowId,
                      ),
                      preview.layout.mappings,
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold">{match.score}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                      Manual
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onRemoveManualMatch(match)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
                    >
                      <FiXCircle className="h-3.5 w-3.5" /> Deshacer
                    </button>
                  </td>
                </tr>
              ))}
              {preview.autoMatches.length === 0 && manualMatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    No hay matches registrados todavia.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
