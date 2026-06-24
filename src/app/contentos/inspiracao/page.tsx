"use client";
import { useState } from "react";
import { useOnboardingStore, getObjetivoPrincipal, getTomDeVoz } from "@/lib/onboarding-store";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { Bookmark, Sparkles, ExternalLink, FileSearch } from "lucide-react";
import Link from "next/link";

interface InspirationCard {
  emoji: string;
  niche: string;
  segment: string;
  tipo: string;
  canal: string;
  titulo: string;
  objetivo: string;
  descricao: string;
  cta: string;
  engagement: string;
}

const CARDS: InspirationCard[] = [
  { emoji: "🍬", niche: "Alimentação", segment: "Alimentação", tipo: "Carrossel", canal: "Instagram",
    titulo: "Como escolher o doce perfeito para cada ocasião",
    objetivo: "Engajamento e autoridade",
    descricao: "Sequência de slides ensinando combinações de sabores. Tom educativo e acolhedor.",
    cta: "Qual é a sua combinação favorita? Comenta aqui! 👇", engagement: "8.4%" },
  { emoji: "🎬", niche: "Alimentação", segment: "Alimentação", tipo: "Reels", canal: "Instagram / TikTok",
    titulo: "Bastidores da produção — o que você não vê",
    objetivo: "Humanização e autoridade",
    descricao: "Vídeo mostrando o processo de produção, a equipe, detalhes artesanais.",
    cta: "Salva pra ver de novo! 🎥 Link na bio.", engagement: "12.3%" },
  { emoji: "📊", niche: "Alimentação", segment: "Alimentação", tipo: "Story", canal: "Instagram",
    titulo: "Enquete: qual sabor lançar na próxima semana?",
    objetivo: "Engajamento e pesquisa",
    descricao: "Story interativo com enquete. Gera antecipação e pesquisa de produto.",
    cta: "Vote aqui e ajude a escolher! ⬇️", engagement: "22.1%" },
  { emoji: "✍️", niche: "Alimentação", segment: "Alimentação", tipo: "Post", canal: "Instagram / Facebook",
    titulo: "O que a marca acredita sobre autoestima e conforto",
    objetivo: "Posicionamento e valores",
    descricao: "Post de manifesto falando sobre valores, propósito e o que motiva a equipe.",
    cta: "Compartilha se você acredita nisso também. 💝", engagement: "9.7%" },
  { emoji: "🦷", niche: "Saúde", segment: "Saúde", tipo: "Reels", canal: "Instagram",
    titulo: "Mito ou verdade sobre saúde bucal",
    objetivo: "Autoridade e alcance",
    descricao: "Reel respondendo dúvidas populares. Formato dinâmico que gera compartilhamentos.",
    cta: "Compartilha com quem precisa saber! 🦷", engagement: "11.2%" },
  { emoji: "👗", niche: "Moda", segment: "Moda", tipo: "Reels", canal: "Instagram / TikTok",
    titulo: "Provação: 5 looks com peças da nova coleção",
    objetivo: "Venda e engajamento",
    descricao: "Vídeo de provação mostrando versatilidade das peças. Alta taxa de clique.",
    cta: "Qual look você usaria? Link na bio! 🛍️", engagement: "12.1%" },
  { emoji: "💡", niche: "Tecnologia", segment: "Tecnologia", tipo: "Carrossel", canal: "LinkedIn / Instagram",
    titulo: "Top 5 ferramentas para agências em 2025",
    objetivo: "Autoridade e leads",
    descricao: "Carrossel educativo listando ferramentas com dicas práticas. Gera DMs.",
    cta: "Salva esse carrossel para não perder! 🔖", engagement: "9.1%" },
  { emoji: "🏠", niche: "Construção", segment: "Construção", tipo: "Post", canal: "Instagram / Facebook",
    titulo: "Antes e depois: reforma completa em 30 dias",
    objetivo: "Prova social e venda",
    descricao: "Post duplo mostrando transformação. Extremamente eficiente para conversão.",
    cta: "Quer um projeto assim? Chama no WhatsApp! 🏗️", engagement: "9.3%" },
  { emoji: "📚", niche: "Educação", segment: "Educação", tipo: "Carrossel", canal: "Instagram",
    titulo: "5 hábitos de estudo que realmente funcionam",
    objetivo: "Autoridade e leads",
    descricao: "Carrossel com dicas práticas do método de ensino. Salva e compartilha muito.",
    cta: "Testa essa semana e me conta! 📖", engagement: "7.8%" },
  { emoji: "💼", niche: "B2B", segment: "Serviços", tipo: "LinkedIn", canal: "LinkedIn",
    titulo: "O erro mais comum em gestão de equipes",
    objetivo: "Autoridade e conexão",
    descricao: "Thread ou artigo com ponto de vista único. Atrai decisores de compra.",
    cta: "Qual erro você já cometeu? Comenta! 👇", engagement: "6.8%" },
  { emoji: "🎉", niche: "Varejo", segment: "Varejo", tipo: "Story", canal: "Instagram",
    titulo: "Flash sale: 3h de desconto especial",
    objetivo: "Venda urgente",
    descricao: "Story com contagem regressiva e oferta exclusiva. Gera pico de vendas.",
    cta: "Só hoje! Arrasta pra cima! ⬆️", engagement: "18.5%" },
  { emoji: "🤝", niche: "Serviços", segment: "Serviços", tipo: "Post", canal: "Instagram / Facebook",
    titulo: "Conheça a equipe por trás do serviço",
    objetivo: "Humanização e confiança",
    descricao: "Post apresentando os membros da equipe. Aumenta confiança e conexão.",
    cta: "Qual da nossa equipe você já conhece? 😊", engagement: "7.2%" },
];

const NICHES = ["Todos", "Alimentação", "Saúde", "Moda", "Tecnologia", "Construção", "Educação", "B2B", "Varejo", "Serviços"];
const TIPOS  = ["Todos", "Reels", "Carrossel", "Post", "Story", "LinkedIn"];

export default function ContentosInspiracaoPage() {
  const data      = useOnboardingStore();
  const brandSeg  = data.marca?.segmento || "";
  const brandName = data.marca?.nome || "";
  const principal = getObjetivoPrincipal(data);
  const tomDeVoz  = getTomDeVoz(data);

  const [activeNiche, setNiche] = useState<string>("Todos");
  const [activeTipo,  setTipo]  = useState<string>("Todos");
  const [saved,       setSaved] = useState<Set<number>>(new Set());

  const toggleSaved = (i: number) =>
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });

  const filtered = CARDS.filter((c) => {
    if (activeNiche !== "Todos" && c.niche !== activeNiche) return false;
    if (activeTipo  !== "Todos" && c.tipo !== activeTipo)   return false;
    return true;
  });

  const brandMatches = CARDS.filter((c) => c.segment === brandSeg);
  const hasBrandMatch = brandMatches.length > 0 && activeNiche === "Todos" && activeTipo === "Todos";

  return (
    <div>
      <PageHeader title="Inspiração" description="Referências e ideias por objetivo, segmento e tom" />

      {hasBrandMatch && brandName && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-purple-800 mb-0.5">✨ Inspirações para {brandName}</p>
            <p className="text-xs text-purple-600">
              {brandMatches.length} referência{brandMatches.length > 1 ? "s" : ""} no segmento {brandSeg}
              {principal && ` · objetivo: ${principal}`}
              {tomDeVoz.length > 0 && ` · tom: ${tomDeVoz.slice(0, 2).join(", ")}`}
            </p>
          </div>
          <button onClick={() => setNiche(brandMatches[0].niche)}
            className="text-xs font-medium text-purple-700 bg-purple-100 px-3 py-1.5 rounded-xl hover:bg-purple-200 transition-colors flex-shrink-0">
            Ver do segmento →
          </button>
        </div>
      )}

      <div className="space-y-2 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {NICHES.map((n) => (
            <button key={n} onClick={() => setNiche(n)}
              className={cn("px-3 py-1 text-xs font-medium rounded-xl border-2 transition-all",
                activeNiche === n ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-100 bg-white text-gray-600 hover:border-gray-200")}>
              {n}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TIPOS.map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              className={cn("px-2.5 py-0.5 text-xs font-medium rounded-xl border transition-all",
                activeTipo === t ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-100 bg-white text-gray-500 hover:border-gray-200")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((card, i) => {
          const isBrandSeg = card.segment === brandSeg;
          const isSaved    = saved.has(i);
          return (
            <div key={i} className={cn(
              "bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-shadow relative flex flex-col",
              isBrandSeg && brandName ? "border-purple-200 ring-1 ring-purple-100" : "border-gray-100")}>
              {isBrandSeg && brandName && (
                <span className="absolute top-3 right-3 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 z-10">
                  Para {brandName.split(" ")[0]}
                </span>
              )}

              <div className="p-4 flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl flex-shrink-0">{card.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] text-gray-400">{card.niche}</span>
                      <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">{card.tipo}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-tight">{card.titulo}</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  {[
                    { k: "Canal",     v: card.canal },
                    { k: "Objetivo",  v: card.objetivo },
                    { k: "Descrição", v: card.descricao },
                    { k: "CTA",       v: card.cta },
                  ].map(({ k, v }) => (
                    <div key={k} className="flex gap-1.5 text-xs">
                      <span className="text-gray-400 font-medium w-16 flex-shrink-0">{k}</span>
                      <span className={cn("text-gray-700 leading-relaxed", k === "CTA" ? "italic" : "")}>{v}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                  <span className="text-gray-400">Engajamento médio</span>
                  <span className="font-black text-emerald-600">{card.engagement}</span>
                </div>
              </div>

              <div className="px-4 pb-4 flex gap-1.5">
                <button className="flex-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" /> Analisar
                </button>
                <Link href="/contentos/criar"
                  className="flex-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Criar
                </Link>
                <button onClick={() => toggleSaved(i)}
                  className={cn("px-2.5 py-1.5 rounded-xl border transition-all",
                    isSaved ? "border-amber-300 bg-amber-50 text-amber-600" : "border-gray-100 text-gray-400 hover:border-gray-200")}>
                  <Bookmark className={cn("w-3.5 h-3.5", isSaved ? "fill-current" : "")} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <FileSearch className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-gray-500">Nenhuma referência encontrada</p>
          <button onClick={() => { setNiche("Todos"); setTipo("Todos"); }} className="mt-3 text-xs text-purple-600 hover:underline">
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
