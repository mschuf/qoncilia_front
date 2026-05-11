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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
