import type { ChangeEvent, FormEvent } from "react";
import AppModal from "../AppModal";
import type { BankFormState } from "../../types/pages/layout-management.types";
import type { UserBankWithLayouts } from "../../types/conciliation";
import { InputField } from "./FormFields";
import { ModalActions } from "./MetricCards";

interface BankModalProps {
  open: boolean;
  onClose: () => void;
  editingBank: UserBankWithLayouts | null;
  bankForm: BankFormState;
  onFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function BankModal({
  open,
  onClose,
  editingBank,
  bankForm,
  onFieldChange,
  onSubmit
}: BankModalProps) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={editingBank ? "Editar banco" : "Asignar banco"}
      footer={<ModalActions formId="bank-layout-form" label="Guardar banco" onCancel={onClose} />}
    >
      <form id="bank-layout-form" onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <InputField label="Banco" name="bankName" value={bankForm.bankName} onChange={onFieldChange} required />
        <InputField label="Alias" name="alias" value={bankForm.alias} onChange={onFieldChange} />
        <InputField label="Moneda" name="currency" value={bankForm.currency} onChange={onFieldChange} required />
        <InputField label="Numero de cuenta" name="accountNumber" value={bankForm.accountNumber} onChange={onFieldChange} />
        <label className="md:col-span-2 space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">Descripcion</span>
          <input name="description" value={bankForm.description} onChange={onFieldChange} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none" />
        </label>
        <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
          <input type="checkbox" name="active" checked={bankForm.active} onChange={onFieldChange} />
          Banco activo para el usuario
        </label>
      </form>
    </AppModal>
  );
}
