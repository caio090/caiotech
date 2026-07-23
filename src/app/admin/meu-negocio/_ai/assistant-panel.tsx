"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, MessageCircle, Mic, Paperclip, Wand2 } from "lucide-react";
import type { AssistantContextSnapshot, ProposedUpdate } from "@/lib/motor-lokat/ai/types";
import { useAssistantAvailability } from "./assistant-availability";
import { AssistantChat } from "./chat";
import { ReportUpload } from "./report-upload";
import { PushToTalk } from "./push-to-talk";
import { ProposedUpdatesPanel } from "./proposed-updates-panel";
import { useAssistantSession } from "./use-assistant-session";

type PanelAction = "ask" | "voice" | "report" | "fill" | null;

const PAGE_GREETING: Record<string, string> = {
  overview: "Posso ajudar a interpretar os números deste painel.",
  business: "Posso ajudar a completar o DNA, os 4 Ps e o SWOT.",
  products: "Posso analisar custo, preço, margem e teste deste produto.",
  campaigns: "Posso ajudar a planejar ou interpretar uma campanha.",
  pricing: "Posso ajudar a definir um preço mínimo saudável.",
  cashflow: "Posso ajudar a interpretar o fluxo de caixa.",
};

interface Props {
  page: string;
  context: AssistantContextSnapshot;
  onApplyProposedUpdates: (updates: ProposedUpdate[]) => void;
}

/** Fase 5 — persistent assistant: right-side panel on desktop, bottom sheet on mobile. Never a generic chatbot screen. */
export function AssistantPanel({ page, context, onApplyProposedUpdates }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState<PanelAction>(null);
  const greeting = PAGE_GREETING[page] ?? "Posso ajudar a interpretar e completar informações deste negócio.";
  const configured = useAssistantAvailability();

  const body = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--business-border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--business-accent-soft)" }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--business-accent)" }} />
          </div>
          <p className="text-xs font-black" style={{ color: "var(--business-text)" }}>Assistente LOKAT</p>
        </div>
        <button onClick={() => setIsOpen(false)} aria-label="Fechar assistente" className="p-1 rounded-lg" style={{ color: "var(--business-muted)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 flex-1 overflow-y-auto space-y-3">
        {!configured && (
          <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--business-border)", background: "var(--business-surface-soft)" }}>
            <p className="text-[11px] font-bold" style={{ color: "var(--business-text)" }}>Assistente temporariamente indisponível</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--business-muted)" }}>O painel continua funcionando normalmente — os cálculos não dependem da IA.</p>
          </div>
        )}

        {!action && (
          <>
            <p className="text-xs" style={{ color: "var(--business-muted)" }}>{greeting}</p>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton icon={MessageCircle} label="Perguntar" onClick={() => setAction("ask")} disabled={!configured} />
              <ActionButton icon={Mic} label="Falar" onClick={() => setAction("voice")} disabled={!configured} />
              <ActionButton icon={Paperclip} label="Anexar relatório" onClick={() => setAction("report")} disabled={!configured} />
              <ActionButton icon={Wand2} label="Preencher comigo" onClick={() => setAction("fill")} disabled={!configured} />
            </div>
          </>
        )}

        {action && (
          <button onClick={() => setAction(null)} className="text-[10px] font-bold" style={{ color: "var(--business-muted)" }}>← Voltar às ações</button>
        )}

        {action === "ask" && <div className="h-72"><AssistantChat mode="interpret" context={context} placeholder={greeting} /></div>}
        {action === "report" && <ReportUpload context={context} onApply={onApplyProposedUpdates} />}
        {action === "voice" && <VoiceFillFlow context={context} onApply={onApplyProposedUpdates} />}
        {action === "fill" && <FillFlow context={context} onApply={onApplyProposedUpdates} />}
      </div>
    </div>
  );

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          data-testid="assistant-panel-toggle"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-white shadow-lg"
          style={{ background: "var(--business-accent)" }}
        >
          <Sparkles className="w-4 h-4" /> <span className="text-xs font-bold hidden sm:inline">Assistente LOKAT</span>
        </button>
      )}

      {/* Desktop: collapsible right-side panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="desktop-panel"
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "tween", duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="hidden sm:flex fixed top-0 right-0 h-full w-[360px] z-50 flex-col shadow-2xl border-l"
            style={{ background: "var(--business-bg)", borderColor: "var(--business-border)" }}
          >
            {body}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: bottom sheet */}
      <AnimatePresence>
        {isOpen && (
          <motion.div key="mobile-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setIsOpen(false)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl overflow-hidden flex flex-col"
              style={{ background: "var(--business-bg)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto mt-2" style={{ background: "var(--business-border)" }} />
              <div className="flex-1 overflow-y-auto">{body}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ActionButton({ icon: Icon, label, onClick, disabled }: { icon: React.ElementType; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-xl border py-3 disabled:opacity-40"
      style={{ borderColor: "var(--business-border)", background: "var(--business-surface)", color: "var(--business-text)" }}
    >
      <Icon className="w-4 h-4" style={{ color: "var(--business-accent)" }} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function FillFlow({ context, onApply }: { context: AssistantContextSnapshot; onApply: (updates: ProposedUpdate[]) => void }) {
  const { status, errorMessage, askStructured } = useAssistantSession();
  const [text, setText] = useState("");
  const [proposals, setProposals] = useState<ProposedUpdate[] | null>(null);
  const isBusy = status === "sending";

  async function submit() {
    if (!text.trim() || isBusy) return;
    const result = await askStructured("fill", text.trim(), context);
    if (result) setProposals(result.proposedUpdates);
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Descreva o que você quer preencher (ex.: 'faturamos R$ 12.000 este mês e o custo direto foi R$ 5.000')"
        rows={3}
        aria-label="Descrição para preenchimento assistido"
        className="w-full text-xs rounded-xl px-3 py-2 outline-none border resize-none"
        style={{ borderColor: "var(--business-border)", background: "var(--business-surface)" }}
      />
      <button onClick={submit} disabled={isBusy || !text.trim()} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40" style={{ background: "var(--business-accent)" }}>
        {isBusy ? "Analisando..." : "Analisar e propor preenchimento"}
      </button>
      {status === "blocked" && <p className="text-[11px]" style={{ color: "var(--business-muted)" }}>Assistente temporariamente indisponível.</p>}
      {status === "error" && errorMessage && <p className="text-[11px] text-red-600">{errorMessage}</p>}
      {proposals && <ProposedUpdatesPanel updates={proposals} onApply={onApply} onCancel={() => setProposals(null)} />}
    </div>
  );
}

function VoiceFillFlow({ context, onApply }: { context: AssistantContextSnapshot; onApply: (updates: ProposedUpdate[]) => void }) {
  const { status, errorMessage, askStructured } = useAssistantSession();
  const [proposals, setProposals] = useState<ProposedUpdate[] | null>(null);

  async function handleTranscribed(text: string) {
    const result = await askStructured("fill", text, context);
    if (result) setProposals(result.proposedUpdates);
  }

  return (
    <div className="space-y-2">
      <PushToTalk onTranscribed={handleTranscribed} />
      {status === "sending" && <p className="text-[11px]" style={{ color: "var(--business-muted)" }}>Interpretando o que foi dito...</p>}
      {status === "blocked" && <p className="text-[11px]" style={{ color: "var(--business-muted)" }}>Assistente temporariamente indisponível.</p>}
      {status === "error" && errorMessage && <p className="text-[11px] text-red-600">{errorMessage}</p>}
      {proposals && <ProposedUpdatesPanel updates={proposals} onApply={onApply} onCancel={() => setProposals(null)} />}
    </div>
  );
}
