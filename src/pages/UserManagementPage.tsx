import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiKey, FiPlus, FiRefreshCw, FiUserCheck, FiUserX } from "react-icons/fi";
import AppModal from "@/AppModal";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type {
  CreateUserForm,
  ErrorLike,
  ManagedUser,
  ResetPasswordResponse,
  UserManagementFieldProps
} from "../types/pages/user-management-page.types";
import { ROLE_VALUES, type Role, roleLabel } from "../utils/role";

const formInitialState: CreateUserForm = {
  usrNombre: "",
  usrApellido: "",
  usrEmail: "",
  usrCelular: "",
  usrLogin: "",
  usrLegajo: "",
  password: "",
  role: ROLE_VALUES.gestor,
  activo: true
};

function roleToFlags(role: Role): { isAdmin: boolean; isSuperAdmin: boolean } {
  if (role === ROLE_VALUES.superadmin) {
    return { isAdmin: true, isSuperAdmin: true };
  }
  if (role === ROLE_VALUES.admin) {
    return { isAdmin: true, isSuperAdmin: false };
  }

  return { isAdmin: false, isSuperAdmin: false };
}

function resolveTargetRole(user: ManagedUser): Role {
  if (user.isSuperAdmin && user.activo) return ROLE_VALUES.superadmin;
  if (user.isAdmin && user.activo) return ROLE_VALUES.admin;
  return ROLE_VALUES.gestor;
}

export default function UserManagementPage() {
  const { role } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(formInitialState);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const notifyError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const apiError = (error ?? null) as ErrorLike | null;
      if (apiError?.code === "TOKEN_EXPIRED") return;
      toast.error(apiError?.message ?? fallbackMessage);
    },
    [toast]
  );

  const allowedRoles = useMemo<Role[]>(
    () =>
      role === ROLE_VALUES.superadmin
        ? [ROLE_VALUES.gestor, ROLE_VALUES.admin, ROLE_VALUES.superadmin]
        : [ROLE_VALUES.gestor],
    [role]
  );

  const canManageUser = useCallback(
    (targetUser: ManagedUser): boolean => {
      const targetRole = resolveTargetRole(targetUser);
      if (role === ROLE_VALUES.superadmin) return true;
      if (role === ROLE_VALUES.admin) return targetRole === ROLE_VALUES.gestor;
      return false;
    },
    [role]
  );

  const loadUsers = useCallback(async () => {
    try {
      const response = await apiClient.get<ManagedUser[]>("/users");
      setUsers(response ?? []);
    } catch (error) {
      notifyError(error, "No se pudo cargar usuarios.");
    }
  }, [notifyError]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openCreateModal = () => {
    setCreateForm({
      ...formInitialState,
      role: allowedRoles[0] ?? ROLE_VALUES.gestor,
      activo: true
    });
    setIsCreateOpen(true);
  };

  const onCreateFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const key = event.target.name as keyof CreateUserForm;

    let value: string | boolean = event.target.value;
    if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") {
      value = event.target.checked;
    }

    setCreateForm((prev) => ({ ...prev, [key]: value }) as CreateUserForm);
  };

  const onPhoneChange = (value?: string) => {
    setCreateForm((prev) => ({ ...prev, usrCelular: value || "" }));
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (createForm.usrCelular && !isValidPhoneNumber(createForm.usrCelular)) {
      toast.error("El numero de celular ingresado no es valido.");
      return;
    }

    try {
      const safeRole: Role = allowedRoles.includes(createForm.role)
        ? createForm.role
        : allowedRoles[0] ?? ROLE_VALUES.gestor;

      await apiClient.post<unknown>("/users", {
        usrNombre: createForm.usrNombre,
        usrApellido: createForm.usrApellido,
        usrEmail: createForm.usrEmail,
        usrCelular: createForm.usrCelular,
        usrLogin: createForm.usrLogin,
        usrLegajo: createForm.usrLegajo,
        password: createForm.password,
        activo: createForm.activo,
        ...roleToFlags(safeRole)
      });

      toast.success("Usuario creado correctamente.");
      setIsCreateOpen(false);
      setCreateForm(formInitialState);
      await loadUsers();
    } catch (error) {
      notifyError(error, "No se pudo crear el usuario.");
    }
  };

  const toggleActive = async (targetUser: ManagedUser) => {
    try {
      await apiClient.patch<unknown>(`/users/${targetUser.id}`, {
        activo: !targetUser.activo
      });
      toast.success("Estado actualizado.");
      await loadUsers();
    } catch (error) {
      notifyError(error, "No se pudo actualizar el estado.");
    }
  };

  const resetPassword = async (targetUser: ManagedUser) => {
    try {
      const response = await apiClient.post<ResetPasswordResponse>(
        `/users/${targetUser.id}/reset-password`,
        {}
      );
      setTemporaryPassword(response.temporaryPassword);
      toast.success(`Contrasena reseteada para ${targetUser.usrLogin}.`);
    } catch (error) {
      notifyError(error, "No se pudo resetear la contrasena.");
    }
  };

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((item) => item.activo).length,
      admins: users.filter((item) => item.isAdmin && item.activo).length,
      superadmins: users.filter((item) => item.isSuperAdmin && item.activo).length
    }),
    [users]
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
            Seguridad Operativa
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">ABM de Usuarios</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Crea accesos y controla activaciones. El superadmin define bancos y layouts; los admins
            quedan enfocados en operar conciliaciones.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <StatCard label="Usuarios" value={stats.total} />
          <StatCard label="Activos" value={stats.active} accent="emerald" />
          <StatCard label="Admins" value={stats.admins} />
          <StatCard label="Superadmins" value={stats.superadmins} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Tu rol actual es <strong>{roleLabel(role)}</strong>. Los permisos se aplican automaticamente
          por rol.
        </p>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          <FiPlus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Activo</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((targetUser) => {
                const isAllowed = canManageUser(targetUser);
                const rowRole = resolveTargetRole(targetUser);

                return (
                  <tr key={targetUser.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-4 py-3 font-semibold">{targetUser.usrLogin}</td>
                    <td className="px-4 py-3">
                      {targetUser.usrNombre
                        ? `${targetUser.usrNombre} ${targetUser.usrApellido ?? ""}`.trim()
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div>{targetUser.usrEmail ?? "-"}</div>
                      <div className="text-xs text-slate-500">{targetUser.usrCelular ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3">{roleLabel(rowRole)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          targetUser.activo
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {targetUser.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => resetPassword(targetUser)}
                          disabled={!isAllowed}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FiKey className="h-3.5 w-3.5" /> Reset pass
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(targetUser)}
                          disabled={!isAllowed}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {targetUser.activo ? (
                            <>
                              <FiUserX className="h-3.5 w-3.5" /> Desactivar
                            </>
                          ) : (
                            <>
                              <FiUserCheck className="h-3.5 w-3.5" /> Activar
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Sin usuarios aun.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AppModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Crear nuevo usuario"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              form="create-user-form"
              type="submit"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              Guardar usuario
            </button>
          </div>
        }
      >
        <form id="create-user-form" onSubmit={createUser} className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre" name="usrNombre" value={createForm.usrNombre} onChange={onCreateFieldChange} />
          <Field
            label="Apellido"
            name="usrApellido"
            value={createForm.usrApellido}
            onChange={onCreateFieldChange}
          />
          <Field
            label="Email"
            name="usrEmail"
            type="email"
            value={createForm.usrEmail}
            onChange={onCreateFieldChange}
          />

          <label className="block space-y-1.5 focus-within:text-slate-900 text-slate-700 transition-colors">
            <span className="text-sm font-semibold">Celular</span>
            <div className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all bg-white">
              <PhoneInput
                international
                defaultCountry="PY"
                value={createForm.usrCelular}
                onChange={onPhoneChange}
                className="outline-none w-full"
              />
            </div>
          </label>

          <Field
            label="Usuario (login)"
            name="usrLogin"
            value={createForm.usrLogin}
            onChange={onCreateFieldChange}
            required
          />
          <Field
            label="Legajo"
            name="usrLegajo"
            value={createForm.usrLegajo}
            onChange={onCreateFieldChange}
            required
          />
          <Field
            label="Contrasena"
            name="password"
            type="password"
            value={createForm.password}
            onChange={onCreateFieldChange}
            required
          />

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-700">Rol</span>
            <select
              name="role"
              value={createForm.role}
              onChange={onCreateFieldChange}
              className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
            >
              {allowedRoles.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleLabel(roleOption)}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="activo"
              checked={createForm.activo}
              onChange={onCreateFieldChange}
            />
            Crear usuario como activo
          </label>
        </form>
      </AppModal>

      <AppModal
        open={Boolean(temporaryPassword)}
        onClose={() => setTemporaryPassword("")}
        title="Contrasena temporal generada"
        footer={
          <button
            type="button"
            onClick={() => setTemporaryPassword("")}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            Cerrar
          </button>
        }
      >
        <p className="text-sm text-slate-600">
          Comparte esta contrasena temporal con el usuario y pedile cambiarla al ingresar.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 p-4">
          <FiRefreshCw className="h-4 w-4 text-brand-700" />
          <code className="text-lg font-bold text-brand-800">{temporaryPassword}</code>
        </div>
      </AppModal>
    </section>
  );
}

function Field({ label, required = false, ...props }: UserManagementFieldProps) {
  return (
    <label className="block space-y-1.5 focus-within:text-slate-900 text-slate-700 transition-colors">
      <span className="text-sm font-semibold">{label}</span>
      <input
        {...props}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all outline-none"
      />
    </label>
  );
}

function StatCard({
  label,
  value,
  accent = "slate"
}: {
  label: string;
  value: number;
  accent?: "slate" | "emerald";
}) {
  const colorClass =
    accent === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border p-4 ${colorClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
