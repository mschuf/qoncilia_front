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
  ReconciliationSnapshot,
  ReconciliationSummary,
  UserBankWithLayouts,
} from "../types/conciliation";
import { isAdminRole } from "../utils/role";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function toInputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function buildSnapshotRows(snapshot: ReconciliationSnapshot) {
  const matchedRows = [...snapshot.autoMatches, ...snapshot.manualMatches].map((match) => ({
    key: `${match.systemRowId}-${match.bankRowId}`,
    system: summarizeRow(
      snapshot.systemRows.find((row) => row.rowId === match.systemRowId),
      snapshot.layout.mappings,
    ),
    bank: summarizeRow(
      snapshot.bankRows.find((row) => row.rowId === match.bankRowId),
      snapshot.layout.mappings,
    ),
    score: String(match.score),
  }));

  const unmatchedSystemRows = snapshot.unmatchedSystemRows.map((row) => ({
    key: `system-${row.rowId}`,
    system: summarizeRow(row, snapshot.layout.mappings),
    bank: "-",
    score: "0",
  }));

  const unmatchedBankRows = snapshot.unmatchedBankRows.map((row) => ({
    key: `bank-${row.rowId}`,
    system: "-",
    bank: summarizeRow(row, snapshot.layout.mappings),
    score: "0",
  }));

  return [...matchedRows, ...unmatchedSystemRows, ...unmatchedBankRows];
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
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const value = new Date();
    value.setMonth(value.getMonth() - 1);
    return toInputDate(value);
  });
  const [dateTo, setDateTo] = useState<string>(() => toInputDate(new Date()));
  const [reconciliations, setReconciliations] = useState<ReconciliationSummary[]>([]);
  const [selectedReconciliationId, setSelectedReconciliationId] = useState<number>(0);
  const [selectedReconciliation, setSelectedReconciliation] =
    useState<ReconciliationDetail | null>(null);

  const showUserFilter = isAdminRole(role);
  const canSearch = selectedBankId > 0;

  const loadUsers = useCallback(async () => {
    if (!showUserFilter) return;
    const response = await apiClient.get<AuthUser[]>("/users/list");
    setUsers(response ?? []);
  }, [showUserFilter]);

  const loadCatalog = useCallback(
    async (userId: number) => {
      const query = showUserFilter && userId > 0 ? `?userId=${userId}` : "";
      const response = await apiClient.get<UserBankWithLayouts[]>(
        `/conciliation/catalog${query}`,
      );
      const nextBanks = response ?? [];
      setBanks(nextBanks);
      setSelectedBankId((current) =>
        current > 0 && nextBanks.some((bank) => bank.id === current) ? current : 0,
      );
    },
    [showUserFilter],
  );

  const loadReconciliations = useCallback(async () => {
    if (!canSearch) {
      setReconciliations([]);
      setSelectedReconciliationId(0);
      setSelectedReconciliation(null);
      return;
    }

    const params = new URLSearchParams();
    if (showUserFilter && selectedUserId > 0) {
      params.set("userId", String(selectedUserId));
    }
    params.set("userBankId", String(selectedBankId));
    if (selectedLayoutId > 0) {
      params.set("layoutId", String(selectedLayoutId));
    }
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }
    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    const response = await apiClient.get<ReconciliationSummary[]>(
      `/conciliation/reconciliations?${params.toString()}`,
    );
    setReconciliations(response ?? []);
  }, [canSearch, dateFrom, dateTo, selectedBankId, selectedLayoutId, selectedUserId, showUserFilter]);

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
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el historial.");
    });
  }, [loadReconciliations, toast]);

  useEffect(() => {
    if (!canSearch) {
      setSelectedReconciliationId(0);
      setSelectedReconciliation(null);
      return;
    }

    setSelectedReconciliationId((current) =>
      current > 0 && reconciliations.some((item) => item.id === current)
        ? current
        : (reconciliations[0]?.id ?? 0),
    );
  }, [canSearch, reconciliations]);

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

  const snapshotRows = useMemo(
    () => (selectedReconciliation?.summarySnapshot ? buildSnapshotRows(selectedReconciliation.summarySnapshot) : []),
    [selectedReconciliation],
  );

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
              Historial de Conciliaciones
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
              Historial compacto y filtrado por banco
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              La consulta no carga resultados hasta elegir un banco. Las fechas
              arrancan por defecto desde un mes atras hasta hoy para ayudarte a
              revisar rapido el trabajo reciente.
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

        <div className={`grid gap-3 ${showUserFilter ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
          {showUserFilter ? (
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Usuario</span>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value={0}>Todos los usuarios visibles</option>
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
              <option value={0}>Selecciona un banco</option>
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
              <option value={0}>Todos los layouts del banco</option>
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

      {!canSearch ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Selecciona un banco para cargar el historial. El layout sigue siendo opcional.
        </section>
      ) : (
        <div className="space-y-6">
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
                      <th className="px-3 py-2">Actualizaciones</th>
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
                          <td className="px-3 py-2 font-semibold">{formatDateTime(item.createdAt)}</td>
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
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                          No hay conciliaciones para el banco y filtros elegidos.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {selectedReconciliation ? (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FiList className="h-4 w-4" /> Resumen seleccionado
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Conciliacion</th>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2">Usuario</th>
                          <th className="px-3 py-2">Layout</th>
                          <th className="px-3 py-2">Match %</th>
                          <th className="px-3 py-2">Actualizaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-100 text-slate-700">
                          <td className="px-3 py-2 font-semibold">{selectedReconciliation.name}</td>
                          <td className="px-3 py-2">{formatDateTime(selectedReconciliation.createdAt)}</td>
                          <td className="px-3 py-2">{selectedReconciliation.userLogin}</td>
                          <td className="px-3 py-2">{selectedReconciliation.layoutName}</td>
                          <td className="px-3 py-2">{selectedReconciliation.matchPercentage}</td>
                          <td className="px-3 py-2">{selectedReconciliation.updateCount}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FiList className="h-4 w-4" /> Lineas guardadas
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
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
                        {snapshotRows.map((row) => (
                          <tr key={row.key} className="border-t border-slate-100 text-slate-700">
                            <td className="px-3 py-2">{row.system}</td>
                            <td className="px-3 py-2">{row.bank}</td>
                            <td className="px-3 py-2 font-semibold">{row.score}</td>
                          </tr>
                        ))}
                        {snapshotRows.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                              Esta conciliacion no tiene lineas visibles en el snapshot.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
