import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiArrowDown,
  FiRefreshCw,
  FiSend,
  FiUploadCloud,
} from "react-icons/fi";
import type {
  SapB1QueryComparisonResult,
  SapB1QueryTable,
  SapTarjetasCsvParseResult,
} from "../../erp/sap";
import SapB1QueryTableView from "./SapB1QueryTableView";
import SmartMatchesTable from "./SmartMatchesTable";
import { UploadCard } from "./WorkbenchControls";
import {
  convertSapB1TableToPreviewRows,
  isSameSmartMatch,
  resolveSapB1ComparisonColumns,
  type SmartMatch,
} from "./workbenchHelpers";

function normalizeLookupKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function findRowText(
  row: SmartMatch["bankRow"] | SmartMatch["systemRow"] | undefined,
  keys: string[],
) {
  if (!row) return "";
  const sources = [row.values, row.normalized];

  for (const key of keys) {
    const normalizedKey = normalizeLookupKey(key);
    for (const source of sources) {
      const direct = source[key];
      if (direct !== undefined && direct !== null && String(direct).trim()) {
        return String(direct).trim();
      }

      const found = Object.entries(source).find(
        ([entryKey]) => normalizeLookupKey(entryKey) === normalizedKey,
      );
      const value = found?.[1];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }

  return "";
}

// Comentario por defecto del asiento del deposito (JournalRemarks); el usuario
// puede ampliarlo o reemplazarlo antes de depositar.
const DEFAULT_JOURNAL_REMARKS = "COMPRA P.O.S BANCARD";

// Fecha de deposito por defecto: dia actual menos 1 (formato YYYY-MM-DD del
// input date). El usuario puede cambiarla pero es obligatoria.
function defaultDepositDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Modo SAP_TARJETAS: compara el archivo de la procesadora (lado banco, no se
// guarda) contra el query OCRH (lado sistema) y envia los matches a Deposits.
export default function SapTarjetasSection({
  systemTable,
  bankTable,
  csvSummary,
  cardFile,
  onCardFileChange,
  onClearCardFile,
  accountCode,
  isRunningSystemQuery,
  isParsingCsv,
  isComparing,
  runComparison,
  isSendingDeposit,
  sendDeposit,
  refreshSystemQuery,
}: {
  systemTable: SapB1QueryTable | null;
  bankTable: SapB1QueryTable | null;
  csvSummary: Pick<
    SapTarjetasCsvParseResult,
    "fileName" | "totalRows" | "includedRows"
  > | null;
  cardFile: File | null;
  onCardFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearCardFile: () => void;
  accountCode: string | null;
  isRunningSystemQuery: boolean;
  isParsingCsv: boolean;
  isComparing: boolean;
  runComparison: (args: {
    columns: string[];
    excludedBankRowIds?: string[];
    excludedSystemRowIds?: string[];
  }) => Promise<SapB1QueryComparisonResult | null>;
  isSendingDeposit: boolean;
  // Deposito masivo: un deposito por AbsId. Devuelve que AbsIds entraron y
  // cuales fallaron (null = no se llego a enviar).
  sendDeposit: (
    matches: SmartMatch[],
    options: {
      depositAccount: string;
      depositDate: string;
      journalRemarks: string;
    },
  ) => Promise<
    {
      succeededAbsIds: number[];
      failedAbsIds: number[];
      errors: string[];
    } | null
  >;
  // Re-ejecuta la consulta del sistema (mismo efecto que el boton Buscar) para
  // refrescar los datos de SAP tras depositar y no volver a depositar repetido.
  refreshSystemQuery: () => Promise<void>;
}) {
  const [selectedBankRowIndex, setSelectedBankRowIndex] = useState<
    number | null
  >(null);
  const [selectedSystemRowIndex, setSelectedSystemRowIndex] = useState<
    number | null
  >(null);
  const [smartMatches, setSmartMatches] = useState<SmartMatch[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [depositAccount, setDepositAccount] = useState("");
  const [depositDate, setDepositDate] = useState(defaultDepositDate);
  const [journalRemarks, setJournalRemarks] = useState(DEFAULT_JOURNAL_REMARKS);
  const [depositErrors, setDepositErrors] = useState<string[]>([]);
  const matchesRef = useRef<HTMLDivElement | null>(null);
  const [scrollSignal, setScrollSignal] = useState(0);

  // Si cambian los datos de origen (CSV u OCRH), se reinician las coincidencias.
  useEffect(() => {
    setSmartMatches([]);
    setShowComparison(false);
    setSelectedBankRowIndex(null);
    setSelectedSystemRowIndex(null);
    setDepositErrors([]);
  }, [systemTable, bankTable]);

  // Scroll a la tabla de resultados al comparar.
  useEffect(() => {
    if (scrollSignal === 0) return;
    matchesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollSignal]);

  // Cuenta Deposito: ya no es editable, refleja siempre la Cuenta Mayor de la
  // cuenta bancaria seleccionada en la busqueda.
  useEffect(() => {
    setDepositAccount(accountCode || "");
  }, [accountCode]);

  const comparisonColumns = useMemo(() => {
    if (!systemTable || !bankTable) return [];
    return resolveSapB1ComparisonColumns({
      bank: bankTable,
      system: systemTable,
    });
  }, [systemTable, bankTable]);

  const matchedBankIndices = useMemo(
    () => new Set(smartMatches.map((m) => m.bankRow.rowNumber - 1)),
    [smartMatches],
  );
  const matchedSystemIndices = useMemo(
    () => new Set(smartMatches.map((m) => m.systemRow.rowNumber - 1)),
    [smartMatches],
  );

  // Columnas para la tabla de resultados, memoizadas: si se recrean en cada render
  // rompen el memo de SmartMatchesTable y su formateo precomputado.
  const smartMatchSystemColumns = useMemo(
    () =>
      (systemTable?.columns ?? []).map((col) => ({
        fieldKey: col,
        label: col,
      })),
    [systemTable],
  );
  const smartMatchBankColumns = useMemo(
    () =>
      (bankTable?.columns ?? []).map((col) => ({ fieldKey: col, label: col })),
    [bankTable],
  );

  const handleManualMatch = () => {
    if (
      !bankTable ||
      !systemTable ||
      selectedBankRowIndex === null ||
      selectedSystemRowIndex === null
    )
      return;

    const bankRows = convertSapB1TableToPreviewRows(bankTable);
    const systemRows = convertSapB1TableToPreviewRows(systemTable);
    const bankRow = bankRows[selectedBankRowIndex];
    const systemRow = systemRows[selectedSystemRowIndex];
    if (!bankRow || !systemRow) return;

    const manualMatch: SmartMatch = {
      systemRow,
      bankRow,
      score: 1,
      column1Match: true,
      column2Match: true,
      column3Match: true,
      matchReason: "manual",
      dateDifferenceDays: null,
    };

    setSmartMatches((prev) => [...prev, manualMatch]);
    setShowComparison(true);
    setSelectedBankRowIndex(null);
    setSelectedSystemRowIndex(null);
  };

  const handleCompare = async () => {
    if (!bankTable || !systemTable) return;
    const excludedBankRowIds = smartMatches.map((m) => m.bankRow.rowId);
    const excludedSystemRowIds = smartMatches.map((m) => m.systemRow.rowId);

    const result = await runComparison({
      columns: comparisonColumns,
      excludedBankRowIds,
      excludedSystemRowIds,
    });
    if (!result) return;

    setSmartMatches((prev) => [...prev, ...result.matches]);
    setShowComparison(true);
    setScrollSignal((n) => n + 1);
  };

  const handleRemoveSmartMatch = useCallback((target: SmartMatch) => {
    setSmartMatches((current) =>
      current.filter((item) => !isSameSmartMatch(item, target)),
    );
  }, []);

  const handleClearSmartMatches = useCallback(() => {
    setSmartMatches([]);
    setShowComparison(false);
    setJournalRemarks(DEFAULT_JOURNAL_REMARKS);
    setDepositDate(defaultDepositDate());
    setDepositErrors([]);
  }, []);

  const handleSendDeposit = async () => {
    setDepositErrors([]);
    const result = await sendDeposit(smartMatches, {
      depositAccount,
      depositDate,
      journalRemarks,
    });
    if (!result) return;
    setDepositErrors(result.errors);

    if (result.failedAbsIds.length === 0) {
      setSmartMatches([]);
      setShowComparison(false);
      setSelectedBankRowIndex(null);
      setSelectedSystemRowIndex(null);
      setJournalRemarks(DEFAULT_JOURNAL_REMARKS);
      setDepositDate(defaultDepositDate());
      // Deposito completo OK: se re-ejecuta la busqueda del sistema para traer
      // el estado fresco de SAP y no re-matchear/depositar vouchers ya enviados.
      await refreshSystemQuery();
      return;
    }

    // Falla parcial: quedan en la tabla solo los matches cuyo deposito fallo,
    // para poder reintentar sin re-enviar los que ya entraron en SAP.
    const failed = new Set(result.failedAbsIds);
    setSmartMatches((current) =>
      current.filter((match) => {
        const absId = Number(findRowText(match.systemRow, ["AbsId"]));
        return !absId || failed.has(absId);
      }),
    );
    setSelectedBankRowIndex(null);
    setSelectedSystemRowIndex(null);
  };

  const canCompare =
    Boolean(bankTable?.rows.length) &&
    Boolean(systemTable?.rows.length) &&
    !isComparing;
  const canSendDeposit =
    smartMatches.length > 0 &&
    Boolean(depositAccount.trim()) &&
    Boolean(depositDate) &&
    !isSendingDeposit;

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        {/* Barra compacta: el dropzone vive aqui, fuera del area de tablas,
            para que las tablas (sistema vs CSV) usen todo el ancho. */}
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                CSV de la procesadora
              </p>
              {accountCode ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                  {accountCode}
                </span>
              ) : null}
              {csvSummary ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {csvSummary.includedRows}/{csvSummary.totalRows} operaciones de débito
                </span>
              ) : null}
              {isParsingCsv ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                  Procesando
                </span>
              ) : null}
            </div>
          </div>
          <div className="w-full shrink-0 sm:w-72">
            <UploadCard
              title="CSV de tarjetas"
              file={cardFile}
              onChange={onCardFileChange}
              onClear={onClearCardFile}
              accept=".csv,.txt,.xls,.xlsx"
              compact
            />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            {bankTable ? (
              <SapB1QueryTableView
                title="Tarjetas de debito"
                table={bankTable}
                selectedRowIndex={selectedBankRowIndex}
                onSelectRow={setSelectedBankRowIndex}
                matchedIndices={matchedBankIndices}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Sube el CSV para ver las tarjetas.
              </div>
            )}
          </div>
          <div>
            {isRunningSystemQuery ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Ejecutando consulta...
              </div>
            ) : systemTable ? (
              <SapB1QueryTableView
                title="Depositos / tarjetas SAP"
                table={systemTable}
                selectedRowIndex={selectedSystemRowIndex}
                onSelectRow={setSelectedSystemRowIndex}
                matchedIndices={matchedSystemIndices}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Selecciona fechas y pulsa buscar para traer los datos del
                sistema.
              </div>
            )}
          </div>
        </div>

        {bankTable && systemTable ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowComparison(false);
                setSmartMatches([]);
                setSelectedBankRowIndex(null);
                setSelectedSystemRowIndex(null);
                setJournalRemarks(DEFAULT_JOURNAL_REMARKS);
              }}
              disabled={!showComparison && smartMatches.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                title="Match Manual"
                onClick={handleManualMatch}
                disabled={
                  selectedBankRowIndex === null ||
                  selectedSystemRowIndex === null
                }
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiArrowDown className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleCompare}
                disabled={!canCompare}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiUploadCloud className="h-4 w-4" /> Comparar
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {showComparison && bankTable && systemTable ? (
        <>
          <div ref={matchesRef} className="scroll-mt-20">
            <SmartMatchesTable
              matches={smartMatches}
              systemColumns={smartMatchSystemColumns}
              bankColumns={smartMatchBankColumns}
              onRemove={handleRemoveSmartMatch}
              onClear={handleClearSmartMatches}
            />
          </div>

          {smartMatches.length > 0 ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Deposito SAP
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Cuenta Deposito
                      </span>
                      <div
                        title="Cuenta Mayor de la cuenta bancaria seleccionada"
                        className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600"
                      >
                        {depositAccount || "Selecciona una cuenta bancaria"}
                      </div>
                    </div>
                    <label className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Fecha Deposito
                      </span>
                      <input
                        type="date"
                        value={depositDate}
                        onChange={(event) => setDepositDate(event.target.value)}
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                      />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Comentario
                      </span>
                      <input
                        value={journalRemarks}
                        onChange={(event) =>
                          setJournalRemarks(event.target.value)
                        }
                        placeholder={DEFAULT_JOURNAL_REMARKS}
                        maxLength={200}
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                      />
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSendDeposit}
                  disabled={!canSendDeposit}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiSend className="h-4 w-4" />
                  {isSendingDeposit ? "Depositando..." : "Depositar"}
                </button>
              </div>
              {depositErrors.length > 0 ? (
                <div
                  role="alert"
                  className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800"
                >
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-black">Errores informados por SAP</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
                        {depositErrors.map((error, index) => (
                          <li key={`${index}-${error}`}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
