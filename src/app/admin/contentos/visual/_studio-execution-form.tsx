"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { DESIGN_FORMATS, type DesignFormat } from "@/lib/providers/shared/types";
import { VIDIGAL_PNG_DELIVERY_STEPS } from "@/lib/rec-os/studio/skills/vidigal-png/instructions";
import type { VidigalPngOutputContract } from "@/lib/rec-os/studio/skills/vidigal-png/output";

/**
 * Sprint REC OS Studio Foundation V0.2 — client component do bloco
 * "Nova criação visual". Único ponto do Studio que chama
 * POST /api/studio/skills/execute -- nunca importa `openai` nem
 * qualquer provider diretamente (Fase "Vidigal PNG não conhece
 * provider" também vale para a UI: ela só fala com a própria API do
 * projeto). Estados: Pronto/Preparando/Concluído/Erro/IA indisponível
 * (Fase 11).
 */

interface StudioSkillOption {
  id: string;
  name: string;
}

type FormStatus = "idle" | "preparing" | "completed" | "error" | "ai_unavailable";

interface ExecuteApiResponse {
  ok: boolean;
  error?: string;
  code?: string;
  result?: {
    status: string;
    output: VidigalPngOutputContract | null;
    warnings: string[];
    error?: { code: string; message: string };
  };
}

const AI_UNAVAILABLE_CODES = new Set(["STUDIO_AI_PROVIDER_UNAVAILABLE", "STUDIO_SKILL_RUNTIME_UNAVAILABLE"]);

export function StudioExecutionForm({ skills, clientId }: { skills: StudioSkillOption[]; clientId: string | null }) {
  const [freeformBrief, setFreeformBrief] = useState("");
  const [format, setFormat] = useState<DesignFormat>(DESIGN_FORMATS[0].id);
  const [skillId, setSkillId] = useState(skills[0]?.id ?? "");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [output, setOutput] = useState<VidigalPngOutputContract | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleSubmit() {
    if (!freeformBrief.trim() || !skillId) return;
    setStatus("preparing");
    setErrorMessage(null);
    setOutput(null);
    setWarnings([]);

    try {
      const response = await fetch("/api/studio/skills/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId,
          input: { freeformBrief: freeformBrief.trim(), format, companyId: clientId ?? undefined },
        }),
      });
      const data = (await response.json().catch(() => null)) as ExecuteApiResponse | null;

      const code = data?.result?.error?.code ?? data?.code;
      if (data?.ok && data.result?.output) {
        setOutput(data.result.output);
        setWarnings(data.result.warnings ?? []);
        setStatus("completed");
        return;
      }
      if (code && AI_UNAVAILABLE_CODES.has(code)) {
        setStatus("ai_unavailable");
        return;
      }
      setErrorMessage(data?.result?.error?.message ?? data?.error ?? "Não foi possível preparar a direção criativa agora.");
      setStatus("error");
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
      setStatus("error");
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
      <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">Nova criação visual</h2>

      <div>
        <label htmlFor="studio-brief" className="text-xs font-bold text-gray-600 mb-1.5 block">
          O que você quer criar?
        </label>
        <textarea
          id="studio-brief"
          rows={3}
          value={freeformBrief}
          onChange={(e) => setFreeformBrief(e.target.value)}
          placeholder='Ex.: "Quero uma arte do aniversário da Duh para feed."'
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="studio-format" className="text-xs font-bold text-gray-600 mb-1.5 block">Formato</label>
          <select id="studio-format" value={format} onChange={(e) => setFormat(e.target.value as DesignFormat)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
            {DESIGN_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>{f.label} ({f.ratio})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="studio-skill" className="text-xs font-bold text-gray-600 mb-1.5 block">Skill</label>
          <select id="studio-skill" value={skillId} onChange={(e) => setSkillId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
            {skills.map((skill) => (
              <option key={skill.id} value={skill.id}>{skill.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={status === "preparing" || !freeformBrief.trim()}
        className="text-xs font-bold bg-purple-600 text-white px-4 py-2 rounded-xl disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5"
        title="O resultado é direção visual (texto) -- não gera o PNG final"
      >
        {status === "preparing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {status === "preparing" ? "Preparando…" : "Executar Vidigal"}
      </button>

      {status === "ai_unavailable" && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2 items-start">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">IA indisponível no momento -- o provider não está configurado ou não respondeu. Tente novamente mais tarde.</p>
        </div>
      )}

      {status === "error" && errorMessage && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2 items-start">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{errorMessage}</p>
        </div>
      )}

      {status === "completed" && output && (
        <div className="space-y-3 pt-2">
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              {warnings.map((w) => <p key={w} className="text-[10px] text-amber-600">{w}</p>)}
            </div>
          )}
          {VIDIGAL_PNG_DELIVERY_STEPS.filter((s) => s.id !== "variations" && s.id !== "adaptations").map((step) => (
            <div key={step.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-1">
                {String(step.order).padStart(2, "0")} {step.label}
              </p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{output[step.id as "briefReading" | "creativeDirection" | "conceptualBasis" | "visualStructure" | "visualGuidelines" | "generationPrompt"]}</p>
            </div>
          ))}

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-2">07 Variações</p>
            <div className="space-y-2">
              {output.variations.map((v, i) => (
                <div key={`${v.title}-${i}`} className="bg-white border border-gray-100 rounded-lg p-2.5">
                  <p className="text-xs font-bold text-gray-700">{v.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{v.direction}</p>
                  <p className="text-[11px] text-purple-600 mt-0.5">{v.promptDelta}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-2">08 Adaptações</p>
            <ul className="list-disc list-inside space-y-1">
              {output.adaptations.map((a, i) => <li key={i} className="text-xs text-gray-700">{a}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
