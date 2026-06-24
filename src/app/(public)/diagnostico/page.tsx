import { ClipboardList, FileSearch, Users, TrendingUp, Eye, Megaphone, MessageSquare, BarChart3 } from "lucide-react";
import Link from "next/link";

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

export default function DiagnosticoPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
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

      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-7">
        {QUESTIONS.map((q, i) => {
          const Icon = q.icon;
          return (
            <div key={q.id}>
              <div className="flex items-start gap-3 mb-1">
                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-indigo-600" />
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
                    defaultValue=""
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-400 transition-colors bg-white hover:border-gray-300"
                  >
                    <option value="" disabled>Selecione uma opção…</option>
                    {q.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              {i < QUESTIONS.length - 1 && (
                <div className="ml-10 border-b border-gray-50 mt-6" />
              )}
            </div>
          );
        })}

        <div className="pt-2">
          <Link
            href="/admin/diagnosticos"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm"
          >
            <FileSearch className="w-4 h-4" />
            Ver resultado do diagnóstico
          </Link>
          <p className="text-center text-xs text-gray-400 mt-3">
            Suas respostas ajudam a identificar oportunidades de crescimento digital.
          </p>
        </div>
      </div>
    </div>
  );
}
