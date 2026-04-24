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
import useLayoutManagement from "../hooks/useLayoutManagement";
import AdminBankingPage from "./AdminBankingPage";
import layoutDocsMarkdown from "../../docs/layouts-creacion-edicion.md?raw";
import { isSuperAdminRole } from "../utils/role";

type WorkspaceKey = "banks" | "templates" | "accounts" | "users";

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
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceKey>("users");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
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
