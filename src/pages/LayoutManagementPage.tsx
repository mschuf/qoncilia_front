import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiBriefcase,
  FiGrid,
  FiInfo,
  FiLayers,
  FiPlus,
  FiRefreshCcw,
  FiSettings,
  FiShield,
  FiSliders,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppModal from "../components/AppModal";
import BankModal from "../components/LayoutManagement/BankModal";
import LayoutListSection from "../components/LayoutManagement/LayoutListSection";
import LayoutModal from "../components/LayoutManagement/LayoutModal";
import { MetricCard } from "../components/LayoutManagement/MetricCards";
import TemplateLayoutSection from "../components/LayoutManagement/TemplateLayoutSection";
import UserBanksSection from "../components/LayoutManagement/UserBanksSection";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useLayoutManagement from "../hooks/useLayoutManagement";
import type {
  BankDeletionPreview,
  UserBankWithLayouts,
} from "../types/conciliation";
import AdminBankingPage from "./AdminBankingPage";
import layoutDocsMarkdown from "../../docs/layouts-creacion-edicion.md?raw";
import { isSuperAdminRole } from "../utils/role";

type WorkspaceKey = "banks" | "templates" | "accounts" | "users";

type PendingDelete = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
} | null;

type PendingBankDelete = {
  userId: number;
  bank: UserBankWithLayouts;
} | null;

const workspaceOptions: Array<{
  key: WorkspaceKey;
  label: string;
  description: string;
  icon: typeof FiGrid;
}> = [
  {
    key: "users",
    label: "Usuarios y Bancos",
    description: "Vista global de todos los usuarios con sus bancos y layouts.",
    icon: FiUsers,
  },
  {
    key: "banks",
    label: "Bancos y Layouts",
    description: "Asignacion por usuario y administracion del layout aplicado.",
    icon: FiGrid,
  },
  {
    key: "templates",
    label: "Template Layouts",
    description: "Base reutilizable para copiar layouts a bancos en segundos.",
    icon: FiLayers,
  },
  {
    key: "accounts",
    label: "Cuentas Bancarias",
    description: "ABM completo de bancos y cuentas bancarias por empresa.",
    icon: FiBriefcase,
  },
];

export default function LayoutManagementPage() {
  const { role } = useAuth();

  if (!isSuperAdminRole(role)) {
    return <AdminBankingPage />;
  }

  return <SuperadminLayoutManagementPage />;
}

function SuperadminLayoutManagementPage() {
  const toast = useToast();
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceKey>("users");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [pendingBankDelete, setPendingBankDelete] = useState<PendingBankDelete>(
    null,
  );
  const [bankDeletePreview, setBankDeletePreview] =
    useState<BankDeletionPreview | null>(null);
  const [bankDeleteLoading, setBankDeleteLoading] = useState(false);
  const [bankDeleteSubmitting, setBankDeleteSubmitting] = useState(false);
  const {
    users,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
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
    editingBank,
    editingLayout,
    editingTemplate,
    bankForm,
    layoutForm,
    templateForm,
    allUserCatalogs,
    loadCatalog,
    loadAllCatalogs,
    openCreateTemplate,
    openEditTemplate,
    openCreateBank,
    openEditBank,
    openCreateLayout,
    openEditLayout,
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
    getBankDeletionPreview,
    deleteBank,
    deleteLayout,
    deleteTemplate,
  } = useLayoutManagement();

  const handleDeleteLayout = (
    layoutName: string,
    onConfirm: () => Promise<void>,
  ) => {
    setPendingDelete({
      title: "Eliminar layout",
      description: `Vas a eliminar el layout "${layoutName}". Si ya tiene conciliaciones guardadas, el sistema no lo va a permitir.`,
      confirmLabel: "Eliminar layout",
      onConfirm,
    });
  };

  const handleDeleteTemplate = (
    templateName: string,
    onConfirm: () => Promise<void>,
  ) => {
    setPendingDelete({
      title: "Eliminar template layout",
      description: `Vas a eliminar el template "${templateName}". Los layouts ya copiados a bancos siguen existiendo, pero el template deja de estar disponible.`,
      confirmLabel: "Eliminar template",
      onConfirm,
    });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const action = pendingDelete.onConfirm;
    setPendingDelete(null);
    await action();
  };

  const closeBankDeleteModal = () => {
    if (bankDeleteSubmitting) return;
    setPendingBankDelete(null);
    setBankDeletePreview(null);
    setBankDeleteLoading(false);
  };

  const handleDeleteBank = async (userId: number, bank: UserBankWithLayouts) => {
    setPendingBankDelete({ userId, bank });
    setBankDeletePreview(null);
    setBankDeleteLoading(true);

    try {
      const preview = await getBankDeletionPreview(userId, bank.id);
      setBankDeletePreview(preview);
    } catch (error) {
      setPendingBankDelete(null);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el detalle del banco a eliminar.",
      );
    } finally {
      setBankDeleteLoading(false);
    }
  };

  const confirmBankDelete = async () => {
    if (!pendingBankDelete) return;

    setBankDeleteSubmitting(true);

    try {
      await deleteBank(pendingBankDelete.userId, pendingBankDelete.bank);
      setPendingBankDelete(null);
      setBankDeletePreview(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar el banco.",
      );
    } finally {
      setBankDeleteSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
                Superadmin Studio
              </p>
              <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
                Bancos, Layouts y Templates en un solo flujo
              </h2>
            </div>

            <button
              onClick={() => setIsDocsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100"
              title="Ver documentacion"
            >
              <FiInfo className="h-4 w-4" /> INFO
            </button>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            Organiza el trabajo por usuario, banco y layout, y usa templates
            como base para copiar configuraciones repetidas. La vista cambia con
            animacion para que sea mas clara en desktop y mucho mas comoda en
            mobile.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <MetricCard
            icon={FiShield}
            label="Usuario"
            value={selectedUser?.usrLogin ?? "-"}
          />
          <MetricCard
            icon={FiLayers}
            label="Templates"
            value={String(templateCount)}
          />
          <MetricCard
            icon={FiSettings}
            label="Bancos"
            value={String(banks.length)}
          />
          <MetricCard
            icon={FiSliders}
            label="Layouts"
            value={String(layoutCount)}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[200px] flex-1 space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Usuario
                </span>
                <select
                  value={selectedUserId}
                  onChange={(event) =>
                    setSelectedUserId(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  {users.map((user) => (
                    <option key={user.id} value={Number(user.id)}>
                      {user.usrLogin}
                      {user.usrNombre ? ` - ${user.usrNombre}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-[200px] flex-1 space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Banco
                </span>
                <select
                  value={selectedBankId}
                  onChange={(event) =>
                    setSelectedBankId(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value={0}>Selecciona un banco</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.alias ?? bank.bankName}
                      {bank.branch ? ` - ${bank.branch}` : ""}
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

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={workspace}
              initial={{
                opacity: 0,
                x: workspace === "banks" || workspace === "users" ? -28 : 28,
              }}
              animate={{ opacity: 1, x: 0 }}
              exit={{
                opacity: 0,
                x: workspace === "banks" || workspace === "users" ? 28 : -28,
              }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              {workspace === "users" ? (
                <UserBanksSection
                  users={users}
                  allCatalogs={allUserCatalogs}
                  onReload={() => void loadAllCatalogs()}
                  onCreateBank={prepareCreateBank}
                  onEditBank={prepareEditBank}
                  onDeleteBank={(userId, bank) =>
                    void handleDeleteBank(userId, bank)
                  }
                  onCreateLayout={prepareCreateLayout}
                  onEditLayout={prepareEditLayout}
                  onDeleteLayout={(userId, bankId, layout) =>
                    handleDeleteLayout(layout.name, () =>
                      deleteLayout(layout, userId, bankId),
                    )
                  }
                />
              ) : workspace === "banks" ? (
                <LayoutListSection
                  selectedBank={selectedBank}
                  onEditBank={openEditBank}
                  onDeleteBank={(bank) =>
                    void handleDeleteBank(bank.userId, bank)
                  }
                  onCreateLayout={openCreateLayout}
                  onEditLayout={openEditLayout}
                  onDeleteLayout={(_bank, layout) =>
                    handleDeleteLayout(layout.name, () => deleteLayout(layout))
                  }
                />
              ) : workspace === "templates" ? (
                <TemplateLayoutSection
                  templates={templates}
                  selectedBank={selectedBank}
                  onCreateTemplate={openCreateTemplate}
                  onEditTemplate={openEditTemplate}
                  onApplyTemplate={applyTemplateToSelectedBank}
                  onDeleteTemplate={(template) =>
                    handleDeleteTemplate(template.name, () =>
                      deleteTemplate(template),
                    )
                  }
                />
              ) : (
                <AdminBankingPage />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="hidden xl:block">
            <WorkspaceTabs
              workspace={workspace}
              onChange={setWorkspace}
              compact
            />
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Contexto Actual
            </p>

            <div className="mt-4 space-y-3">
              <ContextTile
                label="Usuario"
                value={selectedUser?.usrLogin ?? "Sin usuario"}
                helper={
                  selectedUser?.usrNombre ?? "Selecciona a quien administrar"
                }
              />
              <ContextTile
                label="Banco"
                value={
                  selectedBank?.alias ?? selectedBank?.bankName ?? "Sin banco"
                }
                helper={
                  selectedBank
                    ? `${selectedBank.layouts.length} layout(s) disponibles`
                    : "Elige un banco para trabajar rapido"
                }
              />
              <ContextTile
                label="Workspace"
                value={
                  workspace === "users"
                    ? "Usuarios y Bancos"
                    : workspace === "banks"
                      ? "Bancos y Layouts"
                      : workspace === "templates"
                        ? "Template Layouts"
                        : "Cuentas Bancarias"
                }
                helper={
                  workspace === "users"
                    ? "Vista global de todos los usuarios"
                    : workspace === "banks"
                      ? "Aqui haces la asignacion operativa por usuario"
                      : workspace === "templates"
                        ? "Aqui defines las bases reutilizables"
                        : "ABM de bancos y cuentas"
                }
              />
            </div>
          </div>
        </aside>
      </div>

      <BankModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        editingBank={editingBank}
        bankForm={bankForm}
        onFieldChange={onBankFieldChange}
        onSubmit={saveBank}
      />
      <LayoutModal
        open={layoutModalOpen}
        onClose={() => setLayoutModalOpen(false)}
        editingLayout={editingLayout}
        layoutForm={layoutForm}
        onFieldChange={onLayoutFieldChange}
        onMappingFieldChange={onMappingFieldChange}
        onAddMapping={addMappingRow}
        onRemoveMapping={removeMappingRow}
        onResetMappings={resetToSuggestedMappings}
        onSubmit={saveLayout}
      />
      <LayoutModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        editingLayout={editingTemplate}
        layoutForm={templateForm}
        onFieldChange={onTemplateFieldChange}
        onMappingFieldChange={onTemplateMappingFieldChange}
        onAddMapping={addTemplateMappingRow}
        onRemoveMapping={removeTemplateMappingRow}
        onResetMappings={resetTemplateToSuggestedMappings}
        onSubmit={saveTemplate}
        entityLabel="template layout"
        submitLabel="Guardar template"
        showReferenceBankField
      />

      <AppModal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={pendingDelete?.title ?? "Confirmar accion"}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700"
            >
              {pendingDelete?.confirmLabel ?? "Eliminar"}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-600">
          {pendingDelete?.description}
        </p>
      </AppModal>

      <AppModal
        open={Boolean(pendingBankDelete)}
        onClose={closeBankDeleteModal}
        title={
          pendingBankDelete
            ? `Eliminar banco ${pendingBankDelete.bank.alias ?? pendingBankDelete.bank.bankName}`
            : "Eliminar banco"
        }
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeBankDeleteModal}
              disabled={bankDeleteSubmitting}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmBankDelete()}
              disabled={
                bankDeleteLoading ||
                bankDeleteSubmitting ||
                !pendingBankDelete ||
                !bankDeletePreview
              }
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              <FiTrash2 className="h-4 w-4" />
              {bankDeleteSubmitting ? "Eliminando..." : "Eliminar en cascada"}
            </button>
          </div>
        }
      >
        {bankDeleteLoading ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              Cargando dependencias del banco...
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>
        ) : bankDeletePreview ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-700">
                Confirmacion requerida
              </p>
              <p className="mt-2 text-sm leading-6 text-rose-900">
                Si confirmas, se eliminara el banco para el usuario{" "}
                <span className="font-bold">{bankDeletePreview.bank.userLogin}</span>.
                Tambien se borraran en cascada sus layouts, cuentas bancarias y
                conciliaciones asociadas.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <DeleteSummaryCard
                label="Layouts"
                value={String(bankDeletePreview.layouts.length)}
                helper="Configuraciones del banco"
              />
              <DeleteSummaryCard
                label="Cuentas"
                value={String(bankDeletePreview.accounts.length)}
                helper="Cuentas bancarias ligadas"
              />
              <DeleteSummaryCard
                label="Conciliaciones"
                value={String(bankDeletePreview.reconciliationCount)}
                helper="Historial que tambien se elimina"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Banco seleccionado
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-900 shadow-sm">
                  {bankDeletePreview.bank.alias ?? bankDeletePreview.bank.bankName}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                  Responsable {bankDeletePreview.bank.userLogin}
                </span>
                {bankDeletePreview.bank.branch ? (
                  <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                    Sucursal {bankDeletePreview.bank.branch}
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-3 py-1.5 font-semibold ${
                    bankDeletePreview.bank.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {bankDeletePreview.bank.active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <DeleteRecordsSection
                title="Layouts asociados"
                emptyMessage="Este banco no tiene layouts asociados."
                items={bankDeletePreview.layouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {layout.name}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          layout.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {layout.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {layout.description ?? "Sin descripcion"}
                    </p>
                  </div>
                ))}
              />

              <DeleteRecordsSection
                title="Cuentas bancarias asociadas"
                emptyMessage="Este banco no tiene cuentas bancarias asociadas."
                items={bankDeletePreview.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {account.name}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          account.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {account.active ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {account.currency} | Cuenta {account.accountNumber}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      ERP {account.bankErpId} | Mayor {account.majorAccountNumber}
                      {account.paymentAccountNumber
                        ? ` | Pago ${account.paymentAccountNumber}`
                        : ""}
                    </p>
                  </div>
                ))}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-600">
            No se pudo cargar el detalle del banco.
          </p>
        )}
      </AppModal>

      <AppModal
        open={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        title="Documentacion: Bancos y Layouts"
      >
        <div className="prose prose-slate prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {layoutDocsMarkdown}
          </ReactMarkdown>
        </div>
      </AppModal>
    </section>
  );
}

function DeleteSummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function DeleteRecordsSection({
  title,
  emptyMessage,
  items,
}: {
  title: string;
  emptyMessage: string;
  items: JSX.Element[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-extrabold text-slate-900">{title}</p>
      <div className="mt-3 space-y-3">
        {items.length > 0 ? (
          items
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}

function WorkspaceTabs({
  workspace,
  onChange,
  compact,
}: {
  workspace: WorkspaceKey;
  onChange: (value: WorkspaceKey) => void;
  compact: boolean;
}) {
  return (
    <div
      className={`rounded-[2rem] border border-slate-200 bg-white p-3 ${
        compact ? "space-y-2" : ""
      }`}
    >
      <div className={compact ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
        {workspaceOptions.map((option) => {
          const Icon = option.icon;
          const active = option.key === workspace;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-xl p-2 ${
                    active
                      ? "bg-white/15 text-white"
                      : "bg-brand-50 text-brand-700"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">{option.label}</p>
                  <p
                    className={`mt-1 text-xs leading-5 ${
                      active ? "text-white/75" : "text-slate-500"
                    }`}
                  >
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ContextTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}
