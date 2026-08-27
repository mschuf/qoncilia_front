import BankStatementsPage from "./BankStatementsPage";

// Entrada exclusiva de la empresa QA 5629621_QA. La autorizacion definitiva
// tambien se valida en el controlador backend /conciliation/fg.
export default function CargaExtractosFgPage() {
  return <BankStatementsPage conciliationApiBasePath="/conciliation/fg" />;
}
