import type { Role } from "./role";
import { ROLE_VALUES } from "./role";

export const APP_MODULE_VALUES = {
  home: "home",
  profile: "profile",
  conciliation: "conciliation",
  users: "users",
  layoutManagement: "layout_management",
  accessMatrix: "access_matrix",
  erpManagement: "erp_management"
} as const;

export type AppModuleCode = (typeof APP_MODULE_VALUES)[keyof typeof APP_MODULE_VALUES];

export function fallbackModulesForRole(role: Role | null | undefined): AppModuleCode[] {
  if (role === ROLE_VALUES.isSuperAdmin) {
    return [
      APP_MODULE_VALUES.home,
      APP_MODULE_VALUES.profile,
      APP_MODULE_VALUES.conciliation,
      APP_MODULE_VALUES.users,
      APP_MODULE_VALUES.layoutManagement,
      APP_MODULE_VALUES.accessMatrix,
      APP_MODULE_VALUES.erpManagement
    ];
  }

  if (role === ROLE_VALUES.admin) {
    return [
      APP_MODULE_VALUES.home,
      APP_MODULE_VALUES.profile,
      APP_MODULE_VALUES.conciliation,
      APP_MODULE_VALUES.users,
      APP_MODULE_VALUES.erpManagement
    ];
  }

  return [APP_MODULE_VALUES.home, APP_MODULE_VALUES.profile, APP_MODULE_VALUES.conciliation];
}

export function normalizeEnabledModules(
  modules: string[] | null | undefined,
  fallbackRole: Role | null | undefined
): AppModuleCode[] {
  const allowedValues = new Set<AppModuleCode>(Object.values(APP_MODULE_VALUES));
  if (Array.isArray(modules)) {
    return [...new Set(modules.filter((item): item is AppModuleCode => allowedValues.has(item as AppModuleCode)))];
  }

  return fallbackModulesForRole(fallbackRole);
}
