export interface DbProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  is_test?: boolean;
  archived_at?: string | null;
}

export interface DbClient {
  id: string;
  owner_id: string;
  company_name: string;
  responsible_name: string;
  email: string;
  phone: string;
  instagram: string | null;
  segment: string | null;
  city: string | null;
  plan: string | null;
  status: string;
  created_at: string;
}

export interface DbOnboardingProfile {
  id: string;
  client_id: string;
  objective_primary: string | null;
  objective_secondary: string[] | null;
  brand_name: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  segment: string | null;
  description: string | null;
  products_services: string | null;
  instagram: string | null;
  whatsapp: string | null;
  website: string | null;
  ideal_customer: string | null;
  age_range: string | null;
  audience_location: string | null;
  pains: string | null;
  desires: string | null;
  objections: string | null;
  contact_behavior: string | null;
  logo_url: string | null;
  brand_colors: unknown;
  visual_references: string | null;
  canva_link: string | null;
  drive_link: string | null;
  visual_style: string | null;
  tone_of_voice: string[] | null;
  words_use: string | null;
  words_avoid: string | null;
  formality_level: string | null;
  cta_style: string | null;
  approval_responsible: string | null;
  approval_phone: string | null;
  best_contact_time: string | null;
  content_frequency: string | null;
  social_channels: string[] | null;
  uses_canva: boolean | null;
  uses_meta_business: boolean | null;
  uses_drive: boolean | null;
  uses_paid_traffic: boolean | null;
  has_internal_team: boolean | null;
  completed: boolean;
  created_at: string;
}

export interface DbContentItem {
  id: string;
  client_id: string;
  title: string;
  type: string | null;
  channel: string | null;
  objective: string | null;
  caption: string | null;
  script: string | null;
  status: string;
  scheduled_date: string | null;
  scheduled_at?: string | null;
  scheduled_format?: string | null;
  carousel_pages_count?: number | null;
  responsible_id: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface DbApproval {
  id: string;
  content_id: string;
  client_id: string;
  public_token: string;
  status: string;
  client_comment: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  approval_sent_at?: string | null;
  approval_due_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Approval joined with its content item (for list pages and public approval page) */
export interface DbApprovalWithContent extends DbApproval {
  content_items: Pick<DbContentItem, "id" | "title" | "type" | "channel" | "objective" | "caption" | "script" | "status" | "scheduled_date"> | null;
}

/** Shape of data passed from Server Components to Client Components */
export interface ServerPageData {
  client: DbClient | null;
  onboarding: DbOnboardingProfile | null;
  profile: DbProfile | null;
}

/** Maps Supabase content_items.status to the UI status string used by ContentCard / StatusBadge */
export function dbStatusToUi(status: string): string {
  const map: Record<string, string> = {
    ideia: "draft", briefing: "draft", roteiro: "draft",
    producao: "draft", edicao: "draft",
    revisao_interna: "in_review", enviado_aprovacao: "in_review",
    alteracao_solicitada: "rejected",
    aprovado: "approved", agendado: "approved",
    pronto_para_agendar: "ready_to_schedule",
    publicado: "published", reprovado: "rejected",
  };
  return map[status] ?? "draft";
}

export interface DbOperationalTask {
  id: string;
  client_id: string | null;
  content_item_id: string | null;
  approval_id: string | null;
  title: string;
  description: string | null;
  task_type: string | null;
  department: string | null;
  status: string;
  priority: string | null;
  assigned_to: string | null;
  assigned_role: string | null;
  due_date: string | null;
  start_date: string | null;
  channel: string | null;
  format: string | null;
  carousel_pages_count: number | null;
  brief: Record<string, unknown> | null;
  checklist: { label: string; done: boolean }[] | null;
  attachments: unknown | null;
  internal_notes: string | null;
  client_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined fields (optional, when queried with select)
  clients?: { company_name: string | null }[] | null;
  profiles?: { name: string | null }[] | null;
}

// ── Project attachment (operational_attachments + RecOS columns) ──

export interface DbProjectAttachment {
  id: string;
  rec_project_id: string | null;
  rec_frame_id: string | null;
  client_id: string | null;
  task_id: string | null;
  content_item_id: string | null;
  attachment_url: string;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  storage_path: string | null;
  upload_source: string;
  category: string | null;
  tags: string[] | null;
  attachment_notes: string | null;
  notes: string | null;
  delivered_by: string | null;
  created_at: string;
}

// ── RecOS types ───────────────────────────────────────────────

export interface DbRecProject {
  id: string;
  client_id: string | null;
  title: string;
  project_type: string;
  objective: string | null;
  style: string | null;
  duration_estimate: string | null;
  location: string | null;
  status: string;
  team: string[] | null;
  recording_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
  clients?: { company_name: string | null }[] | null;
}

export interface DbRecScript {
  id: string;
  project_id: string;
  script_text: string | null;
  script_url: string | null;
  script_type: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DbRecStoryboardFrame {
  id: string;
  project_id: string;
  scene_number: number;
  frame_number: number;
  title: string | null;
  visual_description: string | null;
  dialogue: string | null;
  action_notes: string | null;
  shot_type: string | null;
  camera_movement: string | null;
  lens: string | null;
  location: string | null;
  duration_estimate: string | null;
  image_url: string | null;
  reference_url: string | null;
  image_prompt: string | null;
  image_status: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DbRecReference {
  id: string;
  project_id: string;
  reference_type: string;
  title: string | null;
  url: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface DbRecShotListItem {
  id: string;
  project_id: string;
  scene_number: number;
  shot_number: number;
  description: string | null;
  shot_type: string | null;
  angle: string | null;
  movement: string | null;
  lens: string | null;
  audio: string | null;
  equipment: string | null;
  location: string | null;
  duration_estimate: string | null;
  priority: string;
  status: string;
  notes: string | null;
  created_at: string;
}

/** Maps approvals.status (PT) to UI status key */
export function dbApprovalStatusToUi(status: string): string {
  const map: Record<string, string> = {
    aguardando: "pending",
    aprovado: "approved",
    alteracao_solicitada: "change_requested",
    reprovado: "rejected",
  };
  return map[status] ?? "pending";
}

/** Returns an emoji thumbnail for a content type */
export function contentTypeEmoji(type: string | null): string {
  const map: Record<string, string> = {
    feed: "📸", story: "📱", reels: "🎬", reel: "🎬",
    carousel: "📚", carrossel: "📚", legenda: "✍️",
    roteiro: "🎭", campanha: "🚀", whatsapp: "💬",
    post: "📝", article: "📄",
  };
  return map[(type ?? "").toLowerCase()] ?? "📄";
}
