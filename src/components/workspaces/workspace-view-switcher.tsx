"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, ChevronRight, X, AlertTriangle } from "lucide-react";
import { SURFACE_LABELS } from "@/config/workspace-capabilities";
import type { WorkspaceSurface } from "@/lib/workspaces/types";
import type { WorkspaceOption } from "@/app/api/admin/workspaces/route";

type Step = "closed" | "surface" | "entity" | "agency_for_client" | "client_under_agency";

const PREVIEWABLE_SURFACES: Exclude<WorkspaceSurface, "super_admin">[] = ["agency", "agency_client", "direct_business"];

const GENERIC_ENTER_ERROR = "Não foi possível abrir esta visualização.";

// Fase 16 do hotfix 1.0.2 — mapeia razões conhecidas e seguras (nunca stack
// trace, nunca detalhe de banco) para uma orientação específica; qualquer
// razão não mapeada cai na mensagem genérica acima.
const KNOWN_ENTER_ERROR_MESSAGES: Record<string, string> = {
  agency_not_found_or_inactive: "Esta agência não foi encontrada ou está inativa.",
  business_not_found: "Esta empresa não foi encontrada.",
  business_is_agency_managed_not_direct: "Este cliente já é gerenciado por uma agência — abra-o como Cliente da agência.",
  client_not_found: "Este cliente não foi encontrado.",
  no_active_agency_relationship: "Este cliente não tem um vínculo ativo com uma agência.",
  unknown_blueprint: "Esta estrutura demonstrativa não é mais válida.",
  forbidden_not_super_admin: "Sua sessão não tem mais permissão de Super Admin.",
  unauthenticated: "Sua sessão expirou. Entre novamente.",
  signing_key_unavailable: "O serviço de visualização está temporariamente indisponível.",
};

/**
 * "Visualizar como" — the second header control next to the bell (the
 * first, "Painel ADM", exits any active preview — see workspace-exit-button.tsx).
 *
 * Fase 17 do hotfix 1.0.1: o erro novo de ESLint (setState síncrono dentro
 * de useEffect) foi corrigido movendo a busca de opções para dentro dos
 * próprios manipuladores de clique (pickSurface/pickAgency) — a sugestão do
 * próprio lint ("chame setState num callback, não no corpo do efeito").
 * Nenhum useEffect de busca de dados existe mais neste arquivo.
 *
 * Fase 16 do hotfix 1.0.2 — antes, uma falha ao iniciar o preview fechava o
 * menu silenciosamente (close() era chamado incondicionalmente antes de
 * checar body.ok). Agora o menu permanece aberto, mostra uma mensagem clara
 * (específica quando a razão é conhecida e segura, genérica caso contrário),
 * preserva a seleção e permite tentar novamente — nunca navega e nunca
 * expõe detalhe técnico.
 */
export function WorkspaceViewSwitcher() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [pendingSurface, setPendingSurface] = useState<WorkspaceSurface | null>(null);
  const [options, setOptions] = useState<WorkspaceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<WorkspaceOption | null>(null);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  async function fetchOptions(url: string) {
    setLoading(true);
    try {
      const r = await fetch(url);
      const b = (await r.json()) as { ok: boolean; options?: WorkspaceOption[] };
      setOptions(b.ok ? b.options ?? [] : []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  function pickSurface(surface: WorkspaceSurface) {
    setEnterError(null);
    if (surface === "agency_client") {
      setStep("agency_for_client");
      fetchOptions("/api/admin/workspaces?surface=agency");
      return;
    }
    setPendingSurface(surface);
    setStep("entity");
    fetchOptions(`/api/admin/workspaces?surface=${surface}`);
  }

  function pickAgency(agency: WorkspaceOption) {
    setEnterError(null);
    setSelectedAgency(agency);
    setStep("client_under_agency");
    fetchOptions(`/api/admin/workspaces?surface=agency_client&agency_id=${agency.id}`);
  }

  async function enterPreview(opt: WorkspaceOption) {
    const surface = selectedAgency ? "agency_client" : pendingSurface;
    if (!surface) return;
    setEntering(true);
    setEnterError(null);
    try {
      const res = await fetch("/api/admin/workspaces/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface, workspaceId: opt.id, isBlueprint: opt.isBlueprint }),
      });
      const body = (await res.json().catch(() => null)) as { ok: boolean; destination?: string; reason?: string } | null;
      if (body?.ok && body.destination) {
        close();
        router.push(body.destination);
        return;
      }
      // Falha: mantém o menu aberto, a seleção intacta, e mostra uma
      // mensagem segura — nunca fecha o menu nem navega em caso de erro.
      setEnterError((body?.reason && KNOWN_ENTER_ERROR_MESSAGES[body.reason]) || GENERIC_ENTER_ERROR);
    } catch {
      setEnterError(GENERIC_ENTER_ERROR);
    } finally {
      setEntering(false);
    }
  }

  function close() {
    setStep("closed"); setOptions([]); setSelectedAgency(null); setPendingSurface(null); setEnterError(null);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setStep(step === "closed" ? "surface" : "closed")}
        className="p-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-indigo-600"
        title="Visualizar como outro painel"
      >
        <Eye className="w-4 h-4" />
        <span className="hidden md:inline text-xs font-bold">Visualizar como</span>
      </button>

      {step !== "closed" && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-bold text-gray-700">
              {step === "surface" && "Visualizar como"}
              {(step === "entity" || step === "agency_for_client") && "Selecione a entidade"}
              {step === "client_under_agency" && `Cliente de ${selectedAgency?.name}`}
            </p>
            <button onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>

          {step === "surface" && (
            <div className="p-2">
              {PREVIEWABLE_SURFACES.map((s) => (
                <button
                  key={s}
                  onClick={() => pickSurface(s)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {SURFACE_LABELS[s]} <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
              ))}
            </div>
          )}

          {(step === "entity" || step === "agency_for_client" || step === "client_under_agency") && (
            <div className="p-2">
              {enterError && (
                <div className="mb-2 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700 leading-relaxed">{enterError}</p>
                </div>
              )}
              <div className="max-h-64 overflow-y-auto">
                {(loading || entering) && <p className="text-xs text-gray-400 text-center py-4">{entering ? "Entrando…" : "Carregando…"}</p>}
                {!loading && !entering && options.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Nenhum registro encontrado.</p>
                )}
                {!loading && !entering && options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => (step === "agency_for_client" ? pickAgency(opt) : enterPreview(opt))}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="truncate">{opt.name}</span>
                    {opt.isBlueprint && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0 ml-1.5">Blueprint</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
