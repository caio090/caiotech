import type { ProductExperiment, ProductOpportunity, ProductPainPoint, ProductResearchEntry, ProductValidationSignal } from "./types";

/** Fixtures demonstrativas genéricas — nenhum nome real de cliente, nenhum dado de conversa real. */
export const PRODUCT_RESEARCH_ENTRIES: ProductResearchEntry[] = [
  {
    id: "pr_001",
    title: "Dono não sabe qual produto está dando prejuízo",
    businessSegment: "food_service",
    businessSize: "micro",
    city: "Exemplo",
    state: "CE",
    reportedProblem: "Não existe uma tela que cruze custo do produto com o preço praticado — a decisão de manter ou tirar um item do cardápio é no feeling.",
    currentWorkaround: "Planilha manual atualizada de vez em quando, geralmente desatualizada.",
    frequency: "recurring",
    severity: "high",
    financialImpact: "Estimado pelo entrevistado em algumas centenas de reais por mês em produtos vendidos abaixo do custo.",
    operationalImpact: "Nenhum processo formal de revisão de cardápio.",
    affectedModules: ["meu_negocio", "financeiro"],
    suggestedSolution: "Painel de margem por produto com alerta quando preço praticado fica abaixo do custo calculado.",
    evidence: ["Entrevista registrada em áudio (fixture: sem gravação real)"],
    sourceType: "interview",
    interviewDate: "2026-07-10",
    reportedBy: "pesquisa_produto",
    validationCount: 3,
    status: "validated_problem",
    createdAt: "2026-07-10T12:00:00Z",
    updatedAt: "2026-07-20T12:00:00Z",
  },
  {
    id: "pr_002",
    title: "Estoque parado sem campanha para escoar",
    businessSegment: "construction_materials",
    businessSize: "small",
    city: "Exemplo",
    state: "CE",
    reportedProblem: "Produto com estoque alto e giro baixo fica parado meses sem que ninguém sugira uma promoção.",
    currentWorkaround: "Vendedor lembra de oferecer quando o cliente já está na loja, por sorte.",
    frequency: "occasional",
    severity: "medium",
    affectedModules: ["meu_negocio", "campanhas"],
    suggestedSolution: "Radar automático de produtos parados sugerindo tipo de campanha.",
    evidence: [],
    sourceType: "sales_call",
    interviewDate: "2026-07-15",
    reportedBy: "pesquisa_produto",
    validationCount: 1,
    status: "reviewing",
    createdAt: "2026-07-15T12:00:00Z",
    updatedAt: "2026-07-15T12:00:00Z",
  },
  {
    id: "pr_003",
    title: "Aprovação de post trava no WhatsApp pessoal",
    businessSegment: "agency_services",
    businessSize: "small",
    city: "Exemplo",
    state: "SP",
    reportedProblem: "Aprovação de conteúdo depende do cliente ver a mensagem no WhatsApp pessoal do responsável — sem rastro, sem prazo.",
    currentWorkaround: "Grupo de WhatsApp da conta, mensagens se perdem.",
    frequency: "constant",
    severity: "high",
    affectedModules: ["rec_os"],
    suggestedSolution: "Aprovação dentro do portal do cliente, com link direto e prazo visível.",
    evidence: [],
    sourceType: "interview",
    interviewDate: "2026-07-18",
    reportedBy: "pesquisa_produto",
    validationCount: 4,
    status: "solution_hypothesis",
    createdAt: "2026-07-18T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
  },
];

export const PRODUCT_PAIN_POINTS: ProductPainPoint[] = [
  {
    id: "pp_001",
    entryIds: ["pr_001"],
    summary: "Falta de visibilidade de margem por produto",
    affectedModules: ["meu_negocio", "financeiro"],
    occurrenceCount: 1,
    segments: ["food_service"],
  },
  {
    id: "pp_002",
    entryIds: ["pr_003"],
    summary: "Aprovação de conteúdo fora do sistema",
    affectedModules: ["rec_os"],
    occurrenceCount: 1,
    segments: ["agency_services"],
  },
];

export const PRODUCT_OPPORTUNITIES: ProductOpportunity[] = [
  {
    id: "op_001",
    painPointId: "pp_001",
    title: "Painel de margem por produto com alerta de prejuízo",
    rationale: "Resolve diretamente pr_001; reaproveita dados que Meu Negócio e Financeiro já registram.",
    estimatedImpact: "high",
    affectedModules: ["meu_negocio", "financeiro"],
    status: "solution_hypothesis",
  },
];

export const PRODUCT_VALIDATION_SIGNALS: ProductValidationSignal[] = [
  { id: "vs_001", opportunityId: "op_001", entryId: "pr_001", signalType: "confirms", notes: "Segundo empresário do mesmo segmento relatou o mesmo problema.", recordedAt: "2026-07-20T12:00:00Z" },
];

export const PRODUCT_EXPERIMENTS: ProductExperiment[] = [
  { id: "ex_001", opportunityId: "op_001", hypothesis: "Mostrar margem por produto reduz em 30% os itens vendidos abaixo do custo em 60 dias.", metric: "percentual de itens com preço >= custo", status: "planned" },
];
