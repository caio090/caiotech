"use client";

/**
 * Prompt 16 (REC OS Persistence Completion) — Fase 10-17/46: fecha o
 * P1-A do QA do Prompt 13 (Feed DNA tinha schema/RLS/resolver mas
 * nenhuma UI capaz de editar/salvar/recarregar).
 *
 * Client wrapper mínimo (Fase 46): a página do Studio é Server
 * Component e não pode passar closures pro EmptyStateGuide -- este
 * componente é o único pedaço client-side necessário pra isso, nunca
 * a página inteira virou client component.
 *
 * Hidrata a partir de `initial` (já resolvido server-side em page.tsx,
 * Fase 14 -- nunca depende só do valor salvo em React de uma sessão
 * anterior). Um refresh de página sempre passa por page.tsx de novo,
 * que resolve `resolveFeedDnaProfile` contra o Supabase real -- esse é
 * o critério de verdade (Fase 15).
 */
import { useState } from "react";
import { Loader2, Check, AlertTriangle, Palette, Pencil } from "lucide-react";
import type { FeedDnaPatternType, ResolveFeedDnaResult } from "@/lib/rec-os/social-profile/feed-dna";

const PATTERN_LABEL: Record<FeedDnaPatternType, string> = {
  FREE: "Livre", ALTERNATING: "Alternado", CHECKERBOARD: "Xadrez", COLUMN_RHYTHM: "Ritmo por colunas",
  ROW_BLOCKS: "Blocos por linha", COLOR_SEQUENCE: "Sequência de cores", CAMPAIGN_BLOCKS: "Blocos de campanha", CUSTOM: "Personalizado",
};
const PATTERN_OPTIONS = Object.keys(PATTERN_LABEL) as FeedDnaPatternType[];

type SaveState = "idle" | "saving" | "saved" | "error";

function parsePaletteInput(value: string): string[] {
  return value.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 8);
}

export function FeedDnaSection({ clientId, initial }: { clientId: string | null; initial: ResolveFeedDnaResult | null }) {
  const [result, setResult] = useState<ResolveFeedDnaResult | null>(initial);
  const [editing, setEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const existingProfile = result?.status === "resolved" ? result.profile : null;
  const [patternType, setPatternType] = useState<FeedDnaPatternType>(existingProfile?.patternType ?? "FREE");
  const [dominantPaletteInput, setDominantPaletteInput] = useState((existingProfile?.dominantPalette ?? []).join(", "));
  const [secondaryPaletteInput, setSecondaryPaletteInput] = useState((existingProfile?.secondaryPalette ?? []).join(", "));
  const [compositionRhythm, setCompositionRhythm] = useState(existingProfile?.compositionRhythm ?? "");
  const [notes, setNotes] = useState((existingProfile?.patternConfig as { notes?: string } | null)?.notes ?? "");

  if (!clientId) return null; // Free Mode nunca tem Feed DNA (Fase 09/Prompt 13).

  if (result?.status === "not_configured") {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
        <p className="text-xs font-bold text-amber-700">Feed DNA indisponível</p>
        <p className="text-[11px] text-amber-600 mt-0.5">O armazenamento de Feed DNA ainda não foi configurado neste ambiente.</p>
      </div>
    );
  }

  function openEditor() {
    if (existingProfile) {
      setPatternType(existingProfile.patternType);
      setDominantPaletteInput((existingProfile.dominantPalette ?? []).join(", "));
      setSecondaryPaletteInput((existingProfile.secondaryPalette ?? []).join(", "));
      setCompositionRhythm(existingProfile.compositionRhythm ?? "");
      setNotes((existingProfile.patternConfig as { notes?: string } | null)?.notes ?? "");
    }
    setSaveState("idle");
    setErrorMessage(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!clientId) return;
    setSaveState("saving");
    setErrorMessage(null);
    try {
      const response = await fetch("/api/rec-os/feed-dna", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId, patternType,
          dominantPalette: parsePaletteInput(dominantPaletteInput),
          secondaryPalette: parsePaletteInput(secondaryPaletteInput),
          compositionRhythm: compositionRhythm.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setSaveState("error");
        setErrorMessage(data?.error ?? "Não foi possível salvar o Feed DNA agora.");
        return;
      }
      // Fase 12 -- nunca fecha o editor silenciosamente antes da confirmação do banco.
      setResult({ status: "resolved", profile: data.profile });
      setSaveState("saved");
      setEditing(false);
    } catch {
      setSaveState("error");
      setErrorMessage("Não foi possível conectar ao servidor.");
    }
  }

  if (!editing) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-purple-500" />
            {existingProfile ? `Feed DNA: ${PATTERN_LABEL[existingProfile.patternType]}` : "Feed DNA ainda não definido"}
          </p>
          {existingProfile ? (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {existingProfile.userOverride ? "Definido manualmente" : "Sugerido pela IA"}
              {existingProfile.dominantPalette.length > 0 && ` · ${existingProfile.dominantPalette.slice(0, 4).join(", ")}`}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">Defina o padrão de expressão deste feed ao longo do tempo.</p>
          )}
        </div>
        <button type="button" onClick={openEditor} className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 shrink-0">
          <Pencil className="w-3 h-3" /> {existingProfile ? "Editar Feed DNA" : "Configurar Feed DNA"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">Feed DNA</p>

      <div>
        <p className="text-[11px] font-bold text-gray-600 mb-1">Padrão do feed</p>
        <div className="flex flex-wrap gap-1.5">
          {PATTERN_OPTIONS.map((p) => (
            <button key={p} type="button" onClick={() => setPatternType(p)}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg ${patternType === p ? "bg-purple-600 text-white" : "bg-gray-50 text-gray-500"}`}>
              {PATTERN_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="fdna-dominant" className="text-[11px] font-bold text-gray-600 mb-1 block">Paleta principal (cores separadas por vírgula)</label>
          <input id="fdna-dominant" type="text" value={dominantPaletteInput} onChange={(e) => setDominantPaletteInput(e.target.value)}
            placeholder="#1a1a1a, #f5f5f0" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div>
          <label htmlFor="fdna-secondary" className="text-[11px] font-bold text-gray-600 mb-1 block">Paleta secundária</label>
          <input id="fdna-secondary" type="text" value={secondaryPaletteInput} onChange={(e) => setSecondaryPaletteInput(e.target.value)}
            placeholder="#e8b923" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
      </div>

      <div>
        <label htmlFor="fdna-rhythm" className="text-[11px] font-bold text-gray-600 mb-1 block">Ritmo/composição</label>
        <input id="fdna-rhythm" type="text" value={compositionRhythm} onChange={(e) => setCompositionRhythm(e.target.value)}
          placeholder="Ex.: foto, arte, foto, arte" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-200" />
      </div>

      <div>
        <label htmlFor="fdna-notes" className="text-[11px] font-bold text-gray-600 mb-1 block">Observações</label>
        <textarea id="fdna-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-purple-200" />
      </div>

      {saveState === "error" && errorMessage && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-2 flex gap-1.5 items-start">
          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-600">{errorMessage}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => void handleSave()} disabled={saveState === "saving"}
          className="text-xs font-bold bg-purple-600 text-white px-3 py-1.5 rounded-lg disabled:bg-gray-200 disabled:text-gray-400 flex items-center gap-1.5">
          {saveState === "saving" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          {saveState === "saving" ? "Salvando…" : "Salvar Feed DNA"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600">
          Cancelar
        </button>
      </div>
    </div>
  );
}
