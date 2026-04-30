import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBriefcase,
  FiCheckCircle,
  FiLayers,
  FiRefreshCcw,
  FiZap,
} from "react-icons/fi";
import { apiClient } from "../api/apiClient";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import type {
  BankWithAvailableTemplates,
  Layout,
  TemplateLayout,
} from "../types/conciliation";

type PendingApply = {
  bank: BankWithAvailableTemplates;
  template: TemplateLayout;
} | null;

type PendingActivate = {
  bank: BankWithAvailableTemplates;
  layout: Layout;
} | null;

export default function AdminTemplatesPage() {
  const toast = useToast();
  const [banks, setBanks] = useState<BankWithAvailableTemplates[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<number>(0);
  const [pendingApply, setPendingApply] = useState<PendingApply>(null);
  const [pendingActivate, setPendingActivate] = useState<PendingActivate>(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<BankWithAvailableTemplates[]>(
        "/conciliation/admin/bancos-plantillas-disponibles",
      );
      const next = response ?? [];
      setBanks(next);
      setSelectedBankId((current) => {
        if (current > 0 && next.some((bank) => bank.id === current)) return current;
        return next[0]?.id ?? 0;
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los bancos y sus plantillas disponibles.",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.id === selectedBankId) ?? null,
    [banks, selectedBankId],
  );

  const totalAvailable = useMemo(
    () => banks.reduce((acc, bank) => acc + bank.availableTemplates.length, 0),
    [banks],
  );

  const totalApplied = useMemo(
    () => banks.reduce((acc, bank) => acc + bank.layouts.length, 0),
    [banks],
  );

  const handleApply = async () => {
    if (!pendingApply) return;
    setSubmitting(true);
    try {
      await apiClient.post<Layout>(
        `/conciliation/admin/banks/${pendingApply.bank.id}/plantillas-base/${pendingApply.template.id}/aplicar`,
        {},
      );
      toast.success(
        `Plantilla "${pendingApply.template.name}" aplicada al banco ${pendingApply.bank.alias ?? pendingApply.bank.bankName}.`,
      );
      setPendingApply(null);
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo aplicar la plantilla al banco.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!pendingActivate) return;
    setSubmitting(true);
    try {
      await apiClient.patch(
        `/conciliation/admin/banks/${pendingActivate.bank.id}/plantillas/${pendingActivate.layout.id}/activate`,
        {},
      );
      toast.success(
        `Plantilla "${pendingActivate.layout.name}" activada correctamente.`,
      );
      setPendingActivate(null);
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo activar la plantilla.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="space-y-6">
        <header className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
              Admin Operativo
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
              Plantillas de mis bancos
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              El super admin habilita un catalogo de plantillas base por cada banco. Desde
              aca podes aplicar la que mas se ajuste a tu operativa para crear la plantilla
              de conciliacion del banco.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              label="Bancos"
              value={String(banks.length)}
              icon={FiBriefcase}
            />
            <MetricCard
              label="Plantillas habilitadas"
              value={String(totalAvailable)}
              icon={FiLayers}
              accent="brand"
            />
            <MetricCard
              label="Plantillas aplicadas"
              value={String(totalApplied)}
              icon={FiCheckCircle}
              accent="emerald"
            />
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FiRefreshCcw className="h-4 w-4" /> Recargar
            </button>
          </div>
        </header>

        {loading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Cargando bancos y plantillas habilitadas...
          </div>
        ) : banks.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
            Todavia no hay bancos disponibles para tu empresa. Pedile al super admin que
            cree los bancos y habilite sus plantillas base.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Bancos
              </p>
              <div className="space-y-2">
                {banks.map((bank) => {
                  const isSelected = bank.id === selectedBankId;
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBankId(bank.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                    >
                      <p className="text-sm font-bold">
                        {bank.alias ?? bank.bankName}
                      </p>
                      <p
                        className={`mt-1 text-xs ${isSelected ? "text-white/70" : "text-slate-500"
                          }`}
                      >
                        {bank.bankName}
                        {bank.branch ? ` | ${bank.branch}` : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                        <span
                          className={`rounded-full px-2.5 py-1 ${isSelected
                            ? "bg-white/15 text-white"
                            : "bg-brand-50 text-brand-700"
                            }`}
                        >
                          {bank.availableTemplates.length} habilitada(s)
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 ${isSelected
                            ? "bg-white/15 text-white"
                            : "bg-emerald-50 text-emerald-700"
                            }`}
                        >
                          {bank.layouts.length} aplicada(s)
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="space-y-5">
              {selectedBank ? (
                <>

                  <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <header className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Plantillas ya aplicadas
                        </p>
                        <h4 className="mt-2 text-lg font-extrabold text-slate-900">
                          Operando en el banco
                        </h4>
                      </div>
                      <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                        <FiCheckCircle className="h-5 w-5" />
                      </span>
                    </header>

                    {selectedBank.layouts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        Este banco todavia no tiene una plantilla aplicada.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedBank.layouts.map((layout) => (
                          <div
                            key={layout.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {layout.name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Sistema {layout.systemName} | {layout.mappings.length}{" "}
                                campo(s)
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                  layout.active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {layout.active ? "Activa" : "Inactiva"}
                              </span>
                              {!layout.active ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingActivate({
                                      bank: selectedBank,
                                      layout,
                                    })
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100"
                                >
                                  Activar
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <header className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Plantillas habilitadas por el super admin
                        </p>
                        <h4 className="mt-2 text-lg font-extrabold text-slate-900">
                          Aplicar al banco
                        </h4>
                      </div>
                      <span className="rounded-2xl bg-brand-50 p-3 text-brand-700">
                        <FiLayers className="h-5 w-5" />
                      </span>
                    </header>

                    {selectedBank.availableTemplates.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        Este banco aun no tiene plantillas habilitadas. Pedile al super
                        admin que asigne al menos una plantilla base.
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {selectedBank.availableTemplates.map((template) => {
                          const alreadyApplied = selectedBank.layouts.some(
                            (layout) => layout.templateLayoutId === template.id,
                          );
                          return (
                            <article
                              key={template.id}
                              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {template.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Sistema {template.systemName}
                                  {template.referenceBankName
                                    ? ` | Banco ref. ${template.referenceBankName}`
                                    : ""}
                                </p>
                                {template.description ? (
                                  <p className="mt-2 text-xs leading-5 text-slate-600">
                                    {template.description}
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                                <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 shadow-sm">
                                  {template.mappings.length} campo(s)
                                </span>
                                {alreadyApplied ? (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                                    Ya aplicada
                                  </span>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setPendingApply({ bank: selectedBank, template })
                                }
                                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                              >
                                <FiZap className="h-4 w-4" />{" "}
                                {alreadyApplied
                                  ? "Volver a aplicar"
                                  : "Aplicar al banco"}
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>


                </>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <ConfirmModal
        open={Boolean(pendingApply)}
        onClose={() => (submitting ? null : setPendingApply(null))}
        title="Aplicar plantilla al banco"
        message={
          pendingApply
            ? `Vas a copiar la plantilla "${pendingApply.template.name}" al banco "${pendingApply.bank.alias ?? pendingApply.bank.bankName}". La plantilla nueva quedara activa y se desactivaran las otras del banco.`
            : ""
        }
        confirmLabel={submitting ? "Aplicando..." : "Aplicar plantilla"}
        confirmVariant="primary"
        onConfirm={() => void handleApply()}
      />

      <ConfirmModal
        open={Boolean(pendingActivate)}
        onClose={() => (submitting ? null : setPendingActivate(null))}
        title="Activar plantilla"
        message={
          pendingActivate
            ? `Vas a volver a activar la plantilla "${pendingActivate.layout.name}". Esto la convertira en la plantilla principal y desactivara la que este activa actualmente.`
            : ""
        }
        confirmLabel={submitting ? "Activando..." : "Activar plantilla"}
        confirmVariant="primary"
        onConfirm={() => void handleActivate()}
      />
    </>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent = "slate",
}: {
  label: string;
  value: string;
  icon: typeof FiBriefcase;
  accent?: "slate" | "emerald" | "brand";
}) {
  const accentClasses = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    brand: "border-brand-200 bg-brand-50 text-brand-800",
  } as const;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClasses[accent]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-extrabold">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3 text-slate-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
