export const ROLE_VALUES = {
  gestorCobranza: "gestor_cobranza",
  gestorPagos: "gestor_pagos",
  admin: "admin",
  isSuperAdmin: "is_super_admin"
} as const;

export type Role = (typeof ROLE_VALUES)[keyof typeof ROLE_VALUES];

export interface RoleUser {
  role?: string | null;
  roleCode?: string | null;
}

export function isSuperAdminRole(role: Role | string | null | undefined): boolean {
  return role === ROLE_VALUES.isSuperAdmin;
}

export function isAdminRole(role: Role | string | null | undefined): boolean {
  return role === ROLE_VALUES.admin || role === ROLE_VALUES.isSuperAdmin;
}

export function isGestorRole(role: Role | string | null | undefined): boolean {
  return role === ROLE_VALUES.gestorCobranza || role === ROLE_VALUES.gestorPagos;
}

function isKnownRole(value: string | null | undefined): value is Role {
  return Boolean(value) && Object.values(ROLE_VALUES).includes(value as Role);
}

export function resolveRole(user: RoleUser | null | undefined): Role | null {
  if (!user) return null;

  if (isKnownRole(user.roleCode)) {
    return user.roleCode;
  }

  if (isKnownRole(user.role)) {
    return user.role;
  }

  return null;
}

export function roleLabel(role: Role | null | undefined): string {
  const labels: Record<Role, string> = {
    gestor_cobranza: "Gestor Cobranza",
    gestor_pagos: "Gestor Pagos",
    admin: "Admin",
    is_super_admin: "Super Admin"
  };

  if (!role) return labels.gestor_cobranza;
  return labels[role] ?? labels.gestor_cobranza;
}
