import { useEffect, useMemo, useState } from "react";
import { FiCheckSquare, FiSave, FiSquare } from "react-icons/fi";
import type { TemplateLayout, UserBankWithLayouts } from "../../types/conciliation";

interface BankAvailableTemplatesPanelProps {
  selectedBank: UserBankWithLayouts | null;
  templates: TemplateLayout[];
  onSave: (templateLayoutIds: number[]) => Promise<void>;
}

export default function BankAvailableTemplatesPanel({
  selectedBank,
  templates,
  onSave,
}: BankAvailableTemplatesPanelProps) {
  const initialIds = useMemo(
    () => new Set(selectedBank?.availableTemplateIds ?? []),
    [selectedBank?.availableTemplateIds, selectedBank?.id],
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(initialIds);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set(selectedBank?.availableTemplateIds ?? []));
  }, [selectedBank?.id, selectedBank?.availableTemplateIds]);

  const toggle = (templateId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  };

  const isDirty = useMemo(() => {
    if (selectedIds.size !== initialIds.size) return true;
    for (const id of selectedIds) if (!initialIds.has(id)) return true;
    return false;
  }, [selectedIds, initialIds]);

  const handleSave = async () => {
    if (!selectedBank) return;
    setSubmitting(true);
    try {
      await onSave(Array.from(selectedIds));
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedBank) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">
        Selecciona un banco para habilitar plantillas base.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Catalogo del banco
          </p>
          <h3 className="mt-2 text-lg font-extrabold text-slate-900">
            Plantillas habilitadas para que el admin pueda elegir
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Marca una o varias plantillas base. El admin del banco vera estas opciones y
            podra aplicar la que mejor se ajuste, sin necesidad de pedirte que la copies
            a mano.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!isDirty || submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiSave className="h-4 w-4" />{" "}
          {submitting ? "Guardando..." : "Guardar habilitadas"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            Todavia no hay plantillas base. Crea al menos una en el workspace de
            "Plantillas Base".
          </div>
        ) : (
          templates.map((template) => {
            const checked = selectedIds.has(template.id);
            return (
              <label
                key={template.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                  checked
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggle(template.id)}
                />
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border ${
                    checked
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                  aria-hidden
                >
                  {checked ? (
                    <FiCheckSquare className="h-3.5 w-3.5" />
                  ) : (
                    <FiSquare className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{template.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sistema {template.systemName}
                    {template.referenceBankName
                      ? ` | Ref. ${template.referenceBankName}`
                      : ""}
                  </p>
                  {template.description ? (
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {template.description}
                    </p>
                  ) : null}
                </div>
              </label>
            );
          })
        )}
      </div>
    </section>
  );
}
