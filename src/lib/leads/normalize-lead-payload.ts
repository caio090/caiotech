/**
 * normalize-lead-payload.ts
 *
 * Normaliza payloads vindos de fontes externas (Typebot, formulários do site,
 * integrações futuras) para o formato interno da launch_waitlist.
 *
 * Não tem dependências de banco — pode ser importado em client e server.
 */

// ── Tipos ─────────────────────────────────────────────────────

export type AccountType = "agency" | "business" | "professional" | "interested";

export interface NormalizedLead {
  name:               string;
  email:              string;
  phone:              string | null;
  whatsapp:           string | null;
  business_name:      string | null;
  business_type:      string | null;
  account_type:       AccountType;
  main_problem:       string | null;
  interest:           string | null;
  city:               string | null;
  segment:            string | null;
  source:             string;
  channel:            string;
  utm_source:         string | null;
  utm_medium:         string | null;
  utm_campaign:       string | null;
  utm_content:        string | null;
  utm_term:           string | null;
  referrer:           string | null;
  landing_path:       string | null;
  typebot_session_id: string | null;
  typebot_result_id:  string | null;
}

// ── Resolvedores de campo ─────────────────────────────────────

type RawPayload = Record<string, unknown>;

function pick(obj: RawPayload, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  // also check nested obj.variables
  const vars = obj.variables;
  if (vars && typeof vars === "object" && !Array.isArray(vars)) {
    for (const k of keys) {
      const v = (vars as RawPayload)[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return "";
}

function pickOrNull(obj: RawPayload, ...keys: string[]): string | null {
  const v = pick(obj, ...keys);
  return v || null;
}

// ── Mapeamento de account_type ────────────────────────────────

const ACCOUNT_TYPE_MAP: Array<[RegExp, AccountType]> = [
  [/ag[eê]ncia|agency/i, "agency"],
  [/empresa|negócio|negocio|business|loja|restaurante|clínica|clinica|local/i, "business"],
  [/autônomo|autonomo|freelancer|profissional|professional/i, "professional"],
];

export function normalizeAccountType(raw: string | null | undefined): AccountType {
  if (!raw) return "interested";
  for (const [re, type] of ACCOUNT_TYPE_MAP) {
    if (re.test(raw)) return type;
  }
  return "interested";
}

// ── Normalização de interesse para lead score ─────────────────

const HIGH_INTENT_INTERESTS = [
  "diagnóstico",
  "diagnostico",
  "demonstração",
  "demonstracao",
  "falar com",
  "agendar",
  "quero assinar",
  "quero contratar",
];

export function isHighIntentInterest(interest: string | null): boolean {
  if (!interest) return false;
  const lower = interest.toLowerCase();
  return HIGH_INTENT_INTERESTS.some((k) => lower.includes(k));
}

// ── Lead score ────────────────────────────────────────────────

export function computeLeadScore(lead: Pick<NormalizedLead,
  "email" | "whatsapp" | "phone" | "business_type" | "main_problem" | "interest" |
  "utm_campaign" | "account_type"
>): number {
  let score = 0;
  if (lead.email)                                             score += 20;
  if (lead.whatsapp || lead.phone)                           score += 20;
  if (lead.business_type)                                    score += 15;
  if (lead.main_problem)                                     score += 15;
  if (isHighIntentInterest(lead.interest))                   score += 10;
  if (lead.utm_campaign)                                     score += 10;
  if (lead.account_type === "agency" || lead.account_type === "business") score += 10;
  return score;
}

// ── Função principal ──────────────────────────────────────────

export function normalizeLeadPayload(
  raw: RawPayload,
  overrides: Partial<Pick<NormalizedLead, "source" | "channel">> = {},
): NormalizedLead {
  // Desembrulha variáveis do Typebot se vier em { variables: { ... } }
  const flat: RawPayload =
    raw.variables && typeof raw.variables === "object" && !Array.isArray(raw.variables)
      ? { ...raw, ...(raw.variables as RawPayload) }
      : raw;

  const name          = pick(flat, "name", "nome", "Nome", "full_name", "fullName");
  const email         = pick(flat, "email", "Email", "e-mail", "e_mail").toLowerCase();
  const phone         = pickOrNull(flat, "phone", "telefone", "celular", "Phone");
  const whatsapp      = pickOrNull(flat, "whatsapp", "WhatsApp", "whats", "wpp");
  const business_name = pickOrNull(flat, "business_name", "empresa", "Empresa", "nome_da_empresa", "marca", "Marca");
  const business_type = pickOrNull(flat, "business_type", "tipo_negocio", "Tipo de negócio", "Tipo de negocio", "perfil", "tipo");
  const account_type  = normalizeAccountType(
    pickOrNull(flat, "account_type", "tipo_conta", "perfil_usuario", "Tipo de conta") ?? business_type
  );
  const main_problem  = pickOrNull(flat, "main_problem", "maior_gargalo", "Maior gargalo", "dor", "problema", "Problema");
  const interest      = pickOrNull(flat, "interest", "Interesse", "objetivo", "cta", "action", "Objetivo");
  const city          = pickOrNull(flat, "city", "cidade", "Cidade");
  const segment       = pickOrNull(flat, "segment", "segmento", "Segmento", "nicho");

  const utm_source   = pickOrNull(flat, "utm_source");
  const utm_medium   = pickOrNull(flat, "utm_medium");
  const utm_campaign = pickOrNull(flat, "utm_campaign");
  const utm_content  = pickOrNull(flat, "utm_content");
  const utm_term     = pickOrNull(flat, "utm_term");
  const referrer     = pickOrNull(flat, "referrer", "ref", "utm_referrer");
  const landing_path = pickOrNull(flat, "landing_path", "page", "path", "url_path");

  const typebot_session_id = pickOrNull(flat, "typebot_session_id", "sessionId", "session_id");
  const typebot_result_id  = pickOrNull(flat, "typebot_result_id",  "resultId",  "result_id");

  return {
    name,
    email,
    phone,
    whatsapp,
    business_name,
    business_type,
    account_type,
    main_problem,
    interest,
    city,
    segment,
    source:  overrides.source  ?? "external",
    channel: overrides.channel ?? "api",
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    referrer,
    landing_path,
    typebot_session_id,
    typebot_result_id,
  };
}
