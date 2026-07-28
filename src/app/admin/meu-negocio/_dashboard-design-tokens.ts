export const dashboardTokens = {
  page: "mn-dashboard-theme bg-[#090b10] text-[#f6f7fb]",
  panel: "border border-[#272d3a] bg-[#11141c] shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
  elevated: "border border-[#3a4354] bg-[#171b26] shadow-[0_16px_36px_rgba(0,0,0,0.28)]",
  muted: "text-[#8993a8]",
  secondary: "text-[#bcc4d4]",
  focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b10]",
  radius: "rounded-lg",
  cardPadding: "p-4 sm:p-5",
  motion: "transition-colors motion-reduce:transition-none",
} as const;

export const dashboardStatus = {
  positive: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  informative: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  simulated: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  integrated: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  manual: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  estimated: "border-amber-500/30 bg-amber-500/10 text-amber-300",
} as const;
