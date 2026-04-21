import { useState } from "react";
import { FiInfo, FiLayers, FiPlus, FiRefreshCcw, FiShield, FiSliders } from "react-icons/fi";
import AppModal from "../components/AppModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import layoutDocsMarkdown from "../../docs/layouts-creacion-edicion.md?raw";
import BankListSection from "../components/LayoutManagement/BankListSection";
import BankModal from "../components/LayoutManagement/BankModal";
import LayoutListSection from "../components/LayoutManagement/LayoutListSection";
import LayoutModal from "../components/LayoutManagement/LayoutModal";
import { MetricCard } from "../components/LayoutManagement/MetricCards";
import TemplateLayoutSection from "../components/LayoutManagement/TemplateLayoutSection";
import useLayoutManagement from "../hooks/useLayoutManagement";

export default function LayoutManagementPage() {
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
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
    loadCatalog,
    openCreateTemplate,
    openEditTemplate,
    openCreateBank,
    openEditBank,
    openCreateLayout,
    openEditLayout,
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
    applyTemplateToSelectedBank
  } = useLayoutManagement();

  return (
    <section className="space-y-6">
      {/* Header + Metrics */}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-600">
              Superadmin Studio
            </p>
            <button
              onClick={() => setIsDocsModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100"
              title="Ver documentación"
            >
              <FiInfo className="h-4 w-4" /> INFO
            </button>
          </div>
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
          <MetricCard icon={FiLayers} label="Templates" value={String(templateCount)} />
          <MetricCard icon={FiLayers} label="Bancos" value={String(banks.length)} />
          <MetricCard icon={FiSliders} label="Layouts" value={String(layoutCount)} />
        </div>
      </div>

      <TemplateLayoutSection
        templates={templates}
        selectedBank={selectedBank}
        onCreateTemplate={openCreateTemplate}
        onEditTemplate={openEditTemplate}
        onApplyTemplate={applyTemplateToSelectedBank}
      />

      {/* User selector toolbar */}
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

      {/* Banks + Layouts side by side */}
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <BankListSection
          banks={banks}
          selectedBankId={selectedBankId}
          onSelectBank={setSelectedBankId}
        />
        <LayoutListSection
          selectedBank={selectedBank}
          onEditBank={openEditBank}
          onCreateLayout={openCreateLayout}
          onEditLayout={openEditLayout}
        />
      </div>

      {/* Modals */}
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
        open={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        title="Documentación: Bancos y Layouts"
      >
        <div className="prose prose-slate prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{layoutDocsMarkdown}</ReactMarkdown>
        </div>
      </AppModal>
    </section>
  );
}
