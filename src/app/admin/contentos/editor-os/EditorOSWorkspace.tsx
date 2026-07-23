"use client";

import { ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

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
  /** Fase 5 — "demo" never touches Supabase and never receives real client/content data. Defaults to "authenticated" so any other caller keeps today's behavior. */
  runtimeMode?: "authenticated" | "demo";
  client: Client | null;
  brandName: string | null;
  socialChannels: string[] | null;
  campaignId: string | null;
  contentId: string | null;
  briefingId: string | null;
  returnTo?: string | null;
}

export default function EditorOSWorkspace({
  runtimeMode = "authenticated",
  client,
  brandName,
  socialChannels,
  contentId,
  returnTo,
}: EditorOSWorkspaceProps) {
  const isDemo = runtimeMode === "demo";

  const backHref = returnTo
    ?? (client
      ? `/admin/contentos/criar?client=${client.id}&step=visual`
      : "/admin/contentos/selecionar-cliente");

  // Fase 5/6 — in demo mode there is no real client, so there is no real
  // display name either, regardless of what a caller might pass in.
  const displayName = isDemo ? "" : (brandName ?? client?.company_name ?? "");

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 py-2.5 flex items-center gap-3 shrink-0">
        {isDemo ? (
          <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            Demonstração
          </span>
        ) : (
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 text-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {returnTo ? "Voltar ao conteúdo" : "Voltar"}
          </Link>
        )}

        <div className="w-px h-3.5 bg-zinc-700" />

        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-xs">{isDemo ? "EditorOS — Demonstração" : "EditorOS"}</span>
          {isDemo ? (
            <span data-testid="editor-demo-mode-badge" className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded px-1.5 py-0.5">
              Modo demonstração
            </span>
          ) : (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5">
              em avaliação
            </span>
          )}
        </div>

        {displayName && (
          <>
            <div className="w-px h-3.5 bg-zinc-700" />
            <span className="text-xs text-zinc-400 truncate max-w-[180px]">{displayName}</span>
          </>
        )}

        {!isDemo && socialChannels && socialChannels.length > 0 && (
          <div className="ml-auto flex gap-1">
            {socialChannels.slice(0, 4).map((ch) => (
              <span key={ch} className="text-[10px] bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5">
                {ch}
              </span>
            ))}
          </div>
        )}
      </header>

      {isDemo && (
        <p className="bg-indigo-950/60 border-b border-indigo-900/60 text-indigo-300 text-[11px] text-center py-1.5 px-4 shrink-0">
          Os dados desta demonstração ficam apenas neste navegador e não são enviados ao banco.
        </p>
      )}

      {/* Editor fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <CanvasEditor
          clientId={isDemo ? "demo" : (client?.id ?? "default")}
          clientName={displayName || undefined}
          contentId={isDemo ? undefined : (contentId ?? undefined)}
          demoMode={isDemo}
        />
      </div>
    </div>
  );
}
