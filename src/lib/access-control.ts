/**
 * Central access-control matrix for LOKAT OS.
 * Import from here — do NOT duplicate role logic across files.
 */

// ── Role sets ─────────────────────────────────────────────────

export const ADMIN_ROLES       = new Set(["admin"]);
export const CLIENT_ROLES      = new Set(["cliente"]);
export const ACADEMY_ROLES     = new Set(["aluno"]);
export const FINANCE_ROLES     = new Set(["financeiro"]);

/** All operational staff (non-admin, non-client) */
export const OPERATIONAL_ROLES = new Set([
  "operacional",
  "social_media",
  "designer",
  "editor",
  "videomaker",
  "gestor_trafego",
  "comercial",
  "sdr",
  "closer",
  "financeiro",
]);

/** Roles that may create content / access ContentOS */
export const CONTENT_ROLES = new Set([
  "admin",
  "operacional",
  "social_media",
  "designer",
  "editor",
  "videomaker",
  "gestor_trafego",
]);

/** Roles allowed on /operacional/* */
export const OPERACIONAL_ALLOWED = new Set([
  "admin",
  "operacional",
  "social_media",
  "designer",
  "editor",
  "videomaker",
  "gestor_trafego",
  "comercial",
  "sdr",
  "closer",
  "financeiro",
]);

/** Roles that can be assigned via team invite */
export const INVITABLE_ROLES = [
  "operacional",
  "comercial",
  "sdr",
  "closer",
  "social_media",
  "designer",
  "editor",
  "videomaker",
  "gestor_trafego",
  "financeiro",
] as const;

export type InvitableRole = typeof INVITABLE_ROLES[number];

// ── Home page per role (used by login + proxy) ────────────────

export const ROLE_HOME: Record<string, string> = {
  super_admin:    "/admin/dashboard",
  admin:          "/admin/dashboard",
  cliente:        "/client/home",
  aluno:          "/academy/home",
  operacional:    "/operacional/dashboard",
  comercial:      "/operacional/comercial",
  sdr:            "/operacional/comercial",
  closer:         "/operacional/comercial",
  social_media:   "/operacional/minhas-tarefas",
  designer:       "/operacional/minhas-tarefas",
  editor:         "/operacional/minhas-tarefas",
  videomaker:     "/operacional/minhas-tarefas",
  gestor_trafego: "/operacional/minhas-tarefas",
  financeiro:     "/operacional/dashboard",
};

/** Safe fallback when role is unknown */
export const ROLE_HOME_FALLBACK = "/client/home";

export function getRoleHome(role: string | null | undefined): string {
  return ROLE_HOME[role ?? ""] ?? ROLE_HOME_FALLBACK;
}

// ── Route permission helpers ──────────────────────────────────

export function canAccessAdmin(role: string)           { return role === "admin" || role === "super_admin"; }
export function canAccessPlatformCentral(role: string) { return role === "super_admin"; }
export function canAccessClient(role: string)          { return role === "cliente"; }
export function canAccessOperacional(role: string)     { return OPERACIONAL_ALLOWED.has(role); }
export function canAccessContenOS(role: string)        { return CONTENT_ROLES.has(role); }
export function canAccessAcademy(role: string)         { return role === "aluno" || role === "admin" || role === "super_admin"; }

// ── Department → task filter mapping ─────────────────────────

export const ROLE_DEPARTMENT_FILTER: Record<string, string[]> = {
  designer:       ["design"],
  editor:         ["video", "edicao"],
  videomaker:     ["video", "captacao"],
  social_media:   ["social_media", "roteiro"],
  gestor_trafego: ["trafego"],
  financeiro:     ["financeiro"],
  comercial:      ["comercial", "atendimento"],
  sdr:            ["comercial"],
  closer:         ["comercial"],
  operacional:    [], // sees everything
  admin:          [], // sees everything
};

export const ROLE_TASK_TYPE_FILTER: Record<string, string[]> = {
  designer:       ["arte"],
  editor:         ["video", "ajuste"],
  videomaker:     ["video"],
  social_media:   ["legenda", "roteiro", "publicacao"],
  gestor_trafego: ["trafego"],
  comercial:      ["planejamento", "outro"],
};

// ── RecOS access ──────────────────────────────────────────────
/** Roles that may access the RecOS audiovisual module */
export const RECOS_ROLES = new Set([
  "admin",
  "videomaker",
  "editor",
  "operacional",
]);

export function canAccessRecOS(role: string): boolean {
  return RECOS_ROLES.has(role);
}

// ── ContentOS full access (strategy layer) ────────────────────
/** Only admin can access /contentos/* complete. Operacional → /operacional/briefings */
export function canAccessContentOSFull(role: string): boolean {
  return role === "admin";
}

// ── Multi-role display ────────────────────────────────────────
/**
 * Format one or more roles as "Designer + Videomaker".
 * Called with primaryRole from profiles.role + extras from profile_roles.
 */
export function formatRoleDisplay(
  primaryRole: string,
  additionalRoles?: string[],
): string {
  // Defer to ROLE_LABELS after it is defined below; safe because this is a function, not a const.
  const label = (r: string) => (ROLE_LABELS[r] ?? r);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of [primaryRole, ...(additionalRoles ?? [])]) {
    if (!seen.has(r)) { seen.add(r); out.push(label(r)); }
  }
  return out.join(" + ");
}

// ── Role display labels ───────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  super_admin:    "Super Admin",
  admin:          "Admin",
  cliente:        "Cliente",
  aluno:          "Aluno",
  operacional:    "Operacional",
  comercial:      "Comercial",
  sdr:            "SDR",
  closer:         "Closer",
  social_media:   "Social Media",
  designer:       "Designer",
  editor:         "Editor",
  videomaker:     "Videomaker",
  gestor_trafego: "Gestor de Tráfego",
  financeiro:     "Financeiro",
};

export const ROLE_COLORS: Record<string, string> = {
  admin:          "bg-indigo-100 text-indigo-700",
  cliente:        "bg-teal-100 text-teal-700",
  aluno:          "bg-amber-100 text-amber-700",
  operacional:    "bg-slate-100 text-slate-700",
  comercial:      "bg-blue-100 text-blue-700",
  sdr:            "bg-cyan-100 text-cyan-700",
  closer:         "bg-sky-100 text-sky-700",
  social_media:   "bg-purple-100 text-purple-700",
  designer:       "bg-pink-100 text-pink-700",
  editor:         "bg-orange-100 text-orange-700",
  videomaker:     "bg-red-100 text-red-700",
  gestor_trafego: "bg-yellow-100 text-yellow-800",
  financeiro:     "bg-emerald-100 text-emerald-700",
};
