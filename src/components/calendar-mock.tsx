"use client";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  platform: string;
  type: string;
  status: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "bg-pink-500",
  LinkedIn:  "bg-blue-600",
  TikTok:    "bg-gray-900",
  Facebook:  "bg-blue-700",
  Twitter:   "bg-sky-500",
};

const DAYS   = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface CalendarMockProps {
  events?: CalendarEvent[];
  year?:  number;  // defaults to current year
  month?: number;  // 0-11, defaults to current month
}

export function CalendarMock({ events = [], year: yearProp, month: monthProp }: CalendarMockProps) {
  const now   = new Date();
  const year  = yearProp  ?? now.getFullYear();
  const month = monthProp ?? now.getMonth();

  // Today's day number only if we're viewing the current month
  const todayDay = (now.getFullYear() === year && now.getMonth() === month) ? now.getDate() : -1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  const eventsByDay: Record<number, CalendarEvent[]> = {};
  events.forEach((ev) => {
    if (!ev.date) return;
    const d = new Date(ev.date);
    if (isNaN(d.getTime())) return;
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  const monthLabel = `${MONTHS[month]} ${year}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{monthLabel}</h3>
        <div className="flex gap-2">
          <button className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50">‹</button>
          <button className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50">›</button>
        </div>
      </div>

      <div className="p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Empty cells before the 1st */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} className="h-16 rounded-lg" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayEvents = eventsByDay[day] ?? [];
            const isToday   = day === todayDay;
            return (
              <div
                key={day}
                className={cn(
                  "h-16 rounded-lg p-1 text-xs border border-transparent hover:border-gray-200 transition-colors cursor-pointer",
                  isToday && "bg-indigo-50 border-indigo-200"
                )}
              >
                <div className={cn("font-medium mb-1", isToday ? "text-indigo-600 font-bold" : "text-gray-600")}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className={cn(
                        "text-white rounded px-1 py-0.5 text-[10px] truncate",
                        PLATFORM_COLORS[ev.platform] || "bg-gray-400"
                      )}
                    >
                      {ev.title.split("—")[0].trim()}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-gray-400 text-[10px]">+{dayEvents.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex gap-4">
        {Object.entries(PLATFORM_COLORS).slice(0, 3).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", c)} />
            <span className="text-xs text-gray-500">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
