import type { ComponentType } from "react";

export function MetricCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand-50 p-3 text-brand-700"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function MetricTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 font-semibold text-slate-700">{value}</p></div>;
}

export function ModalActions({ formId, label, onCancel }: { formId: string; label: string; onCancel: () => void }) {
  return <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancelar</button><button form={formId} type="submit" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-700">{label}</button></div>;
}
