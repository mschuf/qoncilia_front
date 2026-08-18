import BankStatementsPage from "./BankStatementsPage";

// Punto de extension exclusivo de OCHO_A. La pantalla reutiliza la UX actual,
// pero sus solicitudes pasan por la fachada aislada del backend.
export default function CargaExtractosOchoAPage() {
  return <BankStatementsPage conciliationApiBasePath="/conciliation/ocho-a" />;
}
