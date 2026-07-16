"use client";

import { ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";
import { CanvasEditor } from "./CanvasEditor";

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
}

export default function EditorOSWorkspace({
  client,
  brandName,
  socialChannels,
  contentId,
  returnTo,
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
