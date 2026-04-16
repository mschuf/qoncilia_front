import type { ReactNode } from "react";
import type { AuthUser, LoginPayload, LoginResponse, RegisterPayload } from "../auth";
import type { Role } from "../../utils/role";
import type { AppModuleCode } from "../../utils/modules";

export interface LogoutOptions {
  showToast?: boolean;
}

export interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  role: Role | null;
  enabledModules: AppModuleCode[];
  isAuthenticated: boolean;
  hasModule: (moduleCode: AppModuleCode) => boolean;
  login: (payload: LoginPayload) => Promise<LoginResponse>;
  logout: (options?: LogoutOptions) => void;
  register: (payload: RegisterPayload) => Promise<unknown>;
  clearSession: () => void;
  updateUser: (user: AuthUser) => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}
