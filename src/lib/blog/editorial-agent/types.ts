// Contrato do agente editorial — tipos apenas (sem lógica de execução).
// O agente não deve publicar nenhum artigo automaticamente.
// Todo conteúdo passa por aprovação humana antes de status = "published".

export type EditorialStage =
  | "research"    // coleta de fontes e dados
  | "outline"     // estrutura e seções
  | "draft"       // rascunho do corpo
  | "source_check"// verificação de fontes e fatos
  | "seo"         // otimização de title/description/slug
  | "cover_request"// solicitação de imagem de capa
  | "review"      // revisão humana
  | "approval"    // aprovação formal
  | "publish";    // publicação — APENAS após status approved

export type EditorialAgentTaskStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "blocked"
  | "skipped";

export interface EditorialAgentTask {
  stage: EditorialStage;
  status: EditorialAgentTaskStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  started_at?: string;
  completed_at?: string;
  error?: string;
  human_review_required: boolean;
}

export interface EditorialAgentContract {
  post_id: string;
  stages: EditorialAgentTask[];
  current_stage: EditorialStage;
  blocked_reason?: string;
  requires_human_approval: true; // sempre true — agente nunca publica sozinho
  created_at: string;
  updated_at: string;
}

export interface ResearchInput {
  topic: string;
  keywords: string[];
  target_audience: string;
  intent: "informational" | "transactional" | "navigational" | "commercial";
  content_type: "article" | "guide" | "tutorial" | "opinion" | "news_analysis";
}

export interface OutlineOutput {
  title_suggestions: string[];
  slug_suggestion: string;
  summary: string;
  sections: Array<{ heading: string; description: string; estimated_words: number }>;
  estimated_reading_time_minutes: number;
  primary_keyword: string;
  secondary_keywords: string[];
  recommended_cta: string;
}

export interface SourceCheckOutput {
  sources_verified: number;
  sources_flagged: number;
  claims_without_source: string[];
  approved: boolean;
  reviewer_notes: string;
}

export interface SeoOutput {
  seo_title: string;        // max 60 chars
  seo_description: string;  // max 160 chars
  slug: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  schema_type: "Article" | "BlogPosting" | "TechArticle";
}
