import type { Role } from "../utils/role";

export interface AuthUser {
  id?: number | string;
  usrNombre?: string | null;
  usrApellido?: string | null;
  usrEmail?: string | null;
  usrCelular?: string | null;
  usrLogin?: string | null;
  usrLegajo?: string | null;
  role?: Role | string | null;
  activo?: boolean | null;
  isAdmin?: boolean | null;
  isSuperAdmin?: boolean | null;
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
  usrLegajo: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}
