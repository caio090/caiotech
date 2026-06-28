export interface MarketingDiagnosticInput {
  business_type: string;
  marketing_responsible: string;
  main_problem: string;
  full_name: string;
  company_name: string;
  instagram?: string;
  whatsapp: string;
  best_contact_time?: string;
}

export interface DiagnosticResult {
  lead_score: number;
  lead_temperature: "quente" | "morno" | "frio";
  offer_suggestion: string;
  advice: string;
}

export function calculateMarketingDiagnosticScore(input: MarketingDiagnosticInput): DiagnosticResult {
  let score = 0;

  switch (input.main_problem) {
    case "Pouca venda":                     score += 30; break;
    case "Poucas mensagens no WhatsApp":    score += 25; break;
    case "Atendimento bagunçado":           score += 20; break;
    case "Falta de campanha":               score += 20; break;
    case "Não tenho relatório":             score += 15; break;
    case "Instagram parado":                score += 15; break;
    case "Falta de conteúdo":              score += 10; break;
    case "Não sei o que postar":            score += 10; break;
  }

  switch (input.marketing_responsible) {
    case "Ninguém cuida direito": score += 25; break;
    case "Eu mesmo":              score += 20; break;
    case "Funcionário interno":   score += 15; break;
    case "Social media freelancer": score += 10; break;
    case "Agência":               score +=  5; break;
  }

  const lead_temperature: DiagnosticResult["lead_temperature"] =
    score >= 56 ? "quente" : score >= 31 ? "morno" : "frio";

  const offer_suggestion = getMarketingDiagnosticSuggestion(input);
  const advice = getAdvice(input);

  return { lead_score: score, lead_temperature, offer_suggestion, advice };
}

export function getMarketingDiagnosticSuggestion(input: Pick<MarketingDiagnosticInput, "main_problem" | "business_type">): string {
  const { main_problem } = input;
  if (main_problem === "Poucas mensagens no WhatsApp" || main_problem === "Pouca venda")
    return "Plano Crescimento: conteúdo + tráfego + WhatsApp";
  if (main_problem === "Falta de conteúdo" || main_problem === "Não sei o que postar")
    return "Plano Presença: calendário + posts + roteiros";
  if (main_problem === "Atendimento bagunçado")
    return "Lokat Tech: CRM + automação + WhatsApp";
  if (main_problem === "Não tenho relatório")
    return "Relatório + gestão mensal de marketing";
  if (main_problem === "Falta de campanha")
    return "Plano Crescimento: conteúdo + tráfego + WhatsApp";
  return "Plano Presença: calendário + posts + roteiros";
}

function getAdvice(input: Pick<MarketingDiagnosticInput, "business_type" | "main_problem">): string {
  switch (input.business_type) {
    case "Restaurante / Lanchonete":
      return "Campanhas de produto, combos, WhatsApp e recorrência";
    case "Academia":
      return "Captação de alunos, campanhas de matrícula e conteúdo de prova social";
    case "Material de construção":
      return "Ofertas semanais, campanhas sazonais e conteúdo educativo";
    case "Clínica / Estética":
      return "Antes e depois, agendamento via WhatsApp e conteúdo de autoridade";
    case "Mercado / Conveniência":
      return "Encarte digital, promoções semanais e WhatsApp ativo";
    case "Loja local":
      return "Conteúdo de produto, stories diários e tráfego local";
    default:
      return "Organização de conteúdo, campanhas e acompanhamento comercial";
  }
}

export function normalizeWhatsapp(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function buildWhatsappUrl(phone: string, message: string): string {
  const normalized = phone.startsWith("55") ? phone : `55${normalizeWhatsapp(phone)}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
