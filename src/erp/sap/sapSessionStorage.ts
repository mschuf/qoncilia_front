const ACTIVE_SAP_CONFIG_KEY = "qoncilia_active_sap_config_id"

export function getStoredSapConfigId(): number {
  return Number(localStorage.getItem(ACTIVE_SAP_CONFIG_KEY) ?? 0)
}

export function storeSapConfigId(configId: number): void {
  if (configId > 0) {
    localStorage.setItem(ACTIVE_SAP_CONFIG_KEY, String(configId))
  }
}
