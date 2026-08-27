import ConciliationWorkbenchPage from "./ConciliationWorkbenchPage";

export default function ConciliacionBancoFgPage() {
  return (
    <ConciliationWorkbenchPage
      mode="banco"
      conciliationApiBasePath="/conciliation/fg"
      sapApiBasePath="/erp/sap/fg-bank"
      allowSapB1SystemManyToOne
      workbenchProfile="fg"
    />
  );
}
