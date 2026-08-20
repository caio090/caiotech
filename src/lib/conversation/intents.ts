/**
 * LOKAT OS — Conversation Core Foundation V1. Catálogo de intenções
 * canal-agnóstico. Deliberadamente pequeno e baseado em regras (mesmo
 * espírito de src/lib/command-center/intents.ts -- não é um segundo
 * Jarvis, não chama LLM), mas um catálogo DIFERENTE: Command Center
 * resolve ações de navegação da UI admin; este resolve para qual DOMÍNIO
 * do LOKAT OS uma mensagem de qualquer canal deve ser roteada. Nenhum dos
 * dois importa do outro -- catálogos paralelos e propositalmente
 * distintos, não uma duplicação.
 */

export type ConversationIntentId =
  | "status"
  | "projects"
  | "growth"
  | "content"
  | "influence"
  | "meu_negocio";

export interface ConversationIntentDef {
  id: ConversationIntentId;
  label: string;
  /** Frases de exemplo -- casadas por substring normalizado, nunca regex frágil. */
  examples: string[];
  /** id real em src/config/platform-modules.ts -- nunca inventado. */
  moduleId: string;
}

const CATALOG: ConversationIntentDef[] = [
  {
    id: "status",
    label: "Status",
    examples: [
      "o que mudou", "qual a ultima atualizacao", "qual foi o ultimo deploy",
      "o que esta bloqueado", "qual e a proxima frente",
    ],
    moduleId: "status",
  },
  {
    id: "projects",
    label: "Projetos",
    examples: [
      "quais projetos estao ativos", "meus projetos", "o que falta no projeto",
      "qual e a proxima etapa",
    ],
    moduleId: "empresa_central",
  },
  {
    id: "growth",
    label: "Growth",
    examples: [
      "quero vender mais", "quero criar campanha", "quero criar uma campanha",
      "quero fazer uma campanha", "quanto eu deveria investir em trafego",
    ],
    moduleId: "rec_os_growth",
  },
  {
    id: "content",
    label: "Conteúdo",
    examples: [
      "quero criar uma publicacao", "quero criar um video", "quero criar conteudo",
    ],
    moduleId: "rec_os",
  },
  {
    id: "influence",
    label: "Influence",
    examples: [
      "quero planejar meus videos da semana", "quero uma trend para meu nicho",
      "quero planejar creator", "tenho alguma publi pendente",
    ],
    moduleId: "influence_os",
  },
  {
    id: "meu_negocio",
    label: "Meu Negócio",
    examples: [
      "qual o cmv", "como esta o estoque", "quanto vendemos", "esse preco esta bom",
    ],
    moduleId: "meu_negocio",
  },
];

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Pura, determinística -- sem LLM. Casa a primeira intenção cujo exemplo aparece como substring da mensagem. */
export function matchConversationIntent(message: string): ConversationIntentDef | null {
  const q = normalize(message.trim());
  if (!q) return null;
  for (const def of CATALOG) {
    if (def.examples.some((example) => q.includes(normalize(example)))) return def;
  }
  return null;
}

export function listConversationIntents(): ConversationIntentDef[] {
  return CATALOG.slice();
}

export function findConversationIntentById(id: ConversationIntentId): ConversationIntentDef | undefined {
  return CATALOG.find((def) => def.id === id);
}
