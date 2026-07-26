"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, ChevronRight, X, AlertTriangle } from "lucide-react";
import { SURFACE_LABELS } from "@/config/workspace-capabilities";
import type { WorkspaceSurface } from "@/lib/workspaces/types";
import type { WorkspaceOption } from "@/app/api/admin/workspaces/route";

type Step = "closed" | "surface" | "entity" | "agency_for_client" | "client_under_agency";

const PREVIEWABLE_SURFACES: Exclude<WorkspaceSurface, "super_admin">[] = ["agency", "agency_client", "direct_business"];

const GENERIC_ENTER_ERROR = "Não foi possível abrir esta visualização.";

// Hotfix 1.0.9 — the only pathname POST /api/admin/workspaces/preview is
// ever allowed to send back. Validated explicitly before navigating
// instead of trusting any string the response happens to contain.
const PREVIEW_DESTINATION = "/admin/visualizar";

// Sanitized local timing only (a single duration number, never a
// cookie/token/payload) — module-scope, not nested inside the component,
// so react-hooks/purity doesn't (rightly, for actual render code) flag the
// impure performance.now() call; these only ever run from an async click
// handler, never during render.
function startPreviewTimer(): number {
  return performance.now();
}
function logPreviewDuration(label: string, startedAt: number) {
  console.info(`[workspace-preview] ${label}: ${Math.round(performance.now() - startedAt)}ms`);
}

// Fase 16 do hotfix 1.0.2 — mapeia razões conhecidas e seguras (nunca stack
// trace, nunca detalhe de banco) para uma orientação específica; qualquer
// razão não mapeada cai na mensagem genérica acima.
const KNOWN_ENTER_ERROR_MESSAGES: Record<string, string> = {
  agency_not_found_or_inactive: "Esta agência não foi encontrada ou está inativa.",
  business_not_found: "Esta empresa não foi encontrada.",
  business_is_agency_managed_not_direct: "Esta empresa não pertence à superfície selecionada.",
  direct_business_real_not_yet_classified: "Esta empresa não pertence à superfície selecionada.",
  client_not_found: "Este cliente não foi encontrado.",
  no_active_agency_relationship: "Não foi possível confirmar a relação entre agência e cliente.",
  parent_relationship_unresolved: "Não foi possível confirmar a relação entre agência e cliente.",
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
// Fase 8/9 do hotfix 1.0.5 — antes, qualquer resposta ok:false (403, 503,
// erro de rede) virava options:[] silenciosamente, indistinguível de uma
// lista genuinamente vazia — exatamente a causa do P1 "Nenhum registro
// encontrado" nos três blueprints (a rota retornava 503 sem
// SUPABASE_SERVICE_ROLE_KEY, ver src/app/api/admin/workspaces/route.ts).
// optionsState agora distingue os 5 estados exigidos pelo ticket.
type OptionsState = "idle" | "loading" | "ready" | "empty" | "error";

const EMPTY_BLUEPRINT_MESSAGE = "Nenhuma estrutura demonstrativa está disponível.";
const EMPTY_REAL_MESSAGE = "Nenhum workspace real está disponível para esta superfície.";
const LOAD_ERROR_MESSAGE = "Não foi possível carregar as opções de visualização.";

export function WorkspaceViewSwitcher() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState<Step>("closed");
  const [pendingSurface, setPendingSurface] = useState<WorkspaceSurface | null>(null);
  const [options, setOptions] = useState<WorkspaceOption[]>([]);
  const [optionsState, setOptionsState] = useState<OptionsState>("idle");
  const [optionsSource, setOptionsSource] = useState<"blueprint" | "real">("blueprint");
  const [lastOptionsUrl, setLastOptionsUrl] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<WorkspaceOption | null>(null);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  async function fetchOptions(url: string) {
    // Limpa a lista anterior IMEDIATAMENTE — nunca mostra a lista da
    // superfície/agência anterior enquanto a nova carrega (Fase 8).
    setOptions([]);
    setOptionsState("loading");
    setLastOptionsUrl(url);
    try {
      const r = await fetch(url);
      const b = (await r.json().catch(() => null)) as { ok: boolean; source?: "blueprint" | "real"; options?: WorkspaceOption[] } | null;
      if (!b || !b.ok) {
        // Erro HTTP (403/503/500/JSON inválido) NUNCA vira lista vazia.
        setOptionsState("error");
        return;
      }
      const rows = b.options ?? [];
      setOptions(rows);
      setOptionsSource(b.source ?? "blueprint");
      setOptionsState(rows.length === 0 ? "empty" : "ready");
    } catch {
      setOptionsState("error");
    }
  }

  function pickSurface(surface: WorkspaceSurface) {
    setEnterError(null);
    if (surface === "agency_client") {
      setStep("agency_for_client");
      fetchOptions("/api/admin/workspaces?surface=agency&source=blueprint");
      return;
    }
    setPendingSurface(surface);
    setStep("entity");
    fetchOptions(`/api/admin/workspaces?surface=${surface}&source=blueprint`);
  }

  function pickAgency(agency: WorkspaceOption) {
    setEnterError(null);
    setSelectedAgency(agency);
    setStep("client_under_agency");
    fetchOptions(`/api/admin/workspaces?surface=agency_client&agency_id=${agency.id}&source=blueprint`);
  }

  function retryFetchOptions() {
    if (lastOptionsUrl) void fetchOptions(lastOptionsUrl);
  }

  // Hotfix 1.0.9 — 1.0.8's router.push()+router.refresh() fix worked, but
  // Production QA measured 4-7s to switch blueprints and found a full
  // repaint gap before the new context appeared. Both symptoms trace to
  // the same design flaw: push() and refresh() are two SEPARATE App
  // Router round-trips (a soft navigation, then an independent RSC
  // re-fetch of the same tree) layered on top of this component's own
  // still-mounted effects (name/notification fetches in
  // _layout-client.tsx) re-running again on top of that — three phases
  // of async work the user sees as one long stall with no visual
  // feedback in between.
  //
  // A workspace switch is a privileged-context boundary, not an ordinary
  // in-app navigation — it deserves the same treatment as a tenant
  // switch: exactly one server round trip (this POST) to mutate the
  // session, then exactly one real browser navigation
  // (window.location.assign) that discards the Router Cache, every React
  // effect, and every stale closure at once, and shows the browser's own
  // native loading indicator instead of a silent async gap.
  async function enterPreview(opt: WorkspaceOption) {
    if (entering) return; // one activation in flight at a time
    const surface = selectedAgency ? "agency_client" : pendingSurface;
    if (!surface) return;
    setEntering(true);
    setEnterError(null);
    // Fase 6 — lets the next Production QA pass confirm this POST itself
    // isn't what caused the 4-7s observed in 1.0.8 (the suspected cause is
    // the removed push()+refresh() double round-trip, not this request).
    const requestStartedAt = startPreviewTimer();
    try {
      const res = await fetch("/api/admin/workspaces/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface, workspaceId: opt.id, isBlueprint: opt.isBlueprint }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; destination?: string; reason?: string } | null;
      logPreviewDuration("ativação", requestStartedAt);

      if (res.ok && body?.ok === true && body.destination === PREVIEW_DESTINATION) {
        // Success: do NOT reset `entering` — the "Trocando ambiente..."
        // state (and the disabled options list) stays exactly as it is
        // until the browser actually unloads this document for the new
        // one. There is nothing left to keep in sync locally: the current
        // panel intentionally stays on screen, unchanged, until the real
        // navigation replaces it wholesale.
        window.location.assign(body.destination);
        return;
      }

      // Any other outcome (network error, non-2xx, malformed body, or a
      // destination that doesn't match the one allowed value) is treated
      // as failure — never navigate on an ambiguous response. Menu stays
      // open, selection intact, current context untouched.
      setEnterError((body?.reason && KNOWN_ENTER_ERROR_MESSAGES[body.reason]) || GENERIC_ENTER_ERROR);
      setEntering(false);
    } catch {
      setEnterError(GENERIC_ENTER_ERROR);
      setEntering(false);
    }
  }

  function close(returnFocus = false) {
    setStep("closed"); setOptions([]); setOptionsState("idle"); setLastOptionsUrl(null);
    setSelectedAgency(null); setPendingSurface(null); setEnterError(null);
    if (returnFocus) triggerRef.current?.focus();
  }

  // Fase 12 do hotfix 1.0.5 — Escape fecha o modal e devolve o foco ao
  // botão que o abriu, em vez de deixá-lo perdido no documento.
  useEffect(() => {
    if (step === "closed") return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close(true);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [step]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setStep(step === "closed" ? "surface" : "closed")}
        className="p-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-indigo-600"
        title="Visualizar como outro painel"
        aria-label="Visualizar como outro painel"
        aria-haspopup="menu"
        aria-expanded={step !== "closed"}
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
            <button onClick={() => close(true)} aria-label="Fechar" className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
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
                {entering && <p className="text-xs text-gray-400 text-center py-4">Trocando ambiente…</p>}
                {!entering && optionsState === "loading" && (
                  <p className="text-xs text-gray-400 text-center py-4">Carregando…</p>
                )}
                {!entering && optionsState === "empty" && (
                  <p className="text-xs text-gray-400 text-center py-4">
                    {optionsSource === "real" ? EMPTY_REAL_MESSAGE : EMPTY_BLUEPRINT_MESSAGE}
                  </p>
                )}
                {!entering && optionsState === "error" && (
                  <div className="text-center py-4">
                    <p className="text-xs text-red-600 mb-2">{LOAD_ERROR_MESSAGE}</p>
                    <button
                      onClick={retryFetchOptions}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}
                {!entering && optionsState === "ready" && options.map((opt) => (
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
