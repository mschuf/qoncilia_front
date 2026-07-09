import ConciliationWorkbenchPage from "./ConciliationWorkbenchPage";

// "Pago de tarjeta": workbench fijado al modo SAP_TARJETAS.
// Modulo por pantalla: card_payment (ver sql/38_seed_modulos_banco_tarjetas.sql).
export default function PagoTarjetaPage() {
  return <ConciliationWorkbenchPage mode="tarjetas" />;
}
