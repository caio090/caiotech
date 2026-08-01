/**
 * Sprint Navegação e Experiência 3.0.1.2 (Fase 29) — estados do CRM.
 * "0 leads" e "não foi possível carregar" são fatos completamente
 * diferentes — antes desta sprint, `/admin/leads` mostrava a MENSAGEM
 * TÉCNICA `SUPABASE_SERVICE_ROLE_KEY não configurada — leads
 * indisponíveis.` diretamente ao usuário final (bug relatado). Este módulo
 * dá nome a cada estado real para que a UI nunca mais confunda "sem dado"
 * com "erro" nem exponha detalhe interno de backend.
 */
export type CrmDataState =
  | "loading" | "available_empty" | "available_with_data"
  | "unavailable" | "unauthorized" | "preview_read_only" | "demo";

export interface CrmLoadResult {
  ok: boolean;
  code?: string;
  entryCount?: number;
}

/**
 * Mapeia o resultado bruto de uma chamada de API do CRM para um estado de
 * produto — nunca repassa o `code` técnico (ex.: "service_role_missing")
 * diretamente para exibição.
 */
export function resolveCrmDataState(result: CrmLoadResult | null, { isPreview = false }: { isPreview?: boolean } = {}): CrmDataState {
  if (isPreview) return "preview_read_only";
  if (!result) return "loading";
  if (!result.ok) {
    if (result.code === "unauthenticated" || result.code === "forbidden") return "unauthorized";
    return "unavailable"; // service_role_missing, network_error, etc. — nunca "0 leads"
  }
  return (result.entryCount ?? 0) > 0 ? "available_with_data" : "available_empty";
}

const CRM_STATE_COPY: Record<CrmDataState, { title: string; description: string }> = {
  loading: { title: "Carregando...", description: "" },
  available_empty: { title: "Nenhum lead encontrado.", description: "Quando um novo contato entrar, ele aparece aqui." },
  available_with_data: { title: "", description: "" },
  unavailable: {
    title: "Dados do CRM indisponíveis neste ambiente.",
    description: "Não foi possível carregar os leads agora. Tente novamente ou verifique a conexão configurada para este workspace.",
  },
  unauthorized: {
    title: "Acesso restrito.",
    description: "Sua conta não tem permissão para ver esta área.",
  },
  preview_read_only: {
    title: "Modo de visualização — somente leitura.",
    description: "Você está vendo este CRM em modo de preview. Nenhuma ação pode ser realizada aqui.",
  },
  demo: {
    title: "Modo demonstração.",
    description: "Estes dados são apenas ilustrativos.",
  },
};

/** Nunca menciona service role, chave, env, credencial ou Supabase internamente — ver Fase 28. */
export function crmStateCopy(state: CrmDataState): { title: string; description: string } {
  return CRM_STATE_COPY[state];
}

const FORBIDDEN_SUBSTRINGS = ["SUPABASE_SERVICE_ROLE_KEY", "service_role", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "env", "credencial", "variável de ambiente"];

/** Usado em teste — garante que nenhuma cópia visível ao usuário vaza detalhe interno. */
export function containsForbiddenTechnicalDetail(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_SUBSTRINGS.some((s) => lower.includes(s.toLowerCase()));
}
