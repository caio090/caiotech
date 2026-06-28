"use client";

export function DiagnosticProgress({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}>
        <span style={{ fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#9d8fff", fontFamily: "'Space Mono', monospace" }}>
          Passo {step} de {total}
        </span>
        <span style={{ fontSize: ".7rem", letterSpacing: ".1em", color: "#5a5070", fontFamily: "'Space Mono', monospace" }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: "3px", background: "#1e1830", borderRadius: "2px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(to right, #7b6ef6, #c4baff)",
            borderRadius: "2px",
            transition: "width .5s cubic-bezier(.16,1,.3,1)",
          }}
        />
      </div>
    </div>
  );
}
