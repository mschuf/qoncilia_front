import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import type { AuthUser } from "../types/auth";
import type {
  BankDeletionPreview,
  ConciliationSystem,
  CompareOperator,
  DeleteBankResponse,
  Layout,
  LayoutDataType,
  LayoutMapping,
  TemplateLayout,
  UserBankWithLayouts
} from "../types/conciliation";
import type {
  BankFormState,
  LayoutFormState,
  MappingFormRow,
  SystemFormState,
  TemplateLayoutFormState
} from "../types/pages/layout-management.types";
import { defaultBankForm, defaultSystemForm } from "../types/pages/layout-management.types";

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

function createDefaultLayoutForm(bankName = "Banco", systemId: number | "" = ""): LayoutFormState {
  return {
    systemId,
    name: "",
    description: "",
    systemLabel: "Sistema / ERP",
    bankLabel: bankName,
    autoMatchThreshold: "1",
    active: true,
    mappings: createDefaultMappings()
  };
}

function createDefaultTemplateLayoutForm(
  referenceBankName = "",
  systemId: number | "" = ""
): TemplateLayoutFormState {
  return {
    systemId,
    name: "",
    description: "",
    referenceBankName,
    systemLabel: "Sistema / ERP",
    bankLabel: referenceBankName || "Banco",
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

function templateToForm(template: TemplateLayout): TemplateLayoutFormState {
  return {
    systemId: template.systemId,
    name: template.name,
    description: template.description ?? "",
    referenceBankName: template.referenceBankName ?? "",
    systemLabel: template.systemLabel,
    bankLabel: template.bankLabel,
    autoMatchThreshold: String(template.autoMatchThreshold),
    active: template.active,
    mappings: template.mappings.map(mappingToForm)
  };
}

function systemToForm(system: ConciliationSystem): SystemFormState {
  return {
    name: system.name,
    description: system.description ?? "",
    active: system.active
  };
}

export default function useLayoutManagement() {
  const toast = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [systems, setSystems] = useState<ConciliationSystem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [templates, setTemplates] = useState<TemplateLayout[]>([]);
  const [banks, setBanks] = useState<UserBankWithLayouts[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number>(0);
  const [allUserCatalogs, setAllUserCatalogs] = useState<Map<number, UserBankWithLayouts[]>>(new Map());
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<UserBankWithLayouts | null>(null);
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TemplateLayout | null>(null);
  const [editingSystem, setEditingSystem] = useState<ConciliationSystem | null>(null);
  const [bankForm, setBankForm] = useState<BankFormState>(defaultBankForm);
  const [layoutForm, setLayoutForm] = useState<LayoutFormState>(createDefaultLayoutForm());
  const [templateForm, setTemplateForm] = useState<TemplateLayoutFormState>(
    createDefaultTemplateLayoutForm()
  );
  const [systemForm, setSystemForm] = useState<SystemFormState>(defaultSystemForm);

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
      return [];
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
    setAllUserCatalogs((prev) => {
      const next = new Map(prev);
      next.set(userId, nextBanks);
      return next;
    });
    return nextBanks;
  }, []);

  const loadAllCatalogs = useCallback(async () => {
    const nextMap = new Map<number, UserBankWithLayouts[]>();
    const userIds = users.map((user) => Number(user.id)).filter((id) => id > 0);

    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const response = await apiClient.get<UserBankWithLayouts[]>(
            `/conciliation/catalog?userId=${uid}`
          );
          nextMap.set(uid, response ?? []);
        } catch {
          nextMap.set(uid, []);
        }
      })
    );

    setAllUserCatalogs(nextMap);
  }, [users]);

  const loadSystems = useCallback(async () => {
    const response = await apiClient.get<ConciliationSystem[]>("/conciliation/sistemas");
    setSystems(response ?? []);
  }, []);

  const prepareCreateBank = useCallback((userId: number) => {
    setSelectedUserId(userId);
    setEditingBank(null);
    setBankForm(defaultBankForm);
    setBankModalOpen(true);
  }, []);

  const prepareEditBank = useCallback((userId: number, bank: UserBankWithLayouts) => {
    setSelectedUserId(userId);
    setEditingBank(bank);
    setBankForm({
      name: bank.bankName,
      alias: bank.alias ?? "",
      branch: bank.branch ?? "",
      description: bank.description ?? "",
      active: bank.active
    });
    setBankModalOpen(true);
  }, []);

  const prepareCreateLayout = useCallback((userId: number, bank: UserBankWithLayouts) => {
    setSelectedUserId(userId);
    setSelectedBankId(bank.id);
    setEditingLayout(null);
    setLayoutForm(createDefaultLayoutForm(bank.alias ?? bank.bankName, systems[0]?.id ?? ""));
    setLayoutModalOpen(true);
  }, [systems]);

  const prepareEditLayout = useCallback((userId: number, bank: UserBankWithLayouts, layout: Layout) => {
    setSelectedUserId(userId);
    setSelectedBankId(bank.id);
    setEditingLayout(layout);
    setLayoutForm({
      systemId: layout.systemId,
      name: layout.name,
      description: layout.description ?? "",
      systemLabel: layout.systemLabel,
      bankLabel: layout.bankLabel,
      autoMatchThreshold: String(layout.autoMatchThreshold),
      active: layout.active,
      mappings: layout.mappings.map(mappingToForm)
    });
    setLayoutModalOpen(true);
  }, []);

  const loadTemplates = useCallback(async () => {
    const response = await apiClient.get<TemplateLayout[]>("/conciliation/plantillas-base");
    setTemplates(response ?? []);
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

  useEffect(() => {
    void loadTemplates().catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "No se pudieron cargar las plantillas base."
      );
    });
  }, [loadTemplates, toast]);

  useEffect(() => {
    void loadSystems().catch((error) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los sistemas.");
    });
  }, [loadSystems, toast]);

  useEffect(() => {
    if (users.length === 0) {
      setAllUserCatalogs(new Map());
      return;
    }

    void loadAllCatalogs().catch((error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la vista global de bancos y plantillas."
      );
    });
  }, [loadAllCatalogs, toast, users.length]);

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

  const templateCount = templates.length;
  const systemCount = systems.length;

  const openCreateBank = () => {
    setEditingBank(null);
    setBankForm(defaultBankForm);
    setBankModalOpen(true);
  };

  const openEditBank = (bank: UserBankWithLayouts) => {
    setEditingBank(bank);
    setBankForm({
      name: bank.bankName,
      alias: bank.alias ?? "",
      branch: bank.branch ?? "",
      description: bank.description ?? "",
      active: bank.active
    });
    setBankModalOpen(true);
  };

  const openCreateLayout = (bank: UserBankWithLayouts) => {
    setSelectedBankId(bank.id);
    setEditingLayout(null);
    setLayoutForm(createDefaultLayoutForm(bank.alias ?? bank.bankName, systems[0]?.id ?? ""));
    setLayoutModalOpen(true);
  };

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(
      createDefaultTemplateLayoutForm(selectedBank?.bankName ?? "", systems[0]?.id ?? "")
    );
    setTemplateModalOpen(true);
  };

  const openEditLayout = (bank: UserBankWithLayouts, layout: Layout) => {
    setSelectedBankId(bank.id);
    setEditingLayout(layout);
    setLayoutForm({
      systemId: layout.systemId,
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

  const openEditTemplate = (template: TemplateLayout) => {
    setEditingTemplate(template);
    setTemplateForm(templateToForm(template));
    setTemplateModalOpen(true);
  };

  const openCreateSystem = () => {
    setEditingSystem(null);
    setSystemForm(defaultSystemForm);
    setSystemModalOpen(true);
  };

  const openEditSystem = (system: ConciliationSystem) => {
    setEditingSystem(system);
    setSystemForm(systemToForm(system));
    setSystemModalOpen(true);
  };

  const onBankFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof BankFormState;
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setBankForm((prev) => ({ ...prev, [key]: value }) as BankFormState);
  };

  const onLayoutFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const key = event.target.name as keyof LayoutFormState;
    const value =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : key === "systemId"
          ? (event.target.value ? Number(event.target.value) : "")
          : event.target.value;
    setLayoutForm((prev) => {
      const next = { ...prev, [key]: value } as LayoutFormState;
      if (key === "systemId") {
        const system = systems.find((item) => item.id === Number(value));
        next.systemLabel = system?.name ?? prev.systemLabel;
      }
      return next;
    });
  };

  const onTemplateFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const key = event.target.name as keyof TemplateLayoutFormState;
    const value =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : key === "systemId"
          ? (event.target.value ? Number(event.target.value) : "")
          : event.target.value;
    setTemplateForm((prev) => {
      const next = { ...prev, [key]: value } as TemplateLayoutFormState;
      if (key === "systemId") {
        const system = systems.find((item) => item.id === Number(value));
        next.systemLabel = system?.name ?? prev.systemLabel;
      }
      return next;
    });
  };

  const onSystemFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof SystemFormState;
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setSystemForm((prev) => ({ ...prev, [key]: value }) as SystemFormState);
  };

  const updateMappings = useCallback(
    <T extends LayoutFormState | TemplateLayoutFormState>(
      setter: Dispatch<SetStateAction<T>>,
      rowId: string,
      event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
      const key = event.target.name as keyof MappingFormRow;
      const value =
        event.target instanceof HTMLInputElement && event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value;
      setter((prev) =>
        ({
          ...prev,
          mappings: prev.mappings.map((item) =>
            item.id === rowId ? ({ ...item, [key]: value } as MappingFormRow) : item
          )
        }) as T
      );
    },
    []
  );

  const onMappingFieldChange = (
    rowId: string,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => updateMappings(setLayoutForm, rowId, event);

  const onTemplateMappingFieldChange = (
    rowId: string,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => updateMappings(setTemplateForm, rowId, event);

  const addMappingRow = () => {
    setLayoutForm((prev) => ({
      ...prev,
      mappings: [...prev.mappings, createMappingRow()]
    }));
  };

  const addTemplateMappingRow = () => {
    setTemplateForm((prev) => ({
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

  const resetTemplateToSuggestedMappings = () => {
    setTemplateForm((prev) => ({
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

  const removeTemplateMappingRow = (rowId: string) => {
    setTemplateForm((prev) => ({
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
    if (!layoutForm.systemId) {
      toast.error("Debes seleccionar un sistema.");
      return;
    }
    if (layoutForm.mappings.length === 0) {
      toast.error("Debes cargar al menos un mapping.");
      return;
    }
    const payload = {
      systemId: Number(layoutForm.systemId),
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
          `/conciliation/users/${selectedUserId}/banks/${selectedBankId}/plantillas/${editingLayout.id}`,
          payload
        );
        toast.success("Plantilla actualizada.");
      } else {
        await apiClient.post(
          `/conciliation/users/${selectedUserId}/banks/${selectedBankId}/plantillas`,
          payload
        );
        toast.success("Plantilla creada.");
      }
      setLayoutModalOpen(false);
      await loadCatalog(selectedUserId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la plantilla.");
    }
  };

  const saveTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!templateForm.systemId) {
      toast.error("Debes seleccionar un sistema.");
      return;
    }
    if (templateForm.mappings.length === 0) {
      toast.error("Debes cargar al menos un mapping.");
      return;
    }

    const payload = {
      systemId: Number(templateForm.systemId),
      name: templateForm.name,
      description: templateForm.description,
      referenceBankName: templateForm.referenceBankName,
      systemLabel: templateForm.systemLabel,
      bankLabel: templateForm.bankLabel,
      autoMatchThreshold: Number(templateForm.autoMatchThreshold),
      active: templateForm.active,
      mappings: templateForm.mappings.map((item, index) => ({
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
      if (editingTemplate) {
        await apiClient.patch(`/conciliation/plantillas-base/${editingTemplate.id}`, payload);
        toast.success("Plantilla base actualizada.");
      } else {
        await apiClient.post("/conciliation/plantillas-base", payload);
        toast.success("Plantilla base creada.");
      }

      setTemplateModalOpen(false);
      await loadTemplates();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar la plantilla base."
      );
    }
  };

  const saveSystem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (editingSystem) {
        await apiClient.patch(`/conciliation/sistemas/${editingSystem.id}`, systemForm);
        toast.success("Sistema actualizado.");
      } else {
        await apiClient.post("/conciliation/sistemas", systemForm);
        toast.success("Sistema creado.");
      }

      setSystemModalOpen(false);
      await loadSystems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el sistema.");
    }
  };

  const applyTemplateToSelectedBank = async (template: TemplateLayout) => {
    if (!selectedUserId || !selectedBankId) {
      toast.error("Debes seleccionar usuario y banco antes de copiar una plantilla base.");
      return;
    }

    try {
      await apiClient.post(
        `/conciliation/users/${selectedUserId}/banks/${selectedBankId}/plantillas-base/${template.id}/aplicar`,
        {}
      );
      toast.success("Plantilla base copiada al banco.");
      await loadCatalog(selectedUserId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo copiar la plantilla base al banco."
      );
    }
  };

  const deleteLayout = async (layout: Layout, explicitUserId?: number, explicitBankId?: number) => {
    const uid = explicitUserId ?? selectedUserId;
    const bid = explicitBankId ?? selectedBankId;
    if (!uid || !bid) {
      toast.error("Debes seleccionar usuario y banco.");
      return;
    }

    try {
      if (uid !== selectedUserId) {
        setSelectedUserId(uid);
      }
      await apiClient.delete(
        `/conciliation/users/${uid}/banks/${bid}/plantillas/${layout.id}`
      );
      toast.success("Plantilla eliminada.");
      await loadCatalog(uid);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la plantilla.");
    }
  };

  const deleteTemplate = async (template: TemplateLayout) => {
    try {
      await apiClient.delete(`/conciliation/plantillas-base/${template.id}`);
      toast.success("Plantilla base eliminada.");
      await loadTemplates();
      await loadCatalog(selectedUserId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar la plantilla base."
      );
    }
  };

  const deleteSystem = async (system: ConciliationSystem) => {
    try {
      await apiClient.delete(`/conciliation/sistemas/${system.id}`);
      toast.success("Sistema eliminado.");
      await loadSystems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el sistema.");
    }
  };

  const getBankDeletionPreview = async (
    userId: number,
    bankId: number
  ): Promise<BankDeletionPreview> => {
    return apiClient.get<BankDeletionPreview>(
      `/conciliation/users/${userId}/banks/${bankId}/delete-preview`
    );
  };

  const deleteBank = async (
    userId: number,
    bank: UserBankWithLayouts
  ): Promise<DeleteBankResponse> => {
    const response = await apiClient.delete<DeleteBankResponse>(
      `/conciliation/users/${userId}/banks/${bank.id}`
    );

    if (userId !== selectedUserId) {
      setSelectedUserId(userId);
    }

    await loadCatalog(userId);

    toast.success(
      `Banco eliminado. Se borraron ${response.deletedLayouts} plantilla(s), ${response.deletedAccounts} cuenta(s) y ${response.deletedReconciliations} conciliacion(es).`
    );

    return response;
  };

  return {
    users,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    systems,
    systemCount,
    templates,
    templateCount,
    banks,
    selectedBankId,
    setSelectedBankId,
    selectedBank,
    layoutCount,
    bankModalOpen,
    setBankModalOpen,
    layoutModalOpen,
    setLayoutModalOpen,
    templateModalOpen,
    setTemplateModalOpen,
    systemModalOpen,
    setSystemModalOpen,
    editingBank,
    editingLayout,
    editingTemplate,
    editingSystem,
    bankForm,
    layoutForm,
    templateForm,
    systemForm,
    allUserCatalogs,
    loadCatalog,
    loadAllCatalogs,
    loadSystems,
    loadTemplates,
    openCreateBank,
    openEditBank,
    openCreateLayout,
    openEditLayout,
    openCreateSystem,
    openEditSystem,
    openCreateTemplate,
    openEditTemplate,
    prepareCreateBank,
    prepareEditBank,
    prepareCreateLayout,
    prepareEditLayout,
    onBankFieldChange,
    onLayoutFieldChange,
    onTemplateFieldChange,
    onSystemFieldChange,
    onMappingFieldChange,
    onTemplateMappingFieldChange,
    addMappingRow,
    addTemplateMappingRow,
    resetToSuggestedMappings,
    resetTemplateToSuggestedMappings,
    removeMappingRow,
    removeTemplateMappingRow,
    saveBank,
    saveLayout,
    saveTemplate,
    saveSystem,
    applyTemplateToSelectedBank,
    getBankDeletionPreview,
    deleteBank,
    deleteLayout,
    deleteTemplate,
    deleteSystem
  };
}
