"use client";
import { useState, useCallback } from "react";
import { Lightbulb, X, Check, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import type { AISuggestion } from "@/lib/ai-suggestions";

// ── Badge helpers ─────────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, string> = {
  urgente: "bg-red-100 text-red-700 border-red-200",
  alta:    "bg-orange-100 text-orange-700 border-orange-200",
  media:   "bg-amber-50 text-amber-700 border-amber-200",
  baixa:   "bg-gray-100 text-gray-500 border-gray-200",
};

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  risk_alert:     { label: "Risco",          cls: "bg-red-50 text-red-600 border-red-100" },
  next_action:    { label: "Próxima ação",   cls: "bg-purple-50 text-purple-700 border-purple-100" },
  opportunity:    { label: "Oportunidade",   cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  reminder:       { label: "Lembrete",       cls: "bg-amber-50 text-amber-700 border-amber-100" },
  optimization:   { label: "Otimização",     cls: "bg-blue-50 text-blue-700 border-blue-100" },
  content_idea:   { label: "Conteúdo",       cls: "bg-pink-50 text-pink-700 border-pink-100" },
  workflow:       { label: "Fluxo",          cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  financial:      { label: "Financeiro",     cls: "bg-green-50 text-green-700 border-green-100" },
  commercial:     { label: "Comercial",      cls: "bg-teal-50 text-teal-700 border-teal-100" },
  production:     { label: "Produção",       cls: "bg-violet-50 text-violet-700 border-violet-100" },
  report_insight: { label: "Relatório",      cls: "bg-slate-50 text-slate-700 border-slate-100" },
  productivity:   { label: "Produtividade",  cls: "bg-cyan-50 text-cyan-700 border-cyan-100" },
  voice_prompt:   { label: "Voice",          cls: "bg-gray-50 text-gray-600 border-gray-100" },
};

// ── Persistence (fire-and-forget) ─────────────────────────────────────────────

async function persistAction(suggestion: AISuggestion, action: "accepted" | "dismissed") {
  if (!isSupabaseConfigured) return;
  try {
    const supabase = createClient();
    await supabase.from("ai_suggestions").upsert({
      id:              suggestion.id,
      module:          suggestion.module,
      entity_type:     suggestion.entity_type ?? null,
      entity_id:       suggestion.entity_id ?? null,
      client_id:       suggestion.client_id ?? null,
      title:           suggestion.title,
      description:     suggestion.description,
      suggestion_type: suggestion.suggestion_type,
      priority:        suggestion.priority,
      source:          suggestion.source ?? null,
      action_label:    suggestion.action_label ?? null,
      action_url:      suggestion.action_url ?? null,
      status:          action === "accepted" ? "accepted" : "dismissed",
      accepted_at:     action === "accepted" ? new Date().toISOString() : null,
      dismissed_at:    action === "dismissed" ? new Date().toISOString() : null,
      created_by:      "system",
    });
  } catch {
    // Table may not exist yet — silent fail
  }
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  suggestions: AISuggestion[];
  title?: string;
  compact?: boolean;
  className?: string;
}

export function SmartSuggestionsPanel({ suggestions, title = "Sugestões Inteligentes", compact = false, className = "" }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [accepted, setAccepted]   = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const visible = suggestions.filter(s => !dismissed.has(s.id));
  const activeVisible = visible.filter(s => !accepted.has(s.id));

  const handleDismiss = useCallback((s: AISuggestion) => {
    setDismissed(prev => new Set(prev).add(s.id));
    persistAction(s, "dismissed");
  }, []);

  const handleAccept = useCallback((s: AISuggestion) => {
    setAccepted(prev => new Set(prev).add(s.id));
    persistAction(s, "accepted");
  }, []);

  if (suggestions.length === 0) return null;

  return (
    <div className={`bg-white border border-gray-100 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-black text-gray-700 uppercase tracking-wider">{title}</span>
          {activeVisible.length > 0 && (
            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
              {activeVisible.length}
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {!collapsed && (
        <div className="border-t border-gray-50">
          {visible.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-xs text-gray-400">Nenhuma sugestão no momento.</p>
            </div>
          ) : (
            <div className={compact ? "divide-y divide-gray-50" : "divide-y divide-gray-50"}>
              {visible.map((s) => {
                const isAccepted = accepted.has(s.id);
                const typeBadge  = TYPE_LABEL[s.suggestion_type] ?? { label: s.suggestion_type, cls: "bg-gray-50 text-gray-600 border-gray-100" };
                const priBadge   = PRIORITY_BADGE[s.priority] ?? PRIORITY_BADGE.media;

                return (
                  <div
                    key={s.id}
                    className={`px-4 py-3 ${isAccepted ? "opacity-50" : ""} transition-opacity`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${typeBadge.cls}`}>
                            {typeBadge.label}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${priBadge}`}>
                            {s.priority.charAt(0).toUpperCase() + s.priority.slice(1)}
                          </span>
                          {isAccepted && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Aceito
                            </span>
                          )}
                        </div>

                        {/* Title + description */}
                        <p className="text-xs font-bold text-gray-800 leading-tight">{s.title}</p>
                        {!compact && s.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{s.description}</p>
                        )}
                        {s.source && (
                          <p className="text-[9px] text-gray-300 mt-0.5">{s.source}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                        {s.action_url && !isAccepted && (
                          <Link
                            href={s.action_url}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            title={s.action_label ?? "Ver"}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {!isAccepted && (
                          <button
                            onClick={() => handleAccept(s)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Aceitar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(s)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
                          title="Ignorar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
