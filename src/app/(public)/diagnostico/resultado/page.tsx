"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, TrendingUp, Lightbulb, Target, ArrowRight, MessageCircle, CalendarDays, Loader2 } from "lucide-react";

type Answers = Record<string, string>;

interface DiagResult {
  score: number;
  summary: string;
  problems: string[];
  opportunities: string[];
  recommended_plan: string;
  plan_description: string;
}

// Fallback baseado em regras simples (sem IA)
function buildFallback(answers: Answers): DiagResult {
  let score = 0;
  const problems: string[] = [];
  const opportunities: string[] = [];

  // Frequência
  if (answers.frequencia === "Quase nunca" || answers.frequencia === "1 vez por mês") {
    problems.push("Frequência de publicação muito baixa para gerar alcance orgânico");
    opportunities.push("Criar um calendário editorial simples, começando com 3 posts por semana");
    score += 0;
  } else if (answers.frequencia === "2 a 3 vezes por mês") {
    score += 10;
    opportunities.push("Aumentar cadência de publicação para ao menos 3× por semana");
  } else {
    score += 20;
  }

  // Identidade visual
  if (answers.identidade_visual?.includes("Não tenho")) {
    problems.push("Ausência de identidade visual — marca sem consistência visual");
    score += 0;
  } else if (answers.identidade_visual?.includes("básico")) {
    problems.push("Identidade visual básica e inconsistente aplicada nos canais");
    score += 5;
  } else {
    score += 15;
  }

  // Resultados / métricas
  if (answers.resultados?.includes("Não acompanho")) {
    problems.push("Sem acompanhamento de resultados — decisões sem dados");
    opportunities.push("Implementar relatório mensal básico de métricas de redes sociais");
    score += 0;
  } else {
    score += 15;
  }

  // Tráfego pago
  if (answers.trafego_pago?.includes("Nunca")) {
    problems.push("Nenhum investimento em tráfego pago para acelerar crescimento");
    opportunities.push("Testar campanhas de reconhecimento de marca a partir de R$10/dia");
  } else {
    score += 10;
  }

  // Leads
  if (answers.leads?.includes("Não recebo")) {
    problems.push("Sem captação de leads pelo digital — perda de oportunidades de venda");
    opportunities.push("Criar uma landing page simples com formulário de contato");
    score += 0;
  } else if (answers.leads?.includes("funil completo")) {
    score += 20;
  } else {
    score += 10;
  }

  // Conteúdo
  if (answers.conteudo?.includes("muita dificuldade")) {
    problems.push("Dificuldade severa em produzir conteúdo — ausência de processo editorial");
    opportunities.push("Usar IA para gerar ideias, legendas e briefings de forma sistemática");
    score += 0;
  } else {
    score += 20;
  }

  // Redes sociais
  if (answers.redes_sociais === "Nenhuma") {
    problems.push("Sem presença em redes sociais");
    score += 0;
  } else {
    score += 10;
  }

  // Garantir problemas e oportunidades mínimas
  if (problems.length === 0) problems.push("Manter consistência e escalar com estratégia de dados");
  if (opportunities.length === 0) opportunities.push("Automatizar relatórios e expandir canais de distribuição");

  // Definir plano recomendado
  let recommended_plan = "Plano Essencial";
  let plan_description = "Para marcas que querem organizar presença digital, calendário editorial e acompanhar resultados.";

  if (score >= 70) {
    recommended_plan = "Plano Avançado";
    plan_description = "Para negócios com base sólida que precisam de estratégia, automação e escalabilidade de conteúdo.";
  } else if (score < 25) {
    recommended_plan = "Começar pelo Diagnóstico";
    plan_description = "Entender o ponto de partida da marca e definir as prioridades antes de qualquer investimento.";
  }

  return {
    score: Math.min(score, 100),
    summary: `Sua marca tem ${score < 40 ? "oportunidades importantes de melhoria" : score < 70 ? "uma base razoável, mas com gaps estratégicos" : "uma presença digital bem estruturada"} na presença digital. ${score < 40 ? "A principal prioridade é criar processos básicos de conteúdo e mensuração." : "O foco deve ser consistência, automação e escalabilidade."}`,
    problems,
    opportunities,
    recommended_plan,
    plan_description,
  };
}

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg width="112" height="112" className="rotate-[-90deg]">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="56" cy="56" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-gray-900">{score}</span>
        <span className="text-[10px] text-gray-400 font-medium">/ 100</span>
      </div>
    </div>
  );
}

export default function DiagnosticoResultadoPage() {
  const [result, setResult] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiUsed, setAiUsed] = useState(false);

  useEffect(() => {
    let raw: Answers = {};
    try {
      const stored = sessionStorage.getItem("lokat_diagnostico_answers");
      if (stored) raw = JSON.parse(stored) as Answers;
    } catch {}

    // Fallback imediato enquanto tenta IA
    const fallback = buildFallback(raw);
    setResult(fallback);
    setLoading(false);

    // Tentar enriquecer com IA em background
    if (Object.keys(raw).length > 0) {
      fetch("/api/ai/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: raw, context: "diagnostico_publico" }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { result?: string } | null) => {
          if (data?.result) {
            // IA retornou — parsear e sobrescrever apenas o summary
            setResult((prev) => prev ? { ...prev, summary: data.result as string } : prev);
            setAiUsed(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Analisando sua presença digital…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-gray-500 text-sm mb-4">Nenhum diagnóstico encontrado.</p>
        <Link href="/diagnostico" className="text-indigo-600 text-sm font-medium hover:underline">
          Fazer diagnóstico →
        </Link>
      </div>
    );
  }

  const scoreLabel = result.score >= 70 ? "Presença forte" : result.score >= 40 ? "Em desenvolvimento" : "Presença inicial";
  const scoreColor = result.score >= 70 ? "text-emerald-600" : result.score >= 40 ? "text-amber-600" : "text-red-500";

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-xs text-indigo-500 font-medium uppercase tracking-widest mb-2">Diagnóstico rápido da sua marca</p>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Seu resultado está pronto</h1>
        <p className="text-sm text-gray-400">
          {aiUsed ? "Análise gerada com inteligência artificial." : "Análise baseada nas suas respostas."}
        </p>
      </div>

      {/* Score */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 flex items-center gap-6 shadow-sm">
        <ScoreRing score={result.score} />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Organização digital</p>
          <p className={`text-xl font-black mb-1 ${scoreColor}`}>{scoreLabel}</p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{result.summary}</p>
        </div>
      </div>

      {/* Problemas */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-bold text-gray-800">Principais pontos de atenção</h2>
        </div>
        <ul className="space-y-2">
          {result.problems.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Oportunidades */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-gray-800">Oportunidades identificadas</h2>
        </div>
        <ul className="space-y-2">
          {result.opportunities.map((o, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              {o}
            </li>
          ))}
        </ul>
      </div>

      {/* Plano recomendado */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-indigo-800">Plano recomendado para você</h2>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-lg font-black text-indigo-700">{result.recommended_plan}</span>
          <TrendingUp className="w-4 h-4 text-indigo-400" />
        </div>
        <p className="text-sm text-indigo-600 leading-relaxed">{result.plan_description}</p>
      </div>

      {/* Próximos passos / CTAs */}
      <div className="space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wider text-center mb-4">O que você quer fazer agora?</p>

        <Link
          href="/criar-conta?from=diagnostic"
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          Criar conta e salvar diagnóstico
        </Link>

        <a
          href="https://wa.me/5589994217181?text=Ol%C3%A1%2C%20fiz%20o%20diagn%C3%B3stico%20da%20LOKAT%20OS%20e%20quero%20entender%20os%20pr%C3%B3ximos%20passos."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Falar com especialista no WhatsApp
        </a>

        <Link
          href="/planos"
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          <CalendarDays className="w-4 h-4" />
          Ver planos e valores
        </Link>

        <Link
          href="/diagnostico"
          className="block text-center text-xs text-gray-400 hover:text-gray-600 transition-colors pt-2"
        >
          ← Refazer diagnóstico
        </Link>
      </div>
    </div>
  );
}
