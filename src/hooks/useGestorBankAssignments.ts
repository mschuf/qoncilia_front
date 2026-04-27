import { useCallback, useEffect, useMemo, useState } from "react"
import { apiClient } from "../api/apiClient"
import { useToast } from "../context/ToastContext"
import type {
  GestorAssignmentCatalog,
  SyncGestorBankAssignmentResponse
} from "../types/conciliation"

function buildDefaultLayoutIds(catalog: GestorAssignmentCatalog | null, sourceBankId: number) {
  const sourceBank =
    catalog?.sourceBanks.find((bank) => bank.id === sourceBankId) ?? catalog?.sourceBanks[0] ?? null

  if (!sourceBank) {
    return []
  }

  const activeLayouts = sourceBank.layouts.filter((layout) => layout.active).map((layout) => layout.id)
  return activeLayouts.length > 0 ? activeLayouts : sourceBank.layouts.map((layout) => layout.id)
}

export default function useGestorBankAssignments() {
  const toast = useToast()
  const [catalog, setCatalog] = useState<GestorAssignmentCatalog | null>(null)
  const [selectedGestorUserId, setSelectedGestorUserId] = useState<number>(0)
  const [selectedSourceBankId, setSelectedSourceBankId] = useState<number>(0)
  const [selectedLayoutIds, setSelectedLayoutIds] = useState<number[]>([])
  const [lastSyncResult, setLastSyncResult] = useState<SyncGestorBankAssignmentResponse | null>(null)
  const [syncing, setSyncing] = useState(false)

  const loadCatalog = useCallback(async () => {
    const response = await apiClient.get<GestorAssignmentCatalog>("/conciliation/gestor-assignments/catalog")
    const nextCatalog = response ?? { gestorUsers: [], sourceBanks: [] }
    setCatalog(nextCatalog)
    setSelectedGestorUserId((current) => {
      if (current > 0 && nextCatalog.gestorUsers.some((user) => user.id === current)) {
        return current
      }

      return nextCatalog.gestorUsers[0]?.id ?? 0
    })
    setSelectedSourceBankId((current) => {
      if (current > 0 && nextCatalog.sourceBanks.some((bank) => bank.id === current)) {
        return current
      }

      return nextCatalog.sourceBanks[0]?.id ?? 0
    })
    setSelectedLayoutIds((current) => {
      const nextIds = current.filter((layoutId) =>
        nextCatalog.sourceBanks.some((bank) => bank.layouts.some((layout) => layout.id === layoutId))
      )

      return nextIds.length > 0
        ? nextIds
        : buildDefaultLayoutIds(nextCatalog, nextCatalog.sourceBanks[0]?.id ?? 0)
    })
  }, [])

  useEffect(() => {
    void loadCatalog().catch((error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catalogo de asignaciones a gestores."
      )
    })
  }, [loadCatalog, toast])

  const gestorUsers = catalog?.gestorUsers ?? []
  const sourceBanks = catalog?.sourceBanks ?? []
  const selectedGestorUser =
    gestorUsers.find((user) => user.id === selectedGestorUserId) ?? gestorUsers[0] ?? null
  const selectedSourceBank =
    sourceBanks.find((bank) => bank.id === selectedSourceBankId) ?? sourceBanks[0] ?? null
  const selectedLayouts = selectedSourceBank?.layouts ?? []
  const mirroredAccounts = selectedSourceBank?.accounts ?? []

  useEffect(() => {
    setSelectedLayoutIds((current) => {
      if (!selectedSourceBank) {
        return []
      }

      const availableIds = new Set(selectedSourceBank.layouts.map((layout) => layout.id))
      const filtered = current.filter((layoutId) => availableIds.has(layoutId))
      if (filtered.length > 0) {
        return filtered
      }

      return buildDefaultLayoutIds(catalog, selectedSourceBank.id)
    })
  }, [catalog, selectedSourceBank])

  const allLayoutsSelected =
    selectedLayouts.length > 0 && selectedLayoutIds.length === selectedLayouts.length

  const toggleLayout = useCallback((layoutId: number) => {
    setSelectedLayoutIds((current) =>
      current.includes(layoutId)
        ? current.filter((item) => item !== layoutId)
        : [...current, layoutId].sort((left, right) => left - right)
    )
  }, [])

  const toggleAllLayouts = useCallback(() => {
    if (!selectedSourceBank) {
      setSelectedLayoutIds([])
      return
    }

    setSelectedLayoutIds((current) =>
      current.length === selectedSourceBank.layouts.length
        ? []
        : selectedSourceBank.layouts.map((layout) => layout.id)
    )
  }, [selectedSourceBank])

  const syncAssignments = useCallback(async () => {
    if (!selectedGestorUserId) {
      toast.error("Selecciona un gestor.")
      return null
    }

    if (!selectedSourceBankId) {
      toast.error("Selecciona un banco origen.")
      return null
    }

    if (selectedLayoutIds.length === 0) {
      toast.error("Selecciona al menos un layout para asignar.")
      return null
    }

    setSyncing(true)
    try {
      const response = await apiClient.post<SyncGestorBankAssignmentResponse>(
        `/conciliation/gestor-assignments/users/${selectedGestorUserId}/banks/${selectedSourceBankId}/sync`,
        {
          layoutIds: selectedLayoutIds
        }
      )

      setLastSyncResult(response)
      toast.success("Banco, cuentas y layouts sincronizados con el gestor.")
      await loadCatalog()
      return response
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo sincronizar la asignacion al gestor."
      )
      return null
    } finally {
      setSyncing(false)
    }
  }, [loadCatalog, selectedGestorUserId, selectedLayoutIds, selectedSourceBankId, toast])

  return {
    gestorUsers,
    sourceBanks,
    selectedGestorUser,
    selectedGestorUserId,
    setSelectedGestorUserId,
    selectedSourceBank,
    selectedSourceBankId,
    setSelectedSourceBankId,
    selectedLayouts,
    selectedLayoutIds,
    mirroredAccounts,
    allLayoutsSelected,
    toggleLayout,
    toggleAllLayouts,
    syncAssignments,
    loadCatalog,
    lastSyncResult,
    syncing
  }
}
