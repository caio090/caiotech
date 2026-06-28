"use client";

interface OptionCardProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

export function DiagnosticOptionCard({ label, selected, onSelect }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="marketing-diagnostic-option"
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: ".85rem 1.1rem",
        background: selected ? "rgba(123,110,246,0.12)" : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${selected ? "#7b6ef6" : "#2a2040"}`,
        borderRadius: "10px",
        cursor: "pointer",
        color: selected ? "#c4baff" : "#b0a8c8",
        fontSize: ".9rem",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: selected ? 600 : 400,
        transition: "all .18s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span style={{
        display: "inline-block",
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        border: `2px solid ${selected ? "#7b6ef6" : "#3a3054"}`,
        background: selected ? "#7b6ef6" : "transparent",
        marginRight: ".7rem",
        verticalAlign: "middle",
        flexShrink: 0,
        transition: "all .18s ease",
        boxShadow: selected ? "0 0 8px rgba(123,110,246,0.5)" : "none",
      }} />
      {label}
    </button>
  );
}
