type Cell = string | number | boolean | null | undefined;

const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

function escapeCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Mitigate CSV formula injection (CVE-style: =cmd|...). Prefix with a single
  // quote, which Excel/Sheets render as text but strip when displaying.
  if (s.length > 0 && FORMULA_TRIGGERS.includes(s[0])) {
    s = "'" + s;
  }
  // Escape double quotes and wrap if it contains comma/quote/newline.
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export interface CsvColumn<T> {
  header: string;
  get: (row: T) => Cell;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCell(c.get(row))).join(","));
  return [header, ...lines].join("\n");
}
