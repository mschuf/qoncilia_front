import ConciliationWorkbenchPage, {
  type CardPaymentKind,
} from "./ConciliationWorkbenchPage";

export default function PagoTarjetaFgPage({
  cardPaymentKind,
}: {
  cardPaymentKind: CardPaymentKind;
}) {
  return (
    <ConciliationWorkbenchPage
      mode="tarjetas"
      sapApiBasePath="/erp/sap/fg"
      cardPaymentKind={cardPaymentKind}
      workbenchProfile="fg"
    />
  );
}
