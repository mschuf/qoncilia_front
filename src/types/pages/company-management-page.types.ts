export interface CompanyForm {
  nombre: string;
  ruc: string;
  email: string;
  telefono: string;
  direccion: string;
  activo: boolean;
}

export interface CompanyBankForm {
  bancoNombre: string;
  tipoCuenta: string;
  moneda: string;
  numeroCuenta: string;
  titular: string;
  sucursal: string;
  activo: boolean;
}
