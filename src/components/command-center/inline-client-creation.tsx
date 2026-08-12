"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, AlertTriangle } from "lucide-react";

/**
 * Sprint Command Center + Jarvis Context V1 (Problema 3) — criação de
 * cliente inline no Command Center. Reaproveita EXATAMENTE
 * POST /api/admin/clients (mesmos gates/roles/RPC já existentes) -- nenhuma
 * segunda API, nenhuma segunda tabela, nenhuma regra de negócio nova.
 * Só o nome da empresa é obrigatório (contrato real do backend); status
 * inicial limitado a onboarding/aguardando_validacao (nunca inventa um
 * status novo). Mutation só acontece após confirmação explícita do preview.
 */

type Step = "name" | "preview" | "creating" | "success" | "error";

interface CreatedClient {
  id: string;
  company_name: string;
  segment: string | null;
  status: string;
}

const STATUS_OPTIONS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "aguardando_validacao", label: "Aguardando validação" },
] as const;

export function InlineClientCreation({ onClose, onProjectRequested }: {
  onClose: () => void;
  onProjectRequested: (companyId: string, companyName: string) => void;
}) {
  const [step, setStep] = useState<Step>("name");
  const [companyName, setCompanyName] = useState("");
  const [segment, setSegment] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<string>("onboarding");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedClient | null>(null);

  async function handleConfirm() {
    setStep("creating");
    setError(null);
    try {
      const isEmail = contact.includes("@");
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          segment: segment.trim() || undefined,
          responsible_name: responsibleName.trim() || undefined,
          email: isEmail ? contact.trim() : undefined,
          phone: !isEmail && contact.trim() ? contact.trim() : undefined,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Não foi possível criar o cliente agora.");
        setStep("error");
        return;
      }
      setCreated({ id: data.id, company_name: data.company_name, segment: data.segment ?? null, status: data.status });
      setStep("success");
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setStep("error");
    }
  }

  if (step === "name") {
    return (
      <div className="p-4 space-y-3" data-testid="inline-client-creation-name">
        <p className="text-sm font-bold text-white">Nova empresa</p>
        <p className="text-xs text-white/50">Qual é o nome da empresa?</p>
        <input
          autoFocus
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && companyName.trim()) setStep("preview"); }}
          placeholder="Ex.: Top Fitness"
          className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!companyName.trim()}
            onClick={() => setStep("preview")}
            data-testid="inline-client-creation-continue"
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
          >
            Continuar <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onClose} className="text-xs text-white/50 hover:text-white/80 px-2">Cancelar</button>
        </div>
      </div>
    );
  }

  if (step === "preview" || step === "creating") {
    return (
      <div className="p-4 space-y-3" data-testid="inline-client-creation-preview">
        <p className="text-sm font-bold text-white">{companyName}</p>
        <div className="space-y-2">
          <input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Segmento (opcional)" className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-400" />
          <input value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} placeholder="Responsável (opcional)" className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-400" />
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="WhatsApp ou e-mail (opcional)" className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-400" />
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${status === s.value ? "bg-indigo-600 text-white" : "bg-white/10 text-white/50"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={step === "creating"}
            onClick={handleConfirm}
            data-testid="inline-client-creation-confirm"
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
          >
            {step === "creating" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Criar cliente
          </button>
          <button type="button" disabled={step === "creating"} onClick={onClose} className="text-xs text-white/50 hover:text-white/80 px-2">Cancelar</button>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="p-4 space-y-3" data-testid="inline-client-creation-error">
        <div className="flex items-start gap-1.5 text-xs text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep("preview")} className="text-xs font-bold text-indigo-300 hover:text-indigo-200">Tentar de novo</button>
          <button type="button" onClick={onClose} className="text-xs text-white/50 hover:text-white/80">Fechar</button>
        </div>
      </div>
    );
  }

  // success
  if (!created) return null;
  return (
    <div className="p-4 space-y-3" data-testid="inline-client-creation-success">
      <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
        <Check className="w-4 h-4" /> {created.company_name} criada
      </p>
      <p className="text-xs text-white/50">{created.segment ?? "Sem segmento"} · {created.status}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/empresa?client=${created.id}`}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
        >
          Abrir empresa <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => onProjectRequested(created.id, created.company_name)}
          className="bg-white/10 hover:bg-white/20 text-white/90 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
        >
          Criar projeto
        </button>
        <button type="button" onClick={onClose} className="text-xs text-white/50 hover:text-white/80 px-2 py-2">Fechar</button>
      </div>
    </div>
  );
}
