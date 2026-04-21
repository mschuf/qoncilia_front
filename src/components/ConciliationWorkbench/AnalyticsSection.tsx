import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReconciliationSummary } from "../../types/conciliation";

interface AnalyticsSectionProps {
  chartData: Array<{ name: string; conciliaciones: number; match: number }>;
  history: ReconciliationSummary[];
}

export default function AnalyticsSection({ chartData, history }: AnalyticsSectionProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-extrabold text-slate-900">
          KPI por banco
        </h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#475569", fontSize: 12 }}
              />
              <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
              <Tooltip />
              <Bar
                dataKey="conciliaciones"
                fill="#2f8da0"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-extrabold text-slate-900">
          Historico reciente
        </h3>
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
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 text-slate-700"
                  >
                    <td className="px-3 py-2 font-semibold">{item.name}</td>
                    <td className="px-3 py-2">
                      {item.bankAlias ?? item.bankName}
                    </td>
                    <td className="px-3 py-2">{item.layoutName}</td>
                    <td className="px-3 py-2">{item.matchPercentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
