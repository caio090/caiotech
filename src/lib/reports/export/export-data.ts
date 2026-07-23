import { buildCsv } from "../import/csv";

/** Triggers a client-side file download from an in-memory string — same "build a Blob, click a hidden <a>" convention already used by CanvasEditor's PNG export. */
export function downloadTextFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ExportTable {
  name: string;
  headers: string[];
  rows: string[][];
}

/** CSV export always exports exactly the table currently visible on screen — never a hidden superset. */
export function exportTableAsCsv(fileNamePrefix: string, table: ExportTable) {
  downloadTextFile(`${fileNamePrefix}-${table.name}.csv`, "text/csv;charset=utf-8", buildCsv(table.headers, table.rows));
}

/** JSON técnico — raw structured export for advanced/technical use, not for spreadsheet apps. */
export function exportAsJson(fileNamePrefix: string, data: unknown) {
  downloadTextFile(`${fileNamePrefix}.json`, "application/json;charset=utf-8", JSON.stringify(data, null, 2));
}
