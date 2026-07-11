// Perfis de lead para launch_waitlist.account_type
// Constraint no banco: CHECK (account_type IN ('agency', 'business', 'professional', 'interested'))
// Campo NOT NULL — null não é aceito. Default: 'interested'.
// NÃO reutilizar CANONICAL_ACCOUNT_TYPES (profiles) aqui.

export const LEAD_PROFILE_TYPES = [
  { value: "agency",       label: "Agência",      cls: "bg-purple-50 text-purple-700 border-purple-100" },
  { value: "business",     label: "Empresa",      cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  { value: "professional", label: "Profissional", cls: "bg-amber-50  text-amber-700  border-amber-100"  },
  { value: "interested",   label: "Interessado",  cls: "bg-gray-100  text-gray-600   border-gray-200"   },
] as const;

export type LeadProfileType = typeof LEAD_PROFILE_TYPES[number]["value"];
export const LEAD_PROFILE_TYPE_VALUES = LEAD_PROFILE_TYPES.map((t) => t.value) as readonly string[];
export const LEAD_PROFILE_DEFAULT: LeadProfileType = "interested";

export function getLeadProfileBadge(type: string | null | undefined): { label: string; cls: string } {
  if (!type) return { label: "Interessado", cls: "bg-gray-100 text-gray-600 border-gray-200" };
  const found = LEAD_PROFILE_TYPES.find((t) => t.value === type.toLowerCase());
  return found ?? { label: type, cls: "bg-gray-100 text-gray-500 border-gray-100" };
}
