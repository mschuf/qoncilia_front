import ConciliationWorkbenchPage from "./ConciliationWorkbenchPage";

// "Conciliacion de banco": workbench fijado al modo SAP_B1.
// Modulo por pantalla: bank_conciliation (ver sql/38_seed_modulos_banco_tarjetas.sql).
export default function ConciliacionBancoPage() {
  return <ConciliationWorkbenchPage mode="banco" />;
}
