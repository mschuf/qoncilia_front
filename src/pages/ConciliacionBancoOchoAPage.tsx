import ConciliationWorkbenchPage from "./ConciliationWorkbenchPage";

// Punto de extension exclusivo de OCHO_A para no modificar el flujo SAP_B1
// que usan las demas empresas.
export default function ConciliacionBancoOchoAPage() {
  return (
    <ConciliationWorkbenchPage
      mode="banco"
      conciliationApiBasePath="/conciliation/ocho-a"
      sapApiBasePath="/erp/sap/ocho-a-bank"
      allowSapB1SystemManyToOne
    />
  );
}
