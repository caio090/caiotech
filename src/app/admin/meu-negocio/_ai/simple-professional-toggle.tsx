"use client";

import { cn } from "@/lib/utils";

export type ExplanationLevel = "simples" | "profissional";

/**
 * Fase 15 — every assistant explanation can toggle between plain language and
 * the technical term. Never hides the technical term entirely, never leads
 * with jargon by default.
 */
export function SimpleProfessionalToggle({ level, onChange }: { level: ExplanationLevel; onChange: (level: ExplanationLevel) => void }) {
  return (
    <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: "var(--business-border)", background: "var(--business-surface)" }}>
      {(["simples", "profissional"] as const).map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          aria-pressed={level === option}
          className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors")}
          style={level === option ? { background: "var(--business-accent)", color: "white" } : { color: "var(--business-muted)" }}
        >
          {option === "simples" ? "Explicação simples" : "Detalhe profissional"}
        </button>
      ))}
    </div>
  );
}

export function ExplanationText({ level, simple, technical }: { level: ExplanationLevel; simple: string; technical: string }) {
  return <p className="text-xs leading-relaxed" style={{ color: "var(--business-text)" }}>{level === "simples" ? simple : technical}</p>;
}
