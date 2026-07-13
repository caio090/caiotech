// Central de requisitos de documentos por área de análise e nicho.
// Configuração extensível — o admin pode marcar como "não aplicável" ou adicionar itens.

export type DiagnosticArea =
  | "identidade_marca"
  | "marketing_conteudo"
  | "comercial_vendas"
  | "financeiro_faturamento"
  | "operacao_processos"
  | "atendimento_whatsapp"
  | "reputacao_google"
  | "geral";

export type SourceType =
  | "manual_upload"
  | "meta"
  | "google"
  | "crm"
  | "erp"
  | "pdv"
  | "digital_menu"
  | "spreadsheet"
  | "pdf"
  | "image"
  | "external_system"
  | "other";

export type RequirementStatus = "required" | "recommended" | "optional" | "not_applicable";
export type Confidentiality = "normal" | "confidential" | "restricted";

export interface DocumentRequirement {
  key: string;
  label: string;
  description?: string;
  source_type: SourceType;
  requirement_status: RequirementStatus;
  accepted_formats?: string[]; // e.g. ["pdf","xlsx","csv","png","jpg"]
}

// Requisitos por área de análise
export const DOCUMENT_REQUIREMENTS_BY_AREA: Record<DiagnosticArea, DocumentRequirement[]> = {
  identidade_marca: [
    { key: "briefing_marca",        label: "Briefing da marca",          source_type: "pdf",          requirement_status: "required" },
    { key: "manual_identidade",     label: "Manual de identidade visual", source_type: "pdf",          requirement_status: "recommended" },
    { key: "logotipo",              label: "Logotipo",                   source_type: "image",         requirement_status: "recommended" },
    { key: "apresentacao_inst",     label: "Apresentação institucional", source_type: "pdf",          requirement_status: "optional" },
    { key: "posicionamento",        label: "Posicionamento de marca",    source_type: "manual_upload", requirement_status: "optional" },
    { key: "catalogo",              label: "Catálogo de produtos/serviços", source_type: "pdf",       requirement_status: "recommended" },
    { key: "lista_produtos",        label: "Lista de produtos ou serviços", source_type: "spreadsheet", requirement_status: "recommended" },
  ],
  marketing_conteudo: [
    { key: "relatorio_meta",        label: "Relatório Meta Ads",         source_type: "meta",          requirement_status: "recommended" },
    { key: "relatorio_instagram",   label: "Relatório Instagram",        source_type: "meta",          requirement_status: "recommended" },
    { key: "relatorio_trafego",     label: "Relatório de tráfego pago",  source_type: "pdf",          requirement_status: "optional" },
    { key: "calendario_editorial",  label: "Calendário editorial",       source_type: "spreadsheet",   requirement_status: "optional" },
    { key: "campanhas_anteriores",  label: "Campanhas anteriores",       source_type: "pdf",          requirement_status: "optional" },
    { key: "criativos",             label: "Criativos usados",           source_type: "image",         requirement_status: "optional" },
    { key: "relatorio_analytics",   label: "Relatório Google Analytics", source_type: "google",        requirement_status: "optional" },
    { key: "relatorio_gbusiness",   label: "Relatório Google Business",  source_type: "google",        requirement_status: "optional" },
  ],
  comercial_vendas: [
    { key: "export_crm",            label: "Exportação CRM",             source_type: "crm",           requirement_status: "optional" },
    { key: "lista_leads",           label: "Lista de leads",             source_type: "spreadsheet",   requirement_status: "optional" },
    { key: "relatorio_propostas",   label: "Relatório de propostas",     source_type: "pdf",          requirement_status: "optional" },
    { key: "pipeline",              label: "Pipeline comercial",         source_type: "spreadsheet",   requirement_status: "recommended" },
    { key: "relatorio_pedidos",     label: "Relatório de pedidos",       source_type: "spreadsheet",   requirement_status: "recommended" },
    { key: "produtos_mais_vendidos",label: "Produtos/serviços mais vendidos", source_type: "spreadsheet", requirement_status: "required" },
    { key: "taxa_conversao",        label: "Taxa de conversão",          source_type: "manual_upload", requirement_status: "optional" },
  ],
  financeiro_faturamento: [
    { key: "relatorio_faturamento", label: "Relatório mensal de faturamento", source_type: "pdf",     requirement_status: "required" },
    { key: "planilha_vendas",       label: "Planilha de vendas",         source_type: "spreadsheet",   requirement_status: "required" },
    { key: "export_erp",            label: "Exportação ERP",             source_type: "erp",           requirement_status: "optional" },
    { key: "relatorio_pdv",         label: "Relatório PDV / Caixa",      source_type: "pdv",           requirement_status: "recommended" },
    { key: "dre",                   label: "DRE simplificada",           source_type: "spreadsheet",   requirement_status: "optional" },
    { key: "resumo_financeiro",     label: "Resumo financeiro",          source_type: "pdf",          requirement_status: "optional" },
    { key: "contas_receber",        label: "Contas a receber",           source_type: "spreadsheet",   requirement_status: "optional" },
    { key: "relatorio_servicos",    label: "Relatório de serviços vendidos", source_type: "pdf",      requirement_status: "optional" },
  ],
  operacao_processos: [
    { key: "processos",             label: "Processos internos",         source_type: "pdf",          requirement_status: "optional" },
    { key: "checklist_op",          label: "Checklist operacional",      source_type: "manual_upload", requirement_status: "optional" },
    { key: "fluxo_atendimento",     label: "Fluxo de atendimento",       source_type: "pdf",          requirement_status: "optional" },
    { key: "organograma",           label: "Organograma",                source_type: "image",         requirement_status: "optional" },
    { key: "responsabilidades",     label: "Responsabilidades por área", source_type: "pdf",          requirement_status: "optional" },
    { key: "planilhas_controle",    label: "Planilhas de controle",      source_type: "spreadsheet",   requirement_status: "optional" },
  ],
  atendimento_whatsapp: [
    { key: "relatorio_atendimento", label: "Relatório de atendimento",   source_type: "pdf",          requirement_status: "optional" },
    { key: "qtd_contatos",          label: "Quantidade de contatos",     source_type: "spreadsheet",   requirement_status: "optional" },
    { key: "tempo_resposta",        label: "Tempo médio de resposta",    source_type: "manual_upload", requirement_status: "optional" },
    { key: "origem_leads_wa",       label: "Origem dos leads",           source_type: "spreadsheet",   requirement_status: "optional" },
  ],
  reputacao_google: [
    { key: "relatorio_gbusiness2",  label: "Relatório Google Business",  source_type: "google",        requirement_status: "recommended" },
    { key: "avaliacoes",            label: "Avaliações recentes",        source_type: "manual_upload", requirement_status: "optional" },
  ],
  geral: [
    { key: "doc_geral",             label: "Documento geral do cliente", source_type: "manual_upload", requirement_status: "optional" },
  ],
};

export const AREA_LABELS: Record<DiagnosticArea, { label: string; description: string }> = {
  identidade_marca:       { label: "Identidade da marca",       description: "Briefing, manual, logotipo, posicionamento" },
  marketing_conteudo:     { label: "Marketing e conteúdo",      description: "Meta, tráfego, criativos, editorial" },
  comercial_vendas:       { label: "Comercial e vendas",        description: "CRM, pipeline, pedidos, conversão" },
  financeiro_faturamento: { label: "Financeiro e faturamento",  description: "Faturamento, DRE, PDV, contas" },
  operacao_processos:     { label: "Operação e processos",      description: "Fluxos, organograma, responsabilidades" },
  atendimento_whatsapp:   { label: "Atendimento",               description: "WhatsApp, leads, tempo de resposta" },
  reputacao_google:       { label: "Reputação Google",          description: "Google Business, avaliações" },
  geral:                  { label: "Geral",                     description: "Documentos gerais" },
};

// Templates de recomendação por nicho — não são obrigatórios
export type ClientNiche =
  | "material_construcao"
  | "restaurante"
  | "clinica"
  | "academia"
  | "varejo"
  | "servicos"
  | "educacao"
  | "imobiliario"
  | "profissional_liberal"
  | "agencia"
  | "outro";

export const NICHE_LABELS: Record<ClientNiche, string> = {
  material_construcao:  "Materiais de construção",
  restaurante:          "Restaurante / Alimentação",
  clinica:              "Clínica / Saúde",
  academia:             "Academia / Fitness",
  varejo:               "Varejo",
  servicos:             "Serviços",
  educacao:             "Educação",
  imobiliario:          "Imobiliário",
  profissional_liberal: "Profissional liberal",
  agencia:              "Agência",
  outro:                "Outro",
};

// Documentos recomendados por nicho (chaves referenciando DOCUMENT_REQUIREMENTS_BY_AREA)
export const RECOMMENDED_DOCS_BY_NICHE: Record<ClientNiche, Array<{ area: DiagnosticArea; key: string }>> = {
  material_construcao: [
    { area: "identidade_marca",       key: "catalogo" },
    { area: "identidade_marca",       key: "lista_produtos" },
    { area: "comercial_vendas",       key: "produtos_mais_vendidos" },
    { area: "comercial_vendas",       key: "relatorio_pedidos" },
    { area: "financeiro_faturamento", key: "relatorio_faturamento" },
    { area: "marketing_conteudo",     key: "relatorio_meta" },
    { area: "reputacao_google",       key: "relatorio_gbusiness2" },
    { area: "identidade_marca",       key: "briefing_marca" },
  ],
  restaurante: [
    { area: "identidade_marca",       key: "catalogo" },
    { area: "comercial_vendas",       key: "relatorio_pedidos" },
    { area: "financeiro_faturamento", key: "relatorio_faturamento" },
    { area: "comercial_vendas",       key: "produtos_mais_vendidos" },
    { area: "marketing_conteudo",     key: "relatorio_meta" },
  ],
  clinica: [
    { area: "identidade_marca",       key: "lista_produtos" },
    { area: "comercial_vendas",       key: "relatorio_pedidos" },
    { area: "marketing_conteudo",     key: "relatorio_meta" },
    { area: "reputacao_google",       key: "relatorio_gbusiness2" },
    { area: "financeiro_faturamento", key: "relatorio_faturamento" },
  ],
  academia: [
    { area: "financeiro_faturamento", key: "relatorio_faturamento" },
    { area: "marketing_conteudo",     key: "relatorio_meta" },
    { area: "operacao_processos",     key: "checklist_op" },
  ],
  varejo: [
    { area: "comercial_vendas",       key: "produtos_mais_vendidos" },
    { area: "financeiro_faturamento", key: "relatorio_faturamento" },
    { area: "marketing_conteudo",     key: "relatorio_meta" },
    { area: "reputacao_google",       key: "relatorio_gbusiness2" },
  ],
  servicos: [
    { area: "identidade_marca",       key: "lista_produtos" },
    { area: "comercial_vendas",       key: "relatorio_pedidos" },
    { area: "financeiro_faturamento", key: "relatorio_faturamento" },
    { area: "marketing_conteudo",     key: "relatorio_meta" },
  ],
  educacao: [
    { area: "identidade_marca",       key: "briefing_marca" },
    { area: "financeiro_faturamento", key: "relatorio_faturamento" },
    { area: "marketing_conteudo",     key: "relatorio_meta" },
  ],
  imobiliario: [
    { area: "comercial_vendas",       key: "relatorio_pedidos" },
    { area: "financeiro_faturamento", key: "relatorio_faturamento" },
    { area: "marketing_conteudo",     key: "relatorio_meta" },
    { area: "reputacao_google",       key: "relatorio_gbusiness2" },
  ],
  profissional_liberal: [
    { area: "identidade_marca",       key: "lista_produtos" },
    { area: "financeiro_faturamento", key: "relatorio_faturamento" },
    { area: "marketing_conteudo",     key: "relatorio_meta" },
  ],
  agencia: [
    { area: "identidade_marca",       key: "briefing_marca" },
    { area: "comercial_vendas",       key: "relatorio_pedidos" },
    { area: "financeiro_faturamento", key: "relatorio_faturamento" },
    { area: "marketing_conteudo",     key: "relatorio_meta" },
  ],
  outro: [],
};
