// Formato de montos PYG: miles con "." y decimal con "," (3 decimales).
// Ej: 5500200.233 -> "5.500.200,233"
export function formatAmountPyg(value: number): string {
  const fixed = Math.abs(value).toFixed(3);
  const [intPart, decPart] = fixed.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${value < 0 ? "-" : ""}${withThousands},${decPart}`;
}

// ISO (yyyy-mm-dd) -> dd/mm/YYYY. Ej: "2026-06-02" -> "02/06/2026"
export function formatIsoToDdMmYyyy(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

// Parseo tolerante a numero. Quita separadores de miles tipo coma y deja el punto
// como decimal. Sirve para valores "limpios" (enteros HANA) o con coma de miles.
export function parseLooseNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

// Parseo tolerante a fecha -> ISO yyyy-mm-dd. Acepta ISO o d/m/a (misma
// interpretacion d/m/a que usa el backend al normalizar).
export function toIsoLoose(value: string): string | null {
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (!match) return null;
  let year = Number(match[3]);
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}
