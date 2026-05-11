import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import {
  FiCheckCircle,
  FiDatabase,
  FiLogIn,
  FiLogOut,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiServer,
  FiShield,
} from "react-icons/fi";
import useErpManagement from "../hooks/useErpManagement";
import type { CompanyErpConfig } from "../types/erp";

export default function ErpManagementPage() {
  const {
    isSuperAdmin,
    canEditConfig,
    companies,
    configs,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedConfigId,
    setSelectedConfigId,
    selectedConfig,
    configForm,
    onConfigFormChange,
    saveConfig,
    startCreateConfig,
    cancelCreateConfig,
    isCreatingConfig,
    loginForm,
    onLoginFormChange,
    loginSap,
    logoutSap,
    checkSapSession,
    sapSession,
    sessionLabel,
    reload,
  } = useErpManagement();

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          {isSuperAdmin ? (
            <label className="min-w-[260px] flex-1 space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">
                Empresa
              </span>
              <select
                value={selectedCompanyId}
                onChange={(event) => {
                  setSelectedCompanyId(Number(event.target.value));
                  cancelCreateConfig();
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.fiscalId ?? company.code})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="inline-flex min-w-[260px] flex-1 items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <FiShield className="h-4 w-4" />
              ERPs activas de tu empresa
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
              onClick={startCreateConfig}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <FiPlus className="h-4 w-4" /> Nueva configuracion
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                ERPs activas
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                Integraciones disponibles
              </h3>
            </div>
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
              <FiDatabase className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {configs.map((config) => (
              <ConfigTile
                key={config.id}
                config={config}
                selected={config.id === selectedConfigId}
                connected={
                  sapSession?.companyErpConfigId === config.id &&
                  sapSession.authenticated
                }
                onSelect={() => {
                  setSelectedConfigId(config.id);
                }}
              />
            ))}
            {configs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                No hay configuraciones ERP disponibles para esta empresa.
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          {canEditConfig ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    {isSuperAdmin
                      ? isCreatingConfig
                        ? "Nueva configuracion"
                        : "ABM superadmin"
                      : "Configuracion de tu empresa"}
                  </p>
                  <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                    Configuracion SAP Business One
                  </h3>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
                  <FiServer className="h-5 w-5" />
                </div>
              </div>

              <form onSubmit={saveConfig} className="mt-6 space-y-4">
                {isSuperAdmin ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label="Codigo"
                      name="code"
                      value={configForm.code}
                      onChange={onConfigFormChange}
                      required
                    />
                    <Field
                      label="Nombre"
                      name="name"
                      value={configForm.name}
                      onChange={onConfigFormChange}
                      required
                    />
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="CompanyDB"
                    name="dbName"
                    value={configForm.dbName}
                    onChange={onConfigFormChange}
                    placeholder="ESQUEMA_PROD"
                    required
                  />
                  <Field
                    label="Service Layer URL"
                    name="serviceLayerUrl"
                    value={configForm.serviceLayerUrl}
                    onChange={onConfigFormChange}
                    placeholder="https://172.19.0.88:50000/b1s/v2"
                    required
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Field
                    label="Usuario sistema"
                    name="userSystem"
                    value={configForm.userSystem}
                    onChange={onConfigFormChange}
                    placeholder="Usuario SAP"
                  />
                  <Field
                    label="Password sistema"
                    name="userPass"
                    type="password"
                    value={configForm.userPass}
                    onChange={onConfigFormChange}
                    placeholder={
                      selectedConfig?.hasUserPass
                        ? "Dejar en blanco para conservar"
                        : "Opcional"
                    }
                  />
                  <SelectField
                    label="TLS"
                    name="tlsVersion"
                    value={configForm.tlsVersion}
                    onChange={onConfigFormChange}
                  >
                    <option value="1.0">1.0</option>
                    <option value="1.1">1.1</option>
                    <option value="1.2">1.2</option>
                    <option value="1.3">1.3</option>
                  </SelectField>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Field
                    label="Esquema"
                    name="cmpName"
                    value={configForm.cmpName}
                    onChange={onConfigFormChange}
                    placeholder="Opcional"
                  />
                  <Field
                    label="DB user"
                    name="dbUser"
                    value={configForm.dbUser}
                    onChange={onConfigFormChange}
                    placeholder="Opcional"
                  />
                  <Field
                    label="DB password"
                    name="password"
                    type="password"
                    value={configForm.password}
                    onChange={onConfigFormChange}
                    placeholder={
                      selectedConfig?.hasPassword
                        ? "Dejar en blanco para conservar"
                        : "Opcional"
                    }
                  />
                </div>

                {isSuperAdmin ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field
                      label="Server node"
                      name="serverNode"
                      value={configForm.serverNode}
                      onChange={onConfigFormChange}
                      placeholder="Opcional"
                    />
                  </div>
                ) : null}

                {isSuperAdmin ? (
                  <div className="flex flex-wrap gap-3">
                    <CheckField
                      label="Activa"
                      name="active"
                      checked={configForm.active}
                      onChange={onConfigFormChange}
                    />
                    <CheckField
                      label="Predeterminada"
                      name="isDefault"
                      checked={configForm.isDefault}
                      onChange={onConfigFormChange}
                    />
                    <CheckField
                      label="Certificado self-signed"
                      name="allowSelfSigned"
                      checked={configForm.allowSelfSigned}
                      onChange={onConfigFormChange}
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  {isCreatingConfig ? (
                    <button
                      type="button"
                      onClick={cancelCreateConfig}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!isSuperAdmin && !selectedConfig}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    <FiSave className="h-4 w-4" />
                    {isCreatingConfig
                      ? "Crear configuracion"
                      : "Guardar configuracion"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Login SAP
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                  {selectedConfig?.name ?? "Selecciona una integracion"}
                </h3>
              </div>
              <SessionBadge
                connected={Boolean(sapSession?.authenticated)}
                label={sessionLabel}
              />
            </div>

            <form
              onSubmit={loginSap}
              className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <Field
                label="Usuario"
                name="username"
                value={loginForm.username}
                onChange={onLoginFormChange}
                placeholder={
                  selectedConfig?.userSystem
                    ? "Usa el usuario guardado"
                    : "Usuario SAP"
                }
                disabled={!selectedConfig}
              />
              <Field
                label="Password"
                name="password"
                type="password"
                value={loginForm.password}
                onChange={onLoginFormChange}
                placeholder={
                  selectedConfig?.hasUserPass
                    ? "Usa la password guardada"
                    : "Password SAP"
                }
                disabled={!selectedConfig}
              />
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!selectedConfig}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <FiLogIn className="h-4 w-4" /> Login
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>
                {sapSession?.username
                  ? `Usuario SAP: ${sapSession.username}`
                  : "Sin sesion SAP activa para esta configuracion."}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void checkSapSession()}
                  disabled={!selectedConfig}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <FiRefreshCcw className="h-4 w-4" /> Validar token
                </button>
                <button
                  type="button"
                  onClick={() => void logoutSap()}
                  disabled={!sapSession?.authenticated}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <FiLogOut className="h-4 w-4" /> Cerrar
                </button>
              </div>
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}

function ConfigTile({
  config,
  selected,
  connected,
  onSelect,
}: {
  config: CompanyErpConfig;
  selected: boolean;
  connected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-slate-900 bg-slate-900 text-white shadow-md"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">{config.name}</p>
          <p
            className={`mt-1 text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}
          >
            {config.dbName ?? "-"} | {config.serviceLayerUrl ?? "-"}
          </p>
        </div>
        {connected ? (
          <FiCheckCircle className="h-5 w-5 text-emerald-400" />
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${config.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
        >
          {config.active ? "Activa" : "Inactiva"}
        </span>
        {config.isDefault ? (
          <span className="rounded-full bg-brand-100 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">
            Default
          </span>
        ) : null}
      </div>
    </button>
  );
}

function SessionBadge({
  connected,
  label,
}: {
  connected: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
        connected
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {label}
    </span>
  );
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
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </label>
  );
}

function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        {...props}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      >
        {children}
      </select>
    </label>
  );
}

function CheckField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
      <input type="checkbox" {...props} />
      {label}
    </label>
  );
}
