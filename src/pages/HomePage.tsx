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
      <div className="mb-2">
        <h2 className="text-3xl font-extrabold text-slate-900">
          Hola, {user?.usrNombre ? `${user.usrNombre} ${user?.usrApellido ?? ""}`.trim() : user?.usrLogin}
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Resumen de tu actividad en {user?.companyName ?? "Qoncilia"}.
        </p>
      </div>



      {kpis ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Link
              to="/bank-statements"
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
              <p className="mt-1 text-xs text-slate-500">Extractos bancarios</p>
            </Link>

            <Link
              to="/conciliation"
              className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-emerald-500 hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-emerald-600">
                <FiPercent className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Mesa
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900 transition group-hover:text-emerald-600">
                Lista
              </p>
              <p className="mt-1 text-xs text-slate-500">Comparacion en mesa</p>
            </Link>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 text-emerald-500">
                <FiCheckCircle className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Auto match
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {kpis.totalAutoMatches}
              </p>
              <p className="mt-1 text-xs text-slate-500">Solo en comparacion</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 text-amber-500">
                <FiDatabase className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Match manual
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {kpis.totalManualMatches}
              </p>
              <p className="mt-1 text-xs text-slate-500">Solo en comparacion</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 text-rose-500">
                <FiAlertCircle className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Sistema
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {kpis.totalUnmatchedSystem}
              </p>
              <p className="mt-1 text-xs text-slate-500">No se guardan</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 text-rose-500">
                <FiAlertCircle className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Filas banco
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {kpis.totalUnmatchedBank}
              </p>
              <p className="mt-1 text-xs text-slate-500">Filas banco guardadas</p>
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
                      name: item.bankName,
                      extractos: item.totalReconciliations,
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
                      dataKey="extractos"
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
                  Extractos recientes
                </h3>
                <Link
                  to="/bank-statements"
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600 transition hover:text-brand-700"
                >
                  <FiClock className="h-4 w-4" /> Ver extractos
                </Link>
              </div>
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 ring-1 ring-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Extracto</th>
                        <th className="px-4 py-3">Banco</th>
                        <th className="px-4 py-3">Plantilla</th>
                        <th className="px-4 py-3">Filas</th>
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
                            {item.bankName}
                          </td>
                          <td className="px-4 py-3">{item.layoutName}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                              {item.unmatchedBank}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link
                              to="/bank-statements"
                              className="inline-flex rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-brand-600"
                              title="Ver extractos bancarios"
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
                            No hay extractos bancarios recientes para mostrar.
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
