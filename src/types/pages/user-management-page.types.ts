import type { InputHTMLAttributes } from "react";
import type { AuthUser } from "../auth";
import type { Role } from "../../utils/role";

export interface CreateUserForm {
  usrNombre: string;
  usrApellido: string;
  usrEmail: string;
  usrCelular: string;
  usrLogin: string;
  usrLegajo: string;
  password: string;
  empresaId: number;
  role: Role;
  activo: boolean;
}

export interface ManagedUser extends AuthUser {
  id: number | string;
  usrLogin: string;
  activo: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export interface ErrorLike {
  code?: string;
  message?: string;
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
}

export interface UserManagementFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
