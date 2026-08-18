import ConciliationWorkbenchPage, {
  type CardPaymentKind,
} from "./ConciliationWorkbenchPage";

// Modulo independiente para OCHO A. Sus llamadas SAP van al controlador y
// servicio propios, por lo que las personalizaciones futuras no alteran Pago
// de tarjeta de las otras empresas.
export default function PagoTarjetaOchoAPage({
  cardPaymentKind,
}: {
  cardPaymentKind: CardPaymentKind;
}) {
  return (
    <ConciliationWorkbenchPage
      mode="tarjetas"
      sapApiBasePath="/erp/sap/ocho-a"
      cardPaymentKind={cardPaymentKind}
    />
  );
}
