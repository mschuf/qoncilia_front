import type { IrvineDinelcoPresentationGroup, SapB1QueryTable, SapB1SmartMatch } from "./types"

export function resolveIrvineDinelcoMatch(input: {
  bankReference: string
  sapReference: string
  bankSaleDate: string | null
  sapDate: string | null
  bankAmount: number | null
  sapAmount: number | null
}) {
  const normalizeReference = (value: string) => value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  const bankReference = normalizeReference(input.bankReference)
  const sapReference = normalizeReference(input.sapReference)
  const referenceMatched = Boolean(bankReference && sapReference) &&
    (bankReference.includes(sapReference) || sapReference.includes(bankReference))
  const dateMatched = Boolean(input.bankSaleDate && input.sapDate) &&
    input.bankSaleDate === input.sapDate
  const amountMatched = input.bankAmount !== null && input.sapAmount !== null &&
    Number.isFinite(input.bankAmount) && Number.isFinite(input.sapAmount) &&
    input.bankAmount > 0 && input.bankAmount === input.sapAmount
  return {
    referenceMatched, dateMatched, amountMatched,
    matched: amountMatched && (referenceMatched || dateMatched)
  }
}

export function filterIrvineDinelcoAccreditations(
  table: SapB1QueryTable,
  dateFrom?: string | null,
  dateTo?: string | null,
  selectedDate?: string
): SapB1QueryTable {
  return {
    ...table,
    rows: table.rows.filter((row) => {
      const date = String(row["Fecha Acreditación"] ?? "").trim().slice(0, 10)
      return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        (!dateFrom || date >= dateFrom.slice(0, 10)) &&
        (!dateTo || date <= dateTo.slice(0, 10)) &&
        (!selectedDate || date === selectedDate)
    })
  }
}

export function irvineDinelcoSaleDateRange(
  table: SapB1QueryTable, dateFrom: string, dateTo: string
): { saleDateFrom?: string; saleDateTo?: string } {
  const dates = filterIrvineDinelcoAccreditations(table, dateFrom, dateTo).rows
    .map((row) => String(row["Fecha Venta"] ?? "").trim().slice(0, 10))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort()
  return dates.length ? { saleDateFrom: dates[0], saleDateTo: dates[dates.length - 1] } : {}
}

export function buildIrvineDinelcoMatchingBankTable(table: SapB1QueryTable): SapB1QueryTable {
  return {
    ...table,
    columns: [...new Set([...table.columns, "Fecha", "Importe"])],
    rows: table.rows.map((row) => ({ ...row, Fecha: row["Fecha Venta"], Importe: row.Monto }))
  }
}

export function resolveIrvineDinelcoPresentationGroup(value: unknown): IrvineDinelcoPresentationGroup {
  return String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase() === "TRANSFERENCIA SPI"
    ? "SPI"
    : "OTHER"
}

export function irvineDinelcoPresentationLabel(group: IrvineDinelcoPresentationGroup): string {
  return group === "SPI" ? "TRANSFERENCIA SPI" : "OTRAS PRESTACIONES"
}

type IrvineDinelcoDepositBatch = {
  key: string
  date: string
  branch: string
  branchCode: string
  presentationGroup: IrvineDinelcoPresentationGroup
  amount: number
  grossAmount: number
  operationCount: number
  pendingReferences: string[]
  matches: SapB1SmartMatch[]
}

export function buildIrvineDinelcoDepositBatches(
  matches: SapB1SmartMatch[], expectedBankTable?: SapB1QueryTable | null
): IrvineDinelcoDepositBatch[] {
  const groups = new Map<string, IrvineDinelcoDepositBatch>()
  const matchesByRowNumber = new Map<number, SapB1SmartMatch[]>()
  for (const match of matches) {
    const rowMatches = matchesByRowNumber.get(match.bankRow.rowNumber) ?? []
    rowMatches.push(match)
    matchesByRowNumber.set(match.bankRow.rowNumber, rowMatches)
  }
  const rows = expectedBankTable?.rows ?? matches.map((match) => match.bankRow.values)
  for (const [index, row] of rows.entries()) {
    const read = (key: string) => row[key]
    const date = String(read("Fecha Acreditación") ?? "").trim().slice(0, 10)
    const branch = String(read("Nombre Sucursal") ?? "").trim()
    const branchCode = String(read("Cód. Sucursal") ?? "").trim()
    const presentationGroup = resolveIrvineDinelcoPresentationGroup(read("Prestación") ?? read("Presentación"))
    const key = `${date}\u0000${branchCode}\u0000${branch}\u0000${presentationGroup}`
    const group = groups.get(key) ?? {
      key, date, branch, branchCode, presentationGroup, amount: 0, grossAmount: 0,
      operationCount: 0, pendingReferences: [], matches: []
    }
    group.amount += Number(read("Monto Neto"))
    group.grossAmount += Number(read("Monto"))
    group.operationCount += 1
    const rowMatches = expectedBankTable ? matchesByRowNumber.get(index + 1) ?? [] : [matches[index]]
    group.matches.push(...rowMatches)
    if (rowMatches.length === 0) {
      group.pendingReferences.push(String(read("Referencia") ?? `Fila ${index + 1}`))
    }
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) =>
    a.date.localeCompare(b.date) || a.branch.localeCompare(b.branch) ||
    a.presentationGroup.localeCompare(b.presentationGroup))
}
