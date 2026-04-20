import { useState } from "react";
import { FiInfo, FiRefreshCcw, FiSave, FiSettings } from "react-icons/fi";
import AppModal from "../components/AppModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import accessDocsMarkdown from "../../docs/modulos-por-empresa-y-rol.md?raw";
import useAccessControl from "../hooks/useAccessControl";

export default function AccessControlPage() {
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const {
    reference,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompany,
    matrix,
    companyForm,
    onCompanyFieldChange,
    createCompany,
    toggleModule,
    saveRoleModules,
    reloadMatrix
  } = useAccessControl();

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
              Superadmin Studio
            </p>
            <button
              onClick={() => setIsDocsModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100"
              title="Ver documentación"
            >
              <FiInfo className="h-4 w-4" /> INFO
            </button>
          </div>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
            Modulos por Empresa y Rol
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Activa o desactiva pantallas de forma dinamica. Cada cambio impacta en rutas y menu
            del front para los usuarios de la empresa y rol seleccionados.
          </p>
        </div>

        <form
          onSubmit={createCompany}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Nueva Empresa
          </p>
          <input
            name="code"
            value={companyForm.code}
            onChange={onCompanyFieldChange}
            placeholder="Codigo (ej: ACME)"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            required
          />
          <input
            name="name"
            value={companyForm.name}
            onChange={onCompanyFieldChange}
            placeholder="Nombre de empresa"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            required
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            Crear empresa
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[280px] flex-1 space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Empresa</span>
            <select
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              {(reference?.companies ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.code})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void reloadMatrix()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FiRefreshCcw className="h-4 w-4" /> Recargar
          </button>

          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <FiSettings className="h-4 w-4" />
            {selectedCompany ? selectedCompany.name : "Sin empresa seleccionada"}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Rol</th>
                {(matrix?.modules ?? []).map((module) => (
                  <th key={module.id} className="px-4 py-3 whitespace-nowrap">
                    {module.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(matrix?.rows ?? []).map((row) => (
                <tr key={row.role.id} className="border-t border-slate-100 text-slate-700">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{row.role.name}</td>
                  {row.modules.map((moduleState) => (
                    <td key={`${row.role.id}-${moduleState.moduleId}`} className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={moduleState.enabled}
                          onChange={() => toggleModule(row.role.id, moduleState.moduleId)}
                        />
                        <span className="text-xs text-slate-500">{moduleState.moduleCode}</span>
                      </label>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void saveRoleModules(row.role.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      <FiSave className="h-3.5 w-3.5" /> Guardar
                    </button>
                  </td>
                </tr>
              ))}

              {!matrix && (
                <tr>
                  <td
                    colSpan={(reference?.modules?.length ?? 0) + 2}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Selecciona una empresa para ver su matriz de modulos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AppModal
        open={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        title="Documentación: Módulos por Empresa y Rol"
      >
        <div className="prose prose-slate prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{accessDocsMarkdown}</ReactMarkdown>
        </div>
      </AppModal>
    </section>
  );
}
