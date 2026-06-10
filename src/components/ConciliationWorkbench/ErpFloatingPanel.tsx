import { FiLogIn, FiRefreshCw, FiX } from "react-icons/fi";
import type { CompanyErpConfig } from "../../types/erp";
import type { SapErpSession } from "../../erp/sap";
import type { ErpStatus } from "./workbenchHelpers";

export default function ErpFloatingPanel({
  isOpen,
  onToggle,
  onClose,
  erpStatus,
  erpSession,
  erpConfigs,
  selectedErpConfigId,
  setSelectedErpConfigId,
  checkErpSession,
  onLoginClick,
  isLoginDisabled,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  erpStatus: ErpStatus;
  erpSession: SapErpSession | null;
  erpConfigs: CompanyErpConfig[];
  selectedErpConfigId: number;
  setSelectedErpConfigId: (id: number) => void;
  checkErpSession: (force?: boolean) => Promise<unknown> | void;
  onLoginClick: () => void;
  isLoginDisabled: boolean;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {isOpen ? (
        <div className="w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              ERP
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
          <select
            value={selectedErpConfigId}
            onChange={(event) =>
              setSelectedErpConfigId(Number(event.target.value))
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {erpConfigs.length === 0 ? (
              <option value={0}>Sin ERPs activas</option>
            ) : null}
            {erpConfigs.map((config) => (
              <option key={config.id} value={config.id}>
                {config.name} - {config.dbName ?? config.code}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-xs font-bold ${erpStatus.badgeClass}`}
            >
              {erpStatus.label}
            </span>
            <button
              type="button"
              onClick={() => void checkErpSession(true)}
              disabled={!selectedErpConfigId}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FiRefreshCw className="h-3.5 w-3.5" /> Validar
            </button>
          </div>
          <div
            className={`mt-2 rounded-xl border px-3 py-2 text-xs ${erpStatus.panelClass}`}
          >
            <p className="font-bold">{erpStatus.title}</p>
            <p className="mt-0.5 text-[11px]">{erpStatus.detail}</p>
          </div>
          {!erpSession?.authenticated ? (
            <button
              type="button"
              onClick={onLoginClick}
              disabled={isLoginDisabled}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiLogIn className="h-3.5 w-3.5" />
              Iniciar sesion
            </button>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        title="ERP"
        className={`inline-flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition hover:scale-105 ${erpSession?.authenticated
            ? "bg-emerald-600 text-white shadow-emerald-600/30"
            : "bg-slate-900 text-white shadow-slate-900/30"
          }`}
      >
        <FiRefreshCw className="h-5 w-5" />
      </button>
    </div>
  );
}
