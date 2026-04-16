import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import type {
  AccessControlReferenceResponse,
  CompanyRoleMatrixResponse,
  PublicCompany
} from "../types/access-control";

type CompanyFormState = {
  code: string;
  name: string;
  active: boolean;
};

const initialCompanyForm: CompanyFormState = {
  code: "",
  name: "",
  active: true
};

export default function useAccessControl() {
  const toast = useToast();
  const [reference, setReference] = useState<AccessControlReferenceResponse | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(0);
  const [matrix, setMatrix] = useState<CompanyRoleMatrixResponse | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(initialCompanyForm);

  const notifyError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const message = error instanceof Error ? error.message : fallbackMessage;
      toast.error(message);
    },
    [toast]
  );

  const loadReference = useCallback(async () => {
    try {
      const response = await apiClient.get<AccessControlReferenceResponse>("/access-control/reference");
      setReference(response);
      setSelectedCompanyId((current) => current || Number(response.companies[0]?.id ?? 0));
    } catch (error) {
      notifyError(error, "No se pudo cargar referencia de accesos.");
    }
  }, [notifyError]);

  const loadMatrix = useCallback(
    async (companyId: number) => {
      if (!companyId) {
        setMatrix(null);
        return;
      }

      try {
        const response = await apiClient.get<CompanyRoleMatrixResponse>(
          `/access-control/matrix/${companyId}`
        );
        setMatrix(response);
      } catch (error) {
        notifyError(error, "No se pudo cargar la matriz de modulos.");
      }
    },
    [notifyError]
  );

  useEffect(() => {
    void loadReference();
  }, [loadReference]);

  useEffect(() => {
    void loadMatrix(selectedCompanyId);
  }, [loadMatrix, selectedCompanyId]);

  const selectedCompany = useMemo<PublicCompany | null>(() => {
    return (
      reference?.companies.find((item) => Number(item.id) === Number(selectedCompanyId)) ?? null
    );
  }, [reference?.companies, selectedCompanyId]);

  const onCompanyFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof CompanyFormState;
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setCompanyForm((prev) => ({ ...prev, [key]: value }) as CompanyFormState);
  };

  const createCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const created = await apiClient.post<PublicCompany>("/access-control/companies", companyForm);
      toast.success("Empresa creada correctamente.");
      setCompanyForm(initialCompanyForm);
      await loadReference();
      setSelectedCompanyId(created.id);
    } catch (error) {
      notifyError(error, "No se pudo crear la empresa.");
    }
  };

  const toggleModule = (roleId: number, moduleId: number) => {
    setMatrix((current) => {
      if (!current) return current;

      return {
        ...current,
        rows: current.rows.map((row) => {
          if (row.role.id !== roleId) return row;
          return {
            ...row,
            modules: row.modules.map((item) =>
              item.moduleId === moduleId ? { ...item, enabled: !item.enabled } : item
            )
          };
        })
      };
    });
  };

  const saveRoleModules = async (roleId: number) => {
    if (!matrix || !selectedCompanyId) return;

    const roleRow = matrix.rows.find((row) => row.role.id === roleId);
    if (!roleRow) return;

    try {
      const response = await apiClient.put<CompanyRoleMatrixResponse>(
        `/access-control/matrix/${selectedCompanyId}/roles/${roleId}`,
        {
          moduleStates: roleRow.modules.map((item) => ({
            moduleId: item.moduleId,
            enabled: item.enabled
          }))
        }
      );

      setMatrix(response);
      toast.success(`Modulos actualizados para ${roleRow.role.name}.`);
    } catch (error) {
      notifyError(error, "No se pudieron guardar los modulos del rol.");
    }
  };

  return {
    reference,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompany,
    matrix,
    companyForm,
    onCompanyFieldChange,
    createCompany,
    toggleModule,
    saveRoleModules,
    reloadMatrix: () => loadMatrix(selectedCompanyId)
  };
}
