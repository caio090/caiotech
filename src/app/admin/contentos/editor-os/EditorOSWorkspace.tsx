"use client";

import { ArrowLeft, Layers, ScanLine } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { EDITOR_OS_LAYER_SCANNER_STATUS } from "@/lib/rec-os-workflow/types";

const CanvasEditor = dynamic(
  () => import("./CanvasEditor").then((mod) => mod.CanvasEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-xs">Carregando EditorOS…</p>
        </div>
      </div>
    ),
  }
);

interface Client {
  id: string;
  company_name: string;
  segment: string | null;
}

interface EditorOSWorkspaceProps {
  client: Client | null;
  brandName: string | null;
  socialChannels: string[] | null;
  campaignId: string | null;
  contentId: string | null;
  briefingId: string | null;
  returnTo?: string | null;
  /** Fase 16 — handoff expirado (>2h desde a criação do link) nunca quebra a página, só avisa. */
  handoffExpired?: boolean;
  /** Fase 15 — nenhum ativo importado ainda no handoff: o editor abre normalmente para criação, não é um "canvas vazio" indevido. */
  hasAsset?: boolean;
}

export default function EditorOSWorkspace({
  client,
  brandName,
  socialChannels,
  contentId,
  returnTo,
  handoffExpired,
  hasAsset,
}: EditorOSWorkspaceProps) {
  const backHref = returnTo
    ?? (client
      ? `/admin/contentos/criar?client=${client.id}&step=visual`
      : "/admin/contentos/selecionar-cliente");

  const displayName = brandName ?? client?.company_name ?? "";

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 text-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {returnTo ? "Voltar ao conteúdo" : "Voltar"}
        </Link>

        <div className="w-px h-3.5 bg-zinc-700" />

        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-xs">EditorOS</span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5">
            em avaliação
          </span>
        </div>

        {displayName && (
          <>
            <div className="w-px h-3.5 bg-zinc-700" />
            <span className="text-xs text-zinc-400 truncate max-w-[180px]">{displayName}</span>
          </>
        )}

        <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-zinc-500" title={EDITOR_OS_LAYER_SCANNER_STATUS.reason} data-testid="layer-scanner-status-note">
          <ScanLine className="w-3 h-3" />
          Scanner de camadas: {EDITOR_OS_LAYER_SCANNER_STATUS.label.toLowerCase()} — ainda não faz parte do fluxo oficial.
        </div>

        {socialChannels && socialChannels.length > 0 && (
          <div className="ml-auto flex gap-1">
            {socialChannels.slice(0, 4).map((ch) => (
              <span key={ch} className="text-[10px] bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5">
                {ch}
              </span>
            ))}
          </div>
        )}
      </header>

      {handoffExpired && (
        <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between gap-3">
          <span>Este link de edição expirou. Você pode continuar editando este cliente, mas o contexto do conteúdo original pode estar desatualizado.</span>
          {returnTo && <Link href={returnTo} className="font-bold underline shrink-0">Voltar com segurança</Link>}
        </div>
      )}
      {!hasAsset && contentId && (
        <div className="shrink-0 bg-zinc-800/60 px-4 py-1.5 text-[10px] text-zinc-400">
          Nenhum ativo importado ainda — este editor abrirá para criação.
        </div>
      )}

      {/* Editor fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <CanvasEditor
          clientId={client?.id ?? "default"}
          clientName={displayName || undefined}
          contentId={contentId ?? undefined}
        />
      </div>
    </div>
  );
}
