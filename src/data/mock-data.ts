// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type ClientHealth = "healthy" | "attention" | "risk";
export type ClientStatus = "active" | "paused" | "churned";
export type ProjectStatus = "active" | "completed" | "paused" | "cancelled";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";
export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type ContentStatus = "draft" | "in_review" | "approved" | "published" | "rejected";
export type UserRole = "admin" | "client" | "social_media" | "financeiro" | "aluno";

// ─── USUÁRIOS ─────────────────────────────────────────────────────────────────

export const mockUsers = [
  {
    id: "u1",
    name: "Rafael Lima",
    email: "admin@lokatagencia.com.br",
    role: "admin" as UserRole,
    avatar: "RL",
    color: "bg-indigo-600",
  },
  {
    id: "u2",
    name: "Mariana Costa",
    email: "social@lokatagencia.com.br",
    role: "social_media" as UserRole,
    avatar: "MC",
    color: "bg-purple-600",
  },
  {
    id: "u3",
    name: "Pedro Financeiro",
    email: "financeiro@lokatagencia.com.br",
    role: "financeiro" as UserRole,
    avatar: "PF",
    color: "bg-emerald-600",
  },
  {
    id: "u4",
    name: "Ana Aluna",
    email: "ana@aluno.com.br",
    role: "aluno" as UserRole,
    avatar: "AA",
    color: "bg-amber-600",
  },
];

export const mockClientUsers = [
  {
    id: "c1",
    name: "Demo Cliente",
    email: "contato@democlient.com.br",
    role: "client" as UserRole,
    avatar: "DC",
    color: "bg-pink-600",
    clientId: "client-1",
  },
];

// ─── CLIENTES ─────────────────────────────────────────────────────────────────

export const mockClients = [
  {
    id: "client-1",
    name: "Demo",
    company: "Demo Cliente & Presentes",
    email: "contato@democlient.com.br",
    phone: "(11) 99999-0001",
    status: "active" as ClientStatus,
    health: "healthy" as ClientHealth,
    owner: "Mariana Costa",
    ownerId: "u2",
    segment: "Alimentação",
    since: "2024-01-10",
    notes: "Cliente fidelizada, ótimo engajamento nas redes. Prefere comunicação via WhatsApp.",
    avatar: "CA",
    color: "bg-pink-500",
    mrr: 2800,
  },
  {
    id: "client-2",
    name: "Duh Lanches",
    company: "Duh Lanches Artesanais Ltda",
    email: "duh@duhlanches.com.br",
    phone: "(11) 98888-0002",
    status: "active" as ClientStatus,
    health: "attention" as ClientHealth,
    owner: "Rafael Lima",
    ownerId: "u1",
    segment: "Food & Beverage",
    since: "2024-03-15",
    notes: "Entrega de março atrasou 2 dias. Acompanhar de perto o calendário.",
    avatar: "DL",
    color: "bg-orange-500",
    mrr: 1800,
  },
  {
    id: "client-3",
    name: "O Pedreirão",
    company: "Pedreirão Construções e Reformas",
    email: "pedro@operreirão.com.br",
    phone: "(11) 97777-0003",
    status: "active" as ClientStatus,
    health: "risk" as ClientHealth,
    owner: "Rafael Lima",
    ownerId: "u1",
    segment: "Construção Civil",
    since: "2023-11-01",
    notes: "Cliente insatisfeito com frequência de posts. Reunião de alinhamento marcada.",
    avatar: "OP",
    color: "bg-yellow-600",
    mrr: 1200,
  },
  {
    id: "client-4",
    name: "Odonto Lura",
    company: "Clínica Odontológica Lura",
    email: "contato@odontolura.com.br",
    phone: "(11) 96666-0004",
    status: "active" as ClientStatus,
    health: "healthy" as ClientHealth,
    owner: "Mariana Costa",
    ownerId: "u2",
    segment: "Saúde",
    since: "2024-02-20",
    notes: "Clínica em crescimento, quer aumentar plano em julho.",
    avatar: "OL",
    color: "bg-teal-500",
    mrr: 3200,
  },
  {
    id: "client-5",
    name: "Lokat Tech",
    company: "Lokat Tecnologia e Inovação",
    email: "marketing@lokattech.com.br",
    phone: "(11) 95555-0005",
    status: "active" as ClientStatus,
    health: "healthy" as ClientHealth,
    owner: "Rafael Lima",
    ownerId: "u1",
    segment: "Tecnologia",
    since: "2024-04-01",
    notes: "Cliente interno. Foco em LinkedIn e conteúdo técnico.",
    avatar: "LT",
    color: "bg-indigo-500",
    mrr: 4500,
  },
];

// ─── PROJETOS ─────────────────────────────────────────────────────────────────

export const mockProjects = [
  {
    id: "proj-1",
    clientId: "client-1",
    clientName: "Demo",
    name: "Gestão de Redes — Junho 2025",
    status: "active" as ProjectStatus,
    progress: 68,
    dueDate: "2025-06-30",
    assignee: "Mariana Costa",
    tasks: { total: 24, done: 16, overdue: 1 },
    description: "Gestão completa de Instagram e TikTok + criação de conteúdo semanal.",
  },
  {
    id: "proj-2",
    clientId: "client-2",
    clientName: "Duh Lanches",
    name: "Campanha Julho Temático",
    status: "active" as ProjectStatus,
    progress: 30,
    dueDate: "2025-07-31",
    assignee: "Mariana Costa",
    tasks: { total: 18, done: 5, overdue: 2 },
    description: "Campanha especial de julho com tema de inverno. Stories, reels e feed.",
  },
  {
    id: "proj-3",
    clientId: "client-3",
    clientName: "O Pedreirão",
    name: "Reposicionamento de Marca",
    status: "paused" as ProjectStatus,
    progress: 45,
    dueDate: "2025-07-15",
    assignee: "Rafael Lima",
    tasks: { total: 12, done: 5, overdue: 3 },
    description: "Reformulação visual e de posicionamento para atrair clientes corporativos.",
  },
  {
    id: "proj-4",
    clientId: "client-4",
    clientName: "Odonto Lura",
    name: "Crescimento Instagram — Q2",
    status: "active" as ProjectStatus,
    progress: 80,
    dueDate: "2025-06-30",
    assignee: "Mariana Costa",
    tasks: { total: 30, done: 24, overdue: 0 },
    description: "Meta: +500 seguidores e 8% de taxa de engajamento.",
  },
  {
    id: "proj-5",
    clientId: "client-5",
    clientName: "Lokat Tech",
    name: "Estratégia LinkedIn B2B",
    status: "active" as ProjectStatus,
    progress: 55,
    dueDate: "2025-07-30",
    assignee: "Rafael Lima",
    tasks: { total: 20, done: 11, overdue: 0 },
    description: "Posicionamento de liderança técnica e geração de leads via LinkedIn.",
  },
];

// ─── TAREFAS ──────────────────────────────────────────────────────────────────

export const mockTasks = [
  { id: "t1", projectId: "proj-1", title: "Criar pauta semanal de stories", status: "done" as TaskStatus, assignee: "Mariana Costa", dueDate: "2025-06-10", priority: "high" },
  { id: "t2", projectId: "proj-1", title: "Produzir reels de produtos", status: "in_progress" as TaskStatus, assignee: "Mariana Costa", dueDate: "2025-06-18", priority: "high" },
  { id: "t3", projectId: "proj-1", title: "Publicar cards de promoção", status: "todo" as TaskStatus, assignee: "Mariana Costa", dueDate: "2025-06-25", priority: "medium" },
  { id: "t4", projectId: "proj-1", title: "Relatório mensal", status: "todo" as TaskStatus, assignee: "Mariana Costa", dueDate: "2025-06-30", priority: "medium" },
  { id: "t5", projectId: "proj-2", title: "Briefing campanha inverno", status: "done" as TaskStatus, assignee: "Rafael Lima", dueDate: "2025-06-05", priority: "high" },
  { id: "t6", projectId: "proj-2", title: "Criar identidade visual da campanha", status: "in_progress" as TaskStatus, assignee: "Mariana Costa", dueDate: "2025-06-20", priority: "high" },
  { id: "t7", projectId: "proj-4", title: "5 posts de educação odontológica", status: "review" as TaskStatus, assignee: "Mariana Costa", dueDate: "2025-06-15", priority: "medium" },
  { id: "t8", projectId: "proj-5", title: "Artigo técnico sobre IA", status: "in_progress" as TaskStatus, assignee: "Rafael Lima", dueDate: "2025-06-22", priority: "high" },
];

// ─── CONTEÚDOS ────────────────────────────────────────────────────────────────

export const mockContents = [
  {
    id: "cont-1",
    clientId: "client-1",
    clientName: "Demo",
    title: "Coleção Dia dos Namorados — Carrossel",
    type: "carousel",
    platform: "Instagram",
    status: "approved" as ContentStatus,
    assignee: "Mariana Costa",
    createdAt: "2025-06-08",
    scheduledAt: "2025-06-12",
    thumbnail: "🍬",
  },
  {
    id: "cont-2",
    clientId: "client-1",
    clientName: "Demo",
    title: "Promoção Especial — Reel 30s",
    type: "reel",
    platform: "Instagram",
    status: "in_review" as ContentStatus,
    assignee: "Mariana Costa",
    createdAt: "2025-06-10",
    scheduledAt: "2025-06-15",
    thumbnail: "🎬",
  },
  {
    id: "cont-3",
    clientId: "client-2",
    clientName: "Duh Lanches",
    title: "Novo sabor X-Tudo da semana",
    type: "post",
    platform: "Instagram",
    status: "draft" as ContentStatus,
    assignee: "Mariana Costa",
    createdAt: "2025-06-11",
    scheduledAt: "2025-06-16",
    thumbnail: "🍔",
  },
  {
    id: "cont-4",
    clientId: "client-4",
    clientName: "Odonto Lura",
    title: "Dicas de higiene bucal — Reels",
    type: "reel",
    platform: "Instagram",
    status: "in_review" as ContentStatus,
    assignee: "Mariana Costa",
    createdAt: "2025-06-09",
    scheduledAt: "2025-06-14",
    thumbnail: "🦷",
  },
  {
    id: "cont-5",
    clientId: "client-5",
    clientName: "Lokat Tech",
    title: "Como IA está transformando agências — LinkedIn",
    type: "article",
    platform: "LinkedIn",
    status: "approved" as ContentStatus,
    assignee: "Rafael Lima",
    createdAt: "2025-06-07",
    scheduledAt: "2025-06-13",
    thumbnail: "💡",
  },
  {
    id: "cont-6",
    clientId: "client-3",
    clientName: "O Pedreirão",
    title: "Antes e depois — Reforma apartamento",
    type: "carousel",
    platform: "Instagram",
    status: "rejected" as ContentStatus,
    assignee: "Mariana Costa",
    createdAt: "2025-06-06",
    scheduledAt: null,
    thumbnail: "🏗️",
    rejectionReason: "Fotos de baixa qualidade, solicitar novas ao cliente.",
  },
];

// ─── APROVAÇÕES ───────────────────────────────────────────────────────────────

export const mockApprovals = [
  {
    id: "apr-1",
    clientId: "client-1",
    clientName: "Demo",
    contentTitle: "Promoção Especial — Reel 30s",
    platform: "Instagram",
    requestedAt: "2025-06-10",
    deadline: "2025-06-13",
    status: "pending",
    preview: "🎬 Reel 30s mostrando os produtos da coleção de verão com música animada.",
  },
  {
    id: "apr-2",
    clientId: "client-4",
    clientName: "Odonto Lura",
    contentTitle: "Dicas de higiene bucal — Reels",
    platform: "Instagram",
    requestedAt: "2025-06-09",
    deadline: "2025-06-12",
    status: "pending",
    preview: "🦷 3 dicas rápidas de higiene bucal em formato Reels vertical 15s.",
  },
  {
    id: "apr-3",
    clientId: "client-2",
    clientName: "Duh Lanches",
    contentTitle: "Story promoção segunda-feira",
    platform: "Instagram",
    requestedAt: "2025-06-11",
    deadline: "2025-06-14",
    status: "approved",
    preview: "Story com animação do X-Tudo especial da semana.",
  },
];

// ─── FINANCEIRO ───────────────────────────────────────────────────────────────

export const mockInvoices = [
  { id: "inv-1", clientId: "client-1", clientName: "Demo", description: "Gestão de Redes — Junho/25", amount: 2800, dueDate: "2025-06-15", status: "paid" as InvoiceStatus, paidAt: "2025-06-12" },
  { id: "inv-2", clientId: "client-2", clientName: "Duh Lanches", description: "Gestão de Redes — Junho/25", amount: 1800, dueDate: "2025-06-20", status: "pending" as InvoiceStatus, paidAt: null },
  { id: "inv-3", clientId: "client-3", clientName: "O Pedreirão", description: "Gestão de Redes — Maio/25", amount: 1200, dueDate: "2025-05-20", status: "overdue" as InvoiceStatus, paidAt: null },
  { id: "inv-4", clientId: "client-4", clientName: "Odonto Lura", description: "Gestão de Redes — Junho/25", amount: 3200, dueDate: "2025-06-10", status: "paid" as InvoiceStatus, paidAt: "2025-06-09" },
  { id: "inv-5", clientId: "client-5", clientName: "Lokat Tech", description: "Estratégia LinkedIn — Junho/25", amount: 4500, dueDate: "2025-06-25", status: "pending" as InvoiceStatus, paidAt: null },
  { id: "inv-6", clientId: "client-3", clientName: "O Pedreirão", description: "Gestão de Redes — Junho/25", amount: 1200, dueDate: "2025-06-20", status: "pending" as InvoiceStatus, paidAt: null },
  { id: "inv-7", clientId: "client-1", clientName: "Demo", description: "Campanha Dia dos Namorados", amount: 1500, dueDate: "2025-06-05", status: "paid" as InvoiceStatus, paidAt: "2025-06-04" },
];

export const mockExpenses = [
  { id: "exp-1", description: "Adobe Creative Cloud", amount: 289, category: "tools", occurredAt: "2025-06-01" },
  { id: "exp-2", description: "Canva Pro — 5 licenças", amount: 450, category: "tools", occurredAt: "2025-06-01" },
  { id: "exp-3", description: "Meta Ads — Gerenciamento", amount: 800, category: "marketing", occurredAt: "2025-06-10" },
  { id: "exp-4", description: "Salário — Mariana Costa", amount: 4200, category: "payroll", occurredAt: "2025-06-05" },
  { id: "exp-5", description: "Hostinger — Hospedagem sites", amount: 120, category: "infrastructure", occurredAt: "2025-06-01" },
];

// ─── LEADS ────────────────────────────────────────────────────────────────────

export const mockLeads = [
  {
    id: "lead-1",
    name: "Carlos Mendes",
    company: "Bella Pizzas",
    email: "carlos@bellapizzas.com.br",
    phone: "(11) 94444-1001",
    source: "referral",
    stage: "proposal" as LeadStage,
    estimatedValue: 2200,
    owner: "Rafael Lima",
    daysInStage: 5,
    createdAt: "2025-06-01",
  },
  {
    id: "lead-2",
    name: "Fernanda Rocha",
    company: "Studio F — Pilates",
    email: "fe@studiof.com.br",
    phone: "(11) 93333-1002",
    source: "inbound",
    stage: "negotiation" as LeadStage,
    estimatedValue: 3000,
    owner: "Rafael Lima",
    daysInStage: 3,
    createdAt: "2025-05-28",
  },
  {
    id: "lead-3",
    name: "Roberto Alves",
    company: "Sapataria Alves",
    email: "roberto@sapatariaalves.com.br",
    phone: "(11) 92222-1003",
    source: "social",
    stage: "contacted" as LeadStage,
    estimatedValue: 1500,
    owner: "Rafael Lima",
    daysInStage: 8,
    createdAt: "2025-06-03",
  },
  {
    id: "lead-4",
    name: "Juliana Pires",
    company: "Estética J.Pires",
    email: "ju@jpires.com.br",
    phone: "(11) 91111-1004",
    source: "referral",
    stage: "qualified" as LeadStage,
    estimatedValue: 2500,
    owner: "Rafael Lima",
    daysInStage: 2,
    createdAt: "2025-06-08",
  },
  {
    id: "lead-5",
    name: "Marcos Freitas",
    company: "Restaurante Freitas",
    email: "marcos@freitas.com.br",
    phone: "(11) 90000-1005",
    source: "outbound",
    stage: "new" as LeadStage,
    estimatedValue: 1800,
    owner: "Rafael Lima",
    daysInStage: 1,
    createdAt: "2025-06-11",
  },
];

// ─── DIAGNÓSTICOS ─────────────────────────────────────────────────────────────

export const mockDiagnostics = [
  {
    id: "diag-1",
    clientId: "client-1",
    clientName: "Demo",
    score: 78,
    completedAt: "2025-04-10",
    areas: {
      presencaDigital: 85,
      conteudo: 72,
      engajamento: 80,
      consistencia: 75,
      estrategia: 78,
    },
    recommendations: [
      "Aumentar frequência de Reels para 3x por semana",
      "Criar conteúdo educativo sobre processos artesanais",
      "Explorar TikTok para alcance de público mais jovem",
    ],
  },
  {
    id: "diag-2",
    clientId: "client-2",
    clientName: "Duh Lanches",
    score: 62,
    completedAt: "2025-05-15",
    areas: {
      presencaDigital: 60,
      conteudo: 65,
      engajamento: 58,
      consistencia: 55,
      estrategia: 72,
    },
    recommendations: [
      "Padronizar identidade visual dos posts",
      "Aumentar consistência de publicações",
      "Implementar estratégia de UGC (conteúdo do usuário)",
    ],
  },
  {
    id: "diag-3",
    clientId: "client-4",
    clientName: "Odonto Lura",
    score: 88,
    completedAt: "2025-03-20",
    areas: {
      presencaDigital: 90,
      conteudo: 85,
      engajamento: 92,
      consistencia: 88,
      estrategia: 85,
    },
    recommendations: [
      "Explorar mais depoimentos de pacientes",
      "Criar trilha de conteúdo de prevenção",
      "Iniciar presença no YouTube Shorts",
    ],
  },
];

// ─── CALENDÁRIO ───────────────────────────────────────────────────────────────

export const mockCalendarEvents = [
  { id: "ev-1", clientId: "client-1", title: "Post Carrossel — Demo", date: "2025-06-12", platform: "Instagram", type: "post", status: "published" },
  { id: "ev-2", clientId: "client-1", title: "Reel Promoção — Demo", date: "2025-06-15", platform: "Instagram", type: "reel", status: "scheduled" },
  { id: "ev-3", clientId: "client-2", title: "Story X-Tudo — Duh Lanches", date: "2025-06-13", platform: "Instagram", type: "story", status: "scheduled" },
  { id: "ev-4", clientId: "client-4", title: "Dicas Higiene Bucal — Odonto", date: "2025-06-14", platform: "Instagram", type: "reel", status: "scheduled" },
  { id: "ev-5", clientId: "client-5", title: "Artigo IA — Lokat Tech", date: "2025-06-13", platform: "LinkedIn", type: "article", status: "scheduled" },
  { id: "ev-6", clientId: "client-1", title: "Stories Dia dos Namorados — Demo", date: "2025-06-17", platform: "Instagram", type: "story", status: "scheduled" },
  { id: "ev-7", clientId: "client-2", title: "Post Campanha Inverno — Duh", date: "2025-06-20", platform: "Instagram", type: "post", status: "draft" },
  { id: "ev-8", clientId: "client-4", title: "Case clínica — Odonto Lura", date: "2025-06-18", platform: "Instagram", type: "carousel", status: "draft" },
];

// ─── ARQUIVOS ─────────────────────────────────────────────────────────────────

export const mockFiles = [
  { id: "f1", clientId: "client-1", name: "Identidade Visual — Demo.pdf", size: "4.2 MB", type: "pdf", uploadedAt: "2025-04-15", uploadedBy: "Rafael Lima" },
  { id: "f2", clientId: "client-1", name: "Fotos Produtos Junho.zip", size: "124 MB", type: "zip", uploadedAt: "2025-06-01", uploadedBy: "Demo Cliente" },
  { id: "f3", clientId: "client-1", name: "Pauta Junho 2025.docx", size: "1.1 MB", type: "docx", uploadedAt: "2025-05-30", uploadedBy: "Mariana Costa" },
  { id: "f4", clientId: "client-2", name: "Logo Duh Lanches.ai", size: "8.9 MB", type: "ai", uploadedAt: "2025-03-20", uploadedBy: "Rafael Lima" },
  { id: "f5", clientId: "client-4", name: "Fotos Clínica.zip", size: "89 MB", type: "zip", uploadedAt: "2025-05-10", uploadedBy: "Odonto Lura" },
  { id: "f6", clientId: "client-5", name: "Brand Guide Lokat Tech.pdf", size: "6.7 MB", type: "pdf", uploadedAt: "2025-04-01", uploadedBy: "Rafael Lima" },
];

// ─── SOLICITAÇÕES ─────────────────────────────────────────────────────────────

export const mockRequests = [
  {
    id: "req-1",
    clientId: "client-1",
    clientName: "Demo",
    title: "Post especial Dia dos Pais",
    description: "Queremos um post especial para o Dia dos Pais com nossos produtos presenteáveis.",
    status: "pending",
    createdAt: "2025-06-11",
    priority: "medium",
  },
  {
    id: "req-2",
    clientId: "client-2",
    clientName: "Duh Lanches",
    title: "Alterar horário de publicação dos stories",
    description: "Gostaríamos de testar publicar os stories às 18h ao invés das 12h.",
    status: "in_review",
    createdAt: "2025-06-10",
    priority: "low",
  },
  {
    id: "req-3",
    clientId: "client-4",
    clientName: "Odonto Lura",
    title: "Criar serie de vídeos sobre procedimentos",
    description: "Queremos uma série de 5 reels curtos mostrando nossos procedimentos principais.",
    status: "approved",
    createdAt: "2025-06-08",
    priority: "high",
  },
];

// ─── RESULTADOS/RELATÓRIOS ────────────────────────────────────────────────────

export const mockReports = [
  {
    id: "rep-1",
    clientId: "client-1",
    clientName: "Demo",
    period: "Maio 2025",
    metrics: {
      seguidores: { value: 12450, growth: 8.2 },
      alcance: { value: 89000, growth: 15.4 },
      engajamento: { value: 6.8, growth: 1.2 },
      impressoes: { value: 145000, growth: 12.1 },
      cliques: { value: 3240, growth: 22.5 },
    },
    topContent: "Reel Coleção Inverno — 18.4k visualizações",
  },
  {
    id: "rep-2",
    clientId: "client-4",
    clientName: "Odonto Lura",
    period: "Maio 2025",
    metrics: {
      seguidores: { value: 5820, growth: 11.3 },
      alcance: { value: 42000, growth: 18.7 },
      engajamento: { value: 8.1, growth: 2.4 },
      impressoes: { value: 78000, growth: 21.3 },
      cliques: { value: 1890, growth: 35.2 },
    },
    topContent: "Antes e depois clareamento — 9.2k visualizações",
  },
];

// ─── CURSOS / ACADEMY ─────────────────────────────────────────────────────────

export const mockCourses = [
  {
    id: "course-1",
    title: "Onboarding Lokat — Bem-vindo à equipe",
    description: "Tudo que você precisa saber para começar na Lokat Agência.",
    thumbnail: "🚀",
    color: "bg-indigo-500",
    lessons: 8,
    duration: "2h 30min",
    progress: 100,
    category: "onboarding",
    publishedAt: "2024-01-01",
    instructor: "Rafael Lima",
  },
  {
    id: "course-2",
    title: "Copywriting para Redes Sociais",
    description: "Como escrever textos que geram engajamento e conversão.",
    thumbnail: "✍️",
    color: "bg-purple-500",
    lessons: 12,
    duration: "4h 15min",
    progress: 75,
    category: "conteudo",
    publishedAt: "2024-03-10",
    instructor: "Mariana Costa",
  },
  {
    id: "course-3",
    title: "Estratégia de Instagram — Avançado",
    description: "Algoritmo, growth hacking e estratégias comprovadas para escalar perfis.",
    thumbnail: "📱",
    color: "bg-pink-500",
    lessons: 16,
    duration: "6h 00min",
    progress: 40,
    category: "estrategia",
    publishedAt: "2024-05-20",
    instructor: "Mariana Costa",
  },
  {
    id: "course-4",
    title: "Design no Canva — Do Zero ao Pro",
    description: "Criação de artes profissionais para redes sociais usando Canva.",
    thumbnail: "🎨",
    color: "bg-emerald-500",
    lessons: 10,
    duration: "3h 20min",
    progress: 0,
    category: "design",
    publishedAt: "2024-06-01",
    instructor: "Lokat Academy",
  },
  {
    id: "course-5",
    title: "Gestão de Tráfego Pago — Meta Ads",
    description: "Configuração de campanhas, públicos e otimização de anúncios no Meta.",
    thumbnail: "📊",
    color: "bg-blue-500",
    lessons: 20,
    duration: "8h 00min",
    progress: 20,
    category: "trafego",
    publishedAt: "2024-07-15",
    instructor: "Rafael Lima",
  },
];

export const mockLessons = [
  { id: "les-1", courseId: "course-2", title: "Fundamentos do copywriting", duration: "18min", type: "video", completed: true },
  { id: "les-2", courseId: "course-2", title: "A fórmula AIDA aplicada a posts", duration: "22min", type: "video", completed: true },
  { id: "les-3", courseId: "course-2", title: "Calls to action que convertem", duration: "15min", type: "video", completed: true },
  { id: "les-4", courseId: "course-2", title: "Exercício prático — reescrevendo posts", duration: "30min", type: "text", completed: false },
  { id: "les-5", courseId: "course-3", title: "Como o algoritmo do Instagram funciona", duration: "25min", type: "video", completed: true },
  { id: "les-6", courseId: "course-3", title: "Growth hacking com Reels", duration: "32min", type: "video", completed: false },
];

// ─── MÉTRICAS DO DASHBOARD ADMIN ───────────────────────────────────────────────

export const adminMetrics = {
  mrr: 13500,
  mrrGrowth: 12.5,
  activeClients: 5,
  clientsAtRisk: 1,
  activeProjects: 4,
  overdueProjects: 1,
  pendingApprovals: 2,
  contentInProduction: 6,
  pendingInvoices: 3,
  overdueInvoices: 1,
  overdueAmount: 1200,
  leadsInNegotiation: 2,
  overdueTasks: 6,
  teamProductivity: 78,
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

export function getClientById(id: string) {
  return mockClients.find((c) => c.id === id);
}

export function getProjectsByClient(clientId: string) {
  return mockProjects.filter((p) => p.clientId === clientId);
}

export function getContentsByClient(clientId: string) {
  return mockContents.filter((c) => c.clientId === clientId);
}

export function getInvoicesByClient(clientId: string) {
  return mockInvoices.filter((i) => i.clientId === clientId);
}

export function getApprovalsByClient(clientId: string) {
  return mockApprovals.filter((a) => a.clientId === clientId);
}

export function getFilesByClient(clientId: string) {
  return mockFiles.filter((f) => f.clientId === clientId);
}
