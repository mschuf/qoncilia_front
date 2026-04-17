import type { ChangeEvent, FormEvent } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import AppModal from "../AppModal";
import type { PublicCompany } from "../../types/access-control";
import type { CreateUserForm } from "../../types/pages/user-management-page.types";
import type { Role } from "../../utils/role";
import { roleLabel } from "../../utils/role";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  form: CreateUserForm;
  companies: PublicCompany[];
  allowedRoles: Role[];
  onFieldChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onPhoneChange: (value?: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function CreateUserModal({
  open,
  onClose,
  form,
  companies,
  allowedRoles,
  onFieldChange,
  onPhoneChange,
  onSubmit,
}: CreateUserModalProps) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Crear nuevo usuario"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            form="create-user-form"
            type="submit"
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            Guardar usuario
          </button>
        </div>
      }
    >
      <form id="create-user-form" onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <Field label="Nombre" name="usrNombre" value={form.usrNombre} onChange={onFieldChange} />
        <Field label="Apellido" name="usrApellido" value={form.usrApellido} onChange={onFieldChange} />
        <Field label="Email" name="usrEmail" type="email" value={form.usrEmail} onChange={onFieldChange} />

        <label className="block space-y-1.5 focus-within:text-slate-900 text-slate-700 transition-colors">
          <span className="text-sm font-semibold">Celular</span>
          <div className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition-all bg-white">
            <PhoneInput
              international
              defaultCountry="PY"
              value={form.usrCelular}
              onChange={onPhoneChange}
              className="outline-none w-full"
            />
          </div>
        </label>

        <Field label="Usuario (login)" name="usrLogin" value={form.usrLogin} onChange={onFieldChange} required />
        <Field label="Legajo" name="usrLegajo" value={form.usrLegajo} onChange={onFieldChange} required />
        <Field label="Contrasena" name="password" type="password" value={form.password} onChange={onFieldChange} required />

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-700">Empresa</span>
          <select
            name="companyId"
            value={form.companyId}
            onChange={onFieldChange}
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
            required
          >
            <option value="">Seleccionar empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.code})
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-700">Rol</span>
          <select
            name="roleCode"
            value={form.roleCode}
            onChange={onFieldChange}
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
          >
            {allowedRoles.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {roleLabel(roleOption)}
              </option>
            ))}
          </select>
        </label>

        <label className="md:col-span-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="activo"
            checked={form.activo}
            onChange={onFieldChange}
          />
          Crear usuario como activo
        </label>
      </form>
    </AppModal>
  );
}

function Field({
  label,
  required = false,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-1.5 focus-within:text-slate-900 text-slate-700 transition-colors">
      <span className="text-sm font-semibold">{label}</span>
      <input
        {...props}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all outline-none"
      />
    </label>
  );
}
