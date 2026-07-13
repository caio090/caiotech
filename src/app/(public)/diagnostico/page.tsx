"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, FileSearch, Users, TrendingUp, Eye, Megaphone, MessageSquare, BarChart3, X, Loader2 } from "lucide-react";

const QUESTIONS = [
  {
    id: "segmento",
    icon: Users,
    label: "Qual é o segmento do seu negócio?",
    help: "Isso ajuda a identificar os canais e tipos de conteúdo mais relevantes para o seu mercado.",
    options: [
      "Alimentação",
      "Moda e acessórios",
      "Beleza e estética",
      "Saúde e clínicas",
      "Educação",
      "Serviços profissionais",
      "Construção e materiais",
      "Imobiliário",
      "Academia e fitness",
      "Tecnologia",
      "Varejo",
      "Eventos",
      "Outro",
    ],
  },
  {
    id: "redes_sociais",
    icon: MessageSquare,
    label: "Quantas redes sociais você usa atualmente?",
    help: "Considere todas as redes onde sua empresa tem perfil ativo, mesmo que pouco usadas.",
    options: [
      "Nenhuma",
      "1 rede social",
      "2 redes sociais",
      "3 redes sociais",
      "4 ou mais redes sociais",
    ],
  },
  {
    id: "frequencia",
    icon: BarChart3,
    label: "Com que frequência você publica nas redes sociais?",
    help: "Ajuda a entender o ritmo atual da sua presença digital e onde há espaço para melhorar.",
    options: [
      "Quase nunca",
      "1 vez por mês",
      "2 a 3 vezes por mês",
      "1 vez por semana",
      "2 a 3 vezes por semana",
      "Quase todos os dias",
      "Todos os dias",
    ],
  },
  {
    id: "identidade_visual",
    icon: Eye,
    label: "Você tem identidade visual definida para sua marca?",
    help: "Isso ajuda a entender se sua marca já possui consistência visual nos canais digitais.",
    options: [
      "Não tenho identidade visual",
      "Tenho algo básico, mas inconsistente",
      "Tenho identidade visual parcial",
      "Tenho identidade visual, mas não aplico bem",
      "Tenho identidade visual bem definida e aplicada",
    ],
  },
  {
    id: "resultados",
    icon: TrendingUp,
    label: "Você acompanha os resultados da sua presença digital?",
    help: "Essa resposta mostra se sua empresa toma decisões com base em dados ou apenas percepção.",
    options: [
      "Não acompanho resultados",
      "Acompanho de forma manual e ocasional",
      "Vejo métricas básicas às vezes",
      "Acompanho métricas com frequência",
      "Tenho acompanhamento recorrente com análise estratégica",
    ],
  },
  {
    id: "trafego_pago",
    icon: Megaphone,
    label: "Você investe em tráfego pago (anúncios)?",
    help: "Anúncios no Meta, Google ou TikTok podem acelerar resultados quando combinados com bom conteúdo.",
    options: [
      "Nunca investi em anúncios",
      "Já testei, mas parei",
      "Invisto às vezes, sem estratégia definida",
      "Invisto regularmente",
      "Tenho estratégia de tráfego ativa e estruturada",
    ],
  },
  {
    id: "leads",
    icon: FileSearch,
    label: "Você recebe e trata leads pelo digital?",
    help: "Lead é qualquer contato que demonstra interesse no seu produto ou serviço online.",
    options: [
      "Não recebo leads pelo digital",
      "Recebo esporadicamente, sem processo definido",
      "Recebo com frequência, mas sem processo de atendimento",
      "Tenho um processo para tratar e responder os leads",
      "Tenho funil completo do lead até a venda",
    ],
  },
  {
    id: "conteudo",
    icon: ClipboardList,
    label: "Você tem dificuldade em produzir conteúdo regularmente?",
    help: "A consistência na produção de conteúdo é um dos maiores desafios de pequenas e médias empresas.",
    options: [
      "Sim, muita dificuldade — não sei o que postar",
      "Às vezes me perco no que e quando postar",
      "Consigo produzir, mas sem consistência",
      "Consigo produzir com regularidade",
      "Tenho processo, calendário e equipe definida",
    ],
  },
];

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

export default function DiagnosticoPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);

  // Identification modal state
  const [showModal, setShowModal]     = useState(false);
  const [idName,    setIdName]        = useState("");
  const [idEmail,   setIdEmail]       = useState("");
  const [idPhone,   setIdPhone]       = useState("");
  const [idLoading, setIdLoading]     = useState(false);

  const answered = Object.keys(answers).filter((k) => answers[k]).length;
  const allAnswered = answered === QUESTIONS.length;

  const handleChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  function saveAndNavigate() {
    try {
      sessionStorage.setItem("lokat_diagnostico_answers", JSON.stringify(answers));
    } catch {}
    router.push("/diagnostico/resultado");
  }

  const handleSubmit = () => {
    if (!allAnswered) { setError(true); return; }
    setError(false);
    setShowModal(true);
  };

  async function handleIdentifiedSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idName.trim() || !idEmail.trim()) return;
    setIdLoading(true);
    try {
      await fetch("/api/launch/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         idName.trim(),
          email:        idEmail.trim(),
          phone:        idPhone.trim() || null,
          account_type: "interested",
          source:       "quick_diagnostic",
          interest:     "diagnóstico gratuito",
        }),
      });
    } catch { /* silently ignore — result page still loads */ }
    setIdLoading(false);
    setShowModal(false);
    saveAndNavigate();
  }

  function handleSkipIdentification() {
    setShowModal(false);
    saveAndNavigate();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Identification modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900">Quase lá!</h2>
                <p className="text-sm text-gray-500 mt-0.5">Informe seus dados para receber o resultado completo.</p>
              </div>
              <button
                onClick={handleSkipIdentification}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleIdentifiedSubmit(e)} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome *</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={idName}
                  onChange={(e) => setIdName(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">E-mail *</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={idEmail}
                  onChange={(e) => setIdEmail(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">WhatsApp (opcional)</label>
                <input
                  type="tel"
                  placeholder="(00) 9 0000-0000"
                  value={idPhone}
                  onChange={(e) => setIdPhone(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={idLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  {idLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileSearch className="w-4 h-4" />Ver resultado completo</>}
                </button>
                <button
                  type="button"
                  onClick={handleSkipIdentification}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors"
                >
                  Ver sem me identificar →
                </button>
              </div>
              <p className="text-center text-[11px] text-gray-400">
                Sem spam. Usamos para enviar o relatório e acompanhar sua evolução.
              </p>
            </form>
          </div>
        </div>
      )}
      <div className="text-center mb-10">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-6 h-6 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Diagnóstico de Presença Digital</h1>
        <p className="text-base text-gray-500 max-w-xl mx-auto">
          Responda 8 perguntas e descubra os pontos de melhoria da sua presença digital.
          Leva menos de 5 minutos.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{answered} de {QUESTIONS.length} respondidas</span>
          <span>{Math.round((answered / QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${(answered / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-7">
        {QUESTIONS.map((q, i) => {
          const Icon = q.icon;
          const missing = error && !answers[q.id];
          return (
            <div key={q.id}>
              <div className="flex items-start gap-3 mb-1">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${missing ? "bg-red-50" : "bg-indigo-50"}`}>
                  <Icon className={`w-3.5 h-3.5 ${missing ? "text-red-400" : "text-indigo-600"}`} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-800 mb-1">
                    {i + 1}. {q.label}
                  </label>
                  {q.help && (
                    <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">{q.help}</p>
                  )}
                  <select
                    name={q.id}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none transition-colors bg-white ${
                      missing
                        ? "border-red-300 focus:border-red-400"
                        : answers[q.id]
                        ? "border-indigo-300 focus:border-indigo-400"
                        : "border-gray-200 hover:border-gray-300 focus:border-indigo-400"
                    }`}
                  >
                    <option value="" disabled>Selecione uma opção…</option>
                    {q.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {missing && (
                    <p className="text-[11px] text-red-400 mt-1">Por favor, selecione uma opção.</p>
                  )}
                </div>
              </div>
              {i < QUESTIONS.length - 1 && (
                <div className="ml-10 border-b border-gray-50 mt-6" />
              )}
            </div>
          );
        })}

        <div className="pt-2">
          <button
            onClick={handleSubmit}
            className={`flex items-center justify-center gap-2 w-full py-3.5 font-bold rounded-xl text-sm transition-colors ${
              allAnswered
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-indigo-100 text-indigo-400 cursor-not-allowed"
            }`}
          >
            <FileSearch className="w-4 h-4" />
            Ver resultado do diagnóstico
          </button>
          {error && !allAnswered && (
            <p className="text-center text-xs text-red-400 mt-2">Responda todas as perguntas antes de continuar.</p>
          )}
          <p className="text-center text-xs text-gray-400 mt-3">
            Suas respostas ajudam a identificar oportunidades de crescimento digital. Sem cadastro necessário.
          </p>
        </div>
      </div>
    </div>
  );
}
