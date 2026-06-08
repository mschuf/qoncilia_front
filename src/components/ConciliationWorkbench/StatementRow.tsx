import { memo } from "react";
import type { BankStatementSummary } from "../../types/conciliation";
import { formatDateTime } from "./workbenchHelpers";

// Memoized para evitar re-render de filas al cambiar filtros/paginacion sin
// que las props de la fila cambien.
const StatementRow = memo(function StatementRow({
  statement,
  selected,
  onSelect,
}: {
  statement: BankStatementSummary;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <tr
      className={`border-t border-slate-100 ${selected ? "bg-brand-50" : "bg-white hover:bg-slate-50"}`}
    >
      <td className="px-3 py-3 text-slate-600">
        {formatDateTime(statement.createdAt)}
      </td>
      <td className="px-3 py-3">
        <p className="font-semibold text-slate-900">{statement.bankName}</p>
        <p className="mt-1 text-xs text-slate-500">
          {statement.companyBankAccountName} -{" "}
          {statement.companyBankAccountNumber}
        </p>
      </td>
      <td className="px-3 py-3">
        <p className="font-semibold text-slate-900">{statement.name}</p>
        <p className="mt-1 text-xs text-slate-500">{statement.fileName}</p>
      </td>
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={() => onSelect(statement.id)}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition cursor-pointer ${selected
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
        >
          {selected ? "Seleccionado" : "Usar"}
        </button>
      </td>
    </tr>
  );
});

export default StatementRow;
