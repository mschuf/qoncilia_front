import { FiEdit3, FiPlus } from "react-icons/fi";
import type { Layout, UserBankWithLayouts } from "../../types/conciliation";
import { MetricTile } from "./MetricCards";

interface LayoutListSectionProps {
  selectedBank: UserBankWithLayouts | null;
  onEditBank: (bank: UserBankWithLayouts) => void;
  onCreateLayout: (bank: UserBankWithLayouts) => void;
  onEditLayout: (bank: UserBankWithLayouts, layout: Layout) => void;
}

export default function LayoutListSection({
  selectedBank,
  onEditBank,
  onCreateLayout,
  onEditLayout
}: LayoutListSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            {selectedBank ? `Layouts de ${selectedBank.alias ?? selectedBank.bankName}` : "Layouts"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Podes usar columnas como <code>E|F</code> para Debito/Credito.
          </p>
        </div>

        {selectedBank ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEditBank(selectedBank)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <FiEdit3 className="h-4 w-4" /> Editar banco
            </button>
            <button
              type="button"
              onClick={() => onCreateLayout(selectedBank)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <FiPlus className="h-4 w-4" /> Nuevo layout
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-4">
        {(selectedBank?.layouts ?? []).map((layout) => (
          <article
            key={layout.id}
            className={`rounded-2xl border p-4 ${
              layout.active ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50/50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900">{layout.name}</h4>
                  {layout.active ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Activo
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">{layout.description ?? "Sin descripcion"}</p>
              </div>

              <button
                type="button"
                onClick={() => selectedBank && onEditLayout(selectedBank, layout)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
              >
                <FiEdit3 className="h-4 w-4" /> Editar
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MetricTile label="Sistema" value={layout.systemLabel} />
              <MetricTile label="Banco" value={layout.bankLabel} />
              <MetricTile label="Threshold" value={layout.autoMatchThreshold.toFixed(2)} />
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Campo</th>
                      <th className="px-3 py-2 text-left">Operador</th>
                      <th className="px-3 py-2 text-left">Sistema</th>
                      <th className="px-3 py-2 text-left">Banco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layout.mappings.map((mapping) => (
                      <tr key={mapping.id} className="border-t border-slate-100 text-slate-600">
                        <td className="px-3 py-2 font-semibold text-slate-800">{mapping.label}</td>
                        <td className="px-3 py-2">{mapping.compareOperator}</td>
                        <td className="px-3 py-2">{`${mapping.systemSheet ?? "-"} / ${mapping.systemColumn ?? "-"}`}</td>
                        <td className="px-3 py-2">{`${mapping.bankSheet ?? "-"} / ${mapping.bankColumn ?? "-"}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        ))}

        {!selectedBank ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Selecciona un banco para crear o editar layouts.
          </div>
        ) : null}
      </div>
    </section>
  );
}
