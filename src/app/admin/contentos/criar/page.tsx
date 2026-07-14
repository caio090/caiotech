import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import ContentosCriarOriginal from "@/app/contentos/criar/page";
import { Layers, ImageIcon, PenLine, ArrowRight } from "lucide-react";
import Link from "next/link";

type Tab = "criar" | "editor" | "visual";

const TABS: { id: Tab; label: string }[] = [
  { id: "criar",  label: "✦ Criar" },
  { id: "editor", label: "EditorOS" },
  { id: "visual", label: "PNG Vidigal" },
];

export default async function AdminContentosCriarPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; tab?: string }>;
}) {
  const params   = await searchParams;
  const clientId = params.client ?? null;
  const tab      = (params.tab ?? "criar") as Tab;

  if (!clientId) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  let role = "";

  if (isSupabaseConfigured) {
    const valid = await validateContentOSClient(clientId);
    if (!valid) {
      redirect("/admin/contentos/selecionar-cliente");
    }
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        role = profile?.role ?? "";
      }
    } catch {}
  }

  const isSuperAdmin = role === "super_admin";

  function tabHref(t: Tab) {
    return `/admin/contentos/criar?tab=${t}&client=${clientId}`;
  }

  return (
    <>
      <ContentosSubNavServer />

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-100">
        {TABS.map(({ id, label }) => {
          // EditorOS only for super_admin
          if (id === "editor" && !isSuperAdmin) return null;
          const active = tab === id;
          return (
            <Link
              key={id}
              href={tabHref(id)}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                active
                  ? "border-purple-600 text-purple-700 bg-purple-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* ── CRIAR (original flow) ─────────────────────────────────────────── */}
      {tab === "criar" && <ContentosCriarOriginal />}

      {/* ── EDITOROS ──────────────────────────────────────────────────────── */}
      {tab === "editor" && isSuperAdmin && (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Layers className="w-7 h-7 text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-800">EditorOS</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Editor de design no navegador com canvas real, exportação PNG e contexto de marca.
            </p>
            <span className="inline-block mt-2 text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">
              em avaliação
            </span>
          </div>
          <Link
            href={`/admin/contentos/editor-os?client=${clientId}`}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <PenLine className="w-4 h-4" />
            Abrir EditorOS
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <p className="text-[10px] text-gray-400">
            Rascunho salvo localmente neste navegador.
          </p>
        </div>
      )}

      {/* ── PNG VIDIGAL ───────────────────────────────────────────────────── */}
      {tab === "visual" && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-indigo-800">PNG Vidigal — Geração visual por IA</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Gera imagens a partir do briefing da marca, referências e objetivos da campanha.
                O resultado pode ser aberto diretamente no EditorOS para ajustes e exportação.
              </p>
            </div>
          </div>

          {/* Workflow */}
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { num: "1", label: "Preparar prompt",     desc: "Descrever estilo, referência e objetivo" },
              { num: "2", label: "Gerar imagem",        desc: "IA cria variações visuais" },
              { num: "3", label: "Enviar ao EditorOS",  desc: "Editar, adicionar texto e exportar" },
            ].map(({ num, label, desc }) => (
              <div key={num} className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-black text-sm flex items-center justify-center flex-shrink-0">
                  {num}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Provider status */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-sm font-bold text-zinc-700 mb-1">Geração por IA ainda não configurada.</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              O motor de geração de imagens requer configuração de provider (OpenAI DALL-E, Stability AI ou similar).
              Enquanto isso, você pode usar upload manual de referências no EditorOS.
            </p>
            {isSuperAdmin && (
              <Link
                href={`/admin/contentos/editor-os?client=${clientId}`}
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Usar upload manual no EditorOS <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {!isSuperAdmin && (
            <p className="text-xs text-gray-400 text-center">
              A integração com EditorOS está em avaliação para super_admin.
            </p>
          )}
        </div>
      )}
    </>
  );
}
