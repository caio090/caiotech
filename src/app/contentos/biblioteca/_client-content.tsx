"use client";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ContentCard } from "@/components/content-card";
import { mockContents } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { Search, Inbox } from "lucide-react";
import type { DbContentItem } from "@/lib/supabase/types";
import { dbStatusToUi, contentTypeEmoji } from "@/lib/supabase/types";

const STATUS_FILTERS = [
  { key: "all",       label: "Todos" },
  { key: "draft",     label: "Rascunho" },
  { key: "in_review", label: "Em revisão" },
  { key: "approved",  label: "Aprovado" },
  { key: "published", label: "Publicado" },
  { key: "rejected",  label: "Reprovado" },
];

const PLATFORM_FILTERS = ["Todos", "Instagram", "TikTok", "LinkedIn", "Facebook", "YouTube"];

interface UiContent {
  id: string;
  title: string;
  platform: string;
  type: string;
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
    type:        c.type ?? "post",
    status:      dbStatusToUi(c.status),
    thumbnail:   contentTypeEmoji(c.type),
    scheduledAt: c.scheduled_date ?? undefined,
  };
}

interface Props {
  serverContents: DbContentItem[] | null;
}

export function ContentosBibliotecaContent({ serverContents }: Props) {
  const [activeStatus,   setStatus]   = useState("all");
  const [activePlatform, setPlatform] = useState("Todos");
  const [search,         setSearch]   = useState("");

  const isDemo = !serverContents;

  const allItems: UiContent[] = serverContents
    ? serverContents.map(dbToUi)
    : mockContents.map(c => ({ ...c, scheduledAt: c.scheduledAt ?? undefined }));

  const filtered = allItems.filter((c) => {
    if (activeStatus   !== "all"   && c.status !== activeStatus) return false;
    if (activePlatform !== "Todos" && c.platform !== activePlatform) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Biblioteca" description="Todos os conteúdos criados" />

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          Modo demonstração — dados fictícios
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar conteúdo..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-purple-400 transition-colors"
        />
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-xl border-2 transition-all",
              activeStatus === f.key
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
            )}
          >
            {f.label}
            {f.key !== "all" && (
              <span className={cn("ml-1 text-[10px] font-black", activeStatus === f.key ? "text-purple-500" : "text-gray-400")}>
                {allItems.filter(c => c.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Platform filters */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {PLATFORM_FILTERS.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-xl border transition-all",
              activePlatform === p
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Inbox className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-gray-500">Nenhum conteúdo encontrado</p>
          <button onClick={() => { setStatus("all"); setPlatform("Todos"); setSearch(""); }}
            className="mt-3 text-xs text-purple-600 hover:underline">
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((c) => <ContentCard key={c.id} {...c} />)}
        </div>
      )}
    </div>
  );
}
