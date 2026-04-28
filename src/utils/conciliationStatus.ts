export interface ConciliationStatusPresentation {
  label: string
  description: string
  badgeClassName: string
}

const DEFAULT_PRESENTATION: ConciliationStatusPresentation = {
  label: "Borrador",
  description: "La conciliacion todavia no esta lista para compararse.",
  badgeClassName: "bg-slate-100 text-slate-700"
}

export function getConciliationStatusPresentation(
  status: string | null | undefined
): ConciliationStatusPresentation {
  switch (status) {
    case "draft_system_only":
      return {
        label: "Solo sistema",
        description: "Solo se guardaron registros del sistema.",
        badgeClassName: "bg-sky-100 text-sky-700"
      }
    case "draft_bank_only":
      return {
        label: "Solo banco",
        description: "Solo se guardaron registros del banco.",
        badgeClassName: "bg-amber-100 text-amber-700"
      }
    case "ready_to_compare":
      return {
        label: "A comparar",
        description: "Ya tiene ambos lados cargados y falta correr o guardar la comparacion.",
        badgeClassName: "bg-violet-100 text-violet-700"
      }
    case "matched":
      return {
        label: "Conciliada",
        description: "Todas las filas quedaron conciliadas automaticamente.",
        badgeClassName: "bg-emerald-100 text-emerald-700"
      }
    case "matched_with_manual":
      return {
        label: "Concil. manual",
        description: "Todas las filas quedaron conciliadas incluyendo matches manuales.",
        badgeClassName: "bg-emerald-100 text-emerald-700"
      }
    case "compared_with_pending":
      return {
        label: "Pendientes",
        description: "Se comparo, pero todavia quedan filas sin conciliar.",
        badgeClassName: "bg-orange-100 text-orange-700"
      }
    case "compared_without_matches":
      return {
        label: "Sin match",
        description: "Se comparo, pero no se encontraron matches.",
        badgeClassName: "bg-rose-100 text-rose-700"
      }
    case "draft":
      return DEFAULT_PRESENTATION
    default:
      return status
        ? {
            label: status,
            description: "Estado personalizado de conciliacion.",
            badgeClassName: DEFAULT_PRESENTATION.badgeClassName
          }
        : DEFAULT_PRESENTATION
  }
}

export function getConciliationDataSummary(
  hasSystemData: boolean,
  hasBankData: boolean
): string {
  if (hasSystemData && hasBankData) {
    return "Sistema y banco cargados"
  }

  if (hasSystemData) {
    return "Solo sistema cargado"
  }

  if (hasBankData) {
    return "Solo banco cargado"
  }

  return "Sin datos guardados"
}

export function isPendingConciliationStatus(status: string | null | undefined): boolean {
  return [
    "draft",
    "draft_system_only",
    "draft_bank_only",
    "ready_to_compare",
    "compared_with_pending",
    "compared_without_matches"
  ].includes(status ?? "")
}
