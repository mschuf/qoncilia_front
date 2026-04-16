import type {
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { apiClient } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { AuthUser } from "../types/auth";
import { isSuperAdminRole } from "../utils/role";
import type {
  ConciliationKpis,
  Layout,
  LayoutMapping,
  PreviewMatch,
  PreviewResponse,
  PreviewRow,
  UserBankWithLayouts,
} from "../types/conciliation";

function createManualMatch(
  mappings: LayoutMapping[],
  systemRow: PreviewRow,
  bankRow: PreviewRow,
): PreviewMatch {
  const activeMappings = mappings.filter((item) => item.active);
  let totalWeight = 0;
  let matchedWeight = 0;
  const ruleResults = activeMappings.map((mapping) => {
    const systemValue = systemRow.normalized[mapping.fieldKey] ?? null;
    const bankValue = bankRow.normalized[mapping.fieldKey] ?? null;
    const passed = compareValues(mapping, systemValue, bankValue);
    const applicable =
      mapping.required || systemValue !== null || bankValue !== null;
    if (applicable) {
      totalWeight += mapping.weight;
      if (passed) matchedWeight += mapping.weight;
    }
    return {
      fieldKey: mapping.fieldKey,
      label: mapping.label,
      passed,
      compareOperator: mapping.compareOperator,
      systemValue,
      bankValue,
    };
  });

  return {
    systemRowId: systemRow.rowId,
    bankRowId: bankRow.rowId,
    systemRowNumber: systemRow.rowNumber,
    bankRowNumber: bankRow.rowNumber,
    score:
      totalWeight > 0
        ? Math.round((matchedWeight / totalWeight) * 100) / 100
        : 0,
    status: "manual",
    ruleResults,
  };
}

function compareValues(
  mapping: LayoutMapping,
  left: string | number | null,
  right: string | number | null,
): boolean {
  if (left === null && right === null) return true;
  if (left === null || right === null) return false;
  const textLeft = String(left);
  const textRight = String(right);
  switch (mapping.compareOperator) {
    case "contains":
      return textLeft.includes(textRight) || textRight.includes(textLeft);
    case "starts_with":
      return textLeft.startsWith(textRight) || textRight.startsWith(textLeft);
    case "ends_with":
      return textLeft.endsWith(textRight) || textRight.endsWith(textLeft);
    case "numeric_equals":
      return Math.abs(Number(left) - Number(right)) <= (mapping.tolerance ?? 0);
    case "date_equals":
      return textLeft === textRight;
    case "equals":
    default:
      return textLeft === textRight;
  }
}

export function summarizeRow(
  row: PreviewRow | undefined,
  mappings: LayoutMapping[],
): string {
  if (!row) return "-";
  return (
    mappings
      .slice(0, 4)
      .map((mapping) => row.values[mapping.fieldKey])
      .filter(Boolean)
      .join(" | ") || row.rowId
  );
}

function sortRows(rows: PreviewRow[]) {
  return [...rows].sort((left, right) => left.rowNumber - right.rowNumber);
}

export default function useConciliationWorkbench() {
  const { role, user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(
    Number(user?.id ?? 0),
  );
  const [banks, setBanks] = useState<UserBankWithLayouts[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number>(0);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number>(0);
  const [systemFile, setSystemFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [manualMatches, setManualMatches] = useState<PreviewMatch[]>([]);
  const [unmatchedSystemRows, setUnmatchedSystemRows] = useState<PreviewRow[]>(
    [],
  );
  const [unmatchedBankRows, setUnmatchedBankRows] = useState<PreviewRow[]>([]);
  const [kpis, setKpis] = useState<ConciliationKpis | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);

  const loadUsers = useCallback(async () => {
    if (!isSuperAdminRole(role)) return;
    const response = await apiClient.get<AuthUser[]>("/users");
    setUsers(response ?? []);
    setSelectedUserId((current) => current || Number(response?.[0]?.id ?? 0));
  }, [role]);

  const loadCatalog = useCallback(
    async (userId: number) => {
      const query = isSuperAdminRole(role) ? `?userId=${userId}` : "";
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

  const loadAnalytics = useCallback(
    async (userId: number) => {
      const query = isSuperAdminRole(role) ? `?userId=${userId}` : "";
      const [kpiResponse, historyResponse] = await Promise.all([
        apiClient.get<ConciliationKpis>(`/conciliation/kpis${query}`),
        apiClient.get<Array<Record<string, unknown>>>(
          `/conciliation/reconciliations${query}`,
        ),
      ]);
      setKpis(kpiResponse);
      setHistory(historyResponse ?? []);
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
    void loadAnalytics(selectedUserId).catch((error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar KPI y reportes.",
      );
    });
  }, [loadAnalytics, loadCatalog, selectedUserId, toast]);

  const selectedBank = useMemo(
    () => banks.find((item) => item.id === selectedBankId) ?? null,
    [banks, selectedBankId],
  );

  const layouts = selectedBank?.layouts ?? [];
  const selectedLayout = useMemo<Layout | null>(
    () =>
      layouts.find((item) => item.id === selectedLayoutId) ??
      layouts[0] ??
      null,
    [layouts, selectedLayoutId],
  );

  useEffect(() => {
    if (selectedLayout) {
      setSelectedLayoutId(selectedLayout.id);
    }
  }, [selectedLayout]);

  const onFileChange =
    (setter: Dispatch<SetStateAction<File | null>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.files?.[0] ?? null);
    };

  const clearAll = () => {
    setSystemFile(null);
    setBankFile(null);
    setPreview(null);
    setManualMatches([]);
    setUnmatchedSystemRows([]);
    setUnmatchedBankRows([]);
    setKpis(null);
  };

  const runPreview = async () => {
    if (!selectedBankId || !selectedLayoutId || !systemFile || !bankFile) {
      toast.error("Selecciona banco, layout y ambos archivos Excel.");
      return;
    }

    const formData = new FormData();
    formData.append("userBankId", String(selectedBankId));
    formData.append("layoutId", String(selectedLayoutId));
    formData.append("systemFile", systemFile);
    formData.append("bankFile", bankFile);

    try {
      const response = await apiClient.post<PreviewResponse>(
        "/conciliation/preview",
        formData,
      );
      setPreview(response);
      setManualMatches([]);
      setUnmatchedSystemRows(response.unmatchedSystemRows);
      setUnmatchedBankRows(response.unmatchedBankRows);
      toast.success("Preview de conciliacion listo.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo generar la conciliacion.",
      );
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (!preview || !selectedLayout) return;
    const systemRowId = String(event.active.id).replace("system:", "");
    const bankRowId = String(event.over?.id ?? "").replace("bank:", "");
    if (!systemRowId || !bankRowId) return;

    const systemRow = unmatchedSystemRows.find(
      (item) => item.rowId === systemRowId,
    );
    const bankRow = unmatchedBankRows.find((item) => item.rowId === bankRowId);
    if (!systemRow || !bankRow) return;

    const manualMatch = createManualMatch(
      selectedLayout.mappings,
      systemRow,
      bankRow,
    );
    setManualMatches((prev) => [...prev, manualMatch]);
    setUnmatchedSystemRows((prev) =>
      prev.filter((item) => item.rowId !== systemRowId),
    );
    setUnmatchedBankRows((prev) =>
      prev.filter((item) => item.rowId !== bankRowId),
    );
  };

  const removeManualMatch = (target: PreviewMatch) => {
    const systemRow = preview?.systemRows.find(
      (item) => item.rowId === target.systemRowId,
    );
    const bankRow = preview?.bankRows.find(
      (item) => item.rowId === target.bankRowId,
    );
    setManualMatches((prev) => prev.filter((item) => item !== target));
    if (systemRow) {
      setUnmatchedSystemRows((prev) => sortRows([...prev, systemRow]));
    }
    if (bankRow) {
      setUnmatchedBankRows((prev) => sortRows([...prev, bankRow]));
    }
  };

  const metrics = useMemo(() => {
    if (!preview) return null;
    const paired = preview.autoMatches.length + manualMatches.length;
    const totalRows = preview.systemRows.length + preview.bankRows.length;
    return {
      totalSystemRows: preview.systemRows.length,
      totalBankRows: preview.bankRows.length,
      autoMatches: preview.autoMatches.length,
      manualMatches: manualMatches.length,
      unmatchedSystem: unmatchedSystemRows.length,
      unmatchedBank: unmatchedBankRows.length,
      matchPercentage:
        totalRows > 0
          ? Math.round(((paired * 2) / totalRows) * 10000) / 100
          : 0,
    };
  }, [
    manualMatches.length,
    preview,
    unmatchedBankRows.length,
    unmatchedSystemRows.length,
  ]);

  const saveReconciliation = async () => {
    if (!preview || !selectedLayout) {
      toast.error("Primero genera una conciliacion.");
      return;
    }

    try {
      await apiClient.post("/conciliation/reconciliations", {
        userBankId: preview.userBank.id,
        layoutId: selectedLayout.id,
        name: `Conciliacion ${preview.userBank.alias ?? preview.userBank.bankName}`,
        systemFileName: preview.systemFileName,
        bankFileName: preview.bankFileName,
        systemRows: preview.systemRows,
        bankRows: preview.bankRows,
        autoMatches: preview.autoMatches,
        manualMatches,
      });

      toast.success("Conciliacion guardada.");
      await loadAnalytics(selectedUserId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la conciliacion.",
      );
    }
  };

  const chartData =
    kpis?.bankBreakdown.map((item) => ({
      name: item.alias ?? item.bankName,
      conciliaciones: item.totalReconciliations,
      match: item.averageMatchPercentage,
    })) ?? [];

  return {
    role,
    users,
    selectedUserId,
    setSelectedUserId,
    banks,
    selectedBankId,
    setSelectedBankId,
    selectedLayoutId,
    setSelectedLayoutId,
    layouts,
    selectedLayout,
    systemFile,
    setSystemFile,
    bankFile,
    setBankFile,
    preview,
    manualMatches,
    unmatchedSystemRows,
    unmatchedBankRows,
    kpis,
    history,
    metrics,
    chartData,
    onFileChange,
    clearAll,
    runPreview,
    onDragEnd,
    removeManualMatch,
    saveReconciliation,
  };
}
