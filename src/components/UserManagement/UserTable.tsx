import { FiKey, FiUserCheck, FiUserX } from "react-icons/fi";
import type { ManagedUser } from "../../types/pages/user-management-page.types";
import type { Role } from "../../utils/role";
import { roleLabel } from "../../utils/role";
import { resolveTargetRole } from "../../hooks/useUserManagement";

interface UserTableProps {
  users: ManagedUser[];
  canManageUser: (user: ManagedUser) => boolean;
  onToggleActive: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
}

export default function UserTable({
  users,
  canManageUser,
  onToggleActive,
  onResetPassword,
}: UserTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Empresa</th>
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
                  <td className="px-4 py-3">{targetUser.companyName ?? "-"}</td>
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
                        onClick={() => onResetPassword(targetUser)}
                        disabled={!isAllowed}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiKey className="h-3.5 w-3.5" /> Reset pass
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleActive(targetUser)}
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
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                  Sin usuarios aun.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
