// Tipos canônicos de conta — fonte única para labels, badges e classificação

export const CANONICAL_ACCOUNT_TYPES = [
  { value: "interno_lokat",    label: "Interno Lokat",      cls: "bg-emerald-50 text-emerald-700" },
  { value: "agencia_parceira", label: "Agência parceira",   cls: "bg-purple-50 text-purple-700"   },
  { value: "cliente_direto",   label: "Cliente direto",     cls: "bg-indigo-50 text-indigo-700"   },
  { value: "cliente_agencia",  label: "Cliente de agência", cls: "bg-blue-50 text-blue-700"       },
  { value: "autonomo",         label: "Autônomo",           cls: "bg-amber-50 text-amber-700"     },
  { value: "lead",             label: "Lead",               cls: "bg-gray-100 text-gray-600"      },
  { value: "operacional",      label: "Operacional",        cls: "bg-sky-50 text-sky-700"         },
  { value: "teste",            label: "Teste",              cls: "bg-slate-100 text-slate-600"    },
] as const;

export type CanonicalAccountType = typeof CANONICAL_ACCOUNT_TYPES[number]["value"];

export const CANONICAL_ACCOUNT_TYPE_VALUES = CANONICAL_ACCOUNT_TYPES.map((t) => t.value) as CanonicalAccountType[];

// Badge config completo — inclui tipos legados do banco
const ACCOUNT_TYPE_BADGE_MAP: Record<string, { label: string; cls: string }> = {
  // Tipos canônicos novos
  interno_lokat:    { label: "Interno Lokat",      cls: "bg-emerald-50 text-emerald-700" },
  agencia_parceira: { label: "Agência parceira",   cls: "bg-purple-50 text-purple-700"   },
  cliente_direto:   { label: "Cliente direto",     cls: "bg-indigo-50 text-indigo-700"   },
  cliente_agencia:  { label: "Cliente de agência", cls: "bg-blue-50 text-blue-700"       },
  autonomo:         { label: "Autônomo",           cls: "bg-amber-50 text-amber-700"     },
  lead:             { label: "Lead",               cls: "bg-gray-100 text-gray-600"      },
  operacional:      { label: "Operacional",        cls: "bg-sky-50 text-sky-700"         },
  teste:            { label: "Teste",              cls: "bg-slate-100 text-slate-600"    },
  // Legados do banco (somente para exibição — não usar para classificação nova)
  agencia:          { label: "Agência",            cls: "bg-purple-50 text-purple-700"   },
  agency:           { label: "Agência",            cls: "bg-purple-50 text-purple-700"   },
  empresa:          { label: "Empresa",            cls: "bg-indigo-50 text-indigo-700"   },
  business:         { label: "Empresa",            cls: "bg-indigo-50 text-indigo-700"   },
  local_business:   { label: "Negócio local",      cls: "bg-indigo-50 text-indigo-700"   },
  invited_client:   { label: "Cliente convidado",  cls: "bg-blue-50 text-blue-700"       },
  cliente:          { label: "Cliente",            cls: "bg-blue-50 text-blue-700"       },
  diagnostic_only:  { label: "Lead / Diagnóstico", cls: "bg-amber-50 text-amber-700"     },
  professional:     { label: "Profissional",       cls: "bg-amber-50 text-amber-700"     },
  interested:       { label: "Interessado",        cls: "bg-gray-100 text-gray-600"      },
  super_admin:      { label: "Super Admin",        cls: "bg-emerald-50 text-emerald-700" },
  internal:         { label: "Interno Lokat",      cls: "bg-emerald-50 text-emerald-700" },
  freelancer:       { label: "Autônomo",           cls: "bg-amber-50 text-amber-700"     },
  autonomous:       { label: "Autônomo",           cls: "bg-amber-50 text-amber-700"     },
  social_media:     { label: "Social Media",       cls: "bg-sky-50 text-sky-700"         },
  operational:      { label: "Operacional",        cls: "bg-sky-50 text-sky-700"         },
  // Sem classificação — nunca exibir raw
  nao_definido:     { label: "Não classificado",   cls: "bg-gray-100 text-gray-400"      },
};

export const UNCLASSIFIED_BADGE = { label: "Não classificado", cls: "bg-gray-100 text-gray-400" };

export function getAccountTypeBadge(type: string | null | undefined): { label: string; cls: string } {
  if (!type || type === "nao_definido") return UNCLASSIFIED_BADGE;
  const key = type.toLowerCase();
  return ACCOUNT_TYPE_BADGE_MAP[key] ?? UNCLASSIFIED_BADGE;
}
