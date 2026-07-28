export const dashboardTokens = {
  page: "bg-[#f4f5f8] text-slate-950",
  panel: "border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
  elevated: "border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]",
  muted: "text-slate-500",
  secondary: "text-slate-600",
  focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
  radius: "rounded-lg",
  cardPadding: "p-4 sm:p-5",
  motion: "transition-colors motion-reduce:transition-none",
} as const;

export const dashboardStatus = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  informative: "border-sky-200 bg-sky-50 text-sky-700",
  simulated: "border-violet-200 bg-violet-50 text-violet-700",
  integrated: "border-emerald-200 bg-emerald-50 text-emerald-700",
  manual: "border-blue-200 bg-blue-50 text-blue-700",
  estimated: "border-amber-200 bg-amber-50 text-amber-800",
} as const;
