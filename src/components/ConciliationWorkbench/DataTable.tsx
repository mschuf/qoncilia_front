import type { LayoutMapping, PreviewRow } from "../../types/conciliation";

export default function DataTable({
  title,
  rows,
  mappings,
}: {
  title: string;
  rows: PreviewRow[];
  mappings: LayoutMapping[];
}) {
  const activeMappings = mappings.filter((m) => m.active);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {rows.length} filas
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                {activeMappings.map((m) => (
                  <th key={m.fieldKey} className="whitespace-nowrap px-3 py-2">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.rowId}
                  className="border-t border-slate-100 text-slate-700"
                >
                  {activeMappings.map((m) => (
                    <td
                      key={m.fieldKey}
                      className="whitespace-nowrap px-3 py-2"
                    >
                      {row.values[m.fieldKey] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(activeMappings.length, 1)}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Sin filas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
