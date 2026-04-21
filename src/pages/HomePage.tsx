import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiDatabase,
  FiExternalLink,
  FiPercent,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { ConciliationKpis } from "../types/conciliation";
import { roleLabel } from "../utils/role";

export default function HomePage() {
  const { user, role } = useAuth();
  const toast = useToast();
  const [kpis, setKpis] = useState<ConciliationKpis | null>(null);

  useEffect(() => {
    apiClient
      .get<ConciliationKpis>("/conciliation/kpis")
      .then(setKpis)
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Error al cargar KPIs.",
        );
      });
  }, [toast]);



  return (
    <section className="space-y-8">
      <div className="card-surface rounded-3xl border border-slate-200/60 p-8 sm:p-12 shadow-sm relative overflow-hidden bg-white">
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Panel Principal</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Hola, {user?.usrNombre ? `${user.usrNombre} ${user?.usrApellido ?? ""}`.trim() : user?.usrLogin}
          </h2>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            {roleLabel(role)}
          </div>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Qoncilia ahora trabaja con el modelo <strong>usuario + banco + layout</strong>. Desde
            <strong> Conciliar</strong> operas la mesa y desde <strong>Layouts</strong> el superadmin
            define la lectura de ambos Excel.
          </p>
        </div>
      </div>



      {kpis ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Link
              to="/conciliation/history"
              className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-brand-500 hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-brand-600">
                <FiBarChart2 className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Totales
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900 transition group-hover:text-brand-600">
                {kpis.totalReconciliations}
              </p>
              <p className="mt-1 text-xs text-slate-500">Conciliaciones</p>
            </Link>

            <Link
              to="/conciliation"
              className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-emerald-500 hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-emerald-600">
                <FiPercent className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Match
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900 transition group-hover:text-emerald-600">
                {kpis.averageMatchPercentage}%
              </p>
              <p className="mt-1 text-xs text-slate-500">Promedio global</p>
            </Link>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 text-emerald-500">
                <FiCheckCircle className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Auto
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {kpis.totalAutoMatches}
              </p>
              <p className="mt-1 text-xs text-slate-500">Lineas automaticas</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 text-amber-500">
                <FiDatabase className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Manual
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {kpis.totalManualMatches}
              </p>
              <p className="mt-1 text-xs text-slate-500">Lineas manuales</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 text-rose-500">
                <FiAlertCircle className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Sys Pendiente
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {kpis.totalUnmatchedSystem}
              </p>
              <p className="mt-1 text-xs text-slate-500">Sin conciliar (Sistema)</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 text-rose-500">
                <FiAlertCircle className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Bco Pendiente
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {kpis.totalUnmatchedBank}
              </p>
              <p className="mt-1 text-xs text-slate-500">Sin conciliar (Banco)</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-900">
                KPI por banco
              </h3>
              <div className="mt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kpis.bankBreakdown.map((item) => ({
                      name: item.alias ?? item.bankName,
                      conciliaciones: item.totalReconciliations,
                      match: item.averageMatchPercentage,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Bar
                      dataKey="conciliaciones"
                      fill="#0ea5e9"
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Historico reciente
                </h3>
                <Link
                  to="/conciliation/history"
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600 transition hover:text-brand-700"
                >
                  <FiClock className="h-4 w-4" /> Ver historial completo
                </Link>
              </div>
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 ring-1 ring-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Banco</th>
                        <th className="px-4 py-3">Layout</th>
                        <th className="px-4 py-3">Match %</th>
                        <th className="px-4 py-3 text-center">Abrir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kpis.recentReconciliations.slice(0, 7).map((item) => (
                        <tr
                          key={item.id}
                          className="text-slate-700 transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-3 font-semibold">{item.name}</td>
                          <td className="px-4 py-3">
                            {item.alias ?? item.bankName}
                          </td>
                          <td className="px-4 py-3">{item.layoutName}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                item.matchPercentage >= 90
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.matchPercentage >= 50
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {item.matchPercentage}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link
                              to={`/conciliation?updateId=${item.id}`}
                              className="inline-flex rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-brand-600"
                              title="Cargar en la mesa de conciliacion"
                            >
                              <FiExternalLink className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {kpis.recentReconciliations.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-sm text-slate-500"
                          >
                            No hay conciliaciones recientes para mostrar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
