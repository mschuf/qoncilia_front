import type { Role } from "../utils/role";

export interface CompanyOption {
  id: number;
  nombre: string;
}

export interface CompanySummary extends CompanyOption {
  ruc?: string | null;
}

export interface CompanyBank {
  id: number;
  bancoNombre: string;
  tipoCuenta: string;
  moneda: string;
  numeroCuenta: string;
  titular?: string | null;
  sucursal?: string | null;
  activo: boolean;
}

export interface Company extends CompanySummary {
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  activo: boolean;
  bancos: CompanyBank[];
}

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
  empresa?: CompanySummary | null;
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
  empresaId: number;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}
