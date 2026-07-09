const ACTIVE_SAP_CONFIG_KEY = "qoncilia_active_sap_config_id"

// scope opcional (p.ej. el code ERP de una pagina de modo fijo como SAP_B1 o
// SAP_TARJETAS) para que cada pagina recuerde su propia config seleccionada
// sin pisar la de las demas. Sin scope se usa la clave legacy compartida.
function storageKey(scope?: string): string {
  return scope ? `${ACTIVE_SAP_CONFIG_KEY}_${scope.toLowerCase()}` : ACTIVE_SAP_CONFIG_KEY
}

export function getStoredSapConfigId(scope?: string): number {
  return Number(localStorage.getItem(storageKey(scope)) ?? 0)
}

export function storeSapConfigId(configId: number, scope?: string): void {
  if (configId > 0) {
    localStorage.setItem(storageKey(scope), String(configId))
  }
}
