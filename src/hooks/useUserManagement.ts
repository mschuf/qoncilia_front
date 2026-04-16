import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type {
  CreateUserForm,
  ErrorLike,
  ManagedUser,
  ResetPasswordResponse,
} from "../types/pages/user-management-page.types";
import { ROLE_VALUES, type Role } from "../utils/role";

const formInitialState: CreateUserForm = {
  usrNombre: "",
  usrApellido: "",
  usrEmail: "",
  usrCelular: "",
  usrLogin: "",
  usrLegajo: "",
  password: "",
  role: ROLE_VALUES.gestor,
  activo: true,
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

export function resolveTargetRole(user: ManagedUser): Role {
  if (user.isSuperAdmin && user.activo) return ROLE_VALUES.superadmin;
  if (user.isAdmin && user.activo) return ROLE_VALUES.admin;
  return ROLE_VALUES.gestor;
}

export default function useUserManagement() {
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
    [toast],
  );

  const allowedRoles = useMemo<Role[]>(
    () =>
      role === ROLE_VALUES.superadmin
        ? [ROLE_VALUES.gestor, ROLE_VALUES.admin, ROLE_VALUES.superadmin]
        : [ROLE_VALUES.gestor],
    [role],
  );

  const canManageUser = useCallback(
    (targetUser: ManagedUser): boolean => {
      const targetRole = resolveTargetRole(targetUser);
      if (role === ROLE_VALUES.superadmin) return true;
      if (role === ROLE_VALUES.admin) return targetRole === ROLE_VALUES.gestor;
      return false;
    },
    [role],
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
      activo: true,
    });
    setIsCreateOpen(true);
  };

  const onCreateFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const key = event.target.name as keyof CreateUserForm;
    let value: string | boolean = event.target.value;
    if (
      event.target instanceof HTMLInputElement &&
      event.target.type === "checkbox"
    ) {
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
        ...roleToFlags(safeRole),
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
        activo: !targetUser.activo,
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
        {},
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
      superadmins: users.filter((item) => item.isSuperAdmin && item.activo)
        .length,
    }),
    [users],
  );

  return {
    role,
    users,
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
  };
}
