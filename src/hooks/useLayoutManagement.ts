import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import type { AuthUser } from "../types/auth";
import type {
  BankDeletionPreview,
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
  TemplateLayoutFormState
} from "../types/pages/layout-management.types";
import { defaultBankForm } from "../types/pages/layout-management.types";

type CompanyOption = {
  id: number;
  name: string;
  representativeUserId: number;
  users: AuthUser[];
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
    amountMode: "",
    active: true,
    mappings: createDefaultMappings()
  };
}

function createDefaultTemplateLayoutForm(
  referenceBankName = ""
): TemplateLayoutFormState {
  return {
    name: "",
    description: "",
    referenceBankName,
    systemLabel: "Sistema / ERP",
    bankLabel: referenceBankName || "Banco",
    autoMatchThreshold: "1",
    amountMode: "",
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
    name: template.name,
    description: template.description ?? "",
    referenceBankName: template.referenceBankName ?? "",
    systemLabel: template.systemLabel,
    bankLabel: template.bankLabel,
    autoMatchThreshold: String(template.autoMatchThreshold),
    amountMode: template.amountMode ?? "",
    active: template.active,
    mappings: template.mappings.map(mappingToForm)
  };
}

export default function useLayoutManagement() {
  const toast = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [actionUserId, setActionUserId] = useState<number>(0);
  const [templates, setTemplates] = useState<TemplateLayout[]>([]);
  const [banks, setBanks] = useState<UserBankWithLayouts[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number>(0);
  const [allUserCatalogs, setAllUserCatalogs] = useState<Map<number, UserBankWithLayouts[]>>(new Map());
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<UserBankWithLayouts | null>(null);
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TemplateLayout | null>(null);
  const [bankForm, setBankForm] = useState<BankFormState>(defaultBankForm);
  const [layoutForm, setLayoutForm] = useState<LayoutFormState>(createDefaultLayoutForm());
  const [templateForm, setTemplateForm] = useState<TemplateLayoutFormState>(
    createDefaultTemplateLayoutForm()
  );

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

  const prepareCreateBank = useCallback((userId: number) => {
    setSelectedUserId(userId);
    setActionUserId(userId);
    setEditingBank(null);
    setBankForm(defaultBankForm);
    setBankModalOpen(true);
  }, []);

  const prepareEditBank = useCallback((userId: number, bank: UserBankWithLayouts) => {
    setSelectedUserId(userId);
    setActionUserId(bank.userId || userId);
    setEditingBank(bank);
    setBankForm({
      name: bank.bankName,
      branch: bank.branch ?? "",
      description: bank.description ?? "",
      active: bank.active
    });
    setBankModalOpen(true);
  }, []);

  const prepareCreateLayout = useCallback((userId: number, bank: UserBankWithLayouts) => {
    setSelectedUserId(userId);
    setActionUserId(bank.userId || userId);
    setSelectedBankId(bank.id);
    setEditingLayout(null);
    setLayoutForm(createDefaultLayoutForm(bank.bankName));
    setLayoutModalOpen(true);
  }, []);

  const prepareEditLayout = useCallback((userId: number, bank: UserBankWithLayouts, layout: Layout) => {
    setSelectedUserId(userId);
    setActionUserId(bank.userId || userId);
    setSelectedBankId(bank.id);
    setEditingLayout(layout);
    setLayoutForm({
      name: layout.name,
      description: layout.description ?? "",
      systemLabel: layout.systemLabel,
      bankLabel: layout.bankLabel,
      autoMatchThreshold: String(layout.autoMatchThreshold),
      amountMode: layout.amountMode ?? "",
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

  const companyOptions = useMemo<CompanyOption[]>(() => {
    const byCompany = new Map<number, CompanyOption>();

    for (const user of users) {
      const companyId = Number(user.companyId ?? 0);
      if (!companyId) continue;

      const current = byCompany.get(companyId);
      if (current) {
        current.users.push(user);
        continue;
      }

      byCompany.set(companyId, {
        id: companyId,
        name: user.companyName ?? `Empresa ${companyId}`,
        representativeUserId: Number(user.id),
        users: [user]
      });
    }

    return [...byCompany.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [users]);

  const selectedUser = useMemo(
    () => users.find((item) => Number(item.id) === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const selectedCompany = useMemo(() => {
    if (selectedUser?.companyId) {
      const bySelectedUser = companyOptions.find(
        (company) => company.id === Number(selectedUser.companyId)
      );
      if (bySelectedUser) return bySelectedUser;
    }

    return companyOptions[0] ?? null;
  }, [companyOptions, selectedUser?.companyId]);

  const selectedCompanyId = selectedCompany?.id ?? 0;

  const setSelectedCompanyId = useCallback(
    (companyId: number) => {
      const company = companyOptions.find((item) => item.id === companyId);
      setSelectedUserId(company?.representativeUserId ?? 0);
      setActionUserId(company?.representativeUserId ?? 0);
    },
    [companyOptions]
  );

  const selectedBank = useMemo(
    () => banks.find((item) => item.id === selectedBankId) ?? null,
    [banks, selectedBankId]
  );

  const selectedUserAvailableTemplateIds = useMemo(
    () => banks[0]?.availableTemplateIds ?? [],
    [banks]
  );

  const layoutCount = useMemo(
    () => banks.reduce((total, bank) => total + bank.layouts.length, 0),
    [banks]
  );

  const templateCount = templates.length;

  const openCreateBank = () => {
    setActionUserId(selectedUserId);
    setEditingBank(null);
    setBankForm(defaultBankForm);
    setBankModalOpen(true);
  };

  const openEditBank = (bank: UserBankWithLayouts) => {
    setActionUserId(bank.userId || selectedUserId);
    setEditingBank(bank);
    setBankForm({
      name: bank.bankName,
      branch: bank.branch ?? "",
      description: bank.description ?? "",
      active: bank.active
    });
    setBankModalOpen(true);
  };

  const openCreateLayout = (bank: UserBankWithLayouts) => {
    setActionUserId(bank.userId || selectedUserId);
    setSelectedBankId(bank.id);
    setEditingLayout(null);
    setLayoutForm(createDefaultLayoutForm(bank.bankName));
    setLayoutModalOpen(true);
  };

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(createDefaultTemplateLayoutForm(selectedBank?.bankName ?? ""));
    setTemplateModalOpen(true);
  };

  const openEditLayout = (bank: UserBankWithLayouts, layout: Layout) => {
    setActionUserId(bank.userId || selectedUserId);
    setSelectedBankId(bank.id);
    setEditingLayout(layout);
    setLayoutForm({
      name: layout.name,
      description: layout.description ?? "",
      systemLabel: layout.systemLabel,
      bankLabel: layout.bankLabel,
      autoMatchThreshold: String(layout.autoMatchThreshold),
      amountMode: layout.amountMode ?? "",
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
        : event.target.value;
    setLayoutForm((prev) => ({ ...prev, [key]: value }) as LayoutFormState);
  };

  const onTemplateFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const key = event.target.name as keyof TemplateLayoutFormState;
    const value =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setTemplateForm((prev) => ({ ...prev, [key]: value }) as TemplateLayoutFormState);
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
    const targetUserId = editingBank?.userId || actionUserId || selectedUserId;
    if (!targetUserId) {
      toast.error("Debes seleccionar una empresa.");
      return;
    }
    try {
      if (editingBank) {
        await apiClient.patch(
          `/conciliation/users/${targetUserId}/banks/${editingBank.id}`,
          bankForm
        );
        toast.success("Banco actualizado.");
      } else {
        await apiClient.post(`/conciliation/users/${targetUserId}/banks`, bankForm);
        toast.success("Banco asignado.");
      }
      setBankModalOpen(false);
      await loadCatalog(selectedUserId || targetUserId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el banco.");
    }
  };

  const saveLayout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetUserId = actionUserId || selectedBank?.userId || selectedUserId;
    if (!targetUserId || !selectedBankId) {
      toast.error("Debes seleccionar empresa y banco.");
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
      amountMode: layoutForm.amountMode === "" ? null : layoutForm.amountMode,
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
          `/conciliation/users/${targetUserId}/banks/${selectedBankId}/plantillas/${editingLayout.id}`,
          payload
        );
        toast.success("Plantilla actualizada.");
      } else {
        await apiClient.post(
          `/conciliation/users/${targetUserId}/banks/${selectedBankId}/plantillas`,
          payload
        );
        toast.success("Plantilla creada.");
      }
      setLayoutModalOpen(false);
      await loadCatalog(selectedUserId || targetUserId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la plantilla.");
    }
  };

  const saveTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (templateForm.mappings.length === 0) {
      toast.error("Debes cargar al menos un mapping.");
      return;
    }

    const payload = {
      name: templateForm.name,
      description: templateForm.description,
      referenceBankName: templateForm.referenceBankName,
      systemLabel: templateForm.systemLabel,
      bankLabel: templateForm.bankLabel,
      autoMatchThreshold: Number(templateForm.autoMatchThreshold),
      amountMode: templateForm.amountMode === "" ? null : templateForm.amountMode,
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

  const setUserAvailableTemplates = async (
    userId: number,
    templateLayoutIds: number[]
  ) => {
    try {
      await apiClient.put(
        `/conciliation/users/${userId}/plantillas-base/disponibles`,
        { templateLayoutIds }
      );
      toast.success("Plantillas habilitadas actualizadas.");
      await Promise.all([loadCatalog(userId), loadAllCatalogs()]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar las plantillas habilitadas para la empresa."
      );
      throw error;
    }
  };

  const applyTemplateToSelectedBank = async (template: TemplateLayout) => {
    const targetUserId = selectedBank?.userId || selectedUserId;
    if (!targetUserId || !selectedBankId) {
      toast.error("Debes seleccionar empresa y banco antes de copiar una plantilla base.");
      return;
    }

    try {
      await apiClient.post(
        `/conciliation/users/${targetUserId}/banks/${selectedBankId}/plantillas-base/${template.id}/aplicar`,
        {}
      );
      toast.success("Plantilla base copiada al banco.");
      await loadCatalog(selectedUserId || targetUserId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo copiar la plantilla base al banco."
      );
    }
  };

  const deleteLayout = async (layout: Layout, explicitUserId?: number, explicitBankId?: number) => {
    const currentBank = banks.find((item) => item.id === (explicitBankId ?? selectedBankId));
    const uid = explicitUserId ?? currentBank?.userId ?? actionUserId ?? selectedUserId;
    const bid = explicitBankId ?? selectedBankId;
    if (!uid || !bid) {
      toast.error("Debes seleccionar empresa y banco.");
      return;
    }

    try {
      await apiClient.delete(
        `/conciliation/users/${uid}/banks/${bid}/plantillas/${layout.id}`
      );
      toast.success("Plantilla eliminada.");
      await loadCatalog(selectedUserId || uid);
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
    const ownerUserId = bank.userId || userId;
    const response = await apiClient.delete<DeleteBankResponse>(
      `/conciliation/users/${ownerUserId}/banks/${bank.id}`
    );

    await loadCatalog(selectedUserId || ownerUserId);

    toast.success(
      `Banco eliminado. Se borraron ${response.deletedLayouts} plantilla(s), ${response.deletedAccounts} cuenta(s) y ${response.deletedBankStatements} extracto(s).`
    );

    return response;
  };

  return {
    users,
    companyOptions,
    selectedCompany,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    templates,
    templateCount,
    banks,
    selectedBankId,
    setSelectedBankId,
    selectedBank,
    selectedUserAvailableTemplateIds,
    layoutCount,
    bankModalOpen,
    setBankModalOpen,
    layoutModalOpen,
    setLayoutModalOpen,
    templateModalOpen,
    setTemplateModalOpen,
    editingBank,
    editingLayout,
    editingTemplate,
    bankForm,
    layoutForm,
    templateForm,
    allUserCatalogs,
    loadCatalog,
    loadAllCatalogs,
    loadTemplates,
    openCreateBank,
    openEditBank,
    openCreateLayout,
    openEditLayout,
    openCreateTemplate,
    openEditTemplate,
    prepareCreateBank,
    prepareEditBank,
    prepareCreateLayout,
    prepareEditLayout,
    onBankFieldChange,
    onLayoutFieldChange,
    onTemplateFieldChange,
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
    applyTemplateToSelectedBank,
    setUserAvailableTemplates,
    getBankDeletionPreview,
    deleteBank,
    deleteLayout,
    deleteTemplate
  };
}
