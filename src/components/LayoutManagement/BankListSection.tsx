import type { UserBankWithLayouts } from "../../types/conciliation";

interface BankListSectionProps {
  banks: UserBankWithLayouts[];
  selectedBankId: number;
  onSelectBank: (bankId: number) => void;
}

export default function BankListSection({ banks, selectedBankId, onSelectBank }: BankListSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-extrabold text-slate-900">Bancos del usuario</h3>
      <p className="mt-1 text-sm text-slate-500">Selecciona un banco para ver o editar sus layouts.</p>

      <div className="mt-4 space-y-3">
        {banks.map((bank) => (
          <button
            key={bank.id}
            type="button"
            onClick={() => onSelectBank(bank.id)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selectedBankId === bank.id
                ? "border-brand-400 bg-brand-50 shadow-sm"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {bank.alias ?? bank.bankName}
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  {bank.bankName} · {bank.currency} · {bank.accountNumber ?? "Sin cuenta"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  bank.active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {bank.active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                {bank.layouts.length} layouts
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                usuario {bank.userLogin}
              </span>
            </div>
            {bank.description ? <p className="mt-3 text-sm text-slate-600">{bank.description}</p> : null}
          </button>
        ))}
        {banks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Este usuario todavia no tiene bancos asignados.
          </div>
        ) : null}
      </div>
    </section>
  );
}
