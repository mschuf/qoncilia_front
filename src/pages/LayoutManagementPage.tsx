import type {
  ChangeEvent,
  ComponentType,
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes
} from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiEdit3,
  FiLayers,
  FiPlus,
  FiRefreshCcw,
  FiShield,
  FiSliders
} from "react-icons/fi";
import AppModal from "@/AppModal";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import type { AuthUser } from "../types/auth";
import type {
  CompareOperator,
  Layout,
  LayoutDataType,
  LayoutMapping,
  UserBankWithLayouts
} from "../types/conciliation";

type MappingFormRow = {
  id: string;
  fieldKey: string;
  label: string;
  active: boolean;
  required: boolean;
  compareOperator: CompareOperator;
  weight: string;
  tolerance: string;
  sortOrder: string;
  systemSheet: string;
  systemColumn: string;
  systemStartRow: string;
  systemEndRow: string;
  systemDataType: LayoutDataType;
  bankSheet: string;
  bankColumn: string;
  bankStartRow: string;
  bankEndRow: string;
  bankDataType: LayoutDataType;
};

type BankFormState = {
  bankName: string;
  alias: string;
  currency: string;
  accountNumber: string;
  description: string;
  active: boolean;
};

type LayoutFormState = {
  name: string;
  description: string;
  systemLabel: string;
  bankLabel: string;
  autoMatchThreshold: string;
  active: boolean;
  mappings: MappingFormRow[];
};

const compareOperatorOptions: Array<{ value: CompareOperator; label: string }> = [
  { value: "equals", label: "Igual" },
  { value: "contains", label: "Contiene" },
  { value: "starts_with", label: "Empieza con" },
  { value: "ends_with", label: "Termina con" },
  { value: "numeric_equals", label: "Numero igual" },
  { value: "date_equals", label: "Fecha igual" }
];

const dataTypeOptions: Array<{ value: LayoutDataType; label: string }> = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Numero" },
  { value: "amount", label: "Monto" },
  { value: "date", label: "Fecha" }
];

const defaultBankForm: BankFormState = {
  bankName: "",
  alias: "",
  currency: "GS",
  accountNumber: "",
  description: "",
  active: true
};

function createMappingRow(
  fieldKey = "",
  label = "",
  compareOperator: CompareOperator = "equals",
  required = false,
  dataType: LayoutDataType = "text"
): MappingFormRow {
  return {
    id: `mapping-${Math.random().toString(36).slice(2, 10)}`,
    fieldKey,
    label,
    active: true,
    required,
    compareOperator,
    weight: required ? "2" : "1",
    tolerance: "",
    sortOrder: "",
    systemSheet: "",
    systemColumn: "",
    systemStartRow: "",
    systemEndRow: "",
    systemDataType: dataType,
    bankSheet: "",
    bankColumn: "",
    bankStartRow: "",
    bankEndRow: "",
    bankDataType: dataType
  };
}

function createDefaultMappings(): MappingFormRow[] {
  return [
    createMappingRow("fecha", "Fecha", "date_equals", true, "date"),
    createMappingRow("descripcion", "Descripcion", "contains", false, "text"),
    createMappingRow("monto", "Monto", "numeric_equals", true, "amount"),
    createMappingRow("referencia", "Referencia", "contains", false, "text")
  ];
}

function createDefaultLayoutForm(bankName = "Banco"): LayoutFormState {
  return {
    name: "",
    description: "",
    systemLabel: "Sistema / ERP",
    bankLabel: bankName,
    autoMatchThreshold: "1",
    active: true,
    mappings: createDefaultMappings()
  };
}

function mappingToForm(mapping: LayoutMapping): MappingFormRow {
  return {
    id: String(mapping.id),
    fieldKey: mapping.fieldKey,
    label: mapping.label,
    active: mapping.active,
    required: mapping.required,
    compareOperator: mapping.compareOperator,
    weight: String(mapping.weight),
    tolerance: mapping.tolerance !== null ? String(mapping.tolerance) : "",
    sortOrder: String(mapping.sortOrder),
    systemSheet: mapping.systemSheet ?? "",
    systemColumn: mapping.systemColumn ?? "",
    systemStartRow: mapping.systemStartRow !== null ? String(mapping.systemStartRow) : "",
    systemEndRow: mapping.systemEndRow !== null ? String(mapping.systemEndRow) : "",
    systemDataType: mapping.systemDataType,
    bankSheet: mapping.bankSheet ?? "",
    bankColumn: mapping.bankColumn ?? "",
    bankStartRow: mapping.bankStartRow !== null ? String(mapping.bankStartRow) : "",
    bankEndRow: mapping.bankEndRow !== null ? String(mapping.bankEndRow) : "",
    bankDataType: mapping.bankDataType
  };
}

export default function LayoutManagementPage() {
  const toast = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [banks, setBanks] = useState<UserBankWithLayouts[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number>(0);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<UserBankWithLayouts | null>(null);
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null);
  const [bankForm, setBankForm] = useState<BankFormState>(defaultBankForm);
  const [layoutForm, setLayoutForm] = useState<LayoutFormState>(createDefaultLayoutForm());

  const loadUsers = useCallback(async () => {
    const response = await apiClient.get<AuthUser[]>("/users");
    const nextUsers = response ?? [];
    setUsers(nextUsers);
    setSelectedUserId((current) => {
      if (current > 0 && nextUsers.some((item) => Number(item.id) === current)) {
        return current;
      }

      return Number(nextUsers[0]?.id ?? 0);
    });
  }, []);

  const loadCatalog = useCallback(async (userId: number) => {
    if (!userId) {
      setBanks([]);
      setSelectedBankId(0);
      return;
    }

    const response = await apiClient.get<UserBankWithLayouts[]>(
      `/conciliation/catalog?userId=${userId}`
    );
    const nextBanks = response ?? [];
    setBanks(nextBanks);
    setSelectedBankId((current) => {
      if (current > 0 && nextBanks.some((item) => item.id === current)) {
        return current;
      }

      return nextBanks[0]?.id ?? 0;
    });
  }, []);

  useEffect(() => {
    void loadUsers().catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar usuarios.");
    });
  }, [loadUsers, toast]);

  useEffect(() => {
    void loadCatalog(selectedUserId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catalogo.");
    });
  }, [loadCatalog, selectedUserId, toast]);

  const selectedUser = useMemo(
    () => users.find((item) => Number(item.id) === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const selectedBank = useMemo(
    () => banks.find((item) => item.id === selectedBankId) ?? null,
    [banks, selectedBankId]
  );

  const layoutCount = useMemo(
    () => banks.reduce((total, bank) => total + bank.layouts.length, 0),
    [banks]
  );

  const openCreateBank = () => {
    setEditingBank(null);
    setBankForm(defaultBankForm);
    setBankModalOpen(true);
  };

  const openEditBank = (bank: UserBankWithLayouts) => {
    setEditingBank(bank);
    setBankForm({
      bankName: bank.bankName,
      alias: bank.alias ?? "",
      currency: bank.currency,
      accountNumber: bank.accountNumber ?? "",
      description: bank.description ?? "",
      active: bank.active
    });
    setBankModalOpen(true);
  };

  const openCreateLayout = (bank: UserBankWithLayouts) => {
    setSelectedBankId(bank.id);
    setEditingLayout(null);
    setLayoutForm(createDefaultLayoutForm(bank.alias ?? bank.bankName));
    setLayoutModalOpen(true);
  };

  const openEditLayout = (bank: UserBankWithLayouts, layout: Layout) => {
    setSelectedBankId(bank.id);
    setEditingLayout(layout);
    setLayoutForm({
      name: layout.name,
      description: layout.description ?? "",
      systemLabel: layout.systemLabel,
      bankLabel: layout.bankLabel,
      autoMatchThreshold: String(layout.autoMatchThreshold),
      active: layout.active,
      mappings: layout.mappings.map(mappingToForm)
    });
    setLayoutModalOpen(true);
  };

  const onBankFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof BankFormState;
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setBankForm((prev) => ({ ...prev, [key]: value }) as BankFormState);
  };

  const onLayoutFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof LayoutFormState;
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setLayoutForm((prev) => ({ ...prev, [key]: value }) as LayoutFormState);
  };

  const onMappingFieldChange = (
    rowId: string,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const key = event.target.name as keyof MappingFormRow;
    const value =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setLayoutForm((prev) => ({
      ...prev,
      mappings: prev.mappings.map((item) =>
        item.id === rowId ? ({ ...item, [key]: value } as MappingFormRow) : item
      )
    }));
  };

  const addMappingRow = () => {
    setLayoutForm((prev) => ({
      ...prev,
      mappings: [...prev.mappings, createMappingRow()]
    }));
  };

  const resetToSuggestedMappings = () => {
    setLayoutForm((prev) => ({
      ...prev,
      mappings: createDefaultMappings()
    }));
  };

  const removeMappingRow = (rowId: string) => {
    setLayoutForm((prev) => ({
      ...prev,
      mappings: prev.mappings.filter((item) => item.id !== rowId)
    }));
  };

  const saveBank = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUserId) {
      toast.error("Debes seleccionar un usuario.");
      return;
    }

    try {
      if (editingBank) {
        await apiClient.patch(
          `/conciliation/users/${selectedUserId}/banks/${editingBank.id}`,
          bankForm
        );
        toast.success("Banco actualizado.");
      } else {
        await apiClient.post(`/conciliation/users/${selectedUserId}/banks`, bankForm);
        toast.success("Banco asignado.");
      }

      setBankModalOpen(false);
      await loadCatalog(selectedUserId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el banco.");
    }
  };

  const saveLayout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUserId || !selectedBankId) {
      toast.error("Debes seleccionar usuario y banco.");
      return;
    }

    if (layoutForm.mappings.length === 0) {
      toast.error("Debes cargar al menos un mapping.");
      return;
    }

    const payload = {
      name: layoutForm.name,
      description: layoutForm.description,
      systemLabel: layoutForm.systemLabel,
      bankLabel: layoutForm.bankLabel,
      autoMatchThreshold: Number(layoutForm.autoMatchThreshold),
      active: layoutForm.active,
      mappings: layoutForm.mappings.map((item, index) => ({
        fieldKey: item.fieldKey,
        label: item.label,
        active: item.active,
        required: item.required,
        compareOperator: item.compareOperator,
        weight: Number(item.weight || 0),
        tolerance: item.tolerance.trim() ? Number(item.tolerance) : undefined,
        sortOrder: Number(item.sortOrder || index),
        systemSheet: item.systemSheet || undefined,
        systemColumn: item.systemColumn || undefined,
        systemStartRow: item.systemStartRow.trim() ? Number(item.systemStartRow) : undefined,
        systemEndRow: item.systemEndRow.trim() ? Number(item.systemEndRow) : undefined,
        systemDataType: item.systemDataType,
        bankSheet: item.bankSheet || undefined,
        bankColumn: item.bankColumn || undefined,
        bankStartRow: item.bankStartRow.trim() ? Number(item.bankStartRow) : undefined,
        bankEndRow: item.bankEndRow.trim() ? Number(item.bankEndRow) : undefined,
        bankDataType: item.bankDataType
      }))
    };

    try {
      if (editingLayout) {
        await apiClient.patch(
          `/conciliation/users/${selectedUserId}/banks/${selectedBankId}/layouts/${editingLayout.id}`,
          payload
        );
        toast.success("Layout actualizado.");
      } else {
        await apiClient.post(
          `/conciliation/users/${selectedUserId}/banks/${selectedBankId}/layouts`,
          payload
        );
        toast.success("Layout creado.");
      }

      setLayoutModalOpen(false);
      await loadCatalog(selectedUserId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el layout.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
            Superadmin Studio
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
            Bancos y Layouts por Usuario
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Define qué bancos le pertenecen a cada usuario y cómo se leen ambos Excel. Cada banco
            puede tener varios layouts, pero uno solo activo.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <MetricCard icon={FiShield} label="Usuario" value={selectedUser?.usrLogin ?? "-"} />
          <MetricCard icon={FiLayers} label="Bancos" value={String(banks.length)} />
          <MetricCard icon={FiSliders} label="Layouts" value={String(layoutCount)} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[280px] flex-1 space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Usuario</span>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              {users.map((user) => (
                <option key={user.id} value={Number(user.id)}>
                  {user.usrLogin} {user.usrNombre ? `· ${user.usrNombre}` : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void loadCatalog(selectedUserId)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FiRefreshCcw className="h-4 w-4" /> Recargar
          </button>

          <button
            type="button"
            onClick={openCreateBank}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            <FiPlus className="h-4 w-4" /> Asignar banco
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-extrabold text-slate-900">Bancos del usuario</h3>
          <p className="mt-1 text-sm text-slate-500">Selecciona un banco para ver o editar sus layouts.</p>
          <div className="mt-4 space-y-3">
            {banks.map((bank) => (
              <button
                key={bank.id}
                type="button"
                onClick={() => setSelectedBankId(bank.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedBankId === bank.id
                    ? "border-brand-400 bg-brand-50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {bank.alias ?? bank.bankName}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {bank.bankName} · {bank.currency} · {bank.accountNumber ?? "Sin cuenta"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      bank.active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {bank.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                    {bank.layouts.length} layouts
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                    usuario {bank.userLogin}
                  </span>
                </div>
                {bank.description ? <p className="mt-3 text-sm text-slate-600">{bank.description}</p> : null}
              </button>
            ))}
            {banks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Este usuario todavia no tiene bancos asignados.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {selectedBank ? `Layouts de ${selectedBank.alias ?? selectedBank.bankName}` : "Layouts"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Podes usar columnas como <code>E|F</code> para Debito/Credito.
              </p>
            </div>

            {selectedBank ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditBank(selectedBank)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <FiEdit3 className="h-4 w-4" /> Editar banco
                </button>
                <button
                  type="button"
                  onClick={() => openCreateLayout(selectedBank)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <FiPlus className="h-4 w-4" /> Nuevo layout
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            {(selectedBank?.layouts ?? []).map((layout) => (
              <article
                key={layout.id}
                className={`rounded-2xl border p-4 ${
                  layout.active ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">{layout.name}</h4>
                      {layout.active ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Activo
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{layout.description ?? "Sin descripcion"}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => selectedBank && openEditLayout(selectedBank, layout)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
                  >
                    <FiEdit3 className="h-4 w-4" /> Editar
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MetricTile label="Sistema" value={layout.systemLabel} />
                  <MetricTile label="Banco" value={layout.bankLabel} />
                  <MetricTile label="Threshold" value={layout.autoMatchThreshold.toFixed(2)} />
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 uppercase tracking-[0.12em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Campo</th>
                          <th className="px-3 py-2 text-left">Operador</th>
                          <th className="px-3 py-2 text-left">Sistema</th>
                          <th className="px-3 py-2 text-left">Banco</th>
                        </tr>
                      </thead>
                      <tbody>
                        {layout.mappings.map((mapping) => (
                          <tr key={mapping.id} className="border-t border-slate-100 text-slate-600">
                            <td className="px-3 py-2 font-semibold text-slate-800">{mapping.label}</td>
                            <td className="px-3 py-2">{mapping.compareOperator}</td>
                            <td className="px-3 py-2">{`${mapping.systemSheet ?? "-"} / ${mapping.systemColumn ?? "-"}`}</td>
                            <td className="px-3 py-2">{`${mapping.bankSheet ?? "-"} / ${mapping.bankColumn ?? "-"}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            ))}

            {!selectedBank ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Selecciona un banco para crear o editar layouts.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <AppModal open={bankModalOpen} onClose={() => setBankModalOpen(false)} title={editingBank ? "Editar banco" : "Asignar banco"} footer={<ModalActions formId="bank-layout-form" label="Guardar banco" onCancel={() => setBankModalOpen(false)} />}>
        <form id="bank-layout-form" onSubmit={saveBank} className="grid gap-3 md:grid-cols-2">
          <InputField label="Banco" name="bankName" value={bankForm.bankName} onChange={onBankFieldChange} required />
          <InputField label="Alias" name="alias" value={bankForm.alias} onChange={onBankFieldChange} />
          <InputField label="Moneda" name="currency" value={bankForm.currency} onChange={onBankFieldChange} required />
          <InputField label="Numero de cuenta" name="accountNumber" value={bankForm.accountNumber} onChange={onBankFieldChange} />
          <label className="md:col-span-2 space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Descripcion</span>
            <input name="description" value={bankForm.description} onChange={onBankFieldChange} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none" />
          </label>
          <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="active" checked={bankForm.active} onChange={onBankFieldChange} />
            Banco activo para el usuario
          </label>
        </form>
      </AppModal>

      <AppModal open={layoutModalOpen} onClose={() => setLayoutModalOpen(false)} title={editingLayout ? "Editar layout" : "Crear layout"} footer={<ModalActions formId="layout-form" label="Guardar layout" onCancel={() => setLayoutModalOpen(false)} />}>
        <form id="layout-form" onSubmit={saveLayout} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Nombre" name="name" value={layoutForm.name} onChange={onLayoutFieldChange} required />
            <InputField label="Threshold auto-match" name="autoMatchThreshold" value={layoutForm.autoMatchThreshold} onChange={onLayoutFieldChange} required />
            <InputField label="Etiqueta sistema" name="systemLabel" value={layoutForm.systemLabel} onChange={onLayoutFieldChange} required />
            <InputField label="Etiqueta banco" name="bankLabel" value={layoutForm.bankLabel} onChange={onLayoutFieldChange} required />
            <label className="md:col-span-2 space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Descripcion</span>
              <input name="description" value={layoutForm.description} onChange={onLayoutFieldChange} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none" />
            </label>
            <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" name="active" checked={layoutForm.active} onChange={onLayoutFieldChange} />
              Dejar este layout activo
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
              <div>
                <h4 className="text-base font-bold text-slate-900">Mappings de campos</h4>
                <p className="text-sm text-slate-500">Configura hojas, columnas y rangos de ambos Excel.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={resetToSuggestedMappings} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Base sugerida</button>
                <button type="button" onClick={addMappingRow} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800">Agregar fila</button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {layoutForm.mappings.map((mapping, index) => (
                <div key={mapping.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h5 className="text-sm font-bold text-slate-800">Campo #{index + 1}</h5>
                    <button type="button" onClick={() => removeMappingRow(mapping.id)} className="text-xs font-semibold text-rose-600 transition hover:text-rose-700">Quitar</button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InputField label="fieldKey" name="fieldKey" value={mapping.fieldKey} onChange={(event) => onMappingFieldChange(mapping.id, event)} required />
                    <InputField label="Label" name="label" value={mapping.label} onChange={(event) => onMappingFieldChange(mapping.id, event)} required />
                    <SelectField label="Operador" name="compareOperator" value={mapping.compareOperator} onChange={(event) => onMappingFieldChange(mapping.id, event)} options={compareOperatorOptions} />
                    <InputField label="Peso" name="weight" value={mapping.weight} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                    <InputField label="Tolerancia" name="tolerance" value={mapping.tolerance} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                    <InputField label="Orden" name="sortOrder" value={mapping.sortOrder} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                    <CheckField label="Activo" name="active" checked={mapping.active} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                    <CheckField label="Requerido" name="required" checked={mapping.required} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <SideCard title={layoutForm.systemLabel || "Sistema"}>
                      <InputField label="Hoja" name="systemSheet" value={mapping.systemSheet} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                      <InputField label="Columna" name="systemColumn" value={mapping.systemColumn} onChange={(event) => onMappingFieldChange(mapping.id, event)} hint="Ej: A o E|F" />
                      <InputField label="Fila inicio" name="systemStartRow" value={mapping.systemStartRow} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                      <InputField label="Fila fin" name="systemEndRow" value={mapping.systemEndRow} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                      <SelectField label="Tipo" name="systemDataType" value={mapping.systemDataType} onChange={(event) => onMappingFieldChange(mapping.id, event)} options={dataTypeOptions} />
                    </SideCard>
                    <SideCard title={layoutForm.bankLabel || "Banco"}>
                      <InputField label="Hoja" name="bankSheet" value={mapping.bankSheet} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                      <InputField label="Columna" name="bankColumn" value={mapping.bankColumn} onChange={(event) => onMappingFieldChange(mapping.id, event)} hint="Ej: B o E|F" />
                      <InputField label="Fila inicio" name="bankStartRow" value={mapping.bankStartRow} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                      <InputField label="Fila fin" name="bankEndRow" value={mapping.bankEndRow} onChange={(event) => onMappingFieldChange(mapping.id, event)} />
                      <SelectField label="Tipo" name="bankDataType" value={mapping.bankDataType} onChange={(event) => onMappingFieldChange(mapping.id, event)} options={dataTypeOptions} />
                    </SideCard>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </AppModal>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand-50 p-3 text-brand-700"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 font-semibold text-slate-700">{value}</p></div>;
}

function ModalActions({ formId, label, onCancel }: { formId: string; label: string; onCancel: () => void }) {
  return <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancelar</button><button form={formId} type="submit" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-700">{label}</button></div>;
}

function InputField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className="space-y-1.5"><span className="text-sm font-semibold text-slate-700">{label}</span><input {...props} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none" />{hint ? <p className="text-xs text-slate-400">{hint}</p> : null}</label>;
}

function SelectField({ label, options, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Array<{ value: string; label: string }> }) {
  return <label className="space-y-1.5"><span className="text-sm font-semibold text-slate-700">{label}</span><select {...props} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function CheckField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" {...props} />{label}</label>;
}

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</p><div className="mt-4 grid gap-3">{children}</div></div>;
}
