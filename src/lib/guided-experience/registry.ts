/**
 * Prompt 13 (REC OS Core Experience) — Fase 35: camada compartilhada de
 * Guided Experience. Uma única infraestrutura declarativa (este
 * registry + components/guided-experience/*), nunca dezenas de modais
 * hardcoded por feature (Fase 35 explícito).
 *
 * Persistência: só localStorage, client-side, por feature key -- nunca
 * banco, nunca bloqueia a experiência se falhar (Fase 37: acessível,
 * nunca captura foco incorretamente, nunca impossível fechar).
 */

export interface FeatureFirstRun {
  title: string;
  /** Frases curtas -- nunca um modal grande (Fase 35). */
  points: string[];
}

export interface FeatureEmptyState {
  id: string;
  title: string;
  description: string;
  actionLabel?: string;
}

export interface FeatureGuideEntry {
  id: string;
  firstRun: FeatureFirstRun;
  emptyStates: FeatureEmptyState[];
}

export const FEATURE_GUIDE_REGISTRY: Record<string, FeatureGuideEntry> = {
  "rec-os": {
    id: "rec-os",
    firstRun: {
      title: "Como o REC OS se organiza",
      points: [
        "CRIAR organiza o conteúdo: objetivo, briefing, aprovação e publicação.",
        "STUDIO produz o visual com IA -- direção criativa, peça e séries.",
        "EDITOR OS finaliza: ajuste manual, composição e acabamento.",
      ],
    },
    emptyStates: [],
  },
  studio: {
    id: "studio",
    firstRun: {
      title: "O que você pode fazer no Studio",
      points: [
        "Peça única -- uma arte a partir do seu briefing.",
        "Série Visual -- 1, 3, 6 ou 9 peças independentes de uma vez.",
        "Feed Preview -- veja como a peça nova entra no seu perfil.",
        "Company Mode usa o DNA da empresa; Free Mode cria sem vínculo.",
      ],
    },
    emptyStates: [
      {
        id: "instagram_not_connected",
        title: "Instagram não conectado",
        description: "Você pode continuar criando e planejando normalmente -- conectar o Instagram é opcional e habilita a prévia real do feed.",
        actionLabel: "Conectar Instagram",
      },
      {
        id: "feed_dna_unset",
        title: "Feed DNA ainda não definido",
        description: "Defina manualmente o padrão do feed (alternado, xadrez, blocos...) ou deixe para o sistema sugerir quando houver histórico suficiente.",
        actionLabel: "Definir Feed DNA",
      },
    ],
  },
};

const STORAGE_PREFIX = "lokat_guided_experience_v1_";

/** Nunca lança -- localStorage indisponível (SSR, modo privado) vira "ainda não visto". */
export function hasSeenFirstRun(featureId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${featureId}`) === "seen";
  } catch {
    return true;
  }
}

export function markFirstRunSeen(featureId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${featureId}`, "seen");
  } catch {
    // Fase 37 -- nunca bloqueia a experiência se localStorage falhar.
  }
}

/** Fase 36 -- reabrir ajuda precisa ser possível, nunca "visto uma vez, nunca mais". */
export function resetFirstRun(featureId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${featureId}`);
  } catch {
    // no-op
  }
}
