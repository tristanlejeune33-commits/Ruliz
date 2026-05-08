/**
 * Convert an array of objects to a CSV string (RFC 4180 minimal).
 * Cells containing commas, quotes or newlines are wrapped in quotes
 * and inner quotes are doubled.
 */
export function toCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
): string {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const s = typeof value === "string" ? value : String(value);
    if (/["\n,;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escape(row[c.key])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

/**
 * Trigger a CSV download in the browser.
 */
export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
