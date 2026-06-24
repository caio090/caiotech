"use client";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { mockContents } from "@/data/mock-data";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { Copy, ExternalLink, Inbox } from "lucide-react";
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
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
