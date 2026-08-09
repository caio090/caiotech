/**
 * Sprint Gota Neural Foundation V1 (Fase 40-43) — Neural Orchestrator.
 *
 * Fase 42 é explícita: nada de "centena de if text.includes(...)" para
 * simular inteligência. Esta foundation NUNCA interpreta texto livre —
 * ela só roteia com base em `domainHints`/`InitiativeContext` já
 * ESTRUTURADOS (fornecidos por quem chama, seja um humano preenchendo
 * um formulário, seja uma futura camada de interpretação fora desta
 * sprint). Determinístico de ponta a ponta: a mesma entrada sempre
 * produz o mesmo plano.
 */
import type { CanonicalBusinessContext, InitiativeContext } from "./context";
import { AGENT_REGISTRY, isAgentContractAvailable, type AgentDefinition, type AgentDomain } from "./agents";
import { resolveCapabilityPrecedence, type Capability, type CapabilityState, type UnmetCapability } from "./capabilities";
import type { ResponseBlockType } from "./response-blocks";
import { createDraftAction, type NeuralActionDraft } from "./actions";
import type { PlanningContext } from "./planning";

export interface NeuralRequest {
  id: string;
  input: InitiativeContext;
  context: CanonicalBusinessContext;
  intent?: string;
  initiative?: InitiativeContext;
  requestedAt: string;
  requestedBy: string;
  /** Fase 35 — planejamento já estruturado pelo chamador; NUNCA inferido de texto livre pelo Orchestrator. */
  planningContext?: PlanningContext;
}

/** Fase 43 — uma solicitação pode tocar múltiplos domínios ao mesmo tempo (ex.: "campanha sazonal" -> strategy+content+crm+calendar). */
export interface DomainIntent {
  primaryDomain: AgentDomain;
  relatedDomains: AgentDomain[];
  requiredCapabilities: Capability[];
  candidateAgents: AgentDomain[];
}

export interface NeuralPlan {
  requestId: string;
  contextValidation: { valid: boolean; reason?: string };
  domains: DomainIntent | null;
  candidateAgents: AgentDefinition[];
  capabilityRequirements: Capability[];
  missingCapabilities: UnmetCapability[];
  responseBlockPlan: ResponseBlockType[];
  draftActions: NeuralActionDraft[];
  /** Fase 35 — eco do `planningContext` da request, quando fornecido; o Orchestrator nunca o infere sozinho. */
  planningContext?: PlanningContext;
}

/** Fase 40/Princípio Central — nenhuma ação operacional nasce sem Company. */
function validateContext(context: CanonicalBusinessContext): { valid: boolean; reason?: string } {
  if (!context.companyId) return { valid: false, reason: "company_required" };
  return { valid: true };
}

/** Roteamento puramente determinístico sobre domainHints já estruturados -- nunca interpreta `title`/`objective` como texto livre. */
function resolveDomainIntent(initiative: InitiativeContext): DomainIntent {
  const hints = initiative.domainHints.length > 0 ? initiative.domainHints : [initiative.type];
  const matchingAgents = AGENT_REGISTRY.filter((a) => hints.includes(a.domain));
  const candidateAgents = matchingAgents.map((a) => a.id);
  const requiredCapabilities = [...new Set(matchingAgents.flatMap((a) => a.requiredCapabilities))];
  const [primaryDomain, ...relatedDomains] = candidateAgents.length > 0 ? candidateAgents : (["business_strategy"] as AgentDomain[]);
  return { primaryDomain, relatedDomains, requiredCapabilities, candidateAgents };
}

function resolveMissingCapabilities(required: Capability[], states: CapabilityState[]): UnmetCapability[] {
  const missing: UnmetCapability[] = [];
  for (const capability of required) {
    const state = states.find((s) => s.capability === capability);
    if (!state) {
      missing.push({ capability, reason: "not_exists" });
      continue;
    }
    const result = resolveCapabilityPrecedence(state);
    if (!result.actionable && result.unmet) missing.push(result.unmet);
  }
  return missing;
}

export class NeuralOrchestrator {
  /**
   * Fase 41 — nunca chama LLM. Recebe dados já estruturados
   * (NeuralRequest.initiative com domainHints explícitos) e devolve um
   * NeuralPlan -- nunca executa mutação diretamente (retorna, no
   * máximo, ActionDrafts com confirmationRequired sempre true).
   */
  plan(request: NeuralRequest, capabilityStates: CapabilityState[] = []): NeuralPlan {
    const contextValidation = validateContext(request.context);
    if (!contextValidation.valid) {
      return {
        requestId: request.id,
        contextValidation,
        domains: null,
        candidateAgents: [],
        capabilityRequirements: [],
        missingCapabilities: [],
        responseBlockPlan: [],
        draftActions: [],
        planningContext: request.planningContext,
      };
    }

    const initiative = request.initiative ?? request.input;
    const domains = resolveDomainIntent(initiative);
    const candidateAgents = domains.candidateAgents
      .map((id) => AGENT_REGISTRY.find((a) => a.id === id))
      .filter((a): a is AgentDefinition => !!a);

    const missingCapabilities = resolveMissingCapabilities(domains.requiredCapabilities, capabilityStates);

    // Fase 9 — "contract available" decide quais response blocks o PLANO pode
    // antecipar; nunca "runtime available" (não existe runtime nesta Foundation).
    const contractReadyAgents = candidateAgents.filter(isAgentContractAvailable);
    const responseBlockPlan = [...new Set(contractReadyAgents.flatMap((a) => a.supportedResponseBlocks))];

    return {
      requestId: request.id,
      contextValidation,
      domains,
      candidateAgents,
      capabilityRequirements: domains.requiredCapabilities,
      missingCapabilities,
      responseBlockPlan,
      draftActions: [], // Foundation não gera drafts automaticamente -- ver createDraftAction para quando um agente real precisar
      planningContext: request.planningContext, // eco do que o chamador forneceu -- nunca inferido aqui
    };
  }
}

export { createDraftAction };
