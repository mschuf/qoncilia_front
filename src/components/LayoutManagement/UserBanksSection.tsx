import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiEdit3, FiPlus, FiTrash2 } from "react-icons/fi";
import type { Layout, UserBankWithLayouts } from "../../types/conciliation";
import type { AuthUser } from "../../types/auth";
import { MetricTile } from "./MetricCards";

interface UserBanksSectionProps {
  users: AuthUser[];
  allCatalogs: Map<number, UserBankWithLayouts[]>;
  onEditBank: (userId: number, bank: UserBankWithLayouts) => void;
  onDeleteBank: (userId: number, bank: UserBankWithLayouts) => void;
  onCreateLayout: (userId: number, bank: UserBankWithLayouts) => void;
  onEditLayout: (userId: number, bank: UserBankWithLayouts, layout: Layout) => void;
  onDeleteLayout: (userId: number, bankId: number, layout: Layout) => void;
}

export default function UserBanksSection({
  users,
  allCatalogs,
  onEditBank,
  onDeleteBank,
  onCreateLayout,
  onEditLayout,
  onDeleteLayout,
}: UserBanksSectionProps) {
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());
  const companies = users.reduce<
    Array<{
      id: number;
      name: string;
      representativeUserId: number;
      users: AuthUser[];
    }>
  >((acc, user) => {
    const companyId = Number(user.companyId ?? 0);
    if (!companyId) return acc;

    const existing = acc.find((company) => company.id === companyId);
    if (existing) {
      existing.users.push(user);
      return acc;
    }

    acc.push({
      id: companyId,
      name: user.companyName ?? `Empresa ${companyId}`,
      representativeUserId: Number(user.id),
      users: [user],
    });
    return acc;
  }, []).sort((left, right) => left.name.localeCompare(right.name));

  const toggleUser = (userId: number) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleBank = (key: string) => {
    setExpandedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Empresas y bancos</h3>
          <p className="mt-1 text-sm text-slate-500">
            Vista global de las empresas con sus bancos y plantillas.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {companies.map((company) => {
          const uid = company.representativeUserId;
          const banks = allCatalogs.get(uid) ?? [];
          const isExpanded = expandedUsers.has(company.id);
          const userLogins = company.users.map((user) => user.usrLogin).join(", ");

          return (
            <div
              key={company.id}
              className="rounded-2xl border border-slate-200 bg-white transition"
            >
              <button
                type="button"
                onClick={() => toggleUser(company.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {company.name}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {banks.length} banco(s)
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {company.users.length} usuario(s)
                    </span>
                  </div>
                  {userLogins ? (
                    <p className="mt-1 text-xs text-slate-500">{userLogins}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-500 shadow-sm">
                    {isExpanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
                  </span>
                </div>
              </button>

              {isExpanded ? (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  {banks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                      Esta empresa no tiene bancos asignados.
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {banks.map((bank) => {
                      const bankKey = `${uid}-${bank.id}`;
                      const bankExpanded = expandedBanks.has(bankKey);

                      return (
                        <div
                          key={bank.id}
                          className={`rounded-2xl border transition ${
                            bank.active ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50/50"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleBank(bankKey)}
                            className="flex w-full items-center justify-between gap-3 p-3 text-left"
                          >
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">
                                  {bank.bankName}
                                </span>
                                {bank.branch ? (
                                  <span className="text-xs text-slate-500">Sucursal {bank.branch}</span>
                                ) : null}
                                {bank.active ? (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    Activo
                                  </span>
                                ) : null}
                                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm">
                                  {bank.layouts.length} plantilla(s)
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-500 shadow-sm">
                                {bankExpanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
                              </span>
                            </div>
                          </button>

                          {bankExpanded ? (
                            <div className="border-t border-slate-200/70 px-3 pb-3 pt-2">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => onEditBank(uid, bank)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white"
                                >
                                  <FiEdit3 className="h-3.5 w-3.5" /> Editar banco
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteBank(bank.userId || uid, bank)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                >
                                  <FiTrash2 className="h-3.5 w-3.5" /> Eliminar banco
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onCreateLayout(uid, bank)}
                                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                                >
                                  <FiPlus className="h-3.5 w-3.5" /> Nueva plantilla
                                </button>
                              </div>

                              <div className="mt-3 space-y-3">
                                {bank.layouts.map((layout) => (
                                  <div
                                    key={layout.id}
                                    className={`rounded-xl border p-3 ${
                                      layout.active ? "border-emerald-200 bg-white" : "border-slate-200 bg-white"
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm font-bold text-slate-900">
                                            {layout.name}
                                          </span>
                                          {layout.active ? (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                              Activo
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                          {layout.description ?? "Sin descripcion"}
                                        </p>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => onEditLayout(uid, bank, layout)}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white"
                                        >
                                          <FiEdit3 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onDeleteLayout(bank.userId || uid, bank.id, layout)}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                        >
                                          <FiTrash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                      <MetricTile label="Sistema" value={layout.systemLabel} />
                                      <MetricTile label="Banco" value={layout.bankLabel} />
                                      <MetricTile label="Umbral" value={layout.autoMatchThreshold.toFixed(2)} />
                                    </div>
                                  </div>
                                ))}

                                {bank.layouts.length === 0 ? (
                                  <div className="rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
                                    Sin plantillas.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
