"use client";
import { cn } from "@/lib/utils";

interface KanbanCard {
  id: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  cards: KanbanCard[];
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  className?: string;
}

export function KanbanBoard({ columns, className }: KanbanBoardProps) {
  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
      {columns.map((col) => (
        <div key={col.id} className="flex-shrink-0 w-72">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn("w-2 h-2 rounded-full", col.color)} />
            <span className="text-sm font-semibold text-gray-700">{col.title}</span>
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {col.cards.length}
            </span>
          </div>
          <div className="space-y-2">
            {col.cards.map((card) => (
              <div key={card.id} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                {card.badge && <div className="mb-2">{card.badge}</div>}
                <p className="text-sm font-medium text-gray-800 leading-snug">{card.title}</p>
                {card.subtitle && <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>}
                {card.footer && <div className="mt-3 pt-2 border-t border-gray-50">{card.footer}</div>}
              </div>
            ))}
            {col.cards.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-gray-100 p-4 text-center">
                <p className="text-xs text-gray-300">Nenhum card</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
