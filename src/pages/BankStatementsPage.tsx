import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEye, FiRefreshCw, FiSave } from "react-icons/fi";
import {
  SelectBlock,
  UploadCard,
} from "../components/ConciliationWorkbench/WorkbenchControls";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { AuthUser } from "../types/auth";
import type {
  BankStatementDetail,
  BankStatementPreviewResponse,
  Layout,
  LayoutMapping,
  PreviewRow,
  UserBankWithLayouts,
} from "../types/conciliation";
import { isAdminRole } from "../utils/role";

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
  const [selectedDetail, setSelectedDetail] =
    useState<BankStatementDetail | null>(null);

  const loadUsers = useCallback(async () => {
    if (!isAdminRole(role)) return;
    const response = await apiClient.get<AuthUser[]>("/users/list");
    setUsers(response ?? []);
    setSelectedUserId((current) => current || Number(response?.[0]?.id ?? 0));
  }, [role]);

  const loadCatalog = useCallback(
    async (userId: number) => {
      const query = isAdminRole(role) && userId ? `?userId=${userId}` : "";
      const response = await apiClient.get<UserBankWithLayouts[]>(
        `/conciliation/catalog${query}`,
      );
      const nextBanks = response ?? [];
      setBanks(nextBanks);
      setSelectedBankId((current) => {
        if (current > 0 && nextBanks.some((item) => item.id === current))
          return current;
        return nextBanks[0]?.id ?? 0;
      });
    },
    [role],
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

  useEffect(() => {
    if (!selectedUserId) return;
    void loadCatalog(selectedUserId).catch((error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catalogo.",
      );
    });
  }, [loadCatalog, selectedUserId, toast]);

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
    });

    try {
      const response = await apiClient.post<BankStatementPreviewResponse>(
        "/conciliation/bank-statements/preview",
        formData,
      );
      setPreview(response);
      setSelectedDetail(null);
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
    });

    try {
      const response = await apiClient.post<BankStatementDetail>(
        "/conciliation/bank-statements",
        formData,
      );
      setSelectedDetail(response);
      setPreview(null);
      setBankFile(null);
      setStatementSuggestionSeed((current) => current + 1);
      toast.success("Extracto bancario guardado.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el extracto.",
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
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            {isAdminRole(role) ? (
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

            <SelectBlock
              label="Layout"
              value={selectedLayoutId}
              onChange={(value) => setSelectedLayoutId(Number(value))}
              options={layouts.map((item) => ({
                value: item.id,
                label: `${item.name}${item.active ? " - activa" : ""}`,
              }))}
            />

            <label className="space-y-1.5 xl:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Alias del extracto
              </span>
              <input
                value={statementName}
                onChange={(event) => setStatementName(event.target.value)}
                placeholder={suggestedStatementName || "Banco - cuenta - fecha"}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
            <UploadCard
              title="Excel del banco"
              file={bankFile}
              onChange={(event) => setBankFile(event.target.files?.[0] ?? null)}
              onClear={() => setBankFile(null)}
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Acciones
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Primero puedes visualizar las filas que se van a guardar.
                Guardar vuelve a leer el archivo y persiste solo los registros
                del banco.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void previewBankStatement()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <FiEye className="h-4 w-4" /> Visualizar
                </button>
                <button
                  type="button"
                  onClick={() => void saveBankStatement()}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700"
                >
                  <FiSave className="h-4 w-4" /> Guardar extracto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setSelectedDetail(null);
                    setBankFile(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <FiRefreshCw className="h-4 w-4" /> Limpiar
                </button>
              </div>
            </div>
          </div>
        </section>

        <RowsTable
          title={visibleTitle}
          rows={visibleRows}
          layout={visibleLayout}
        />
      </section>
    </>
  );
}

function buildStatementFormData({
  userBankId,
  companyBankAccountId,
  layoutId,
  name,
  file,
}: {
  userBankId: number;
  companyBankAccountId: number;
  layoutId: number;
  name: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("userBankId", String(userBankId));
  formData.append("companyBankAccountId", String(companyBankAccountId));
  formData.append("layoutId", String(layoutId));
  if (name.trim()) formData.append("name", name.trim());
  formData.append("file", file);
  return formData;
}

function RowsTable({
  title,
  rows,
  layout,
}: {
  title: string;
  rows: PreviewRow[];
  layout: Layout | null;
}) {
  const columns = useMemo(
    () =>
      (layout?.mappings ?? []).filter((mapping) => mapping.active).slice(0, 8),
    [layout],
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Vista de datos
          </p>
          <h3 className="mt-2 text-lg font-extrabold text-slate-900">
            {title}
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
          {rows.length} filas
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2">Fila</th>
                {columns.map((column) => (
                  <th key={column.fieldKey} className="px-3 py-2">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((row) => (
                <tr
                  key={row.rowId}
                  className="border-t border-slate-100 text-slate-700"
                >
                  <td className="px-3 py-2 font-semibold">{row.rowNumber}</td>
                  {columns.map((column) => (
                    <td key={column.fieldKey} className="px-3 py-2">
                      {formatCell(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length + 1, 1)}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    Sube un Excel y pulsa Visualizar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length > 200 ? (
        <p className="mt-3 text-xs text-slate-500">
          Se muestran las primeras 200 filas.
        </p>
      ) : null}
    </section>
  );
}

function formatCell(row: PreviewRow, column: LayoutMapping) {
  return row.values[column.fieldKey] ?? "-";
}
