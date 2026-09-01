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
import type { WorkbenchProfile } from "../../hooks/useConciliationWorkbench";
import SapB1QueryTableView from "./SapB1QueryTableView";
import SmartMatchesTable from "./SmartMatchesTable";
import { UploadCard } from "./WorkbenchControls";
import { formatAmountPyg, toIsoLoose } from "../../utils/format";
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
  preferNormalized = false,
) {
  if (!row) return "";
  const sources = preferNormalized
    ? [row.normalized, row.values]
    : [row.values, row.normalized];

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

type CardMatchKind = "credit" | "debit";

function findTableRowText(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const direct = row[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) {
      return String(direct).trim();
    }

    const found = Object.entries(row).find(
      ([entryKey]) => normalizeLookupKey(entryKey) === normalizeLookupKey(key),
    );
    const value = found?.[1];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function resolveCardTableRowKind(row: Record<string, unknown>): CardMatchKind {
  const cardType = normalizeLookupKey(
    findTableRowText(row, ["Tipo de tarjeta"]),
  );
  const presentation = normalizeLookupKey(
    findTableRowText(row, ["PrestaciÃ³n", "Prestacion"]),
  );

  return cardType === "credito" || presentation.startsWith("tc")
    ? "credit"
    : "debit";
}

function toCsvDateKey(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return toIsoLoose(raw) ?? raw;
}

function formatCsvDateKey(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function findTableColumn(columns: string[], normalizedKey: string): string | undefined {
  return columns.find((column) => normalizeLookupKey(column) === normalizedKey);
}

// Para las pantallas dedicadas de débito se preserva Fecha de venta como dato original y se expone
// además como "Fecha" exclusivamente al motor de comparación. Así el matching
// automático y manual compara venta vs. fecha SAP, sin mostrar las fechas de
// acreditación que confunden al usuario.
function buildDedicatedDebitMatchingBankTable(table: SapB1QueryTable): SapB1QueryTable {
  const saleDateColumn = findTableColumn(table.columns, "fechadeventa");
  if (!saleDateColumn) return table;

  const visibleColumns = table.columns.filter((column) => {
    const key = normalizeLookupKey(column);
    return key === "fechadeventa" || !key.includes("fecha");
  });
  const columns = visibleColumns.includes("Fecha")
    ? visibleColumns
    : [...visibleColumns, "Fecha"];

  return {
    columns,
    rows: table.rows.map((row) => ({
      ...row,
      "Fecha de venta": row[saleDateColumn],
      Fecha: row[saleDateColumn],
    })),
  };
}

// En crédito de OCHO_A la Fecha de crédito del comercio sigue siendo el dato
// de liquidación/depósito, pero la comparación contra OCRH debe usar la Fecha
// de venta. Se conserva la fecha de crédito en su columna propia y se expone
// Fecha de venta como "Fecha" solo al motor de matching.
function buildDedicatedOchoACreditMatchingBankTable(
  table: SapB1QueryTable,
): SapB1QueryTable {
  const saleDateColumn = findTableColumn(table.columns, "fechadeventa");
  if (!saleDateColumn) return table;

  return {
    columns: table.columns.includes("Fecha")
      ? table.columns
      : [...table.columns, "Fecha"],
    rows: table.rows.map((row) => ({
      ...row,
      Fecha: row[saleDateColumn],
    })),
  };
}

// La tabla superior de Débito muestra Referencia y Fecha de venta al inicio, y
// omite Fecha/Fecha de crédito del comercio para que haya una sola fecha visible.
function buildDedicatedDebitDisplayBankTable(table: SapB1QueryTable): SapB1QueryTable {
  const referenceColumn = findTableColumn(table.columns, "referencia");
  const saleDateColumn = findTableColumn(table.columns, "fechadeventa");
  if (!saleDateColumn) return table;

  const otherColumns = table.columns.filter((column) => {
    const key = normalizeLookupKey(column);
    return column !== referenceColumn && column !== saleDateColumn && !key.includes("fecha");
  });
  const columns = [referenceColumn, saleDateColumn, ...otherColumns].filter(
    (column): column is string => Boolean(column),
  );

  return { ...table, columns };
}

// Crédito OCHO_A: la fecha usada para comparar (venta) queda junto a la fecha
// histórica de comercio; la columna explícita de crédito se deja al final para
// que siga disponible para los resúmenes y el DepositDate sin confundir el
// control manual.
function buildDedicatedOchoACreditDisplayBankTable(
  table: SapB1QueryTable,
): SapB1QueryTable {
  const referenceColumn = findTableColumn(table.columns, "referencia");
  const commerceDateColumn = findTableColumn(table.columns, "fecha");
  const saleDateColumn = findTableColumn(table.columns, "fechadeventa");
  const creditDateColumn = findTableColumn(
    table.columns,
    "fechadecreditodelcomercio",
  );
  if (!saleDateColumn) return table;

  const leadingColumns = [
    referenceColumn,
    commerceDateColumn,
    saleDateColumn,
  ].filter((column): column is string => Boolean(column));
  const columns = [
    ...leadingColumns,
    ...table.columns.filter(
      (column) => !leadingColumns.includes(column) && column !== creditDateColumn,
    ),
    ...(creditDateColumn ? [creditDateColumn] : []),
  ];

  return { ...table, columns };
}

function parseCardAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const text = String(value ?? "").trim();
  if (!text || text === "-") return null;

  const cleaned = text
    .replace(/[A-Za-z$%]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^\d,.+-]/g, "");
  const sign = cleaned.startsWith("-") ? "-" : cleaned.startsWith("+") ? "+" : "";
  const unsigned = cleaned.replace(/^[-+]/, "");
  if (!unsigned || !/^\d[\d,.]*$/.test(unsigned)) return null;

  const lastDot = unsigned.lastIndexOf(".");
  const lastComma = unsigned.lastIndexOf(",");
  let normalized: string;

  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSeparator = lastDot > lastComma ? "." : ",";
    const thousandsSeparator = decimalSeparator === "." ? "," : ".";
    normalized = unsigned
      .replace(new RegExp(`\\${thousandsSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    const groups = unsigned.split(",");
    normalized =
      groups.length > 1 && groups.slice(1).every((group) => group.length === 3)
        ? groups.join("")
        : unsigned.replace(",", ".");
  } else if (lastDot >= 0) {
    const groups = unsigned.split(".");
    normalized =
      groups.length > 1 && groups.slice(1).every((group) => group.length === 3)
        ? groups.join("")
        : unsigned;
  } else {
    normalized = unsigned;
  }

  const parsed = Number(`${sign}${normalized}`);
  return Number.isFinite(parsed) ? parsed : null;
}

function findRowAmount(
  row: SmartMatch["bankRow"] | SmartMatch["systemRow"],
): number | null {
  return parseCardAmount(findRowText(row, ["Importe", "Monto", "Amount"], true));
}

function resolveCardManualMatchDateKey(
  row: SmartMatch["bankRow"] | SmartMatch["systemRow"],
  kind: CardMatchKind,
  side: "bank" | "system",
  useSaleDateForCredit = false,
): string | null {
  const dateKeys =
    side === "bank" && (kind === "debit" || useSaleDateForCredit)
      ? ["Fecha de venta"]
      : ["Fecha"];
  const normalized = findRowText(row, dateKeys, true);
  const raw = findRowText(row, dateKeys);
  return toIsoLoose(normalized) ?? toIsoLoose(raw);
}

function resolveCardDebitSaleDateKey(match: SmartMatch): string {
  const dateKeys = ["Fecha de venta", "Fecha de Venta"];
  const normalized = findRowText(match.bankRow, dateKeys, true);
  const raw = findRowText(match.bankRow, dateKeys);
  return toIsoLoose(normalized) ?? toIsoLoose(raw) ?? "sin-fecha";
}

type CardManualPairing = {
  matches: SmartMatch[];
  error: string | null;
};

// El matching manual dedicado acepta varias filas, pero no agrupa importes:
// cada fila elegida del CSV debe encontrar exactamente una fila SAP con el
// mismo importe y la misma fecha. Asi se evita que un total correcto esconda
// lineas individuales incorrectas.
function buildCardManualPairing(
  bankRows: SmartMatch["bankRow"][],
  systemRows: SmartMatch["systemRow"][],
  kind: CardMatchKind,
  useSaleDateForCredit = false,
): CardManualPairing {
  if (bankRows.length !== systemRows.length) {
    return {
      matches: [],
      error: "Selecciona la misma cantidad de filas en CSV y SAP para emparejar línea por línea.",
    };
  }

  const availableSystemRows = [...systemRows];
  const matches: SmartMatch[] = [];

  for (const bankRow of bankRows) {
    const bankAmount = findRowAmount(bankRow);
    const bankDate = resolveCardManualMatchDateKey(
      bankRow,
      kind,
      "bank",
      useSaleDateForCredit,
    );
    if (bankAmount === null || !bankDate) {
      return {
        matches: [],
        error: `La fila ${bankRow.rowNumber} del CSV no tiene un importe o fecha válida.`,
      };
    }

    const systemIndex = availableSystemRows.findIndex((systemRow) => {
      const systemAmount = findRowAmount(systemRow);
      const systemDate = resolveCardManualMatchDateKey(
        systemRow,
        kind,
        "system",
        useSaleDateForCredit,
      );
      return (
        systemAmount !== null &&
        systemDate === bankDate &&
        Math.abs(systemAmount - bankAmount) < 0.01
      );
    });
    if (systemIndex < 0) {
      return {
        matches: [],
        error:
          `La fila ${bankRow.rowNumber} del CSV no tiene una fila SAP seleccionada ` +
          "con el mismo importe y fecha.",
      };
    }

    const [systemRow] = availableSystemRows.splice(systemIndex, 1);
    matches.push({
      systemRow,
      bankRow,
      score: 1,
      column1Match: true,
      column2Match: true,
      column3Match: true,
      matchReason: "manual",
      dateDifferenceDays: 0,
    });
  }

  return { matches, error: null };
}

// El CSV identifica las tarjetas de credito tanto por el tipo como por la
// prestacion. La segunda regla cubre los registros que la procesadora clasifica
// como "Otro"; por ejemplo, TC, TCQR y TCTK.
function resolveCardMatchKind(match: SmartMatch): CardMatchKind {
  const cardType = normalizeLookupKey(
    findRowText(match.bankRow, ["Tipo de tarjeta"]),
  );
  const presentation = normalizeLookupKey(
    findRowText(match.bankRow, ["Prestación", "Prestacion"]),
  );

  return cardType === "credito" || presentation.startsWith("tc")
    ? "credit"
    : "debit";
}

// La clave debe coincidir con la usada en el resumen por fecha de crédito para
// poder conservar una sola liquidación sin tocar los matches de débito.
function resolveCardCreditDateKey(match: SmartMatch): string {
  const dateKeys = ["Fecha de credito del comercio", "Fecha de crédito del comercio"];
  const normalized = findRowText(match.bankRow, dateKeys, true);
  const raw = findRowText(match.bankRow, dateKeys);
  const iso = /^\d{4}-\d{2}-\d{2}/.test(normalized)
    ? normalized.slice(0, 10)
    : raw
      ? toIsoLoose(raw)
      : null;

  return (iso ?? raw) || "sin-fecha";
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
  cardPaymentKind,
  workbenchProfile = "standard",
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
    bankTable?: SapB1QueryTable;
    excludedBankRowIds?: string[];
    excludedSystemRowIds?: string[];
    strictReferenceAmountMatch?: boolean;
    cardPaymentKind?: CardMatchKind;
  }) => Promise<SapB1QueryComparisonResult | null>;
  isSendingDeposit: boolean;
  // Deposito masivo: un deposito por lote (debito o credito). Devuelve los
  // AbsId procesados y fallidos; null = no se llego a enviar el lote.
  sendDeposit: (
    matches: SmartMatch[],
    options: {
      depositAccount: string;
      depositDate: string;
      journalRemarks: string;
      bankReference?: string;
      voucherAccount?: string;
    },
    kind: CardMatchKind,
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
  // Los perfiles especializados usan una pantalla por tipo. Sin este valor se conserva la pantalla
  // estandar con debito y credito juntos.
  cardPaymentKind?: CardMatchKind;
  workbenchProfile?: WorkbenchProfile;
}) {
  const [selectedBankRowIndex, setSelectedBankRowIndex] = useState<
    number | null
  >(null);
  const [selectedSystemRowIndex, setSelectedSystemRowIndex] = useState<
    number | null
  >(null);
  const [selectedBankRowIndices, setSelectedBankRowIndices] = useState<Set<number>>(
    () => new Set(),
  );
  const [selectedSystemRowIndices, setSelectedSystemRowIndices] = useState<Set<number>>(
    () => new Set(),
  );
  const [smartMatches, setSmartMatches] = useState<SmartMatch[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [depositAccount, setDepositAccount] = useState("");
  const [depositDate, setDepositDate] = useState(defaultDepositDate);
  const [journalRemarks, setJournalRemarks] = useState(DEFAULT_JOURNAL_REMARKS);
  const [creditBankReferencesByDate, setCreditBankReferencesByDate] = useState<
    Record<string, string>
  >({});
  const [depositErrors, setDepositErrors] = useState<string[]>([]);
  const [csvDateColumn, setCsvDateColumn] = useState("");
  const [csvDateFilter, setCsvDateFilter] = useState("");
  const matchesRef = useRef<HTMLDivElement | null>(null);
  const [scrollSignal, setScrollSignal] = useState(0);
  const isDedicatedCardPaymentPage =
    workbenchProfile !== "standard" && Boolean(cardPaymentKind);
  const isDedicatedDebitPage =
    isDedicatedCardPaymentPage && cardPaymentKind === "debit";
  const isDedicatedCreditPage =
    isDedicatedCardPaymentPage && cardPaymentKind === "credit";
  const isOchoACreditPage =
    workbenchProfile === "ocho_a" && cardPaymentKind === "credit";
  const usesCsvDepositDate = isDedicatedDebitPage || isDedicatedCreditPage;

  const csvDateColumns = useMemo(
    () =>
      (bankTable?.columns ?? []).filter((column) =>
        normalizeLookupKey(column).includes("fecha"),
      ),
    [bankTable],
  );

  useEffect(() => {
    const preferredDateKey =
      cardPaymentKind === "debit" || isOchoACreditPage
        ? "fechadeventa"
        : "fecha";
    const preferredColumn = csvDateColumns.find(
      (column) => normalizeLookupKey(column) === preferredDateKey,
    );
    setCsvDateColumn(preferredColumn ?? csvDateColumns[0] ?? "");
    setCsvDateFilter("");
  }, [bankTable, cardPaymentKind, csvDateColumns, isOchoACreditPage]);

  const csvDates = useMemo(() => {
    if (!bankTable || !csvDateColumn) return [];

    return [...new Set(
      bankTable.rows
        .filter(
          (row) =>
            !cardPaymentKind ||
            resolveCardTableRowKind(row) === cardPaymentKind,
        )
        .map((row) => toCsvDateKey(row[csvDateColumn]))
        .filter((date): date is string => Boolean(date)),
    )].sort((left, right) => right.localeCompare(left));
  }, [bankTable, cardPaymentKind, csvDateColumn]);

  const filteredBankTable = useMemo(() => {
    if (!bankTable) return null;

    const rows = bankTable.rows.filter((row) => {
      if (cardPaymentKind && resolveCardTableRowKind(row) !== cardPaymentKind) {
        return false;
      }

      return !csvDateFilter || toCsvDateKey(row[csvDateColumn]) === csvDateFilter;
    });

    return { ...bankTable, rows };
  }, [bankTable, cardPaymentKind, csvDateColumn, csvDateFilter]);

  const bankTableForMatching = useMemo(
    () =>
      filteredBankTable && isDedicatedDebitPage
        ? buildDedicatedDebitMatchingBankTable(filteredBankTable)
        : filteredBankTable && isOchoACreditPage
          ? buildDedicatedOchoACreditMatchingBankTable(filteredBankTable)
        : filteredBankTable,
    [filteredBankTable, isDedicatedDebitPage, isOchoACreditPage],
  );
  const bankTableForDisplay = useMemo(
    () =>
      filteredBankTable && isDedicatedDebitPage
        ? buildDedicatedDebitDisplayBankTable(filteredBankTable)
        : filteredBankTable && isOchoACreditPage
          ? buildDedicatedOchoACreditDisplayBankTable(filteredBankTable)
        : filteredBankTable,
    [filteredBankTable, isDedicatedDebitPage, isOchoACreditPage],
  );

  const cardKindLabel =
    cardPaymentKind === "credit"
      ? "crédito"
      : cardPaymentKind === "debit"
        ? "débito"
        : "débito y crédito";

  // Si cambian los datos de origen (CSV u OCRH), se reinician las coincidencias.
  useEffect(() => {
    setSmartMatches([]);
    setShowComparison(false);
    setSelectedBankRowIndex(null);
    setSelectedSystemRowIndex(null);
    setSelectedBankRowIndices(new Set());
    setSelectedSystemRowIndices(new Set());
    setCreditBankReferencesByDate({});
    setDepositErrors([]);
  }, [systemTable, filteredBankTable]);

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
    if (!systemTable || !bankTableForMatching) return [];
    return resolveSapB1ComparisonColumns({
      bank: bankTableForMatching,
      system: systemTable,
    });
  }, [systemTable, bankTableForMatching]);

  const matchedBankIndices = useMemo(
    () => new Set(smartMatches.map((m) => m.bankRow.rowNumber - 1)),
    [smartMatches],
  );
  const matchedSystemIndices = useMemo(
    () => new Set(smartMatches.map((m) => m.systemRow.rowNumber - 1)),
    [smartMatches],
  );
  const creditSmartMatches = useMemo(
    () => smartMatches.filter((match) => resolveCardMatchKind(match) === "credit"),
    [smartMatches],
  );
  const debitSmartMatches = useMemo(
    () => smartMatches.filter((match) => resolveCardMatchKind(match) === "debit"),
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
      (bankTableForDisplay?.columns ?? []).map((col) => ({ fieldKey: col, label: col })),
    [bankTableForDisplay],
  );

  const selectedManualBankRows = useMemo(
    () =>
      bankTableForMatching
        ? convertSapB1TableToPreviewRows(bankTableForMatching).filter((_, index) =>
            selectedBankRowIndices.has(index),
          )
        : [],
    [bankTableForMatching, selectedBankRowIndices],
  );
  const selectedManualSystemRows = useMemo(
    () =>
      systemTable
        ? convertSapB1TableToPreviewRows(systemTable).filter((_, index) =>
            selectedSystemRowIndices.has(index),
          )
        : [],
    [selectedSystemRowIndices, systemTable],
  );
  const manualPairing = useMemo(
    () =>
      cardPaymentKind &&
      selectedManualBankRows.length > 0 &&
      selectedManualSystemRows.length > 0
        ? buildCardManualPairing(
            selectedManualBankRows,
            selectedManualSystemRows,
            cardPaymentKind,
            isOchoACreditPage,
          )
        : null,
    [
      cardPaymentKind,
      isOchoACreditPage,
      selectedManualBankRows,
      selectedManualSystemRows,
    ],
  );
  const manualSelectionTotals = useMemo(
    () => ({
      bank: selectedManualBankRows.reduce(
        (total, row) => total + (findRowAmount(row) ?? 0),
        0,
      ),
      system: selectedManualSystemRows.reduce(
        (total, row) => total + (findRowAmount(row) ?? 0),
        0,
      ),
      bankDates: [...new Set(
        selectedManualBankRows
          .map((row) =>
            resolveCardManualMatchDateKey(
              row,
              cardPaymentKind ?? "debit",
              "bank",
              isOchoACreditPage,
            ),
          )
          .filter((date): date is string => Boolean(date)),
      )],
      systemDates: [...new Set(
        selectedManualSystemRows
          .map((row) =>
            resolveCardManualMatchDateKey(
              row,
              cardPaymentKind ?? "debit",
              "system",
              isOchoACreditPage,
            ),
          )
          .filter((date): date is string => Boolean(date)),
      )],
    }),
    [
      cardPaymentKind,
      isOchoACreditPage,
      selectedManualBankRows,
      selectedManualSystemRows,
    ],
  );

  const toggleSelectedBankRow = useCallback((index: number, selected: boolean) => {
    setSelectedBankRowIndices((current) => {
      const next = new Set(current);
      if (selected) next.add(index);
      else next.delete(index);
      return next;
    });
  }, []);
  const toggleSelectedSystemRow = useCallback((index: number, selected: boolean) => {
    setSelectedSystemRowIndices((current) => {
      const next = new Set(current);
      if (selected) next.add(index);
      else next.delete(index);
      return next;
    });
  }, []);

  const handleManualMatch = () => {
    if (isDedicatedCardPaymentPage) {
      if (!manualPairing || manualPairing.error || manualPairing.matches.length === 0) {
        return;
      }

      setSmartMatches((prev) => [...prev, ...manualPairing.matches]);
      setShowComparison(true);
      setSelectedBankRowIndices(new Set());
      setSelectedSystemRowIndices(new Set());
      return;
    }

    if (
      !filteredBankTable ||
      !systemTable ||
      selectedBankRowIndex === null ||
      selectedSystemRowIndex === null
    )
      return;

    const bankRows = convertSapB1TableToPreviewRows(filteredBankTable);
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
    if (!bankTableForMatching || !systemTable) return;
    const excludedBankRowIds = smartMatches.map((m) => m.bankRow.rowId);
    const excludedSystemRowIds = smartMatches.map((m) => m.systemRow.rowId);

    const result = await runComparison({
      columns: comparisonColumns,
      bankTable: bankTableForMatching,
      excludedBankRowIds,
      excludedSystemRowIds,
      // Las pantallas dedicadas de Debito y Credito requieren
      // referencia contenida y el mismo importe antes del matching automatico.
      strictReferenceAmountMatch: Boolean(cardPaymentKind),
      cardPaymentKind,
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
    setSelectedBankRowIndex(null);
    setSelectedSystemRowIndex(null);
    setSelectedBankRowIndices(new Set());
    setSelectedSystemRowIndices(new Set());
    setJournalRemarks(DEFAULT_JOURNAL_REMARKS);
    setCreditBankReferencesByDate({});
    setDepositDate(defaultDepositDate());
    setDepositErrors([]);
  }, []);

  const handleClearSmartMatchesByKind = useCallback((kind: CardMatchKind) => {
    setSmartMatches((current) =>
      current.filter((match) => resolveCardMatchKind(match) !== kind),
    );
    if (kind === "credit") setCreditBankReferencesByDate({});
    setDepositErrors([]);
  }, []);

  const handleKeepOnlyCreditDate = useCallback((dateKey: string) => {
    setSmartMatches((current) =>
      current.filter(
        (match) =>
          resolveCardMatchKind(match) !== "credit" ||
          resolveCardCreditDateKey(match) === dateKey,
      ),
    );
    setCreditBankReferencesByDate((current) =>
      current[dateKey] === undefined ? {} : { [dateKey]: current[dateKey] },
    );
    setDepositErrors([]);
  }, []);

  const handleRemoveCreditDate = useCallback((dateKey: string) => {
    setSmartMatches((current) =>
      current.filter(
        (match) =>
          resolveCardMatchKind(match) !== "credit" ||
          resolveCardCreditDateKey(match) !== dateKey,
      ),
    );
    setCreditBankReferencesByDate((current) => {
      const next = { ...current };
      delete next[dateKey];
      return next;
    });
    setDepositErrors([]);
  }, []);

  const handleCreditDateReferenceChange = useCallback((dateKey: string, value: string) => {
    setCreditBankReferencesByDate((current) => ({ ...current, [dateKey]: value }));
  }, []);

  const handleKeepOnlyDebitSaleDate = useCallback((dateKey: string) => {
    setSmartMatches((current) =>
      current.filter(
        (match) =>
          resolveCardMatchKind(match) !== "debit" ||
          resolveCardDebitSaleDateKey(match) === dateKey,
      ),
    );
    setDepositErrors([]);
  }, []);

  const handleRemoveDebitSaleDate = useCallback((dateKey: string) => {
    setSmartMatches((current) =>
      current.filter(
        (match) =>
          resolveCardMatchKind(match) !== "debit" ||
          resolveCardDebitSaleDateKey(match) !== dateKey,
      ),
    );
    setDepositErrors([]);
  }, []);

  const handleSendDeposit = async () => {
    setDepositErrors([]);
    let batches: Array<{
      kind: CardMatchKind;
      matches: SmartMatch[];
      depositDate: string;
      bankReference?: string;
      voucherAccount?: string;
    }>;

    if (usesCsvDepositDate) {
      const kind: CardMatchKind = isDedicatedCreditPage ? "credit" : "debit";
      const matches = kind === "credit" ? creditSmartMatches : debitSmartMatches;
      const dateFieldLabel =
        kind === "credit" ? "Fecha de crédito del comercio" : "Fecha de venta";
      const resolveDepositDate =
        kind === "credit" ? resolveCardCreditDateKey : resolveCardDebitSaleDateKey;
      const matchesByDepositDate = new Map<
        string,
        { depositDate: string; matches: SmartMatch[]; voucherAccount?: string }
      >();

      for (const match of matches) {
        const csvDate = resolveDepositDate(match);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(csvDate)) {
          setDepositErrors([
            `La fila ${match.bankRow.rowNumber} del CSV no tiene ${dateFieldLabel} válida para depositar.`,
          ]);
          return;
        }
        // Un deposito de credito solo puede reconciliar vouchers de una misma
        // cuenta origen. FG QA devuelve OCRH.CreditAcct como Cuenta vouchers
        // SAP; si hay mas de una cuenta en una fecha, se crean lotes separados.
        const voucherAccount =
          kind === "credit" && workbenchProfile === "fg"
            ? findRowText(match.systemRow, ["Cuenta vouchers SAP", "CreditAcct"]) || undefined
            : undefined;
        const batchKey = `${csvDate}\u0000${voucherAccount ?? ""}`;
        const current = matchesByDepositDate.get(batchKey) ?? {
          depositDate: csvDate,
          matches: [],
          voucherAccount,
        };
        current.matches.push(match);
        matchesByDepositDate.set(batchKey, current);
      }
      batches = [...matchesByDepositDate.values()]
        .sort((left, right) => left.depositDate.localeCompare(right.depositDate))
        .map(({ depositDate: csvDate, matches, voucherAccount }) => ({
          kind,
          matches,
          depositDate: csvDate,
          ...(voucherAccount ? { voucherAccount } : {}),
          ...(kind === "credit" && creditBankReferencesByDate[csvDate]?.trim()
            ? { bankReference: creditBankReferencesByDate[csvDate].trim() }
            : {}),
        }));
    } else {
      batches = (cardPaymentKind
        ? [
            {
              kind: cardPaymentKind,
              matches:
                cardPaymentKind === "credit"
                  ? creditSmartMatches
                  : debitSmartMatches,
            },
          ]
        : [
            { kind: "debit" as const, matches: debitSmartMatches },
            { kind: "credit" as const, matches: creditSmartMatches },
          ])
        .filter((batch) => batch.matches.length > 0)
        .map((batch) => ({ ...batch, depositDate }));
    }
    const results: Array<{
      succeededAbsIds: number[];
      failedAbsIds: number[];
      errors: string[];
    }> = [];

    // Cada lote conserva todos sus AbsId dentro de CreditLines. Los perfiles dedicados generan
    // un lote por fecha del CSV: venta para Débito y crédito del comercio para
    // Crédito, para que SAP reciba el DepositDate correcto.
    for (const batch of batches) {
      const result = await sendDeposit(
        batch.matches,
        {
          depositAccount,
          depositDate: batch.depositDate,
          journalRemarks,
          ...(batch.kind === "credit" && batch.bankReference
            ? { bankReference: batch.bankReference }
            : {}),
          ...(batch.voucherAccount ? { voucherAccount: batch.voucherAccount } : {}),
        },
        batch.kind,
      );
      if (!result) return;
      results.push(result);
    }

    const failedAbsIds = [
      ...new Set(results.flatMap((result) => result.failedAbsIds)),
    ];
    const errors = [...new Set(results.flatMap((result) => result.errors))];
    setDepositErrors(errors);

    if (failedAbsIds.length === 0) {
      setSmartMatches([]);
      setShowComparison(false);
      setSelectedBankRowIndex(null);
      setSelectedSystemRowIndex(null);
      setSelectedBankRowIndices(new Set());
      setSelectedSystemRowIndices(new Set());
      setJournalRemarks(DEFAULT_JOURNAL_REMARKS);
      setCreditBankReferencesByDate({});
      setDepositDate(defaultDepositDate());
      // Deposito completo OK: se re-ejecuta la busqueda del sistema para traer
      // el estado fresco de SAP y no re-matchear/depositar vouchers ya enviados.
      await refreshSystemQuery();
      return;
    }

    // Falla parcial: quedan en la tabla solo los matches cuyo deposito fallo,
    // para poder reintentar sin re-enviar los que ya entraron en SAP.
    const failed = new Set(failedAbsIds);
    setSmartMatches((current) =>
      current.filter((match) => {
        const absId = Number(findRowText(match.systemRow, ["AbsId"]));
        return !absId || failed.has(absId);
      }),
    );
    setSelectedBankRowIndex(null);
    setSelectedSystemRowIndex(null);
    setSelectedBankRowIndices(new Set());
    setSelectedSystemRowIndices(new Set());
  };

  const canCompare =
    Boolean(bankTableForMatching?.rows.length) &&
    Boolean(systemTable?.rows.length) &&
    !isComparing;
  const canSendDeposit =
    smartMatches.length > 0 &&
    Boolean(depositAccount.trim()) &&
    (usesCsvDepositDate || Boolean(depositDate)) &&
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
                  {csvSummary.includedRows}/{csvSummary.totalRows} operaciones de tarjetas
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

        {cardPaymentKind && bankTable ? (
          <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
            <div className="mr-auto">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">
                Pagos {cardKindLabel}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                El filtro limita las filas del CSV que se enviaran al matching.
              </p>
            </div>
            {csvDateColumns.length > 1 ? (
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-600">Columna de fecha</span>
                <select
                  value={csvDateColumn}
                  onChange={(event) => {
                    setCsvDateColumn(event.target.value);
                    setCsvDateFilter("");
                  }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                >
                  {csvDateColumns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {csvDateColumns.length > 0 ? (
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-600">Fecha a procesar</span>
                <select
                  value={csvDateFilter}
                  onChange={(event) => setCsvDateFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Todas las fechas</option>
                  {csvDates.map((date) => (
                    <option key={date} value={date}>
                      {formatCsvDateKey(date)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
              {filteredBankTable?.rows.length ?? 0} de {bankTable.rows.length} filas
            </span>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            {filteredBankTable ? (
              <SapB1QueryTableView
                title={`Tarjetas de ${cardKindLabel}`}
                table={bankTableForDisplay ?? filteredBankTable}
                selectedRowIndex={
                  isDedicatedCardPaymentPage ? undefined : selectedBankRowIndex
                }
                selectedRowIndices={
                  isDedicatedCardPaymentPage ? selectedBankRowIndices : undefined
                }
                onSelectRow={
                  isDedicatedCardPaymentPage ? undefined : setSelectedBankRowIndex
                }
                onToggleRow={
                  isDedicatedCardPaymentPage ? toggleSelectedBankRow : undefined
                }
                hiddenRowIndices={matchedBankIndices}
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
                selectedRowIndex={
                  isDedicatedCardPaymentPage ? undefined : selectedSystemRowIndex
                }
                selectedRowIndices={
                  isDedicatedCardPaymentPage ? selectedSystemRowIndices : undefined
                }
                onSelectRow={
                  isDedicatedCardPaymentPage ? undefined : setSelectedSystemRowIndex
                }
                onToggleRow={
                  isDedicatedCardPaymentPage ? toggleSelectedSystemRow : undefined
                }
                hiddenRowIndices={matchedSystemIndices}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Selecciona fechas y pulsa buscar para traer los datos del
                sistema.
              </div>
            )}
          </div>
        </div>

        {isDedicatedCardPaymentPage && filteredBankTable && systemTable ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                  Control de selección manual
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Cada fila del CSV debe coincidir con una fila SAP seleccionada por importe y {isDedicatedDebitPage || isOchoACreditPage ? "Fecha de venta" : isDedicatedCreditPage ? "Fecha de crédito" : "fecha"}.
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  manualPairing?.error
                    ? "bg-rose-100 text-rose-700"
                    : manualPairing?.matches.length
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white text-slate-600"
                }`}
              >
                {manualPairing?.error
                  ? "Revisar selección"
                  : manualPairing?.matches.length
                    ? "Líneas cuadradas"
                    : "Selecciona filas"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs font-semibold sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white px-3 py-2 text-amber-800 shadow-sm">
                CSV: {selectedManualBankRows.length} líneas · {formatAmountPyg(manualSelectionTotals.bank)}
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-sky-800 shadow-sm">
                SAP: {selectedManualSystemRows.length} líneas · {formatAmountPyg(manualSelectionTotals.system)}
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-slate-700 shadow-sm">
                Diferencia: {formatAmountPyg(manualSelectionTotals.bank - manualSelectionTotals.system)}
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-slate-700 shadow-sm">
                Fechas: CSV {manualSelectionTotals.bankDates.map(formatCsvDateKey).join(", ") || "-"}
                {" · "}SAP {manualSelectionTotals.systemDates.map(formatCsvDateKey).join(", ") || "-"}
              </div>
            </div>
            {manualPairing?.error ? (
              <p className="mt-3 text-xs font-bold text-rose-700">{manualPairing.error}</p>
            ) : null}
          </div>
        ) : null}

        {filteredBankTable && systemTable ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowComparison(false);
                setSmartMatches([]);
                setSelectedBankRowIndex(null);
                setSelectedSystemRowIndex(null);
                setSelectedBankRowIndices(new Set());
                setSelectedSystemRowIndices(new Set());
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
                title={
                  isDedicatedCardPaymentPage
                    ? "Emparejar las filas seleccionadas"
                    : "Match Manual"
                }
                onClick={handleManualMatch}
                disabled={
                  isDedicatedCardPaymentPage
                    ? !manualPairing ||
                      Boolean(manualPairing.error) ||
                      manualPairing.matches.length === 0
                    : selectedBankRowIndex === null || selectedSystemRowIndex === null
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

      {showComparison && filteredBankTable && systemTable ? (
        <>
          <div ref={matchesRef} className="scroll-mt-20">
            {!cardPaymentKind || cardPaymentKind === "debit" ? (
            <SmartMatchesTable
              title="Resultados del matching Débito"
              exportFileName="resultados-matching-debito"
              matches={debitSmartMatches}
              systemColumns={smartMatchSystemColumns}
              bankColumns={smartMatchBankColumns}
              onRemove={handleRemoveSmartMatch}
              onClear={() => handleClearSmartMatchesByKind("debit")}
              {...(isDedicatedDebitPage
                ? {
                    dateSubtotalColumn: "Fecha de venta",
                    dateSubtotalLabel: "Totales por fecha de venta",
                    dateSubtotalEmptyLabel: "Sin fecha de venta",
                    onKeepOnlyDate: handleKeepOnlyDebitSaleDate,
                    onRemoveDate: handleRemoveDebitSaleDate,
                  }
                : {})}
            />
            ) : null}
            {!cardPaymentKind || cardPaymentKind === "credit" ? (
            <div className={cardPaymentKind ? "" : "mt-5"}>
              <SmartMatchesTable
                title="Resultados del matching Crédito"
                exportFileName="resultados-matching-credito"
                matches={creditSmartMatches}
                systemColumns={smartMatchSystemColumns}
                bankColumns={smartMatchBankColumns}
                onRemove={handleRemoveSmartMatch}
                onClear={() => handleClearSmartMatchesByKind("credit")}
                dateSubtotalColumn="Fecha de credito del comercio"
                dateSubtotalLabel="Totales por fecha de crédito"
                dateSubtotalBankExtraColumn="Importe neto"
                dateSubtotalBankExtraLabel="Total Importe Neto"
                dateSubtotalEmptyLabel="Sin fecha de crédito"
                onKeepOnlyDate={handleKeepOnlyCreditDate}
                onRemoveDate={
                  cardPaymentKind === "credit" ? handleRemoveCreditDate : undefined
                }
                dateSubtotalReferences={
                  isOchoACreditPage ? creditBankReferencesByDate : undefined
                }
                onDateSubtotalReferenceChange={
                  isOchoACreditPage ? handleCreditDateReferenceChange : undefined
                }
                dateSubtotalReferenceLabel="Referencia SAP"
              />
            </div>
            ) : null}
          </div>

          {smartMatches.length > 0 ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Deposito SAP
                  </p>
                  <div
                    className={`mt-3 grid gap-3 ${
                      cardPaymentKind === "credit"
                        ? "md:grid-cols-4"
                        : isDedicatedDebitPage
                          ? "md:grid-cols-3"
                        : "md:grid-cols-4"
                    }`}
                  >
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
                    {usesCsvDepositDate ? (
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Fechas Deposito
                        </span>
                        <div className="flex h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700">
                          {isDedicatedCreditPage
                            ? "Se toma Fecha de crédito del comercio"
                            : "Se toma Fecha de venta del CSV"}
                        </div>
                      </div>
                    ) : (
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
                    )}
                    <label
                      className={`space-y-1 ${
                        isDedicatedDebitPage ? "md:col-span-1" : "md:col-span-2"
                      }`}
                    >
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
