import { FiChevronDown, FiChevronUp, FiSearch } from "react-icons/fi";
import type { AuthUser } from "../../types/auth";
import type { UserBankWithLayouts } from "../../types/conciliation";
import { isSuperAdminRole } from "../../utils/role";
import { DateRangePicker } from "./DateRangePicker";
import { SelectBlock } from "./WorkbenchControls";

export default function FiltersSection({
  role,
  users,
  selectedUserId,
  setSelectedUserId,
  banks,
  selectedBankId,
  setSelectedBankId,
  accounts,
  selectedCompanyBankAccountId,
  setSelectedCompanyBankAccountId,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  isExpanded,
  setIsExpanded,
  onSearch,
  isSapB1QueryMode,
  isSearchDisabled,
}: {
  role: string | null;
  users: AuthUser[];
  selectedUserId: number;
  setSelectedUserId: (id: number) => void;
  banks: UserBankWithLayouts[];
  selectedBankId: number;
  setSelectedBankId: (id: number) => void;
  accounts: UserBankWithLayouts["accounts"];
  selectedCompanyBankAccountId: number;
  setSelectedCompanyBankAccountId: (id: number) => void;
  dateFrom: string;
  dateTo: string;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  onSearch: () => void;
  isSapB1QueryMode: boolean;
  isSearchDisabled: boolean;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Filtros de consulta</h2>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          {isExpanded ? "Ocultar" : "Mostrar"}
          {isExpanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isExpanded ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-12">
          {isSuperAdminRole(role) ? (
            <div className="col-span-2 md:col-span-4 lg:col-span-2">
              <SelectBlock
                label="Usuario"
                value={selectedUserId}
                onChange={(value) => setSelectedUserId(Number(value))}
                options={users.map((item) => ({
                  value: Number(item.id),
                  label: `${item.usrLogin}${item.usrNombre ? ` - ${item.usrNombre}` : ""}`,
                }))}
              />
            </div>
          ) : null}

          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <SelectBlock
              label="Banco"
              value={selectedBankId}
              onChange={(value) => setSelectedBankId(Number(value))}
              options={banks.map((item) => ({
                value: item.id,
                label: item.bankName,
              }))}
              disabled={banks.length === 0}
            />
          </div>

          <div className="col-span-1 md:col-span-1 lg:col-span-3">
            <label className="space-y-1.5 block">
              <span className="text-sm font-semibold text-slate-700">
                Cuenta bancaria
              </span>
              <select
                value={selectedCompanyBankAccountId}
                onChange={(event) =>
                  setSelectedCompanyBankAccountId(Number(event.target.value))
                }
                disabled={accounts.length === 0}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {accounts.length === 0 ? (
                  <option value={0}>Sin cuentas para este banco</option>
                ) : null}
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {account.accountNumber} ({account.currency})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={`col-span-2 md:col-span-2 ${isSuperAdminRole(role) ? "lg:col-span-3" : "lg:col-span-5"}`}>
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
          </div>

          <div className="col-span-2 md:col-span-4 lg:col-span-2 flex items-end">
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                onSearch();
              }}
              disabled={isSearchDisabled}
              aria-label={
                isSapB1QueryMode ? "Ejecutar consultas" : "Buscar extractos"
              }
              title={
                isSapB1QueryMode ? "Ejecutar consultas" : "Buscar extractos"
              }
              className="inline-flex h-[46px] w-full items-center justify-center rounded-xl bg-emerald-600 px-4 font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSearch className="h-4 w-4" />
              <span className="ml-2">Buscar</span>
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
