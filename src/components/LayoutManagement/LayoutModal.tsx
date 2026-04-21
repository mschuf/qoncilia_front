import type { ChangeEvent, FormEvent } from "react";
import { FiX } from "react-icons/fi";
import useEscapeKey from "../../hooks/useEscapeKey";
import type { Layout, TemplateLayout } from "../../types/conciliation";
import type {
  LayoutFormState,
  TemplateLayoutFormState
} from "../../types/pages/layout-management.types";
import {
  compareOperatorOptions,
  dataTypeOptions,
} from "../../types/pages/layout-management.types";
import { CheckField, InputField, SelectField } from "./FormFields";
import SideCard from "./SideCard";

interface LayoutModalProps {
  open: boolean;
  onClose: () => void;
  editingLayout: Layout | TemplateLayout | null;
  layoutForm: LayoutFormState | TemplateLayoutFormState;
  onFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMappingFieldChange: (
    rowId: string,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onAddMapping: () => void;
  onRemoveMapping: (rowId: string) => void;
  onResetMappings: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  entityLabel?: string;
  submitLabel?: string;
  showReferenceBankField?: boolean;
}

export default function LayoutModal({
  open,
  onClose,
  editingLayout,
  layoutForm,
  onFieldChange,
  onMappingFieldChange,
  onAddMapping,
  onRemoveMapping,
  onResetMappings,
  onSubmit,
  entityLabel = "layout",
  submitLabel = "Guardar layout",
  showReferenceBankField = false,
}: LayoutModalProps) {
  useEscapeKey(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/40 p-4 md:p-6 lg:p-8"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-7xl flex-col rounded-2xl bg-white shadow-glow max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] lg:max-h-[calc(100vh-4rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 lg:px-8">
          <h3 className="text-lg font-bold text-slate-800">
            {editingLayout ? `Editar ${entityLabel}` : `Crear ${entityLabel}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar modal"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
          <form id="layout-form" onSubmit={onSubmit} className="space-y-8">
            {/* Basic info section */}
            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">
                Informacion general
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InputField
                  label="Nombre"
                  name="name"
                  value={layoutForm.name}
                  onChange={onFieldChange}
                  required
                />
                {showReferenceBankField && "referenceBankName" in layoutForm ? (
                  <InputField
                    label="Banco referencia"
                    name="referenceBankName"
                    value={layoutForm.referenceBankName}
                    onChange={onFieldChange}
                  />
                ) : null}
                <InputField
                  label="Threshold auto-match"
                  name="autoMatchThreshold"
                  value={layoutForm.autoMatchThreshold}
                  onChange={onFieldChange}
                  required
                />
                <InputField
                  label="Etiqueta sistema"
                  name="systemLabel"
                  value={layoutForm.systemLabel}
                  onChange={onFieldChange}
                  required
                />
                <InputField
                  label="Etiqueta banco"
                  name="bankLabel"
                  value={layoutForm.bankLabel}
                  onChange={onFieldChange}
                  required
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Descripcion
                  </span>
                  <input
                    name="description"
                    value={layoutForm.description}
                    onChange={onFieldChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="active"
                    checked={layoutForm.active}
                    onChange={onFieldChange}
                  />
                  Dejar este layout activo
                </label>
              </div>
            </div>

            {/* Mappings section */}
            <div className="rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 lg:px-6">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Mappings de campos
                  </h4>
                  <p className="text-sm text-slate-500">
                    Configura hojas, columnas y rangos de ambos Excel.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onResetMappings}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Base sugerida
                  </button>
                  <button
                    type="button"
                    onClick={onAddMapping}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Agregar fila
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-5 lg:p-6">
                {layoutForm.mappings.map((mapping, index) => (
                  <div
                    key={mapping.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:p-6"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h5 className="text-sm font-bold text-slate-800">
                        Campo #{index + 1}
                      </h5>
                      <button
                        type="button"
                        onClick={() => onRemoveMapping(mapping.id)}
                        className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                      <InputField
                        label="fieldKey"
                        name="fieldKey"
                        value={mapping.fieldKey}
                        onChange={(event) =>
                          onMappingFieldChange(mapping.id, event)
                        }
                        required
                      />
                      <InputField
                        label="Label"
                        name="label"
                        value={mapping.label}
                        onChange={(event) =>
                          onMappingFieldChange(mapping.id, event)
                        }
                        required
                      />
                      <SelectField
                        label="Operador"
                        name="compareOperator"
                        value={mapping.compareOperator}
                        onChange={(event) =>
                          onMappingFieldChange(mapping.id, event)
                        }
                        options={compareOperatorOptions}
                      />
                      <InputField
                        label="Peso"
                        name="weight"
                        value={mapping.weight}
                        onChange={(event) =>
                          onMappingFieldChange(mapping.id, event)
                        }
                      />
                      <InputField
                        label="Tolerancia"
                        name="tolerance"
                        value={mapping.tolerance}
                        onChange={(event) =>
                          onMappingFieldChange(mapping.id, event)
                        }
                      />
                      <InputField
                        label="Orden"
                        name="sortOrder"
                        value={mapping.sortOrder}
                        onChange={(event) =>
                          onMappingFieldChange(mapping.id, event)
                        }
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4">
                      <CheckField
                        label="Activo"
                        name="active"
                        checked={mapping.active}
                        onChange={(event) =>
                          onMappingFieldChange(mapping.id, event)
                        }
                      />
                      <CheckField
                        label="Requerido"
                        name="required"
                        checked={mapping.required}
                        onChange={(event) =>
                          onMappingFieldChange(mapping.id, event)
                        }
                      />
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                      <SideCard title={layoutForm.systemLabel || "Sistema"}>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <InputField
                            label="Hoja"
                            name="systemSheet"
                            value={mapping.systemSheet}
                            onChange={(event) =>
                              onMappingFieldChange(mapping.id, event)
                            }
                          />
                          <InputField
                            label="Columna"
                            name="systemColumn"
                            value={mapping.systemColumn}
                            onChange={(event) =>
                              onMappingFieldChange(mapping.id, event)
                            }
                            hint="Ej: A o E|F"
                          />
                          <InputField
                            label="Fila inicio"
                            name="systemStartRow"
                            value={mapping.systemStartRow}
                            onChange={(event) =>
                              onMappingFieldChange(mapping.id, event)
                            }
                          />
                          <InputField
                            label="Fila fin"
                            name="systemEndRow"
                            value={mapping.systemEndRow}
                            onChange={(event) =>
                              onMappingFieldChange(mapping.id, event)
                            }
                          />
                          <SelectField
                            label="Tipo"
                            name="systemDataType"
                            value={mapping.systemDataType}
                            onChange={(event) =>
                              onMappingFieldChange(mapping.id, event)
                            }
                            options={dataTypeOptions}
                          />
                        </div>
                      </SideCard>
                      <SideCard title={layoutForm.bankLabel || "Banco"}>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <InputField
                            label="Hoja"
                            name="bankSheet"
                            value={mapping.bankSheet}
                            onChange={(event) =>
                              onMappingFieldChange(mapping.id, event)
                            }
                          />
                          <InputField
                            label="Columna"
                            name="bankColumn"
                            value={mapping.bankColumn}
                            onChange={(event) =>
                              onMappingFieldChange(mapping.id, event)
                            }
                            hint="Ej: B o E|F"
                          />
                          <InputField
                            label="Fila inicio"
                            name="bankStartRow"
                            value={mapping.bankStartRow}
                            onChange={(event) =>
                              onMappingFieldChange(mapping.id, event)
                            }
                          />
                          <InputField
                            label="Fila fin"
                            name="bankEndRow"
                            value={mapping.bankEndRow}
                            onChange={(event) =>
                              onMappingFieldChange(mapping.id, event)
                            }
                          />
                          <SelectField
                            label="Tipo"
                            name="bankDataType"
                            value={mapping.bankDataType}
                            onChange={(event) =>
                              onMappingFieldChange(mapping.id, event)
                            }
                            options={dataTypeOptions}
                          />
                        </div>
                      </SideCard>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 lg:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            form="layout-form"
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
