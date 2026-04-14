import type { ChangeEvent, ComponentType, Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FiBarChart2, FiCheckCircle, FiDatabase, FiSave, FiUploadCloud, FiXCircle } from "react-icons/fi";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { AuthUser } from "../types/auth";
import type {
  ConciliationKpis,
  Layout,
  LayoutMapping,
  PreviewMatch,
  PreviewResponse,
  PreviewRow,
  UserBankWithLayouts
} from "../types/conciliation";

export default function ConciliationWorkbenchPage() {
  const { role, user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(Number(user?.id ?? 0));
  const [banks, setBanks] = useState<UserBankWithLayouts[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number>(0);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number>(0);
  const [systemFile, setSystemFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [manualMatches, setManualMatches] = useState<PreviewMatch[]>([]);
  const [unmatchedSystemRows, setUnmatchedSystemRows] = useState<PreviewRow[]>([]);
  const [unmatchedBankRows, setUnmatchedBankRows] = useState<PreviewRow[]>([]);
  const [kpis, setKpis] = useState<ConciliationKpis | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);

  const loadUsers = useCallback(async () => {
    if (role !== "superadmin") return;
    const response = await apiClient.get<AuthUser[]>("/users");
    setUsers(response ?? []);
    setSelectedUserId((current) => current || Number(response?.[0]?.id ?? 0));
  }, [role]);

  const loadCatalog = useCallback(async (userId: number) => {
    const query = role === "superadmin" ? `?userId=${userId}` : "";
    const response = await apiClient.get<UserBankWithLayouts[]>(`/conciliation/catalog${query}`);
    const nextBanks = response ?? [];
    setBanks(nextBanks);
    setSelectedBankId((current) => {
      if (current > 0 && nextBanks.some((item) => item.id === current)) return current;
      return nextBanks[0]?.id ?? 0;
    });
  }, [role]);

  const loadAnalytics = useCallback(async (userId: number) => {
    const query = role === "superadmin" ? `?userId=${userId}` : "";
    const [kpiResponse, historyResponse] = await Promise.all([
      apiClient.get<ConciliationKpis>(`/conciliation/kpis${query}`),
      apiClient.get<Array<Record<string, unknown>>>(`/conciliation/reconciliations${query}`)
    ]);
    setKpis(kpiResponse);
    setHistory(historyResponse ?? []);
  }, [role]);

  useEffect(() => {
    void loadUsers().catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar usuarios.");
    });
  }, [loadUsers, toast]);

  useEffect(() => {
    if (!selectedUserId) return;
    void loadCatalog(selectedUserId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo.");
    });
    void loadAnalytics(selectedUserId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar KPI y reportes.");
    });
  }, [loadAnalytics, loadCatalog, selectedUserId, toast]);

  const selectedBank = useMemo(
    () => banks.find((item) => item.id === selectedBankId) ?? null,
    [banks, selectedBankId]
  );

  const layouts = selectedBank?.layouts ?? [];
  const selectedLayout = useMemo<Layout | null>(
    () => layouts.find((item) => item.id === selectedLayoutId) ?? layouts[0] ?? null,
    [layouts, selectedLayoutId]
  );

  useEffect(() => {
    if (selectedLayout) {
      setSelectedLayoutId(selectedLayout.id);
    }
  }, [selectedLayout]);

  const onFileChange =
    (setter: Dispatch<SetStateAction<File | null>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.files?.[0] ?? null);
    };

  const runPreview = async () => {
    if (!selectedBankId || !selectedLayoutId || !systemFile || !bankFile) {
      toast.error("Selecciona banco, layout y ambos archivos Excel.");
      return;
    }

    const formData = new FormData();
    formData.append("userBankId", String(selectedBankId));
    formData.append("layoutId", String(selectedLayoutId));
    formData.append("systemFile", systemFile);
    formData.append("bankFile", bankFile);

    try {
      const response = await apiClient.post<PreviewResponse>("/conciliation/preview", formData);
      setPreview(response);
      setManualMatches([]);
      setUnmatchedSystemRows(response.unmatchedSystemRows);
      setUnmatchedBankRows(response.unmatchedBankRows);
      toast.success("Preview de conciliacion listo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar la conciliacion.");
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (!preview || !selectedLayout) return;
    const systemRowId = String(event.active.id).replace("system:", "");
    const bankRowId = String(event.over?.id ?? "").replace("bank:", "");
    if (!systemRowId || !bankRowId) return;

    const systemRow = unmatchedSystemRows.find((item) => item.rowId === systemRowId);
    const bankRow = unmatchedBankRows.find((item) => item.rowId === bankRowId);
    if (!systemRow || !bankRow) return;

    const manualMatch = createManualMatch(selectedLayout.mappings, systemRow, bankRow);
    setManualMatches((prev) => [...prev, manualMatch]);
    setUnmatchedSystemRows((prev) => prev.filter((item) => item.rowId !== systemRowId));
    setUnmatchedBankRows((prev) => prev.filter((item) => item.rowId !== bankRowId));
  };

  const removeManualMatch = (target: PreviewMatch) => {
    const systemRow = preview?.systemRows.find((item) => item.rowId === target.systemRowId);
    const bankRow = preview?.bankRows.find((item) => item.rowId === target.bankRowId);
    setManualMatches((prev) => prev.filter((item) => item !== target));
    if (systemRow) {
      setUnmatchedSystemRows((prev) => sortRows([...prev, systemRow]));
    }
    if (bankRow) {
      setUnmatchedBankRows((prev) => sortRows([...prev, bankRow]));
    }
  };

  const metrics = useMemo(() => {
    if (!preview) return null;
    const paired = preview.autoMatches.length + manualMatches.length;
    const totalRows = preview.systemRows.length + preview.bankRows.length;
    return {
      totalSystemRows: preview.systemRows.length,
      totalBankRows: preview.bankRows.length,
      autoMatches: preview.autoMatches.length,
      manualMatches: manualMatches.length,
      unmatchedSystem: unmatchedSystemRows.length,
      unmatchedBank: unmatchedBankRows.length,
      matchPercentage: totalRows > 0 ? Math.round(((paired * 2) / totalRows) * 10000) / 100 : 0
    };
  }, [manualMatches.length, preview, unmatchedBankRows.length, unmatchedSystemRows.length]);

  const saveReconciliation = async () => {
    if (!preview || !selectedLayout) {
      toast.error("Primero genera una conciliacion.");
      return;
    }

    try {
      await apiClient.post("/conciliation/reconciliations", {
        userBankId: preview.userBank.id,
        layoutId: selectedLayout.id,
        name: `Conciliacion ${preview.userBank.alias ?? preview.userBank.bankName}`,
        systemFileName: preview.systemFileName,
        bankFileName: preview.bankFileName,
        systemRows: preview.systemRows,
        bankRows: preview.bankRows,
        autoMatches: preview.autoMatches,
        manualMatches
      });

      toast.success("Conciliacion guardada.");
      await loadAnalytics(selectedUserId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la conciliacion.");
    }
  };

  const chartData =
    kpis?.bankBreakdown.map((item) => ({
      name: item.alias ?? item.bankName,
      conciliaciones: item.totalReconciliations,
      match: item.averageMatchPercentage
    })) ?? [];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
            Mesa de Conciliacion
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
            Subi dos Excel y comparalos por layout
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            A la izquierda va tu archivo del sistema y a la derecha el extracto del banco. Los
            matches automaticos se marcan y el resto se puede emparejar manualmente arrastrando.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <KpiCard label="Conciliaciones" value={String(kpis?.totalReconciliations ?? 0)} icon={FiBarChart2} />
          <KpiCard label="Auto-match" value={String(kpis?.totalAutoMatches ?? 0)} icon={FiCheckCircle} />
          <KpiCard label="Manual-match" value={String(kpis?.totalManualMatches ?? 0)} icon={FiDatabase} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 lg:grid-cols-4">
          {role === "superadmin" ? (
            <SelectBlock
              label="Usuario"
              value={selectedUserId}
              onChange={(value) => setSelectedUserId(Number(value))}
              options={users.map((item) => ({
                value: Number(item.id),
                label: `${item.usrLogin}${item.usrNombre ? ` · ${item.usrNombre}` : ""}`
              }))}
            />
          ) : null}

          <SelectBlock
            label="Banco"
            value={selectedBankId}
            onChange={(value) => setSelectedBankId(Number(value))}
            options={banks.map((item) => ({
              value: item.id,
              label: item.alias ?? item.bankName
            }))}
          />

          <SelectBlock
            label="Layout"
            value={selectedLayoutId}
            onChange={(value) => setSelectedLayoutId(Number(value))}
            options={layouts.map((item) => ({
              value: item.id,
              label: `${item.name}${item.active ? " · activo" : ""}`
            }))}
          />

          <div className="flex items-end">
            <button
              type="button"
              onClick={runPreview}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <FiUploadCloud className="h-4 w-4" /> Conciliar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <UploadCard title={selectedLayout?.systemLabel ?? "Sistema"} file={systemFile} onChange={onFileChange(setSystemFile)} />
          <UploadCard title={selectedLayout?.bankLabel ?? "Banco"} file={bankFile} onChange={onFileChange(setBankFile)} />
        </div>
      </div>

      {preview && metrics ? (
        <>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Metric label="Sistema" value={String(metrics.totalSystemRows)} />
            <Metric label="Banco" value={String(metrics.totalBankRows)} />
            <Metric label="Auto" value={String(metrics.autoMatches)} tone="emerald" />
            <Metric label="Manual" value={String(metrics.manualMatches)} tone="amber" />
            <Metric label="Pendiente S" value={String(metrics.unmatchedSystem)} tone="rose" />
            <Metric label="Match %" value={`${metrics.matchPercentage}%`} />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveReconciliation}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <FiSave className="h-4 w-4" /> Guardar conciliacion
            </button>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5">
            <h3 className="text-lg font-extrabold text-emerald-900">Matches automaticos</h3>
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
                    <tr key={`${match.systemRowId}-${match.bankRowId}`} className="border-t border-emerald-200">
                      <td className="px-3 py-2">{summarizeRow(preview.systemRows.find((item) => item.rowId === match.systemRowId), preview.layout.mappings)}</td>
                      <td className="px-3 py-2">{summarizeRow(preview.bankRows.find((item) => item.rowId === match.bankRowId), preview.layout.mappings)}</td>
                      <td className="px-3 py-2 font-bold">{match.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Match manual por arrastre</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Arrastra una fila del sistema hacia una fila del banco para vincularlas.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {manualMatches.length} matches manuales
              </span>
            </div>

            <DndContext onDragEnd={onDragEnd}>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <UnmatchedColumn title={preview.layout.systemLabel} rows={unmatchedSystemRows} mappings={preview.layout.mappings} variant="system" />
                <UnmatchedColumn title={preview.layout.bankLabel} rows={unmatchedBankRows} mappings={preview.layout.mappings} variant="bank" />
              </div>
            </DndContext>

            <div className="mt-5 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70">
              <div className="border-b border-amber-200 px-4 py-3 text-sm font-bold text-amber-900">
                Matches manuales
              </div>
              <div className="divide-y divide-amber-200">
                {manualMatches.map((match) => (
                  <div key={`${match.systemRowId}-${match.bankRowId}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">
                        {summarizeRow(preview.systemRows.find((item) => item.rowId === match.systemRowId), preview.layout.mappings)}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {summarizeRow(preview.bankRows.find((item) => item.rowId === match.bankRowId), preview.layout.mappings)}
                      </p>
                    </div>
                    <button type="button" onClick={() => removeManualMatch(match)} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-white">
                      <FiXCircle className="h-4 w-4" /> Deshacer
                    </button>
                  </div>
                ))}
                {manualMatches.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-slate-500">Todavia no agregaste matches manuales.</div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-extrabold text-slate-900">KPI por banco</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="conciliaciones" fill="#2f8da0" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-extrabold text-slate-900">Historico reciente</h3>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Banco</th>
                    <th className="px-3 py-2">Layout</th>
                    <th className="px-3 py-2">Match %</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 12).map((item) => (
                    <tr key={String(item.id)} className="border-t border-slate-100 text-slate-700">
                      <td className="px-3 py-2 font-semibold">{String(item.name ?? "-")}</td>
                      <td className="px-3 py-2">{String(item.bankAlias ?? item.bankName ?? "-")}</td>
                      <td className="px-3 py-2">{String(item.layoutName ?? "-")}</td>
                      <td className="px-3 py-2">{String(item.matchPercentage ?? "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function createManualMatch(mappings: LayoutMapping[], systemRow: PreviewRow, bankRow: PreviewRow): PreviewMatch {
  const activeMappings = mappings.filter((item) => item.active);
  let totalWeight = 0;
  let matchedWeight = 0;
  const ruleResults = activeMappings.map((mapping) => {
    const systemValue = systemRow.normalized[mapping.fieldKey] ?? null;
    const bankValue = bankRow.normalized[mapping.fieldKey] ?? null;
    const passed = compareValues(mapping, systemValue, bankValue);
    const applicable = mapping.required || systemValue !== null || bankValue !== null;
    if (applicable) {
      totalWeight += mapping.weight;
      if (passed) matchedWeight += mapping.weight;
    }
    return { fieldKey: mapping.fieldKey, label: mapping.label, passed, compareOperator: mapping.compareOperator, systemValue, bankValue };
  });

  return {
    systemRowId: systemRow.rowId,
    bankRowId: bankRow.rowId,
    systemRowNumber: systemRow.rowNumber,
    bankRowNumber: bankRow.rowNumber,
    score: totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) / 100 : 0,
    status: "manual",
    ruleResults
  };
}

function compareValues(mapping: LayoutMapping, left: string | number | null, right: string | number | null): boolean {
  if (left === null && right === null) return true;
  if (left === null || right === null) return false;
  const textLeft = String(left);
  const textRight = String(right);
  switch (mapping.compareOperator) {
    case "contains": return textLeft.includes(textRight) || textRight.includes(textLeft);
    case "starts_with": return textLeft.startsWith(textRight) || textRight.startsWith(textLeft);
    case "ends_with": return textLeft.endsWith(textRight) || textRight.endsWith(textLeft);
    case "numeric_equals": return Math.abs(Number(left) - Number(right)) <= (mapping.tolerance ?? 0);
    case "date_equals": return textLeft === textRight;
    case "equals":
    default: return textLeft === textRight;
  }
}

function summarizeRow(row: PreviewRow | undefined, mappings: LayoutMapping[]): string {
  if (!row) return "-";
  return mappings.slice(0, 4).map((mapping) => row.values[mapping.fieldKey]).filter(Boolean).join(" | ") || row.rowId;
}

function sortRows(rows: PreviewRow[]) {
  return [...rows].sort((left, right) => left.rowNumber - right.rowNumber);
}

function KpiCard({ label, value, icon: Icon }: { label: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-brand-50 p-3 text-brand-700"><Icon className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p></div></div></div>;
}

function Metric({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "emerald" | "amber" | "rose" }) {
  const color = tone === "emerald" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-700" : tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-700";
  return <div className={`rounded-2xl border p-4 ${color}`}><p className="text-xs font-bold uppercase tracking-[0.14em]">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}</p></div>;
}

function SelectBlock({ label, value, onChange, options }: { label: string; value: number; onChange: (value: number) => void; options: Array<{ value: number; label: string }> }) {
  return <label className="space-y-1.5"><span className="text-sm font-semibold text-slate-700">{label}</span><select value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function UploadCard({ title, file, onChange }: { title: string; file: File | null; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"><span className="text-sm font-semibold text-slate-700">{title}</span><input type="file" accept=".xlsx,.xls" onChange={onChange} className="mt-4 block w-full text-sm" /><p className="mt-3 text-sm text-slate-500">{file?.name ?? "Todavia no cargaste archivo."}</p></label>;
}

function UnmatchedColumn({ title, rows, mappings, variant }: { title: string; rows: PreviewRow[]; mappings: LayoutMapping[]; variant: "system" | "bank" }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h4 className="text-sm font-bold text-slate-800">{title}</h4><div className="mt-4 space-y-3">{rows.map((row) => variant === "system" ? <DraggableRow key={row.rowId} id={`system:${row.rowId}`} label={summarizeRow(row, mappings)} /> : <DroppableRow key={row.rowId} id={`bank:${row.rowId}`} label={summarizeRow(row, mappings)} />)}{rows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Sin pendientes.</div> : null}</div></div>;
}

function DraggableRow({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} {...listeners} {...attributes} className={`rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm ${isDragging ? "opacity-50" : ""}`}>{label}</div>;
}

function DroppableRow({ id, label }: { id: string; label: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef} className={`rounded-xl border p-3 text-sm shadow-sm transition ${isOver ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white"}`}>{label}</div>;
}
