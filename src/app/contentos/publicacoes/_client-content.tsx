"use client";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { mockContents } from "@/data/mock-data";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { Copy, ExternalLink, Inbox, LoaderCircle, Send } from "lucide-react";
import type { DbContentItem } from "@/lib/supabase/types";
import { dbStatusToUi, contentTypeEmoji } from "@/lib/supabase/types";

const PLATFORM_EMOJI: Record<string, string> = {
  Instagram: "📸", TikTok: "🎵", LinkedIn: "💼", Facebook: "📘", YouTube: "▶️",
};

const STATUS_TABS = [
  { key: "all",       label: "Todos" },
  { key: "approved",  label: "Aprovados" },
  { key: "published", label: "Publicados" },
];

interface UiContent {
  id: string;
  title: string;
  platform: string;
  status: string;
  thumbnail: string;
  scheduledAt?: string;
  clientName?: string;
}

function dbToUi(c: DbContentItem): UiContent {
  const channel = c.channel?.split(",")[0]?.trim() ?? "Instagram";
  return {
    id:          c.id,
    title:       c.title,
    platform:    channel,
    status:      dbStatusToUi(c.status),
    thumbnail:   contentTypeEmoji(c.type),
    scheduledAt: c.scheduled_date ?? undefined,
  };
}

interface Props {
  serverContents: DbContentItem[] | null;
}

export function ContentosPublicacoesContent({ serverContents }: Props) {
  const [activeTab, setTab] = useState("all");
  const [copiedId,  setCopied] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publicationMessage, setPublicationMessage] = useState<Record<string, string>>({});
  const [publicationAction, setPublicationAction] = useState<Record<string, string | undefined>>({});

  const isDemo = !serverContents;

  const allItems: UiContent[] = serverContents
    ? serverContents.map(dbToUi).filter(c => c.status === "approved" || c.status === "published")
    : mockContents.filter(c => c.status === "approved" || c.status === "published")
        .map(c => ({ ...c, scheduledAt: c.scheduledAt ?? undefined }));

  const filtered = allItems.filter((c) => {
    if (activeTab === "all") return true;
    return c.status === activeTab;
  });

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(`https://lokat.app/publicacao/${id}`).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  // Reasons the shared eligibility check (src/lib/meta/publish-eligibility.ts)
  // can return where clicking the button again won't help — the user needs
  // to go fix something on /admin/conexoes first. Both labels point to the
  // same existing page; the label just tells them what they're going there
  // to do.
  const ACTIONABLE_REASONS: Record<string, string> = {
    connection_inactive: "Reconectar Meta",
    permission_missing: "Reconectar Meta",
    asset_link_ambiguous: "Revisar conexões",
  };

  const handleMetaPublish = async (content: UiContent) => {
    if (publishingId !== null) return; // double-click guard
    setPublishingId(content.id);
    setPublicationAction((current) => ({ ...current, [content.id]: undefined }));
    setPublicationMessage((current) => ({ ...current, [content.id]: "Verificando publicação..." }));
    try {
      const dryRunResponse = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: content.id, mode: "dry_run" }),
      });
      const dryRun = await dryRunResponse.json() as {
        ok?: boolean; reason?: string; message?: string; already_published?: boolean;
        plan?: { account: string; caption: string; media_url: string };
      };
      if (!dryRunResponse.ok || !dryRun.ok) {
        const action = dryRun.reason ? ACTIONABLE_REASONS[dryRun.reason] : undefined;
        if (action) setPublicationAction((current) => ({ ...current, [content.id]: action }));
        throw new Error(dryRun.message ?? "Não foi possível validar a publicação.");
      }
      if (dryRun.already_published) {
        setPublicationMessage((current) => ({ ...current, [content.id]: "Este conteúdo já foi publicado." }));
        return;
      }

      // The click that got us here only verified eligibility — nothing was
      // published yet. This confirm() is the actual "publish now?" gate,
      // and it's the only one: approving it calls the real Graph API.
      const preview = dryRun.plan;
      const approved = window.confirm(
        `Verificação concluída — nada foi publicado ainda.\n\n` +
        `Conta: @${preview?.account ?? "Instagram"}\n` +
        `Legenda: ${preview?.caption || "(sem legenda)"}\n` +
        `Mídia: ${preview?.media_url ?? "(sem mídia)"}\n\n` +
        `Confirmar e publicar agora pela API oficial da Meta?`,
      );
      if (!approved) {
        setPublicationMessage((current) => ({ ...current, [content.id]: "Verificação concluída; publicação cancelada pelo usuário." }));
        return;
      }

      setPublicationMessage((current) => ({ ...current, [content.id]: "Publicando na Meta..." }));
      const publishResponse = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: content.id, mode: "publish" }),
      });
      const published = await publishResponse.json() as { ok?: boolean; reason?: string; message?: string; media_id?: string };
      if (!publishResponse.ok || !published.ok) {
        if (published.reason === "published_but_not_recorded") {
          setPublicationMessage((current) => ({
            ...current,
            [content.id]: `Publicado na Meta, mas o registro local falhou (ID ${published.media_id ?? "?"}). Avise o suporte antes de tentar de novo.`,
          }));
          return;
        }
        throw new Error(published.message ?? "A Meta recusou a publicação.");
      }
      setPublicationMessage((current) => ({ ...current, [content.id]: `Publicado com sucesso · ID ${published.media_id ?? "Meta"}` }));
    } catch (error) {
      setPublicationMessage((current) => ({
        ...current,
        [content.id]: error instanceof Error ? error.message : "Falha ao publicar.",
      }));
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Publicações" description="Conteúdos aprovados e publicados" />

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          Modo demonstração — dados fictícios
        </div>
      )}

      <div className="flex gap-1.5 mb-5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-xl border-2 transition-all",
              activeTab === t.key
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Inbox className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-gray-500">Nenhuma publicação nesta categoria</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                {c.thumbnail || PLATFORM_EMOJI[c.platform] || "📄"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{c.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {c.clientName && <span className="text-xs text-gray-400">{c.clientName}</span>}
                  {c.clientName && <span className="text-gray-200">·</span>}
                  <span className="text-xs text-gray-400">{PLATFORM_EMOJI[c.platform] ?? "📱"} {c.platform}</span>
                </div>
              </div>
              {c.scheduledAt && (
                <p className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                  {new Date(c.scheduledAt).toLocaleDateString("pt-BR")}
                </p>
              )}
              <StatusBadge status={c.status as "approved"} />
              <div className="flex gap-1.5 flex-shrink-0">
                {c.status === "approved" && !isDemo && (
                  <button
                    onClick={() => handleMetaPublish(c)}
                    disabled={publishingId !== null}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 disabled:opacity-50 transition-all"
                    title="Verificar publicação — o primeiro clique só confere conta, legenda e mídia; publicar exige uma segunda confirmação"
                  >
                    {publishingId === c.id
                      ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      : <Send className="w-3.5 h-3.5" />}
                    Meta
                  </button>
                )}
                <button
                  onClick={() => handleCopy(c.id)}
                  className={cn(
                    "p-1.5 rounded-lg border transition-all",
                    copiedId === c.id ? "border-emerald-300 bg-emerald-50 text-emerald-600" : "border-gray-100 text-gray-400 hover:border-gray-200"
                  )}
                  title="Copiar link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:border-gray-200 transition-all" title="Abrir">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
              {publicationMessage[c.id] && (
                <p className="basis-full pl-16 text-xs text-gray-500">
                  {publicationMessage[c.id]}
                  {publicationAction[c.id] && (
                    <a href="/admin/conexoes" className="ml-2 font-semibold text-purple-600 hover:underline">
                      {publicationAction[c.id]}
                    </a>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
