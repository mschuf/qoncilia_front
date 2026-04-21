import { useCallback, useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiCalendar, FiFilter, FiList } from "react-icons/fi";
import { Link } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { summarizeRow } from "../hooks/useConciliationWorkbench";
import type { AuthUser } from "../types/auth";
import type {
  Layout,
  ReconciliationDetail,
  ReconciliationSummary,
  UserBankWithLayouts,
} from "../types/conciliation";
import { isAdminRole } from "../utils/role";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function buildLayouts(banks: UserBankWithLayouts[], selectedBankId: number): Layout[] {
  if (selectedBankId > 0) {
    return banks.find((bank) => bank.id === selectedBankId)?.layouts ?? [];
  }

  const byId = new Map<number, Layout>();
  for (const bank of banks) {
    for (const layout of bank.layouts) {
      if (!byId.has(layout.id)) {
        byId.set(layout.id, layout);
      }
    }
  }

  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export default function ConciliationHistoryPage() {
  const { role, user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(
    isAdminRole(role) ? 0 : Number(user?.id ?? 0),
  );
  const [banks, setBanks] = useState<UserBankWithLayouts[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number>(0);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number>(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reconciliations, setReconciliations] = useState<ReconciliationSummary[]>([]);
  const [selectedReconciliationId, setSelectedReconciliationId] = useState<number>(0);
  const [selectedReconciliation, setSelectedReconciliation] =
    useState<ReconciliationDetail | null>(null);

  const loadUsers = useCallback(async () => {
    if (!isAdminRole(role)) return;
    const response = await apiClient.get<AuthUser[]>("/users/list");
    setUsers(response ?? []);
  }, [role]);

  const loadCatalog = useCallback(
    async (userId: number) => {
      const query = isAdminRole(role) && userId > 0 ? `?userId=${userId}` : "";
      const response = await apiClient.get<UserBankWithLayouts[]>(
        `/conciliation/catalog${query}`,
      );
      const nextBanks = response ?? [];
      setBanks(nextBanks);
      setSelectedBankId((current) =>
        current > 0 && nextBanks.some((bank) => bank.id === current) ? current : 0,
      );
    },
    [role],
  );

  const loadReconciliations = useCallback(async () => {
    const params = new URLSearchParams();
    if (isAdminRole(role) && selectedUserId > 0) {
      params.set("userId", String(selectedUserId));
    }
    if (selectedBankId > 0) {
      params.set("userBankId", String(selectedBankId));
    }
    if (selectedLayoutId > 0) {
      params.set("layoutId", String(selectedLayoutId));
    }
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }
    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    const query = params.toString();
    const response = await apiClient.get<ReconciliationSummary[]>(
      `/conciliation/reconciliations${query ? `?${query}` : ""}`,
    );
    setReconciliations(response ?? []);
  }, [dateFrom, dateTo, role, selectedBankId, selectedLayoutId, selectedUserId]);

  const loadDetail = useCallback(async (reconciliationId: number) => {
    if (!reconciliationId) {
      setSelectedReconciliation(null);
      return;
    }

    const response = await apiClient.get<ReconciliationDetail>(
      `/conciliation/reconciliations/${reconciliationId}`,
    );
    setSelectedReconciliation(response);
  }, []);

  useEffect(() => {
    void loadUsers().catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar usuarios.");
    });
  }, [loadUsers, toast]);

  useEffect(() => {
    void loadCatalog(selectedUserId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo.");
    });
  }, [loadCatalog, selectedUserId, toast]);

  useEffect(() => {
    void loadReconciliations().catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cargar el historial.",
      );
    });
  }, [loadReconciliations, toast]);

  useEffect(() => {
    setSelectedReconciliationId((current) =>
      current > 0 && reconciliations.some((item) => item.id === current)
        ? current
        : (reconciliations[0]?.id ?? 0),
    );
  }, [reconciliations]);

  useEffect(() => {
    void loadDetail(selectedReconciliationId).catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cargar el detalle de la conciliacion.",
      );
    });
  }, [loadDetail, selectedReconciliationId, toast]);

  const layouts = useMemo(
    () => buildLayouts(banks, selectedBankId),
    [banks, selectedBankId],
  );

  useEffect(() => {
    setSelectedLayoutId((current) =>
      current > 0 && layouts.some((layout) => layout.id === current) ? current : 0,
    );
  }, [layouts]);

  const snapshot = selectedReconciliation?.summarySnapshot;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
              Historial de Conciliaciones
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
              Consulta conciliaciones y matches con filtros
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Filtra por fecha, banco, layout y usuario segun tu alcance. A la
              derecha vas a ver el detalle completo del snapshot guardado.
            </p>
          </div>

          <Link
            to="/conciliation"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FiArrowLeft className="h-4 w-4" /> Volver a conciliar
          </Link>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FiFilter className="h-4 w-4" /> Filtros
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          {isAdminRole(role) ? (
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Usuario</span>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value={0}>Todos los usuarios habilitados</option>
                {users.map((item) => (
                  <option key={item.id} value={Number(item.id)}>
                    {item.usrLogin}
                    {item.usrNombre ? ` - ${item.usrNombre}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Banco</span>
            <select
              value={selectedBankId}
              onChange={(event) => setSelectedBankId(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value={0}>Todos los bancos</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.userLogin} - {bank.alias ?? bank.bankName}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Layout</span>
            <select
              value={selectedLayoutId}
              onChange={(event) => setSelectedLayoutId(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value={0}>Todos los layouts</option>
              {layouts.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FiCalendar className="h-4 w-4" /> Desde
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>

          <label className="space-y-1.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FiCalendar className="h-4 w-4" /> Hasta
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FiList className="h-4 w-4" /> Conciliaciones
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2">Banco</th>
                    <th className="px-3 py-2">Layout</th>
                    <th className="px-3 py-2">Match %</th>
                    <th className="px-3 py-2">Act.</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliations.map((item) => {
                    const selected = item.id === selectedReconciliationId;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedReconciliationId(item.id)}
                        className={`cursor-pointer border-t border-slate-100 ${
                          selected ? "bg-brand-50 text-slate-900" : "text-slate-700"
                        }`}
                      >
                        <td className="px-3 py-2 font-semibold">{formatDate(item.createdAt)}</td>
                        <td className="px-3 py-2">{item.userLogin}</td>
                        <td className="px-3 py-2">{item.bankAlias ?? item.bankName}</td>
                        <td className="px-3 py-2">{item.layoutName}</td>
                        <td className="px-3 py-2">{item.matchPercentage}</td>
                        <td className="px-3 py-2">{item.updateCount}</td>
                      </tr>
                    );
                  })}
                  {reconciliations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-sm text-slate-500"
                      >
                        No hay conciliaciones para los filtros aplicados.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-extrabold text-slate-900">
              {selectedReconciliation?.name ?? "Detalle de conciliacion"}
            </h3>
            {selectedReconciliation ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Metric label="Banco" value={selectedReconciliation.bankAlias ?? selectedReconciliation.bankName} />
                <Metric label="Layout" value={selectedReconciliation.layoutName} />
                <Metric label="Estado" value={selectedReconciliation.status} />
                <Metric label="Auto" value={String(selectedReconciliation.autoMatches)} />
                <Metric label="Manual" value={String(selectedReconciliation.manualMatches)} />
                <Metric label="Actualizaciones" value={String(selectedReconciliation.updateCount)} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Selecciona una conciliacion para ver su detalle.
              </p>
            )}
          </div>

          {snapshot ? (
            <>
              <SnapshotTable
                title="Matches automaticos"
                rows={snapshot.autoMatches.map((match) => ({
                  left: summarizeRow(
                    snapshot.systemRows.find((row) => row.rowId === match.systemRowId),
                    snapshot.layout.mappings,
                  ),
                  right: summarizeRow(
                    snapshot.bankRows.find((row) => row.rowId === match.bankRowId),
                    snapshot.layout.mappings,
                  ),
                  score: String(match.score),
                }))}
              />
              <SnapshotTable
                title="Matches manuales"
                rows={snapshot.manualMatches.map((match) => ({
                  left: summarizeRow(
                    snapshot.systemRows.find((row) => row.rowId === match.systemRowId),
                    snapshot.layout.mappings,
                  ),
                  right: summarizeRow(
                    snapshot.bankRows.find((row) => row.rowId === match.bankRowId),
                    snapshot.layout.mappings,
                  ),
                  score: String(match.score),
                }))}
              />
              <SnapshotTable
                title={`Pendientes ${snapshot.layout.systemLabel}`}
                rows={snapshot.unmatchedSystemRows.map((row) => ({
                  left: summarizeRow(row, snapshot.layout.mappings),
                  right: "-",
                  score: "0",
                }))}
              />
              <SnapshotTable
                title={`Pendientes ${snapshot.layout.bankLabel}`}
                rows={snapshot.unmatchedBankRows.map((row) => ({
                  left: summarizeRow(row, snapshot.layout.mappings),
                  right: "-",
                  score: "0",
                }))}
              />
            </>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function SnapshotTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ left: string; right: string; score: string }>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2">Sistema</th>
                <th className="px-3 py-2">Banco</th>
                <th className="px-3 py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-t border-slate-100 text-slate-700">
                  <td className="px-3 py-2">{row.left}</td>
                  <td className="px-3 py-2">{row.right}</td>
                  <td className="px-3 py-2 font-semibold">{row.score}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-5 text-center text-sm text-slate-500">
                    Sin registros para esta seccion.
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
