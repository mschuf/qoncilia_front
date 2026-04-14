export const ROLE_VALUES = {
  gestor: "gestor",
  admin: "admin",
  superadmin: "superadmin"
} as const;

export type Role = (typeof ROLE_VALUES)[keyof typeof ROLE_VALUES];

export interface RoleUser {
  role?: string | null;
  activo?: boolean | null;
  isAdmin?: boolean | null;
  isSuperAdmin?: boolean | null;
}

export function resolveRole(user: RoleUser | null | undefined): Role | null {
  if (!user) return null;

  if (user.role && Object.values(ROLE_VALUES).includes(user.role as Role)) {
    return user.role as Role;
  }

  const isActive = Boolean(user.activo);
  if (isActive && Boolean(user.isSuperAdmin)) {
    return ROLE_VALUES.superadmin;
  }
  if (isActive && Boolean(user.isAdmin)) {
    return ROLE_VALUES.admin;
  }

  return ROLE_VALUES.gestor;
}

export function roleLabel(role: Role | null | undefined): string {
  const labels: Record<Role, string> = {
    gestor: "Gestor",
    admin: "Admin",
    superadmin: "Superadmin"
  };

  if (!role) return labels.gestor;
  return labels[role] ?? labels.gestor;
}
