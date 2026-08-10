/**
 * Sprint MVP Experience Completion V0.1 — Jarvis (interface de voz/conversa
 * sobre Gota Neural / LOKAT NEURAL CORE). Jarvis não é um segundo cérebro:
 * não tem memory system próprio, não tem agent registry próprio, não tem
 * orchestrator próprio. Ele só monta um contexto autorizado (via
 * Company Context + projections já existentes + NeuralVisibilityPolicy) e
 * conversa sobre ele -- toda mutação real continua fora do alcance do
 * assistente nesta versão (MAX_AUTONOMY_LEVEL_THIS_SPRINT = DRAFT, ver
 * src/lib/neural-core/actions.ts).
 */

export type JarvisChatRole = "user" | "assistant";

export interface JarvisChatMessage {
  role: JarvisChatRole;
  content: string;
}

export interface JarvisReportAttachment {
  name: string;
  type: string;
  size: number;
  /** Base64, sem o prefixo data URI. Nunca persistido -- consumido e descartado dentro da mesma request. */
  dataBase64: string;
}

export interface JarvisChatRequestBody {
  message: string;
  history?: JarvisChatMessage[];
  /** Empresa explicitamente selecionada pelo usuário (ex.: ?client=) -- sempre revalidada server-side, nunca confiada sozinha. */
  companyId?: string | null;
  route?: string;
  attachment?: JarvisReportAttachment;
}

export class JarvisUnavailableError extends Error {}
export class JarvisRequestInProgressError extends Error {}
export class JarvisValidationError extends Error {}
