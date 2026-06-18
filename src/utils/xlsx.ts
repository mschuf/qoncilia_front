// Generador de archivos .xlsx (Excel) sin dependencias.
// Un .xlsx es un ZIP (almacenado, sin compresion) con partes XML. Aqui armamos
// ese ZIP a mano: CRC32 + cabeceras locales + directorio central. Suficiente
// para exportar tablas; no soporta estilos ni multiples hojas.

export type CellValue = string | number | null | undefined;

// --- CRC32 (requerido por el formato ZIP) ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// --- ZIP con entradas "stored" (metodo 0, sin compresion) ---
type ZipEntry = { name: string; data: Uint8Array };

function buildZip(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const out: number[] = [];
  const central: number[] = [];

  const u16 = (arr: number[], v: number) => arr.push(v & 0xff, (v >>> 8) & 0xff);
  const u32 = (arr: number[], v: number) =>
    arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
  const raw = (arr: number[], b: Uint8Array) => {
    for (let i = 0; i < b.length; i++) arr.push(b[i]);
  };

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;
    const localOffset = out.length;

    // Cabecera local
    u32(out, 0x04034b50);
    u16(out, 20); // version necesaria
    u16(out, 0x0800); // flag: nombres en UTF-8
    u16(out, 0); // metodo: stored
    u16(out, 0); // hora
    u16(out, 0x21); // fecha (1980-01-01)
    u32(out, crc);
    u32(out, size); // tamano comprimido
    u32(out, size); // tamano sin comprimir
    u16(out, nameBytes.length);
    u16(out, 0); // extra
    raw(out, nameBytes);
    raw(out, entry.data);

    // Registro en el directorio central
    u32(central, 0x02014b50);
    u16(central, 20); // version made by
    u16(central, 20); // version necesaria
    u16(central, 0x0800);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0x21);
    u32(central, crc);
    u32(central, size);
    u32(central, size);
    u16(central, nameBytes.length);
    u16(central, 0); // extra
    u16(central, 0); // comentario
    u16(central, 0); // disco
    u16(central, 0); // atributos internos
    u32(central, 0); // atributos externos
    u32(central, localOffset);
    raw(central, nameBytes);
  }

  const centralOffset = out.length;
  raw(out, Uint8Array.from(central));

  // Fin del directorio central
  u32(out, 0x06054b50);
  u16(out, 0);
  u16(out, 0);
  u16(out, entries.length);
  u16(out, entries.length);
  u32(out, central.length);
  u32(out, centralOffset);
  u16(out, 0); // comentario

  return Uint8Array.from(out);
}

// --- Construccion de las partes XML del .xlsx ---
// Escapa para XML y descarta caracteres de control invalidos en XML 1.0
// (todo < 0x20 salvo tab, LF y CR).
function escapeXml(value: string): string {
  let result = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) continue;
    const ch = value[i];
    if (ch === "&") result += "&amp;";
    else if (ch === "<") result += "&lt;";
    else if (ch === ">") result += "&gt;";
    else if (ch === '"') result += "&quot;";
    else if (ch === "'") result += "&apos;";
    else result += ch;
  }
  return result;
}

// Indice de columna (0-based) -> letras de Excel: 0 -> A, 25 -> Z, 26 -> AA.
function columnLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim();
  return (cleaned || "Hoja1").slice(0, 31);
}

function buildSheetXml(rows: CellValue[][]): string {
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((value, c) => {
          if (value == null || value === "") return "";
          const ref = `${columnLetter(c)}${r + 1}`;
          if (typeof value === "number" && Number.isFinite(value)) {
            return `<c r="${ref}"><v>${value}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
            String(value)
          )}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${body}</sheetData>` +
    "</worksheet>"
  );
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  "</Types>";

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>";

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  "</Relationships>";

function workbookXml(sheetName: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    "</workbook>"
  );
}

// Genera los bytes de un archivo .xlsx con una hoja. Funcion pura (sin DOM)
// para poder probarla fuera del navegador.
export function buildXlsx(
  rows: CellValue[][],
  sheetName = "Hoja1"
): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const safeName = sanitizeSheetName(sheetName);
  return buildZip([
    { name: "[Content_Types].xml", data: enc.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: enc.encode(ROOT_RELS) },
    { name: "xl/workbook.xml", data: enc.encode(workbookXml(safeName)) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(WORKBOOK_RELS) },
    { name: "xl/worksheets/sheet1.xml", data: enc.encode(buildSheetXml(rows)) },
  ]);
}

// Construye el .xlsx y dispara la descarga en el navegador.
export function downloadXlsx(
  filename: string,
  rows: CellValue[][],
  sheetName?: string
): void {
  const bytes = buildXlsx(rows, sheetName);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
