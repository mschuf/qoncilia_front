import { FiPlus } from "react-icons/fi";
import CreateUserModal from "../components/UserManagement/CreateUserModal";
import StatCard from "../components/UserManagement/StatCard";
import TemporaryPasswordModal from "../components/UserManagement/TemporaryPasswordModal";
import UserTable from "../components/UserManagement/UserTable";
import useUserManagement from "../hooks/useUserManagement";
import { roleLabel } from "../utils/role";

export default function UserManagementPage() {
  const {
    role,
    users,
    companies,
    isCreateOpen,
    setIsCreateOpen,
    createForm,
    temporaryPassword,
    setTemporaryPassword,
    allowedRoles,
    canManageUser,
    openCreateModal,
    onCreateFieldChange,
    onPhoneChange,
    createUser,
    toggleActive,
    resetPassword,
    stats,
  } = useUserManagement();

  return (
    <section className="space-y-6">
      {/* Header + Stats */}
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

      {/* Toolbar */}
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

      {/* Users table */}
      <UserTable
        users={users}
        canManageUser={canManageUser}
        onToggleActive={toggleActive}
        onResetPassword={resetPassword}
      />

      {/* Modals */}
      <CreateUserModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        form={createForm}
        companies={companies}
        allowedRoles={allowedRoles}
        onFieldChange={onCreateFieldChange}
        onPhoneChange={onPhoneChange}
        onSubmit={createUser}
      />

      <TemporaryPasswordModal
        temporaryPassword={temporaryPassword}
        onClose={() => setTemporaryPassword("")}
      />
    </section>
  );
}
