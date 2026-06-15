import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiSave,
  FiSearch,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import {
  SelectBlock,
  UploadCard,
} from "../components/ConciliationWorkbench/WorkbenchControls";
import AppModal from "../components/AppModal";
import ConfirmModal from "../components/ConfirmModal";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useDebounce } from "../hooks/useDebounce";
import type { AuthUser } from "../types/auth";
import type {
  BankStatementDetail,
  BankStatementPreviewResponse,
  BankStatementSummary,
  DeleteBankStatementResponse,
  Layout,
  LayoutMapping,
  PaginatedResponse,
  PreviewRow,
  UserBankWithLayouts,
} from "../types/conciliation";
import { isAdminRole, isSuperAdminRole } from "../utils/role";

type SapB1ConfigStatus = {
  enabled: boolean;
  companyErpConfigId: number | null;
  companyErpConfigName: string | null;
  code: string | null;
};

type SapBankPageProcessResponse = BankStatementDetail & {
  sap?: {
    processedRows: number;
  };
};

type BankStatementPagination = {
  page: number;
  limit: number;
  total: number;
  lastPage: number;
};

function formatDateTimeTag(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function normalizeAliasSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildSuggestedStatementName(accountName?: string | null) {
  const normalizedAccountName = normalizeAliasSegment(accountName ?? "");
  return `${normalizedAccountName || "extracto"}${formatDateTimeTag(new Date())}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function BankStatementsPage() {
  const { role, user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(
    Number(user?.id ?? 0),
  );
  const [banks, setBanks] = useState<UserBankWithLayouts[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number>(0);
  const [selectedCompanyBankAccountId, setSelectedCompanyBankAccountId] =
    useState<number>(0);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number>(0);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [statementName, setStatementName] = useState("");
  const [statementSuggestionSeed, setStatementSuggestionSeed] = useState(0);
  const [lastSuggestedStatementName, setLastSuggestedStatementName] =
    useState("");
  const [preview, setPreview] = useState<BankStatementPreviewResponse | null>(
    null,
  );
  const [excludedRowIds, setExcludedRowIds] = useState<string[]>([]);
  const [selectedDetail, setSelectedDetail] =
    useState<BankStatementDetail | null>(null);
  const [bankStatements, setBankStatements] = useState<BankStatementSummary[]>(
    [],
  );
  const [bankStatementsPagination, setBankStatementsPagination] =
    useState<BankStatementPagination>({
      page: 1,
      limit: 10,
      total: 0,
      lastPage: 1,
    });
  const [deleteStatementTarget, setDeleteStatementTarget] =
    useState<BankStatementSummary | null>(null);
  const [isLoadingStatements, setIsLoadingStatements] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [sapB1ConfigStatus, setSapB1ConfigStatus] =
    useState<SapB1ConfigStatus | null>(null);

  // Cache de catalogos por usuario para evitar refetch al cambiar de usuario
  // (admin/superadmin) y volver a uno ya consultado.
  const catalogCacheRef = useRef<Map<number, UserBankWithLayouts[]>>(new Map());

  const loadUsers = useCallback(async () => {
    if (!isSuperAdminRole(role)) return;
    const response = await apiClient.get<AuthUser[]>("/users/list");
    setUsers(response ?? []);
    setSelectedUserId((current) => current || Number(response?.[0]?.id ?? 0));
  }, [role]);

  const loadCatalog = useCallback(
    async (userId: number) => {
      const cached = catalogCacheRef.current.get(userId);
      if (cached) {
        setBanks(cached);
        setSelectedBankId((current) => {
          if (current > 0 && cached.some((item) => item.id === current))
            return current;
          return cached[0]?.id ?? 0;
        });
        return;
      }

      setIsLoadingCatalog(true);
      try {
        const query = isAdminRole(role) && userId ? `?userId=${userId}` : "";
        const response = await apiClient.get<UserBankWithLayouts[]>(
          `/conciliation/catalog${query}`,
        );
        const nextBanks = response ?? [];
        catalogCacheRef.current.set(userId, nextBanks);
        setBanks(nextBanks);
        setSelectedBankId((current) => {
          if (current > 0 && nextBanks.some((item) => item.id === current))
            return current;
          return nextBanks[0]?.id ?? 0;
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el catalogo.",
        );
      } finally {
        setIsLoadingCatalog(false);
      }
    },
    [role, toast],
  );

  const loadSapB1ConfigStatus = useCallback(
    async (userId: number) => {
      if (!userId) {
        setSapB1ConfigStatus(null);
        return;
      }

      try {
        const query = isSuperAdminRole(role) ? `?userId=${userId}` : "";
        const response = await apiClient.get<SapB1ConfigStatus>(
          `/conciliation/bank-statements/sap-b1-config${query}`,
          { showBackdrop: false },
        );
        setSapB1ConfigStatus(response);
      } catch (error) {
        setSapB1ConfigStatus(null);
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo validar la configuracion SAP_B1.",
        );
      }
    },
    [role, toast],
  );

  const loadBankStatements = useCallback(
    async (targetPage = 1) => {
      if (!selectedUserId || !selectedBankId) {
        setBankStatements([]);
        setBankStatementsPagination((current) => ({
          ...current,
          page: 1,
          total: 0,
          lastPage: 1,
        }));
        return;
      }

      setIsLoadingStatements(true);
      try {
        const params = new URLSearchParams({
          userBankId: String(selectedBankId),
          page: String(targetPage),
          limit: String(bankStatementsPagination.limit),
        });

        if (isAdminRole(role)) {
          params.set("userId", String(selectedUserId));
        }

        const response = await apiClient.get<
          PaginatedResponse<BankStatementSummary>
        >(`/conciliation/bank-statements?${params.toString()}`, {
          showBackdrop: false,
        });

        setBankStatements(response.data ?? []);
        setBankStatementsPagination({
          page: response.page,
          limit: response.limit,
          total: response.total,
          lastPage: response.lastPage,
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los ultimos extractos.",
        );
      } finally {
        setIsLoadingStatements(false);
      }
    },
    [
      bankStatementsPagination.limit,
      role,
      selectedBankId,
      selectedUserId,
      toast,
    ],
  );

  useEffect(() => {
    void loadUsers().catch((error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar usuarios.",
      );
    });
  }, [loadUsers, toast]);

  // Carga automatica del catalogo para todos excepto superadmin
  useEffect(() => {
    if (!selectedUserId) return;
    if (isSuperAdminRole(role)) return; // solo superadmin usa busqueda manual
    void loadCatalog(selectedUserId);
  }, [loadCatalog, role, selectedUserId, toast]);

  useEffect(() => {
    if (!selectedUserId) return;
    if (isSuperAdminRole(role)) return;
    void loadSapB1ConfigStatus(selectedUserId);
  }, [loadSapB1ConfigStatus, role, selectedUserId]);

  useEffect(() => {
    if (isSuperAdminRole(role)) {
      setSapB1ConfigStatus(null);
    }
  }, [role, selectedUserId]);

  const selectedBank = useMemo(
    () => banks.find((item) => item.id === selectedBankId) ?? null,
    [banks, selectedBankId],
  );

  const accounts = selectedBank?.accounts ?? [];
  const layouts = selectedBank?.layouts ?? [];
  const selectedCompanyBankAccount = useMemo(
    () =>
      accounts.find((item) => item.id === selectedCompanyBankAccountId) ?? null,
    [accounts, selectedCompanyBankAccountId],
  );
  const selectedLayout = useMemo<Layout | null>(
    () =>
      layouts.find((item) => item.id === selectedLayoutId) ??
      layouts[0] ??
      null,
    [layouts, selectedLayoutId],
  );
  const hasActiveSapB1 = sapB1ConfigStatus?.enabled === true;
  const suggestedStatementName = useMemo(() => {
    return buildSuggestedStatementName(selectedCompanyBankAccount?.name);
  }, [selectedCompanyBankAccount?.name, statementSuggestionSeed]);

  useEffect(() => {
    if (!suggestedStatementName) return;

    setStatementName((current) => {
      if (!current.trim() || current === lastSuggestedStatementName) {
        return suggestedStatementName;
      }

      return current;
    });
    setLastSuggestedStatementName(suggestedStatementName);
  }, [lastSuggestedStatementName, suggestedStatementName]);

  useEffect(() => {
    setSelectedCompanyBankAccountId((current) => {
      if (current > 0 && accounts.some((item) => item.id === current))
        return current;
      return accounts[0]?.id ?? 0;
    });
  }, [accounts]);

  useEffect(() => {
    if (selectedLayout) {
      setSelectedLayoutId(selectedLayout.id);
    } else {
      setSelectedLayoutId(0);
    }
  }, [selectedLayout]);

  useEffect(() => {
    setPreview(null);
    setSelectedDetail(null);
    setExcludedRowIds([]);
  }, [selectedBankId, selectedCompanyBankAccountId, selectedLayoutId]);

  useEffect(() => {
    void loadBankStatements(1);
  }, [loadBankStatements]);

  const handleSearch = () => {
    if (!selectedUserId) {
      toast.error("Selecciona un usuario.");
      return;
    }
    void Promise.all([
      loadCatalog(selectedUserId),
      loadSapB1ConfigStatus(selectedUserId),
    ]);
  };

  const handleBankFileChange = (file: File | null) => {
    setBankFile(file);
    setPreview(null);
    setSelectedDetail(null);
    setExcludedRowIds([]);
  };

  const handleDeletePreviewRows = useCallback(
    (rowIds: string[]) => {
      if (!preview || rowIds.length === 0) return;

      const idsToDelete = new Set(rowIds);
      const nextRows = preview.rows.filter(
        (row) => !idsToDelete.has(row.rowId),
      );
      const deletedCount = preview.rows.length - nextRows.length;

      if (deletedCount === 0) return;

      setPreview({
        ...preview,
        rows: nextRows,
        rowCount: nextRows.length,
      });
      setExcludedRowIds((current) => [
        ...current,
        ...rowIds.filter((rowId) => !current.includes(rowId)),
      ]);
      toast.success(`${deletedCount} fila(s) eliminada(s) de la vista previa.`);
    },
    [preview, toast],
  );

  const openSavedStatement = async (statementId: number) => {
    try {
      const response = await apiClient.get<BankStatementDetail>(
        `/conciliation/bank-statements/${statementId}`,
      );
      setSelectedDetail(response);
      setPreview(null);
      setIsPreviewModalOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo abrir el extracto.",
      );
    }
  };

  const deleteSavedStatement = async () => {
    if (!deleteStatementTarget) return;

    try {
      await apiClient.delete<DeleteBankStatementResponse>(
        `/conciliation/bank-statements/${deleteStatementTarget.id}`,
      );
      if (selectedDetail?.id === deleteStatementTarget.id) {
        setSelectedDetail(null);
      }
      await loadBankStatements(bankStatementsPagination.page);
      toast.success("Extracto eliminado.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el extracto.",
      );
    }
  };

  const previewBankStatement = async () => {
    if (!selectedBankId || !selectedCompanyBankAccountId || !selectedLayoutId) {
      toast.error("Selecciona banco, cuenta bancaria y layout.");
      return;
    }
    if (!bankFile) {
      toast.error("Sube el Excel del extracto bancario.");
      return;
    }
    if (!statementName.trim()) {
      toast.error("Carga el alias del extracto antes de guardar.");
      return;
    }

    const formData = buildStatementFormData({
      userBankId: selectedBankId,
      companyBankAccountId: selectedCompanyBankAccountId,
      layoutId: selectedLayoutId,
      name: statementName,
      file: bankFile,
      excludedRowIds,
    });

    try {
      const response = await apiClient.post<BankStatementPreviewResponse>(
        "/conciliation/bank-statements/preview",
        formData,
      );
      setPreview(response);
      setSelectedDetail(null);
      setIsPreviewModalOpen(true);
      toast.success("Vista previa lista.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo leer el Excel.",
      );
    }
  };

  const saveBankStatement = async () => {
    if (!selectedBankId || !selectedCompanyBankAccountId || !selectedLayoutId) {
      toast.error("Selecciona banco, cuenta bancaria y layout.");
      return;
    }
    if (!bankFile) {
      toast.error("Sube el Excel del extracto bancario.");
      return;
    }

    const formData = buildStatementFormData({
      userBankId: selectedBankId,
      companyBankAccountId: selectedCompanyBankAccountId,
      layoutId: selectedLayoutId,
      name: statementName,
      file: bankFile,
      excludedRowIds,
    });

    try {
      const response = await apiClient.post<BankStatementDetail>(
        "/conciliation/bank-statements",
        formData,
      );
      setSelectedDetail(response);
      setPreview(null);
      setBankFile(null);
      setExcludedRowIds([]);
      setStatementSuggestionSeed((current) => current + 1);
      await loadBankStatements(1);
      toast.success("Extracto bancario guardado.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el extracto.",
      );
    }
  };

  const processBankStatement = async () => {
    if (!hasActiveSapB1) {
      toast.error("La empresa no tiene una configuracion SAP_B1 activa.");
      return;
    }
    if (!selectedBankId || !selectedLayoutId) {
      toast.error("Selecciona banco y layout.");
      return;
    }
    if (!selectedCompanyBankAccountId) {
      toast.error("Selecciona una cuenta bancaria para procesar.");
      return;
    }
    if (!bankFile) {
      toast.error("Sube el Excel del extracto bancario.");
      return;
    }
    if (!statementName.trim()) {
      toast.error("Carga el alias del extracto antes de procesar.");
      return;
    }

    const formData = buildStatementFormData({
      userBankId: selectedBankId,
      companyBankAccountId: selectedCompanyBankAccountId,
      layoutId: selectedLayoutId,
      name: statementName,
      file: bankFile,
      excludedRowIds,
    });

    try {
      const response = await apiClient.post<SapBankPageProcessResponse>(
        "/conciliation/bank-statements/process-sap-b1",
        formData,
      );
      setSelectedDetail(response);
      setPreview(null);
      setBankFile(null);
      setExcludedRowIds([]);
      setStatementSuggestionSeed((current) => current + 1);
      await loadBankStatements(1);
      toast.success(
        `Extracto procesado en SAP_B1 (${response.sap?.processedRows ?? response.rowCount} fila(s)).`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo procesar el extracto en SAP_B1.",
      );
    }
  };

  const visibleRows = preview?.rows ?? selectedDetail?.rows ?? [];
  const visibleLayout =
    preview?.layout ?? selectedDetail?.layout ?? selectedLayout;
  const visibleTitle = preview
    ? `Vista previa: ${preview.fileName}`
    : selectedDetail
      ? `Extracto guardado: ${selectedDetail.name}`
      : "Datos del extracto";

  return (
    <>
      <section className="space-y-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Conciliacion bancaria
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Cargar extracto con IA
          </h1>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            {isSuperAdminRole(role) ? (
              <SelectBlock
                label="Usuario"
                value={selectedUserId}
                onChange={(value) => setSelectedUserId(Number(value))}
                options={users.map((item) => ({
                  value: Number(item.id),
                  label: `${item.usrLogin}${item.usrNombre ? ` - ${item.usrNombre}` : ""}`,
                }))}
              />
            ) : null}

            <SelectBlock
              label="Banco"
              value={selectedBankId}
              onChange={(value) => setSelectedBankId(Number(value))}
              options={banks.map((item) => ({
                value: item.id,
                label: item.bankName,
              }))}
              disabled={banks.length === 0}
            />

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">
                Cuenta bancaria
              </span>
              <select
                value={selectedCompanyBankAccountId}
                onChange={(event) =>
                  setSelectedCompanyBankAccountId(Number(event.target.value))
                }
                disabled={accounts.length === 0}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {accounts.length === 0 ? (
                  <option value={0}>Sin cuentas para este banco</option>
                ) : null}
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {account.accountNumber} ({account.currency}
                    )
                  </option>
                ))}
              </select>
            </label>

            {isSuperAdminRole(role) ? (
              <button
                type="button"
                onClick={handleSearch}
                disabled={isLoadingCatalog}
                title="Buscar"
                className="inline-flex h-10 w-10 items-center justify-center self-end rounded-xl bg-slate-900 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiSearch className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
            <UploadCard
              title="Excel del banco"
              file={bankFile}
              onChange={(event) =>
                handleBankFileChange(event.target.files?.[0] ?? null)
              }
              onClear={() => handleBankFileChange(null)}
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Acciones
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {hasActiveSapB1
                  ? "SAP_B1 activo: Procesar envia el extracto a BankPages y guarda las secuencias devueltas."
                  : "Primero puedes visualizar las filas que se van a guardar. Guardar vuelve a leer el archivo y persiste solo los registros del banco."}
              </p>

              <div className="mt-4">
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Alias
                  </span>
                  <input
                    value={statementName}
                    onChange={(event) => setStatementName(event.target.value)}
                    placeholder={
                      suggestedStatementName || "Banco - cuenta - fecha"
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void previewBankStatement()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <FiEye className="h-4 w-4" /> Visualizar
                </button>
                {hasActiveSapB1 ? (
                  <button
                    type="button"
                    onClick={() => void processBankStatement()}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700"
                  >
                    <FiSend className="h-4 w-4" /> Procesar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void saveBankStatement()}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700"
                  >
                    <FiSave className="h-4 w-4" /> Guardar extracto
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Ultimos ingresos
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                Extractos guardados por banco
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                void loadBankStatements(bankStatementsPagination.page)
              }
              disabled={isLoadingStatements || !selectedBankId}
              title="Actualizar extractos"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSearch className="h-4 w-4" />
            </button>
          </div>

          <BankStatementsTable
            statements={bankStatements}
            pagination={bankStatementsPagination}
            loading={isLoadingStatements}
            onPageChange={(page) => void loadBankStatements(page)}
            onOpen={(statementId) => void openSavedStatement(statementId)}
            onDelete={(statement) => setDeleteStatementTarget(statement)}
          />
        </section>
      </section>

      <ConfirmModal
        open={Boolean(deleteStatementTarget)}
        onClose={() => setDeleteStatementTarget(null)}
        title="Eliminar extracto"
        message={
          <span>
            Seguro que quieres eliminar el extracto{" "}
            <strong>"{deleteStatementTarget?.name ?? ""}"</strong>?
            {deleteStatementTarget?.status === "sap_b1_processed"
              ? " Tambien se eliminara fila por fila en SAP_B1. Este proceso puede demorar"
              : ""}
          </span>
        }
        confirmLabel="Eliminar extracto"
        confirmVariant="danger"
        onConfirm={() => void deleteSavedStatement()}
      />

      <AppModal
        open={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={visibleTitle}
        closeOnBackdrop={false}
        widthClass="w-[70vw] max-w-[70vw]"
        contentClassName="h-[80vh] overflow-y-auto px-6 py-5"
      >
        <RowsTable
          rows={visibleRows}
          layout={visibleLayout}
          editable={Boolean(preview)}
          onDeleteRows={handleDeletePreviewRows}
        />
      </AppModal>
    </>
  );
}

function buildStatementFormData({
  userBankId,
  companyBankAccountId,
  layoutId,
  name,
  file,
  excludedRowIds = [],
}: {
  userBankId: number;
  companyBankAccountId: number;
  layoutId: number;
  name: string;
  file: File;
  excludedRowIds?: string[];
}) {
  const formData = new FormData();
  formData.append("userBankId", String(userBankId));
  formData.append("companyBankAccountId", String(companyBankAccountId));
  formData.append("layoutId", String(layoutId));
  if (name.trim()) formData.append("name", name.trim());
  if (excludedRowIds.length > 0) {
    formData.append("excludedRowIds", JSON.stringify(excludedRowIds));
  }
  formData.append("file", file);
  return formData;
}

const BankStatementsTable = memo(function BankStatementsTable({
  statements,
  pagination,
  loading,
  onPageChange,
  onOpen,
  onDelete,
}: {
  statements: BankStatementSummary[];
  pagination: BankStatementPagination;
  loading: boolean;
  onPageChange: (page: number) => void;
  onOpen: (statementId: number) => void;
  onDelete: (statement: BankStatementSummary) => void;
}) {
  const firstItem =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <section>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Extracto</th>
                <th className="px-3 py-2">Cuenta</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Filas</th>
                <th className="w-24 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {statements.map((statement) => (
                <tr
                  key={statement.id}
                  className="border-t border-slate-100 text-slate-700"
                >
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                    {formatDateTime(statement.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-900">
                      {statement.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {statement.fileName}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-900">
                      {statement.companyBankAccountName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {statement.companyBankAccountNumber} ·{" "}
                      {statement.companyBankAccountCurrency}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {statement.status === "sap_b1_processed"
                        ? "SAP_B1"
                        : "Guardado"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {statement.rowCount}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onOpen(statement.id)}
                        title="Ver extracto"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
                      >
                        <FiEye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(statement)}
                        title="Eliminar extracto"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {statements.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    {loading
                      ? "Cargando extractos..."
                      : "No hay extractos guardados para este banco."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <span>
          Mostrando {firstItem}-{lastItem} de {pagination.total}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || pagination.page <= 1}
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiChevronLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          <span>
            Pagina <strong>{pagination.page}</strong> de{" "}
            <strong>{pagination.lastPage}</strong>
          </span>
          <button
            type="button"
            disabled={loading || pagination.page >= pagination.lastPage}
            onClick={() =>
              onPageChange(Math.min(pagination.lastPage, pagination.page + 1))
            }
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente <FiChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
});

// Memo para evitar re-render por cada keystroke del search/cambio de pagina.
const RowsTable = memo(function RowsTable({
  rows,
  layout,
  editable = false,
  onDeleteRows,
}: {
  rows: PreviewRow[];
  layout: Layout | null;
  editable?: boolean;
  onDeleteRows?: (rowIds: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const columns = useMemo(
    () =>
      (layout?.mappings ?? []).filter((mapping) => mapping.active).slice(0, 8),
    [layout],
  );

  const filteredRows = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      if (String(row.rowNumber).includes(term)) return true;
      for (const column of columns) {
        const value = row.values[column.fieldKey];
        if (value != null && String(value).toLowerCase().includes(term)) {
          return true;
        }
      }
      return false;
    });
  }, [columns, debouncedSearch, rows]);

  // Reset de paginacion ante cambios de input/filas/pageSize.
  useEffect(() => {
    setPage(1);
    setSelectedRowIds([]);
  }, [debouncedSearch, rows, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * pageSize;
  const visibleRows = useMemo(
    () => filteredRows.slice(sliceStart, sliceStart + pageSize),
    [filteredRows, pageSize, sliceStart],
  );
  const selectedRowsOnPage = useMemo(
    () => visibleRows.filter((row) => selectedRowIds.includes(row.rowId)),
    [selectedRowIds, visibleRows],
  );
  const allVisibleSelected =
    visibleRows.length > 0 && selectedRowsOnPage.length === visibleRows.length;

  const toggleRowSelection = (rowId: string) => {
    setSelectedRowIds((current) =>
      current.includes(rowId)
        ? current.filter((item) => item !== rowId)
        : [...current, rowId],
    );
  };

  const toggleVisibleSelection = () => {
    const visibleIds = visibleRows.map((row) => row.rowId);
    setSelectedRowIds((current) => {
      if (allVisibleSelected) {
        return current.filter((rowId) => !visibleIds.includes(rowId));
      }

      return [
        ...current,
        ...visibleIds.filter((rowId) => !current.includes(rowId)),
      ];
    });
  };

  const deleteRows = (rowIds: string[]) => {
    onDeleteRows?.(rowIds);
    setSelectedRowIds((current) =>
      current.filter((rowId) => !rowIds.includes(rowId)),
    );
  };

  return (
    <section>
      {rows.length > 0 ? (
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar en las filas..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm cursor-pointer"
          >
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
            <option value={200}>200 por página</option>
          </select>
          {editable ? (
            <button
              type="button"
              disabled={selectedRowIds.length === 0}
              onClick={() => deleteRows(selectedRowIds)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiTrash2 className="h-4 w-4" />
              Eliminar ({selectedRowIds.length})
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                {editable ? (
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleVisibleSelection}
                      aria-label="Seleccionar filas visibles"
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                ) : null}
                <th className="px-3 py-2">Fila</th>
                {columns.map((column) => (
                  <th key={column.fieldKey} className="px-3 py-2">
                    {column.label}
                  </th>
                ))}
                {editable ? <th className="w-12 px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.rowId}
                  className="border-t border-slate-100 text-slate-700"
                >
                  {editable ? (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.includes(row.rowId)}
                        onChange={() => toggleRowSelection(row.rowId)}
                        aria-label={`Seleccionar fila ${row.rowNumber}`}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                  ) : null}
                  <td className="px-3 py-2 font-semibold">{row.rowNumber}</td>
                  {columns.map((column) => (
                    <td key={column.fieldKey} className="px-3 py-2">
                      {formatCell(row, column)}
                    </td>
                  ))}
                  {editable ? (
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteRows([row.rowId])}
                        title={`Eliminar fila ${row.rowNumber}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length + (editable ? 3 : 1), 1)}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    Sube un Excel y pulsa Visualizar.
                  </td>
                </tr>
              ) : null}
              {rows.length > 0 && filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length + (editable ? 3 : 1), 1)}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    Sin resultados para "{debouncedSearch}".
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRows.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span>
            Mostrando {sliceStart + 1}-
            {Math.min(sliceStart + pageSize, filteredRows.length)} de{" "}
            {filteredRows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold transition hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
            >
              <FiChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <span>
              Página <strong>{safePage}</strong> de{" "}
              <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold transition hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
            >
              Siguiente <FiChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
});

function formatCell(row: PreviewRow, column: LayoutMapping) {
  return row.values[column.fieldKey] ?? "-";
}
