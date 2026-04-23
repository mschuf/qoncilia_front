import {
  FiCpu,
  FiRefreshCcw,
  FiSave,
  FiServer,
  FiShield,
} from "react-icons/fi";
import useErpManagement from "../hooks/useErpManagement";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export default function ErpManagementPage() {
  const {
    canManage,
    reference,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompany,
    configs,
    metrics,
    editingConfigId,
    form,
    onFormFieldChange,
    saveConfig,
    startCreate,
    startEdit,
    reloadConfigs,
  } = useErpManagement();

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
            Integraciones ERP
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
            Configuracion por empresa para SAP B1
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Cada empresa puede tener varios ERP. En esta primera version dejamos
            la configuracion lista para SAP Business One con Service Layer, TLS
            y credenciales guardadas de forma segura.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Configuraciones
            </p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {metrics.total}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              Activas
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-800">
              {metrics.active}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">
              Default
            </p>
            <p className="mt-2 text-2xl font-extrabold text-brand-800">
              {metrics.defaults}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          {canManage ? (
            <label className="min-w-[280px] flex-1 space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">
                Empresa
              </span>
              <select
                value={selectedCompanyId}
                onChange={(event) =>
                  setSelectedCompanyId(Number(event.target.value))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                {(reference?.companies ?? []).map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.code})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="inline-flex min-w-[280px] flex-1 items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <FiShield className="h-4 w-4" />
              {selectedCompany
                ? `${selectedCompany.name} (${selectedCompany.code})`
                : "Sin empresa"}
            </div>
          )}

          <button
            type="button"
            onClick={() => void reloadConfigs()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FiRefreshCcw className="h-4 w-4" /> Recargar
          </button>

          {canManage ? (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <FiServer className="h-4 w-4" /> Nueva configuracion
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          {configs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              Todavia no hay configuraciones ERP para esta empresa.
            </div>
          ) : (
            configs.map((config) => (
              <article
                key={config.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {config.name}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {config.code}
                      </span>
                      {config.active ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700">
                          Inactivo
                        </span>
                      )}
                      {config.isDefault ? (
                        <span className="rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {config.description || "Sin descripcion adicional."}
                    </p>
                  </div>

                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => startEdit(config)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Editar
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      ERP
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {config.erpType}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Usuario SAP
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {config.sapUsername ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      DB Name
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {config.dbName ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      CMP Name
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {config.cmpName ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Server Node
                    </p>
                    <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                      {config.serverNode ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      UI / DB User
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {config.dbUser ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[1.5fr_0.7fr_0.8fr]">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Service Layer
                    </p>
                    <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                      {config.serviceLayerUrl ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      TLS
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {config.tlsVersion ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Password
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {config.hasPassword ? "Guardada" : "Pendiente"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>
                    <strong>Self-signed:</strong>{" "}
                    {config.allowSelfSigned ? "Si" : "No"}
                  </span>
                  <span>
                    <strong>Actualizado:</strong>{" "}
                    {formatDateTime(config.updatedAt)}
                  </span>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {canManage ? (
            <form onSubmit={saveConfig} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    {editingConfigId
                      ? "Editando configuracion"
                      : "Nueva configuracion"}
                  </p>
                  <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                    SAP Business One
                  </h3>
                </div>
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
                  <FiCpu className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Codigo
                  </span>
                  <input
                    name="code"
                    value={form.code}
                    onChange={onFormFieldChange}
                    placeholder="SAP_PRD"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Nombre visible
                  </span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onFormFieldChange}
                    placeholder="SAP Produccion"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    required
                  />
                </label>
              </div>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Descripcion
                </span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onFormFieldChange}
                  rows={3}
                  placeholder="Conexion principal para depositos via Service Layer."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Usuario SAP
                  </span>
                  <input
                    name="sapUsername"
                    value={form.sapUsername}
                    onChange={onFormFieldChange}
                    placeholder="manager"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    UI / DB User
                  </span>
                  <input
                    name="dbUser"
                    value={form.dbUser}
                    onChange={onFormFieldChange}
                    placeholder="SYSTEM"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    DB Name
                  </span>
                  <input
                    name="dbName"
                    value={form.dbName}
                    onChange={onFormFieldChange}
                    placeholder="SBODEMO"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    CMP Name
                  </span>
                  <input
                    name="cmpName"
                    value={form.cmpName}
                    onChange={onFormFieldChange}
                    placeholder="SBODEMOPY"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    required
                  />
                </label>
              </div>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Server Node
                </span>
                <input
                  name="serverNode"
                  value={form.serverNode}
                  onChange={onFormFieldChange}
                  placeholder="172.19.0.88:30015"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  required
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Service Layer URL
                </span>
                <input
                  name="serviceLayerUrl"
                  value={form.serviceLayerUrl}
                  onChange={onFormFieldChange}
                  placeholder="https://172.19.0.88:50000/b1s/v2"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  required
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Password{" "}
                    {editingConfigId ? "(dejar vacio para mantener)" : ""}
                  </span>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={onFormFieldChange}
                    placeholder="Password cifrada en backend"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    required={!editingConfigId}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    TLS
                  </span>
                  <select
                    name="tlsVersion"
                    value={form.tlsVersion}
                    onChange={onFormFieldChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    {(reference?.tlsVersions ?? ["1.2"]).map((tlsVersion) => (
                      <option key={tlsVersion} value={tlsVersion}>
                        TLS {tlsVersion}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    name="active"
                    checked={form.active}
                    onChange={onFormFieldChange}
                  />
                  Activo
                </label>

                <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={form.isDefault}
                    onChange={onFormFieldChange}
                  />
                  Default
                </label>

                <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    name="allowSelfSigned"
                    checked={form.allowSelfSigned}
                    onChange={onFormFieldChange}
                  />
                  Permitir self-signed
                </label>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <FiSave className="h-4 w-4" />
                {editingConfigId ? "Guardar cambios" : "Crear configuracion"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Vista operativa
              </p>
              <h3 className="text-xl font-extrabold text-slate-900">
                Las configuraciones ERP se administran desde Superadmin
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                Como admin podes consultar las conexiones activas de tu empresa
                y usarlas desde la pantalla de conciliacion para enviar
                depositos al ERP.
              </p>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Selecciona una conciliacion, generala o guardala, y luego usa el
                boton
                <strong> Guardar y enviar a ERP</strong> desde la mesa para
                publicar el deposito.
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
