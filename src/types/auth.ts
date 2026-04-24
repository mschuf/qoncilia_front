import type { Role } from "../utils/role";

export interface AuthUser {
  id?: number | string;
  usrNombre?: string | null;
  usrApellido?: string | null;
  usrEmail?: string | null;
  usrCelular?: string | null;
  usrLogin?: string | null;
  usrLegajo?: string | null;
  roleId?: number | null;
  roleCode?: Role | string | null;
  roleName?: string | null;
  companyId?: number | null;
  companyCode?: string | null;
  companyName?: string | null;
  enabledModules?: string[] | null;
  role?: Role | string | null;
  activo?: boolean | null;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  usrNombre?: string;
  usrApellido?: string;
  usrEmail?: string;
  usrCelular?: string;
  usrLogin: string;
  usrLegajo?: string;
  password: string;
  companyId?: number;
  roleCode?: Role;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}
