import { FiCopy, FiEdit3, FiPlus } from "react-icons/fi";
import type { TemplateLayout, UserBankWithLayouts } from "../../types/conciliation";
import { MetricTile } from "./MetricCards";

interface TemplateLayoutSectionProps {
  templates: TemplateLayout[];
  selectedBank: UserBankWithLayouts | null;
  onCreateTemplate: () => void;
  onEditTemplate: (template: TemplateLayout) => void;
  onApplyTemplate: (template: TemplateLayout) => void;
}

export default function TemplateLayoutSection({
  templates,
  selectedBank,
  onCreateTemplate,
  onEditTemplate,
  onApplyTemplate
}: TemplateLayoutSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Template Layouts</h3>
          <p className="mt-1 text-sm text-slate-500">
            Crea una vez y copia el template al banco del usuario que elijas.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateTemplate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <FiPlus className="h-4 w-4" /> Nuevo template
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {templates.map((template) => (
          <article
            key={template.id}
            className={`rounded-2xl border p-4 ${
              template.active
                ? "border-brand-200 bg-brand-50/40"
                : "border-slate-200 bg-slate-50/50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900">{template.name}</h4>
                  {template.active ? (
                    <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                      Activo
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {template.description ?? "Sin descripcion"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEditTemplate(template)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
                >
                  <FiEdit3 className="h-4 w-4" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => onApplyTemplate(template)}
                  disabled={!selectedBank}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  <FiCopy className="h-4 w-4" />
                  {selectedBank ? `Copiar a ${selectedBank.alias ?? selectedBank.bankName}` : "Selecciona un banco"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <MetricTile label="Banco ref." value={template.referenceBankName ?? "-"} />
              <MetricTile label="Sistema" value={template.systemLabel} />
              <MetricTile label="Banco" value={template.bankLabel} />
              <MetricTile label="Threshold" value={template.autoMatchThreshold.toFixed(2)} />
            </div>
          </article>
        ))}

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Todavia no hay template layouts creados.
          </div>
        ) : null}
      </div>
    </section>
  );
}
