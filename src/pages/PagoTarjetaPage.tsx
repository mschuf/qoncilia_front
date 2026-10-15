import ConciliationWorkbenchPage from "./ConciliationWorkbenchPage";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// "Pago de tarjeta": workbench fijado al modo SAP_TARJETAS.
// Modulo por pantalla: card_payment (ver sql/38_seed_modulos_banco_tarjetas.sql).
export default function PagoTarjetaPage({ processor = "bancard" }: { processor?: "bancard" | "dinelco" }) {
  const { user } = useAuth();
  if (processor === "dinelco" && user?.companyCode?.trim().toUpperCase() !== "IRVINE") {
    return <Navigate to="/pago-tarjeta" replace />;
  }
  return <ConciliationWorkbenchPage
    mode="tarjetas"
    workbenchProfile={processor === "dinelco" ? "irvine_dinelco" : "standard"}
    cardPaymentTitleOverride={user?.companyCode?.trim().toUpperCase() === "IRVINE"
      ? processor === "dinelco" ? "Tarjeta Dinelco" : "Tarjeta Bancard"
      : undefined}
  />;
}
