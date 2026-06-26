"use client";
import { useState, useEffect, useCallback } from "react";
import { useOnboardingStore, getObjetivoPrincipal, getObjetivosSecundarios, getTomDeVoz } from "@/lib/onboarding-store";
import { useCanvaStore } from "@/lib/canva-store";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ExternalLink, Palette, AtSign, AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

const objetivoLabel: Record<string, string> = {
  vender: "Vender mais 💰", leads: "Gerar leads 🎯", autoridade: "Construir autoridade 🏆",
  engajamento: "Aumentar engajamento ❤️", marketing: "Organizar marketing 📊", atendimento: "Melhorar atendimento 💬",
};

const tomLabel: Record<string, string> = {
  profissional: "💼 Profissional", direto: "⚡ Direto", acolhedor: "🤗 Acolhedor",
  educativo: "📚 Educativo", popular: "🎉 Popular", sofisticado: "✨ Sofisticado",
  divertido: "😄 Divertido", tecnico: "🔧 Técnico", tradicional: "🏛️ Tradicional",
};

const notificacoes = [
  "Aprovações pendentes",
  "Publicações agendadas para hoje",
  "Conteúdo reprovado",
  "Nova sugestão de conteúdo",
];

type MetaApiResponse = {
  ok: boolean;
  missing?: string[];
  meta?: { configured: boolean; appId: string; appSecret: string; redirectUri: string; apiVersion: string };
};

export default function ContentosConfigPage() {
  const data = useOnboardingStore();
  const canva = useCanvaStore();
  const [notifs, setNotifs] = useState(new Set([0, 1, 2]));

  // ── Estado Meta/Instagram ─────────────────────────────────
  const [metaData,    setMetaData]    = useState<MetaApiResponse | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaTested,  setMetaTested]  = useState(false);

  const checkMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const res  = await fetch("/api/meta/status");
      const json = await res.json() as MetaApiResponse;
      setMetaData(json);
      setMetaTested(true);
    } catch {
      setMetaData(null);
      setMetaTested(true);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => { void checkMeta(); }, [checkMeta]);

  const brandName   = data.marca?.nome       || "";
  const brandSeg    = data.marca?.segmento   || "";
  const brandCity   = data.marca?.cidade     || "";
  const instagram   = data.marca?.instagram  || "";
  const redes       = data.operacao?.redes   || [];
  const principal   = getObjetivoPrincipal(data);
  const secundarios = getObjetivosSecundarios(data);
  const allObjetivos = [principal, ...secundarios].filter(Boolean);
  const tomDeVoz    = getTomDeVoz(data);
  const hasMarcaData = !!brandName;

  const canvaLabel = canva.status === "tem_conta" ? "Conta pessoal"
    : canva.status === "tem_equipe" ? "Equipe / Business"
    : canva.status === "nao_usa" ? "Não utiliza"
    : canva.status === "nao_sei" ? "Pendente de configuração"
    : "Não configurado";

  const toggleNotif = (i: number) =>
    setNotifs((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });

  return (
    <div>
      <PageHeader title="Configurações" description="Preferências do ContentOS" />
      <div className="max-w-2xl space-y-4">

        {/* Brand profile from onboarding */}
        {hasMarcaData ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-800">Perfil da marca</h2>
              <Link href="/onboarding/marca" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Editar <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Brand header */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-700 text-base font-black flex-shrink-0">
                {brandName[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{brandName}</p>
                {(brandSeg || brandCity) && (
                  <p className="text-xs text-gray-400">{brandSeg}{brandCity ? ` · ${brandCity}` : ""}</p>
                )}
              </div>
            </div>

            {/* Data rows */}
            <div className="space-y-3">
              {instagram && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Instagram</span>
                  <span className="font-medium text-gray-800">@{instagram}</span>
                </div>
              )}
              {redes.length > 0 && (
                <div className="flex items-start justify-between text-xs gap-4">
                  <span className="text-gray-500 flex-shrink-0">Redes sociais</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {redes.map((r) => (
                      <span key={r} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {allObjetivos.length > 0 && (
                <div className="flex items-start justify-between text-xs gap-4">
                  <span className="text-gray-500 flex-shrink-0">Objetivos</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {allObjetivos.map((o, i) => (
                      <span key={o} className={i === 0 ? "bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium" : "bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full"}>
                        {objetivoLabel[o] ?? o}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {tomDeVoz.length > 0 && (
                <div className="flex items-start justify-between text-xs gap-4">
                  <span className="text-gray-500 flex-shrink-0">Tom de voz</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {tomDeVoz.map((t) => (
                      <span key={t} className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                        {tomLabel[t] ?? t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.publico?.faixaEtaria && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Faixa etária</span>
                  <span className="font-medium text-gray-800">{data.publico.faixaEtaria}</span>
                </div>
              )}
              {data.operacao?.frequencia && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Frequência</span>
                  <span className="font-medium text-gray-800">{data.operacao.frequencia}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
            <p className="text-sm font-bold text-purple-800 mb-1">Marca não configurada</p>
            <p className="text-xs text-purple-600 mb-3">Complete o onboarding para personalizar o ContentOS com os dados da sua marca.</p>
            <Link href="/onboarding/marca" className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-100 px-3 py-1.5 rounded-xl hover:bg-purple-200 transition-colors">
              Configurar marca →
            </Link>
          </div>
        )}

        {/* Canva status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">Integração Canva</h2>
            <Link href="/contentos/canva" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              {canva.status ? "Editar" : "Configurar"} <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${canva.status === "tem_conta" || canva.status === "tem_equipe" ? "bg-emerald-50" : "bg-gray-50"}`}>
              <Palette className={`w-5 h-5 ${canva.status === "tem_conta" || canva.status === "tem_equipe" ? "text-emerald-500" : "text-gray-400"}`} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-800">Canva</p>
              <p className={`text-xs ${canva.status === "tem_conta" || canva.status === "tem_equipe" ? "text-emerald-600" : "text-gray-400"}`}>
                {canvaLabel}
              </p>
            </div>
            {canva.link && (
              <a href={canva.link} target="_blank" rel="noreferrer" className="ml-auto text-xs text-purple-600 hover:underline flex items-center gap-1">
                Abrir <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Meta / Instagram */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">Meta / Instagram</h2>
            <button onClick={() => void checkMeta()} disabled={metaLoading} className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40" title="Atualizar">
              <RefreshCw className={`w-3.5 h-3.5 ${metaLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${metaTested && metaData?.ok ? "bg-emerald-50" : "bg-gray-50"}`}>
              <AtSign className={`w-5 h-5 ${metaTested && metaData?.ok ? "text-emerald-500" : "text-gray-400"}`} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-800">Meta / Instagram Business</p>
              {metaLoading && <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Verificando…</p>}
              {!metaLoading && !metaTested && <p className="text-xs text-gray-400">Clique em atualizar para verificar</p>}
              {!metaLoading && metaTested && metaData?.ok  && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Variáveis configuradas</p>}
              {!metaLoading && metaTested && metaData && !metaData.ok && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Faltando: {metaData.missing?.join(", ")}
                </p>
              )}
              {!metaLoading && metaTested && !metaData && <p className="text-xs text-red-500">Erro ao verificar</p>}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => void checkMeta()}
              disabled={metaLoading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {metaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Testar Meta
            </button>
            {metaTested && metaData?.ok && (
              <a href="/api/meta/connect" className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors">
                <AtSign className="w-3.5 h-3.5" /> Conectar Meta →
              </a>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Notificações</h2>
          <div className="space-y-1">
            {notificacoes.map((n, i) => (
              <label key={n} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 cursor-pointer">
                <span className="text-sm text-gray-700">{n}</span>
                <div
                  onClick={() => toggleNotif(i)}
                  className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${notifs.has(i) ? "bg-purple-600" : "bg-gray-200"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notifs.has(i) ? "right-0.5" : "left-0.5"}`} />
                </div>
              </label>
            ))}
          </div>
        </div>

        <button className="text-sm font-medium text-white bg-indigo-600 px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
          Salvar preferências
        </button>
      </div>
    </div>
  );
}
