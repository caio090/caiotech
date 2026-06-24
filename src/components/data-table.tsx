"use client";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string }>({ columns, data, className, onRowClick }: DataTableProps<T>) {
  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {columns.map((col) => (
                <th key={col.key} className={cn("px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn("transition-colors", onRowClick && "cursor-pointer hover:bg-gray-50")}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3.5 text-sm text-gray-700", col.className)}>
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">Nenhum registro encontrado.</div>
        )}
      </div>
    </div>
  );
}
