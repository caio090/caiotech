// Tipos canônicos do blog público LOKAT OS.
// Espelha a estrutura da SQL 78 (proposta, não executada ainda).
// Quando o banco tiver as tabelas, as queries tipam com base nisto.

export type BlogPostStatus =
  | "draft"
  | "research"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "archived";

export type BlogSourceType =
  | "official"
  | "research"
  | "news"
  | "interview"
  | "internal"
  | "other";

export type BlogCtaType =
  | "diagnostic"
  | "platform_trial"
  | "service_contact"
  | "newsletter"
  | "affiliate"
  | "sponsored"
  | "product"
  | "none";

export type CoverGenerationStatus =
  | "none"
  | "pending"
  | "generated"
  | "approved"
  | "external";

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
  post_count?: number;
}

export interface BlogAuthor {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  role: string | null;
}

export interface BlogSource {
  id: string;
  post_id: string;
  source_type: BlogSourceType;
  title: string;
  url: string | null;
  author: string | null;
  published_at: string | null;
  note: string | null;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string | null;
  status: BlogPostStatus;
  author_id: string | null;
  author?: BlogAuthor;
  category_id: string | null;
  category?: BlogCategory;
  tags: string[];
  cover_url: string | null;
  cover_alt: string | null;
  cover_generation_status: CoverGenerationStatus;
  seo_title: string | null;
  seo_description: string | null;
  cta_type: BlogCtaType;
  cta_label: string | null;
  cta_href: string | null;
  sources?: BlogSource[];
  approved_by: string | null;
  approved_at: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogListItem
  extends Pick<BlogPost, "id" | "slug" | "title" | "summary" | "cover_url" | "cover_alt" | "status" | "published_at" | "tags"> {
  author?: Pick<BlogAuthor, "name" | "avatar_url">;
  category?: Pick<BlogCategory, "slug" | "name" | "color">;
}

export const BLOG_CATEGORIES: Omit<BlogCategory, "id" | "post_count">[] = [
  { slug: "marketing",         name: "Marketing",              description: "Estratégia, conteúdo, campanhas e resultados de marketing.", color: "#7b6ef6" },
  { slug: "tecnologia",        name: "Tecnologia",             description: "Ferramentas, plataformas e inovações para negócios.",        color: "#3b82f6" },
  { slug: "inteligencia-ia",   name: "Inteligência Artificial", description: "IA aplicada a operação, conteúdo e decisões.",              color: "#a855f7" },
  { slug: "gestao",            name: "Gestão",                 description: "Processos, equipes, planejamento e resultados.",             color: "#10b981" },
  { slug: "vendas",            name: "Vendas",                 description: "Conversão, CRM, follow-up e expansão de receita.",           color: "#f59e0b" },
  { slug: "crm",               name: "CRM",                   description: "Relacionamento com clientes, leads e funis de vendas.",       color: "#ef4444" },
  { slug: "automacao",         name: "Automação",             description: "Fluxos automáticos, webhooks e integrações.",                 color: "#06b6d4" },
  { slug: "conteudo",          name: "Conteúdo",              description: "Produção, calendário, aprovações e distribuição.",            color: "#ec4899" },
  { slug: "audiovisual",       name: "Audiovisual",           description: "Vídeo, roteiro, decupagem e produção visual.",               color: "#c0392b" },
  { slug: "redes-sociais",     name: "Redes Sociais",         description: "Instagram, Meta, TikTok e estratégias de presença.",         color: "#7b6ef6" },
  { slug: "negocios-locais",   name: "Negócios Locais",       description: "Operação de empresas locais, clínicas, lojas e serviços.",   color: "#0ea5e9" },
  { slug: "ecommerce",         name: "E-commerce",            description: "Vendas online, pedidos, faturamento e plataformas.",         color: "#84cc16" },
  { slug: "cardapio-digital",  name: "Cardápio Digital",      description: "Pedidos online, integrações e faturamento via plataforma.", color: "#f97316" },
  { slug: "whatsapp",          name: "WhatsApp",              description: "Atendimento, CRM e automação via canal WhatsApp.",           color: "#25d366" },
  { slug: "dados-insights",    name: "Dados e Insights",      description: "Métricas, relatórios, diagnósticos e tomada de decisão.",   color: "#6366f1" },
];
