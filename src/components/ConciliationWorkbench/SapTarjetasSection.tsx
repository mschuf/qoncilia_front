import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowDown, FiRefreshCw, FiUploadCloud } from "react-icons/fi";
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

// Modo SAP_TARJETAS: compara el CSV de la procesadora (lado banco, no se guarda)
// contra el query del sistema OCRH (lado sistema). Reusa el mismo motor visual
// que SAP_B1 (tablas + tabla de resultados) pero sin envio al ERP: solo matchea.
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
}) {
  const [selectedBankRowIndex, setSelectedBankRowIndex] = useState<
    number | null
  >(null);
  const [selectedSystemRowIndex, setSelectedSystemRowIndex] = useState<
    number | null
  >(null);
  const [smartMatches, setSmartMatches] = useState<SmartMatch[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const matchesRef = useRef<HTMLDivElement | null>(null);
  const [scrollSignal, setScrollSignal] = useState(0);

  // Si cambian los datos de origen (CSV u OCRH), se reinician las coincidencias.
  useEffect(() => {
    setSmartMatches([]);
    setShowComparison(false);
    setSelectedBankRowIndex(null);
    setSelectedSystemRowIndex(null);
  }, [systemTable, bankTable]);

  // Scroll a la tabla de resultados al comparar.
  useEffect(() => {
    if (scrollSignal === 0) return;
    matchesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollSignal]);

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
      (systemTable?.columns ?? []).map((col) => ({ fieldKey: col, label: col })),
    [systemTable],
  );
  const smartMatchBankColumns = useMemo(
    () => (bankTable?.columns ?? []).map((col) => ({ fieldKey: col, label: col })),
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
  }, []);

  const canCompare =
    Boolean(bankTable?.rows.length) &&
    Boolean(systemTable?.rows.length) &&
    !isComparing;

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
            </div>
          </div>
          <div className="w-full shrink-0 sm:w-72">
            <UploadCard
              title="CSV de tarjetas"
              file={cardFile}
              onChange={onCardFileChange}
              onClear={onClearCardFile}
              accept=".csv,.txt"
              compact
            />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            {bankTable ? (
              <SapB1QueryTableView
                title="Tarjetas de credito"
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
        <div ref={matchesRef} className="scroll-mt-20">
          <SmartMatchesTable
            matches={smartMatches}
            systemColumns={smartMatchSystemColumns}
            bankColumns={smartMatchBankColumns}
            onRemove={handleRemoveSmartMatch}
            onClear={handleClearSmartMatches}
          />
        </div>
      ) : null}
    </>
  );
}
