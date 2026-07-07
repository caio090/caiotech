"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCanvaStore, saveCanva, CanvaStatus } from "@/lib/canva-store";
import { useOnboardingStore } from "@/lib/onboarding-store";
import { ExternalLink, Check, ArrowLeft, Send, Palette, ClipboardList, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── option cards ───────────────────────────────── */

const options: Array<{ id: CanvaStatus; emoji: string; title: string; desc: string; color: string }> = [
  {
    id: "tem_conta",
    emoji: "🎨",
    title: "Sim, tenho conta Canva",
    desc: "Uso o Canva pessoalmente para criar artes",
    color: "border-purple-500 bg-purple-50",
  },
  {
    id: "tem_equipe",
    emoji: "👥",
    title: "Sim, tenho equipe Canva",
    desc: "A empresa usa Canva for Teams / Business",
    color: "border-indigo-500 bg-indigo-50",
  },
  {
    id: "nao_usa",
    emoji: "🚫",
    title: "Não uso Canva",
    desc: "Prefiro outras ferramentas ou não tenho conta",
    color: "border-gray-400 bg-gray-50",
  },
  {
    id: "nao_sei",
    emoji: "🤔",
    title: "Não sei o que é Canva",
    desc: "Nunca usei, não tenho certeza",
    color: "border-amber-400 bg-amber-50",
  },
];

/* ── form fields ────────────────────────────────── */

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 transition-colors";

/* ── page ─────────────────────────────────────────── */

export default function ContentosCanvaPage() {
  const router = useRouter();
  const canva = useCanvaStore();
  const data = useOnboardingStore();

  const brandName = data.marca?.nome || "sua marca";

  // Derive current step from store (avoids setState in effect)
  const alreadyConfigured = canva.status !== null;
  const [userStep, setUserStep] = useState<"choice" | "form" | "nao_usa" | "nao_sei" | "done">("choice");
  const [selectedId, setSelectedId] = useState<CanvaStatus | null>(null);
  const [form, setForm] = useState({ link: canva.link, templates: canva.templates, responsavel: canva.responsavel, email: canva.email, observacoes: canva.observacoes });
  const [saved, setSaved] = useState(false);

  // After hydration, if already configured — show done view (derived, no setState)
  const step = alreadyConfigured && userStep === "choice" ? "done" : userStep;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function selectOption(id: CanvaStatus) {
    setSelectedId(id);
    if (id === "tem_conta" || id === "tem_equipe") {
      setForm({ link: canva.link, templates: canva.templates, responsavel: canva.responsavel, email: canva.email, observacoes: canva.observacoes });
      setUserStep("form");
    } else if (id === "nao_usa") {
      setUserStep("nao_usa");
    } else {
      setUserStep("nao_sei");
    }
  }

  function saveForm() {
    saveCanva({ status: selectedId ?? canva.status ?? "tem_conta", ...form });
    setSaved(true);
    setTimeout(() => setUserStep("done"), 800);
  }

  function solicitarOrganizacao() {
    saveCanva({ status: "nao_usa", solicitado: true });
    setUserStep("done");
  }

  function solicitarEquipe() {
    saveCanva({ status: "nao_sei", solicitado: true });
    setUserStep("done");
  }

  /* ─── views ───────────────────────────────────── */

  if (step === "done") {
    const isConnected = canva.status === "tem_conta" || canva.status === "tem_equipe";
    const isSolicitado = canva.solicitado;

    return (
      <div className="max-w-2xl">
        <button onClick={() => setUserStep("choice")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Editar configuração
        </button>

        {/* Status card */}
        <div className={cn("rounded-2xl p-5 mb-5 border", isConnected ? "bg-emerald-50 border-emerald-100" : isSolicitado ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100")}>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isConnected ? "bg-emerald-100" : "bg-gray-100")}>
              {isConnected
                ? <Palette className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
                : isSolicitado
                ? <ClipboardList className="w-6 h-6 text-amber-500" strokeWidth={1.5} />
                : <Ban className="w-6 h-6 text-gray-400" strokeWidth={1.5} />}
            </div>
            <div>
              <h2 className={cn("text-sm font-bold", isConnected ? "text-emerald-800" : "text-gray-800")}>
                {isConnected
                  ? "Canva configurado!"
                  : canva.status === "nao_sei"
                  ? "Solicitação enviada"
                  : "Canva não utilizado"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {canva.status === "tem_conta" && "Conta pessoal vinculada"}
                {canva.status === "tem_equipe" && "Conta de equipe vinculada"}
                {canva.status === "nao_usa" && (isSolicitado ? "Organização solicitada à equipe Lokat" : "Sem Canva cadastrado")}
                {canva.status === "nao_sei" && "Nossa equipe entrará em contato"}
              </p>
            </div>
            {isConnected && <Check className="w-5 h-5 text-emerald-500 ml-auto flex-shrink-0" />}
          </div>

          {isConnected && (
            <div className="space-y-2">
              {canva.link && (
                <div className="flex items-center gap-2 bg-white rounded-xl p-3 border border-emerald-100">
                  <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">Conta</span>
                  <a href={canva.link} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline flex items-center gap-1 truncate">
                    {canva.link} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
              {canva.templates && (
                <div className="flex items-center gap-2 bg-white rounded-xl p-3 border border-emerald-100">
                  <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">Templates</span>
                  <a href={canva.templates} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline flex items-center gap-1 truncate">
                    {canva.templates} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
              {canva.responsavel && (
                <div className="flex items-center gap-2 bg-white rounded-xl p-3 border border-emerald-100">
                  <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">Responsável</span>
                  <span className="text-xs text-gray-700">{canva.responsavel}</span>
                </div>
              )}
              {canva.email && (
                <div className="flex items-center gap-2 bg-white rounded-xl p-3 border border-emerald-100">
                  <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">E-mail</span>
                  <span className="text-xs text-gray-700">{canva.email}</span>
                </div>
              )}
              {canva.observacoes && (
                <div className="bg-white rounded-xl p-3 border border-emerald-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">Observações</p>
                  <p className="text-xs text-gray-700">{canva.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Templates rápidos */}
        {isConnected && (
          <>
            <h2 className="text-sm font-bold text-gray-800 mb-3">Templates rápidos</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { emoji: "⬛", name: "Post quadrado 1:1",   size: "1080×1080" },
                { emoji: "📱", name: "Story vertical 9:16", size: "1080×1920" },
                { emoji: "📚", name: "Carrossel Instagram", size: "1080×1080" },
                { emoji: "▶️", name: "Thumbnail YouTube",   size: "1280×720" },
              ].map((t) => (
                <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer hover:border-purple-200">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">{t.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">{t.name}</p>
                    <p className="text-[10px] text-gray-400">{t.size} px</p>
                  </div>
                  <button className="text-xs text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors font-medium flex-shrink-0">
                    Usar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={() => router.push("/contentos/home")} className="mt-5 text-sm text-indigo-600 hover:underline">
          ← Voltar para REC OS
        </button>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="max-w-2xl">
        <button onClick={() => setUserStep("choice")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Palette className="w-6 h-6 text-purple-500" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900">Dados do Canva</h1>
              <p className="text-xs text-gray-500">Compartilhe os links para {brandName}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Link do Canva <span className="font-normal text-gray-400">(opcional)</span></label>
            <input type="url" value={form.link} onChange={set("link")} placeholder="https://www.canva.com/brand/..." className={inputCls} />
            <p className="text-[10px] text-gray-400 mt-1">Link do perfil ou workspace do Canva</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Link da pasta de templates <span className="font-normal text-gray-400">(opcional)</span></label>
            <input type="url" value={form.templates} onChange={set("templates")} placeholder="https://www.canva.com/folder/..." className={inputCls} />
            <p className="text-[10px] text-gray-400 mt-1">Pasta onde ficam os templates da marca</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Responsável pelo Canva <span className="font-normal text-gray-400">(opcional)</span></label>
            <input type="text" value={form.responsavel} onChange={set("responsavel")} placeholder="Nome de quem gerencia o Canva" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">E-mail do responsável <span className="font-normal text-gray-400">(opcional)</span></label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="email@empresa.com.br" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Observações <span className="font-normal text-gray-400">(opcional)</span></label>
            <textarea value={form.observacoes} onChange={set("observacoes")} placeholder="Alguma informação extra sobre o uso do Canva..." rows={3} className={`${inputCls} resize-none`} />
          </div>

          <button
            onClick={saveForm}
            disabled={saved}
            className={cn(
              "w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all",
              saved ? "bg-emerald-500 text-white" : "bg-purple-600 text-white hover:bg-purple-700"
            )}
          >
            {saved ? <><Check className="w-4 h-4" /> Salvo!</> : "Salvar configuração"}
          </button>
          <button onClick={() => setUserStep("choice")} className="w-full text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors">
            Pular por agora
          </button>
        </div>
      </div>
    );
  }

  if (step === "nao_usa") {
    return (
      <div className="max-w-2xl">
        <button onClick={() => setUserStep("choice")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Sem Canva por enquanto</h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-8">
            Sem problema! Nossa equipe pode organizar o Canva da {brandName} do zero — criamos o workspace, os templates e a identidade visual.
          </p>
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 text-left mb-6">
            <h3 className="text-sm font-bold text-purple-800 mb-2">O que a equipe Lokat faz:</h3>
            <ul className="space-y-1.5">
              {[
                "Cria o workspace no Canva para a marca",
                "Configura as cores e fontes da identidade visual",
                "Desenvolve templates prontos para Instagram e Stories",
                "Organiza a pasta de materiais e arquivos",
              ].map((item, i) => (
                <li key={i} className="text-xs text-purple-700 flex items-start gap-2">
                  <span className="text-purple-400 flex-shrink-0 font-bold">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={solicitarOrganizacao}
            className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Solicitar organização do Canva
          </button>
          <p className="text-xs text-gray-400 mt-3">Nossa equipe entrará em contato em até 24h</p>
        </div>
      </div>
    );
  }

  if (step === "nao_sei") {
    return (
      <div className="max-w-2xl">
        <button onClick={() => setUserStep("choice")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Palette className="w-7 h-7 text-amber-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">O que é o Canva?</h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Canva é uma plataforma de design gráfico online. Com ela, criamos os posts, stories, carrosséis e artes da sua marca de forma profissional.
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-left mb-6">
            <h3 className="text-sm font-bold text-amber-800 mb-3">Por que usamos o Canva?</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { emoji: "⚡", text: "Criação rápida de posts" },
                { emoji: "🎨", text: "Templates da identidade visual" },
                { emoji: "📱", text: "Formatos para cada rede social" },
                { emoji: "🤝", text: "Você pode acompanhar e aprovar" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-700">
                  <span>{item.emoji}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={solicitarEquipe}
              className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Falar com nossa equipe
            </button>
            <button
              onClick={() => selectOption("tem_conta")}
              className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Vou criar uma conta Canva →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── choice (default) ──────────────────────────── */
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl">🎨</div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Configurar Canva</h1>
            <p className="text-xs text-gray-500">{brandName}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          O Canva é a ferramenta que nossa equipe usa para criar as artes da sua marca. Como você usa o Canva hoje?
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => selectOption(opt.id)}
            className={cn(
              "flex flex-col items-start gap-2 p-5 rounded-2xl border-2 text-left transition-all hover:shadow-md",
              "bg-white border-gray-100 hover:border-gray-200"
            )}
          >
            <span className="text-3xl">{opt.emoji}</span>
            <div>
              <p className="text-sm font-bold text-gray-900">{opt.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        Você pode alterar isso a qualquer momento nas configurações
      </p>
    </div>
  );
}
