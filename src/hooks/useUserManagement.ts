import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { AccessControlReferenceResponse, PublicCompany } from "../types/access-control";
import type {
  CreateUserForm,
  ErrorLike,
  ManagedUser,
  ResetPasswordResponse
} from "../types/pages/user-management-page.types";
import {
  ROLE_VALUES,
  type Role,
  isAdminRole,
  isSuperAdminRole,
  resolveRole
} from "../utils/role";

const formInitialState: CreateUserForm = {
  usrNombre: "",
  usrApellido: "",
  usrEmail: "",
  usrCelular: "",
  usrLogin: "",
  usrLegajo: "",
  password: "",
  companyId: "",
  roleCode: ROLE_VALUES.gestorCobranza,
  activo: true
};

export function resolveTargetRole(user: ManagedUser): Role {
  return resolveRole(user) ?? ROLE_VALUES.gestorCobranza;
}

function normalizeSelectableRoles(
  availableRoleCodes: string[],
  actorRole: Role | null | undefined
): Role[] {
  const knownRoles = Object.values(ROLE_VALUES);
  const fromApi = availableRoleCodes.filter((item): item is Role =>
    knownRoles.includes(item as Role)
  );

  if (isSuperAdminRole(actorRole)) {
    return fromApi.length > 0 ? fromApi : knownRoles;
  }

  const gestores = new Set<Role>([ROLE_VALUES.gestorCobranza, ROLE_VALUES.gestorPagos]);
  if (fromApi.length > 0) {
    return fromApi.filter((item) => gestores.has(item));
  }

  return [...gestores];
}

export default function useUserManagement() {
  const { role, user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(formInitialState);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [availableRoleCodes, setAvailableRoleCodes] = useState<string[]>([]);

  const notifyError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const apiError = (error ?? null) as ErrorLike | null;
      if (apiError?.code === "TOKEN_EXPIRED") return;
      toast.error(apiError?.message ?? fallbackMessage);
    },
    [toast]
  );

  const allowedRoles = useMemo<Role[]>(
    () => normalizeSelectableRoles(availableRoleCodes, role),
    [availableRoleCodes, role]
  );

  const loadReference = useCallback(async () => {
    try {
      const response = await apiClient.get<AccessControlReferenceResponse>("/access-control/reference");
      setCompanies(response.companies ?? []);
      setAvailableRoleCodes((response.roles ?? []).map((item) => item.code));
    } catch (error) {
      notifyError(error, "No se pudo cargar catalogo de empresas y roles.");
    }
  }, [notifyError]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await apiClient.get<ManagedUser[]>("/users");
      setUsers(response ?? []);
    } catch (error) {
      notifyError(error, "No se pudo cargar usuarios.");
    }
  }, [notifyError]);

  useEffect(() => {
    void Promise.all([loadReference(), loadUsers()]);
  }, [loadReference, loadUsers]);

  const canManageUser = useCallback(
    (targetUser: ManagedUser): boolean => {
      const targetRole = resolveTargetRole(targetUser);

      if (isSuperAdminRole(role)) return true;

      if (role === ROLE_VALUES.admin) {
        const sameCompany = Number(targetUser.companyId ?? 0) === Number(user?.companyId ?? 0);
        return sameCompany && !isAdminRole(targetRole);
      }

      return false;
    },
    [role, user?.companyId]
  );

  const resolveDefaultCompanyId = useCallback((): number | "" => {
    if (role === ROLE_VALUES.admin && user?.companyId) {
      return Number(user.companyId);
    }

    return Number(companies[0]?.id ?? 0) || "";
  }, [companies, role, user?.companyId]);

  const openCreateModal = () => {
    setCreateForm({
      ...formInitialState,
      companyId: resolveDefaultCompanyId(),
      roleCode: allowedRoles[0] ?? ROLE_VALUES.gestorCobranza,
      activo: true
    });
    setIsCreateOpen(true);
  };

  const onCreateFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const key = event.target.name as keyof CreateUserForm;
    let value: string | boolean | number = event.target.value;

    if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") {
      value = event.target.checked;
    }

    if (key === "companyId") {
      value = value === "" ? "" : Number(value);
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

    if (!createForm.companyId) {
      toast.error("Debes seleccionar una empresa.");
      return;
    }

    try {
      const safeRole: Role = allowedRoles.includes(createForm.roleCode)
        ? createForm.roleCode
        : allowedRoles[0] ?? ROLE_VALUES.gestorCobranza;

      await apiClient.post<unknown>("/users", {
        usrNombre: createForm.usrNombre,
        usrApellido: createForm.usrApellido,
        usrEmail: createForm.usrEmail,
        usrCelular: createForm.usrCelular,
        usrLogin: createForm.usrLogin,
        usrLegajo: createForm.usrLegajo,
        password: createForm.password,
        companyId: Number(createForm.companyId),
        roleCode: safeRole,
        activo: createForm.activo
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
      admins: users.filter((item) => resolveTargetRole(item) === ROLE_VALUES.admin && item.activo).length,
      superadmins: users.filter((item) => resolveTargetRole(item) === ROLE_VALUES.isSuperAdmin && item.activo)
        .length
    }),
    [users]
  );

  const selectableCompanies = useMemo(() => {
    if (role === ROLE_VALUES.admin && user?.companyId) {
      return companies.filter((company) => company.id === Number(user.companyId));
    }

    return companies;
  }, [companies, role, user?.companyId]);

  return {
    role,
    users,
    companies: selectableCompanies,
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
    stats
  };
}
