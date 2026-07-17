"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyIdButtonProps {
  id: string;
  label?: string;
  className?: string;
}

export function CopyIdButton({ id, label = "Copiar ID", className = "" }: CopyIdButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!id) return;
    const copy = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id).then(copy).catch(() => {
        fallbackCopy(id);
        copy();
      });
    } else {
      fallbackCopy(id);
      copy();
    }
  }

  return (
    <button
      type="button"
      aria-label={copied ? "ID copiado" : `${label}: ${id}`}
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
        copied
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          {label}
        </>
      )}
    </button>
  );
}

function fallbackCopy(text: string) {
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  } catch {
    // silent — copy unavailable in this context
  }
}
