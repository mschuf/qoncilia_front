import type { InputHTMLAttributes } from "react"
import { FiBriefcase, FiPlus, FiRefreshCcw, FiSave, FiShield } from "react-icons/fi"
import useErpManagement from "../hooks/useErpManagement"

export default function ErpManagementPage() {
  const {
    isSuperAdmin,
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompany,
    form,
    onFormFieldChange,
    saveCompany,
    startCreate,
    cancelCreate,
    isCreating,
    metrics,
    reload
  } = useErpManagement()

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
            Empresas
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
            {isSuperAdmin ? "ABM de Empresas" : "Mi Empresa"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {isSuperAdmin
              ? "Administra los datos maestros de cada empresa y sus campos ERP visibles."
              : "Completa o ajusta los datos basicos de tu empresa. La configuracion ERP ampliada la gestiona superadmin."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <MetricCard label="Empresas" value={String(metrics.total)} />
          <MetricCard label="Activas" value={String(metrics.active)} accent="emerald" />
          <MetricCard label="Con ERP" value={String(metrics.withErp)} accent="brand" />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          {isSuperAdmin ? (
            <label className="min-w-[280px] flex-1 space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Empresa</span>
              <select
                value={isCreating ? 0 : selectedCompanyId}
                onChange={(event) => {
                  setSelectedCompanyId(Number(event.target.value))
                  cancelCreate()
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value={0}>Selecciona una empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.fiscalId})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="inline-flex min-w-[280px] flex-1 items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <FiShield className="h-4 w-4" />
              {selectedCompany ? `${selectedCompany.name} (${selectedCompany.fiscalId})` : "Sin empresa"}
            </div>
          )}

          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FiRefreshCcw className="h-4 w-4" /> Recargar
          </button>

          {isSuperAdmin ? (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <FiPlus className="h-4 w-4" /> Nueva empresa
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {isSuperAdmin ? (isCreating ? "Nueva empresa" : "Edicion de empresa") : "Ficha basica"}
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                {isSuperAdmin ? "Datos de Empresa" : "Datos visibles para tu empresa"}
              </h3>
            </div>
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
              <FiBriefcase className="h-5 w-5" />
            </div>
          </div>

          <form onSubmit={saveCompany} className="mt-6 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Nombre Empresa"
                name="name"
                value={form.name}
                onChange={onFormFieldChange}
                placeholder="Qoncilia SA"
                required
              />
              <Field
                label="ID Fiscal"
                name="fiscalId"
                value={form.fiscalId}
                onChange={onFormFieldChange}
                placeholder="80012345-6"
                required={isSuperAdmin || !selectedCompany || form.fiscalId.length > 0}
              />
            </div>

            {isSuperAdmin ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Webservice ERP"
                    name="webserviceErp"
                    value={form.webserviceErp}
                    onChange={onFormFieldChange}
                    placeholder="https://erp.empresa.com/api"
                  />
                  <Field
                    label="Scheme ERP"
                    name="schemeErp"
                    value={form.schemeErp}
                    onChange={onFormFieldChange}
                    placeholder="SAP_B1"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Version TLS ERP"
                    name="tlsVersionErp"
                    value={form.tlsVersionErp}
                    onChange={onFormFieldChange}
                    placeholder="1.2"
                  />
                  <Field
                    label="ID Tarjetas"
                    name="cardsId"
                    value={form.cardsId}
                    onChange={onFormFieldChange}
                    placeholder="TARJETAS_PRINCIPAL"
                  />
                </div>

                <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    name="active"
                    checked={form.active}
                    onChange={onFormFieldChange}
                  />
                  Empresa activa
                </label>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                El alta de campos ERP ampliados la realiza superadmin. Desde aqui solo podes
                ajustar nombre e ID fiscal.
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {isSuperAdmin && isCreating ? (
                <button
                  type="button"
                  onClick={cancelCreate}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
              ) : null}

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <FiSave className="h-4 w-4" />
                {isSuperAdmin && isCreating ? "Crear empresa" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Resumen
          </p>
          <div className="mt-4 space-y-3">
            <SummaryTile label="Nombre" value={selectedCompany?.name ?? form.name ?? "-"} />
            <SummaryTile label="ID Fiscal" value={selectedCompany?.fiscalId ?? form.fiscalId ?? "-"} />
            <SummaryTile
              label="Estado"
              value={(selectedCompany?.active ?? form.active) ? "Activa" : "Inactiva"}
            />
            <SummaryTile
              label="Webservice ERP"
              value={selectedCompany?.webserviceErp ?? form.webserviceErp ?? "-"}
            />
            <SummaryTile
              label="Scheme ERP"
              value={selectedCompany?.schemeErp ?? form.schemeErp ?? "-"}
            />
            <SummaryTile
              label="Version TLS ERP"
              value={selectedCompany?.tlsVersionErp ?? form.tlsVersionErp ?? "-"}
            />
            <SummaryTile
              label="ID Tarjetas"
              value={selectedCompany?.cardsId ?? form.cardsId ?? "-"}
            />
          </div>
        </section>
      </div>
    </section>
  )
}

function MetricCard({
  label,
  value,
  accent = "slate"
}: {
  label: string
  value: string
  accent?: "slate" | "emerald" | "brand"
}) {
  const accentClasses = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    brand: "border-brand-200 bg-brand-50 text-brand-800"
  } as const

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClasses[accent]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  )
}

function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />
    </label>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}
