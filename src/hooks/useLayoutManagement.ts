import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { BankFormState, LayoutFormState, MappingFormRow } from "../types/pages/layout-management.types";
import { defaultBankForm } from "../types/pages/layout-management.types";

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

export default function useLayoutManagement() {
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
    const response = await apiClient.get<AuthUser[]>("/users/list");
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

  return {
    users,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    banks,
    selectedBankId,
    setSelectedBankId,
    selectedBank,
    layoutCount,
    bankModalOpen,
    setBankModalOpen,
    layoutModalOpen,
    setLayoutModalOpen,
    editingBank,
    editingLayout,
    bankForm,
    layoutForm,
    loadCatalog,
    openCreateBank,
    openEditBank,
    openCreateLayout,
    openEditLayout,
    onBankFieldChange,
    onLayoutFieldChange,
    onMappingFieldChange,
    addMappingRow,
    resetToSuggestedMappings,
    removeMappingRow,
    saveBank,
    saveLayout
  };
}
