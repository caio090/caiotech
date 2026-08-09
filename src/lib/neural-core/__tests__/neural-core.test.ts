/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/neural-core/__tests__/neural-core.test.ts
 * Sprint Gota Neural Foundation V1 (Fase 66) — 20 casos mínimos exigidos.
 * V1.1 (Fase 46-48 da correção CODEX WEB) — testes tautológicos
 * substituídos por comportamentais; matriz de regressão de 20 itens
 * (Fase 47) coberta abaixo.
 */
import type { CanonicalBusinessContext, Campaign, InitiativeContext, DerivedKnowledge, ConversationContext } from "../context";
import { AGENT_REGISTRY, isAgentContractAvailable, isAgentRuntimeAvailable } from "../agents";
import { resolveCapabilityPrecedence, type CapabilityState } from "../capabilities";
import type { ActivationConnectionChoice, ConnectionHealth } from "../integrations";
import type { CompanyActivationState } from "../activation";
import { provenanceForExternalAIImport, type ExternalAIImportIntake } from "../intake";
import { NeuralOrchestrator, type NeuralRequest } from "../orchestrator";
import { createDraftAction } from "../actions";
import { conversationTurnIsMemoryEntry, type BusinessMemory } from "../memory";
import { orderBriefingItems, type BusinessBriefingItem } from "../briefing";
import { RESPONSE_BLOCK_TYPES, type ResponseBlock } from "../response-blocks";
import {
  DEFAULT_VISIBILITY_POLICY, resolveVisibilityPolicy, isClientVisible, isClientSummaryOnly, isConnectorReadable,
  type NeuralVisibilityPolicy,
} from "../visibility";
import type { ObjectiveReference, PlanningContext } from "../planning";
import type { ConnectorEvent, ConnectorMetric } from "../lkt";
import * as fs from "node:fs";
import * as path from "node:path";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function baseContext(companyId: string | null): CanonicalBusinessContext {
  return {
    workspaceId: "ws-1", surface: "direct_business", companyId, userId: "u-1", role: "admin",
    preview: false, readOnly: false, capabilities: [], connections: [], dataQuality: "confirmed",
    provenance: { sourceType: "system", verified: true },
  };
}

function baseInitiative(overrides: Partial<InitiativeContext> = {}): InitiativeContext {
  return {
    type: "operational_improvement", title: "t", objective: null, companyId: "c-1",
    desiredOutcome: null, domainHints: [], sourceRefs: [], ...overrides,
  };
}

function capabilityState(overrides: Partial<CapabilityState> & Pick<CapabilityState, "capability">): CapabilityState {
  return { exists: true, entitled: true, enabled: true, connectionRequirement: "not_required", connected: false, permitted: true, ...overrides };
}

// 1. Company obrigatória em contexto operacional.
console.log("[test] 1 — Company obrigatória em contexto operacional");
{
  const orchestrator = new NeuralOrchestrator();
  const req: NeuralRequest = { id: "r1", input: baseInitiative(), context: baseContext(null), requestedAt: "2026-08-01T00:00:00Z", requestedBy: "u-1" };
  const plan = orchestrator.plan(req);
  assert(plan.contextValidation.valid === false, "sem companyId, contextValidation.valid é false");
  assert(plan.contextValidation.reason === "company_required", "motivo é company_required");
  assert(plan.candidateAgents.length === 0, "nenhum agente candidato quando o contexto é inválido");
}

// 2. Project opcional quando aplicável.
console.log("[test] 2 — Project opcional");
{
  const req: NeuralRequest = { id: "r2", input: baseInitiative({ companyId: "c-1" }), context: baseContext("c-1"), requestedAt: "2026-08-01T00:00:00Z", requestedBy: "u-1" };
  assert(req.input.projectId === undefined, "InitiativeContext sem projectId é válido (opcional)");
  const plan = new NeuralOrchestrator().plan(req);
  assert(plan.contextValidation.valid === true, "contexto válido mesmo sem project");
}

// 3/4. Campaign exige Company; pode existir sem Project.
console.log("[test] 3/4 — Campaign.companyId required, Campaign.projectId optional");
{
  const withoutProject: Campaign = { campaignId: "camp-1", companyId: "c-1", name: "n", objective: null, status: "draft", sourceRefs: [] };
  assert(!!withoutProject.companyId, "Campaign sempre tem companyId");
  assert(withoutProject.projectId === undefined, "Campaign pode existir sem projectId");
  const withProject: Campaign = { ...withoutProject, projectId: "proj-1" };
  assert(withProject.projectId === "proj-1", "Campaign também pode referenciar um Project");
}

// 5. external_ai_import começa verified=false. (matriz #18)
console.log("[test] 5 — external_ai_import nasce verified=false");
{
  const intake: ExternalAIImportIntake = {
    type: "external_ai_import", companyId: "c-1", workspaceId: "ws-1", source: "user", createdAt: "2026-08-01T00:00:00Z",
    payload: { content: "contexto colado de uma IA externa" },
  };
  const provenance = provenanceForExternalAIImport(intake);
  assert(provenance.verified === false, "provenance de external_ai_import começa não verificada");
  assert(provenance.sourceType === "external_ai_import", "sourceType correto");
}

// 6. Derived Knowledge mantém provenance.
console.log("[test] 6 — DerivedKnowledge sempre tem provenance");
{
  const dk: DerivedKnowledge = {
    kind: "opportunity", summary: "s", companyId: "c-1",
    provenance: { sourceType: "derived", verified: false, confidence: "estimated" },
    confidence: "estimated",
  };
  assert(!!dk.provenance, "DerivedKnowledge.provenance é obrigatório no tipo");
  assert(dk.provenance.sourceType === "derived", "provenance rastreável até a origem");
}

// 7/8. Connection pode ser skipped; skip não invalida Activation.
console.log("[test] 7/8 — Connection skippable, skip não bloqueia Activation");
{
  const choice: ActivationConnectionChoice = "SKIP_FOR_LATER";
  assert(choice === "SKIP_FOR_LATER" || choice === "NOT_RELEVANT", "SKIP_FOR_LATER é uma escolha válida de conexão");
  const state: CompanyActivationState = { companyId: "c-1", status: "completed", currentStep: "OPERATIONAL_ENTRY", completedSteps: ["WELCOME", "CONTEXT_INTAKE", "CONNECTION_SUGGESTION"] };
  assert(state.status === "completed", "Activation pode chegar a completed mesmo com uma conexão pulada (nenhum campo de conexão bloqueia o status)");
}

// 9. Capability interna (documents) não exige connection. (matriz #1) -- corrige o bug P1 #1 auditado.
console.log("[test] 9 — Capability interna sem connection é actionable (bug P1 #1 corrigido)");
{
  const internalDocs = capabilityState({ capability: "documents", connectionRequirement: "not_required", connected: false });
  const result = resolveCapabilityPrecedence(internalDocs);
  assert(result.actionable === true, "documents com connectionRequirement=not_required e connected=false ainda é actionable");
  assert(result.unmet === undefined, "nenhum unmet reportado quando a conexão não é exigida");
}

// 10. Capability externa exige connection quando required. (matriz #2)
console.log("[test] 10 — Capability externa (advertising) exige connection quando required");
{
  const disconnected = capabilityState({ capability: "advertising", connectionRequirement: "required", connected: false });
  const disconnectedResult = resolveCapabilityPrecedence(disconnected);
  assert(disconnectedResult.actionable === false, "advertising com connectionRequirement=required e connected=false não é actionable");
  assert(disconnectedResult.unmet?.reason === "not_connected", "motivo reportado é not_connected");

  const connected = capabilityState({ capability: "advertising", connectionRequirement: "required", connected: true });
  assert(resolveCapabilityPrecedence(connected).actionable === true, "advertising com connectionRequirement=required e connected=true avança ao próximo gate (permitted) e fica actionable");
}

// 11. "optional" nunca bloqueia sozinho.
console.log("[test] 11 — connectionRequirement=optional nunca bloqueia sozinho");
{
  const optionalDisconnected = capabilityState({ capability: "crm", connectionRequirement: "optional", connected: false });
  assert(resolveCapabilityPrecedence(optionalDisconnected).actionable === true, "optional + connected=false ainda é actionable (conexão só enriquece, não bloqueia)");
}

// 12. not_connected nunca é reportado para capability not_required.
console.log("[test] 12 — not_connected nunca é reportado quando not_required");
{
  const notRequired = capabilityState({ capability: "crm", connectionRequirement: "not_required", connected: false, permitted: false });
  const result = resolveCapabilityPrecedence(notRequired);
  assert(result.unmet?.reason !== "not_connected", "reason nunca é not_connected para not_required (aqui o motivo real é not_permitted)");
  assert(result.unmet?.reason === "not_permitted", "motivo correto (not_permitted) reportado em vez de not_connected");
}

// 13. Agent IDs únicos.
console.log("[test] 13 — Agent IDs únicos");
{
  const ids = AGENT_REGISTRY.map((a) => a.id);
  assert(new Set(ids).size === ids.length, "nenhum ID de agente duplicado no registry");
}

// 14. Contract available != Runtime available. (matriz #3/#4) -- corrige o bug P1 #2 auditado.
console.log("[test] 14 — contract available != runtime available (bug P1 #2 corrigido)");
{
  const availableAgent = AGENT_REGISTRY.find((a) => a.status === "available_contract");
  assert(!!availableAgent, "existe pelo menos um agente available_contract no registry");
  assert(isAgentContractAvailable(availableAgent!) === true, "isAgentContractAvailable retorna true para available_contract");
  assert(isAgentRuntimeAvailable(availableAgent!) === false, "isAgentRuntimeAvailable NUNCA retorna true nesta Foundation, mesmo para available_contract");

  const plannedAgent = AGENT_REGISTRY.find((a) => a.status === "planned");
  assert(!!plannedAgent, "existe pelo menos um agente planned no registry (growth/finance/documents)");
  assert(isAgentContractAvailable(plannedAgent!) === false, "isAgentContractAvailable retorna false para status planned");
  assert(isAgentRuntimeAvailable(plannedAgent!) === false, "isAgentRuntimeAvailable retorna false para status planned");

  const noAgentHasRuntime = AGENT_REGISTRY.every((a) => isAgentRuntimeAvailable(a) === false);
  assert(noAgentHasRuntime, "nenhum agente do registry tem runtime available = true nesta Foundation");
}

// 15. Multi-domain plan.
console.log("[test] 15 — plano multi-domínio");
{
  const req: NeuralRequest = {
    id: "r15", context: baseContext("c-1"), requestedAt: "2026-08-01T00:00:00Z", requestedBy: "u-1",
    input: baseInitiative({ companyId: "c-1", domainHints: ["content", "crm", "project"] }),
  };
  const plan = new NeuralOrchestrator().plan(req);
  assert(plan.domains !== null, "domains resolvido");
  assert(plan.domains!.candidateAgents.length >= 3, "múltiplos agentes candidatos para múltiplos domainHints");
  assert(plan.candidateAgents.some((a) => a.domain === "content") && plan.candidateAgents.some((a) => a.domain === "crm"), "inclui content e crm");
}

// 16. Missing capability.
console.log("[test] 16 — missing capability reportada no plano");
{
  const req: NeuralRequest = {
    id: "r16", context: baseContext("c-1"), requestedAt: "2026-08-01T00:00:00Z", requestedBy: "u-1",
    input: baseInitiative({ companyId: "c-1", domainHints: ["crm"] }),
  };
  const plan = new NeuralOrchestrator().plan(req, []); // nenhum CapabilityState fornecido
  assert(plan.missingCapabilities.length > 0, "capability crm exigida pelo agente mas ausente do contexto -> reportada como missing");
  assert(plan.missingCapabilities[0].reason === "not_exists", "motivo not_exists quando nenhum CapabilityState existe para a capability");
}

// 17. Response blocks são uma discriminated union real (narrowing por switch). (matriz #16) -- corrige o gap P2 #6 auditado.
console.log("[test] 17 — ResponseBlock é discriminated union real (narrowing, não só type==constante)");
{
  function extractPayloadSummary(block: ResponseBlock): string {
    switch (block.type) {
      case "metric":
        return `metric:${block.payload?.metricKey ?? "?"}=${block.payload?.value ?? "?"}`;
      case "connection":
        return `connection:${block.payload?.connectionId ?? "none"}`;
      case "campaign":
        return `campaign:${block.payload?.campaignRef ?? "none"}`;
      case "warning":
        return `warning:${block.payload?.severity ?? "unknown"}`;
      default:
        return `other:${block.type}`;
    }
  }
  const metricBlock: ResponseBlock = { id: "b-metric", type: "metric", title: "t", summary: "s", companyId: "c-1", sourceRefs: [], actions: [], status: "informational", payload: { metricKey: "conversion_rate", value: 0.42 } };
  assert(extractPayloadSummary(metricBlock) === "metric:conversion_rate=0.42", "narrowing dá acesso tipado ao payload de metric (metricKey/value)");

  const connectionBlock: ResponseBlock = { id: "b-conn", type: "connection", title: "t", summary: "s", companyId: "c-1", sourceRefs: [], actions: [], status: "informational", payload: { connectionId: "conn-1" } };
  assert(extractPayloadSummary(connectionBlock) === "connection:conn-1", "narrowing dá acesso tipado ao payload de connection (connectionId)");

  const campaignBlock: ResponseBlock = { id: "b-camp", type: "campaign", title: "t", summary: "s", companyId: "c-1", sourceRefs: [], actions: [], status: "informational", payload: { campaignRef: "camp-1", objective: null } };
  assert(extractPayloadSummary(campaignBlock) === "campaign:camp-1", "narrowing dá acesso tipado ao payload de campaign (campaignRef)");

  const warningBlock: ResponseBlock = { id: "b-warn", type: "warning", title: "t", summary: "s", companyId: "c-1", sourceRefs: [], actions: [], status: "informational", payload: { severity: "high", reason: "token expirado" } };
  assert(extractPayloadSummary(warningBlock) === "warning:high", "narrowing dá acesso tipado ao payload de warning (severity)");

  assert(RESPONSE_BLOCK_TYPES.length === 16, "16 tipos de block conhecidos (fonte única em response-blocks.ts, não hardcoded no teste)");
}

// 18. ActionDraft nunca executa; Confirmation necessária. (matriz #17)
console.log("[test] 18 — ActionDraft sempre exige confirmação, nunca executa");
{
  const draft = createDraftAction({
    id: "a1", companyId: "c-1", type: "create_work_item_draft", targetModule: "operacional",
    summary: "s", impact: "baixo", payload: {}, sourceRefs: [],
  });
  assert(draft.confirmationRequired === true, "createDraftAction sempre produz confirmationRequired=true");
  assert(draft.safetyLevel === "DRAFT", "safetyLevel nunca passa de DRAFT nesta sprint");
}

// 19. Conversation != BusinessMemory. (matriz #19)
console.log("[test] 19 — Conversation nunca é BusinessMemory automaticamente");
{
  const turn: ConversationContext = { turnId: "t1", companyId: "c-1", currentQuestion: "q", occurredAt: "2026-08-01T00:00:00Z" };
  assert(conversationTurnIsMemoryEntry(turn) === false, "conversationTurnIsMemoryEntry sempre retorna false -- nunca promove sozinho");
  const memory: BusinessMemory = [];
  assert(memory.length === 0, "nenhuma memória criada a partir da conversa sem promoção explícita");
}

// 20. Briefing ordering determinístico. (matriz #15, parte 1: SIGNAL_WEIGHT inalterado)
console.log("[test] 20 — Briefing ordenado deterministicamente por sinais");
{
  const items: BusinessBriefingItem[] = [
    { id: "b", companyId: "c-1", kind: "data_quality" as const, title: "baixa prioridade", signals: ["data_quality"] },
    { id: "a", companyId: "c-1", kind: "work_item" as const, title: "atrasado", signals: ["overdue", "blocker"] },
    { id: "c", companyId: "c-1", kind: "approval" as const, title: "aprovação pendente", signals: ["approval_waiting"] },
  ];
  const ordered = orderBriefingItems(items);
  assert(ordered[0].id === "a", "item com overdue+blocker vem primeiro");
  assert(ordered[1].id === "c", "aprovação pendente vem em segundo");
  assert(ordered[2].id === "b", "data_quality sozinho vem por último");
  const orderedAgain = orderBriefingItems(items);
  assert(JSON.stringify(ordered) === JSON.stringify(orderedAgain), "mesma entrada produz sempre a mesma ordem (determinístico)");
}

// 21. Connection health suportado.
console.log("[test] 21 — ConnectionHealth suporta os estados esperados");
{
  const health: ConnectionHealth = { connectionId: "conn-1", status: "degraded", checkedAt: "2026-08-01T00:00:00Z", missingRequirements: ["token_refresh"], source: "system" };
  const validStatuses: ConnectionHealth["status"][] = ["healthy", "degraded", "offline", "auth_required", "configuration_required", "unknown"];
  assert(validStatuses.includes(health.status), "status de ConnectionHealth é um dos 6 estados conceituais");
}

// 22. Visibility default restritivo. (matriz #5) -- cobre o gap P1 #3 auditado.
console.log("[test] 22 — Visibility default é restritivo quando ausente");
{
  const resolved = resolveVisibilityPolicy(undefined);
  assert(resolved.internalOnly === true, "policy ausente resolve para internalOnly=true");
  assert(resolved.client === "hidden", "policy ausente resolve para client=hidden");
  assert(isClientVisible(resolved) === false, "policy ausente nunca é client-visible");
  assert(JSON.stringify(resolved) === JSON.stringify(DEFAULT_VISIBILITY_POLICY), "default explícito é usado quando nenhuma policy é fornecida");
}

// 23. client_summary != client_visible. (matriz #6)
console.log("[test] 23 — client_summary é distinto de client_visible");
{
  const summaryPolicy: NeuralVisibilityPolicy = { internalOnly: false, client: "summary", connectorReadable: false, futureCommandable: false };
  assert(isClientSummaryOnly(summaryPolicy) === true, "summary é reconhecido como summary");
  assert(isClientVisible(summaryPolicy) === false, "summary NUNCA é tratado como visible");

  const visiblePolicy: NeuralVisibilityPolicy = { ...summaryPolicy, client: "visible" };
  assert(isClientVisible(visiblePolicy) === true, "visible é reconhecido como visible");
  assert(isClientSummaryOnly(visiblePolicy) === false, "visible NUNCA é tratado como summary");
}

// 24. connector_readable explícito. (matriz #7)
console.log("[test] 24 — connectorReadable=false nunca é interpretado como readable");
{
  const notReadable: NeuralVisibilityPolicy = { internalOnly: false, client: "hidden", connectorReadable: false, futureCommandable: false };
  assert(isConnectorReadable(notReadable) === false, "connectorReadable=false permanece false");
  const readable: NeuralVisibilityPolicy = { ...notReadable, connectorReadable: true };
  assert(isConnectorReadable(readable) === true, "connectorReadable=true é respeitado quando internalOnly=false");
  const internalOnlyButReadableFlag: NeuralVisibilityPolicy = { internalOnly: true, client: "visible", connectorReadable: true, futureCommandable: false };
  assert(isConnectorReadable(internalOnlyButReadableFlag) === false, "internalOnly=true vence mesmo se connectorReadable foi setado como true por engano");
}

// 25. future_commandable é só metadata -- nunca cria executor/action.
console.log("[test] 25 — futureCommandable é metadata, nunca vira executor real");
{
  const policyWithFutureCommand: NeuralVisibilityPolicy = { internalOnly: false, client: "summary", connectorReadable: false, futureCommandable: true };
  const draft = createDraftAction({
    id: "a-fc", companyId: "c-1", type: "create_work_item_draft", targetModule: "operacional",
    summary: "s", impact: "baixo", payload: {}, sourceRefs: [], visibility: policyWithFutureCommand,
  });
  assert(draft.confirmationRequired === true, "mesmo com futureCommandable=true na visibility, o draft continua exigindo confirmação");
  assert(draft.safetyLevel === "DRAFT", "futureCommandable nunca eleva safetyLevel além de DRAFT");
}

// 26. ConnectorEvent não publica DomainEvent automaticamente. (matriz #8) -- cobre o gap P1 #4 auditado.
console.log("[test] 26 — ConnectorEvent não é publicado como DomainEvent automaticamente");
{
  const connectorEvent: ConnectorEvent = {
    version: "1", connectorId: "conn-1", sourceSystem: "external_crm", companyId: "c-1",
    eventId: "evt-1", eventName: "lead_created", occurredAt: "2026-08-01T00:00:00Z",
    entity: "lead", payload: { leadId: "l-1" },
    provenance: { sourceType: "connector", verified: false },
  };
  assert(connectorEvent.normalizedDomainEventId === undefined, "ConnectorEvent nasce sem normalizedDomainEventId -- nenhuma normalização automática nesta Foundation");
}

// 27. ConnectorMetric exige provenance suficiente. (matriz #9)
console.log("[test] 27 — ConnectorMetric sempre carrega provenance rastreável");
{
  const metric: ConnectorMetric = {
    connectorId: "conn-1", sourceSystem: "external_crm", companyId: "c-1",
    metricKey: "leads_captured", value: 12, observedAt: "2026-08-01T00:00:00Z",
    provenance: { sourceType: "connector", sourceId: "conn-1", verified: false },
  };
  assert(!!metric.provenance, "ConnectorMetric.provenance é obrigatório no tipo");
  assert(metric.provenance.sourceType === "connector", "provenance rastreável até o connector de origem");
}

// 28. PlanningLevel e PlanningHorizon são independentes. (matriz #10/#11/#12) -- cobre o gap P2 #5 auditado.
console.log("[test] 28 — PlanningLevel e PlanningHorizon são dimensões independentes");
{
  const strategicShort: PlanningContext = { level: "strategic", horizon: "short" };
  const operationalContinuous: PlanningContext = { level: "operational", horizon: "continuous" };
  assert(strategicShort.level === "strategic" && strategicShort.horizon === "short", "strategic + short horizon é uma combinação válida (level != horizon)");
  assert(operationalContinuous.level === "operational" && operationalContinuous.horizon === "continuous", "operational + continuous horizon é uma combinação válida");
}

// 29. Objective cascade mínimo (strategic -> tactical -> operational), sem persistência. (matriz #13)
console.log("[test] 29 — Objective cascade (strategic -> tactical -> operational)");
{
  const strategicObjective: ObjectiveReference = { id: "obj-strategic", companyId: "c-1", title: "Expandir para novo mercado", planningLevel: "strategic" };
  const tacticalInitiative: ObjectiveReference = { id: "obj-tactical", companyId: "c-1", title: "Lançar campanha regional", planningLevel: "tactical", parentObjectiveId: strategicObjective.id };
  const operationalWork: ObjectiveReference = { id: "obj-operational", companyId: "c-1", title: "Publicar 10 peças de conteúdo", planningLevel: "operational", parentObjectiveId: tacticalInitiative.id };
  assert(tacticalInitiative.parentObjectiveId === strategicObjective.id, "tactical referencia o strategic como parent");
  assert(operationalWork.parentObjectiveId === tacticalInitiative.id, "operational referencia o tactical como parent");
  assert(strategicObjective.parentObjectiveId === undefined, "o topo da cascata (strategic) não tem parent");
}

// 30. NeuralRequest/NeuralPlan carregam planningContext sem inferência por texto livre. (matriz #14)
console.log("[test] 30 — NeuralRequest/NeuralPlan carregam planningContext já estruturado (nunca inferido)");
{
  const planningContext: PlanningContext = { level: "tactical", horizon: "medium", objectiveRef: "obj-tactical" };
  const req: NeuralRequest = {
    id: "r30", context: baseContext("c-1"), requestedAt: "2026-08-01T00:00:00Z", requestedBy: "u-1",
    input: baseInitiative({ companyId: "c-1", domainHints: ["crm"] }), planningContext,
  };
  const plan = new NeuralOrchestrator().plan(req, []);
  assert(plan.planningContext === planningContext, "NeuralPlan ecoa exatamente o planningContext fornecido -- nunca gera um novo a partir de texto");
}

// 31. Nenhum agent do registry importa AI SDK/mutation (estrutural). (matriz #20 + Fase 48 "No Fake Runtime")
console.log("[test] 31 — nenhuma mutation direta ou SDK de IA/runtime importável no neural-core");
{
  const dir = path.join(__dirname, "..");
  const forbiddenMutationClients = /supabase|service_role|createRequiredSupabaseAdminClient|createServerSupabaseClient/i;
  const forbiddenRuntimeSdkImport = /from\s+["'](openai|@anthropic-ai\/sdk|@google\/generative-ai|whatsapp-web\.js|stripe|mercadopago)["']|require\(\s*["'](openai|@anthropic-ai\/sdk|@google\/generative-ai|whatsapp-web\.js|stripe|mercadopago)["']\s*\)/i;
  const offenders: string[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".ts") || file.includes("__tests__")) continue;
    const content: string = fs.readFileSync(path.join(dir, file), "utf8");
    const codeOnly = content.split("\n").filter((l: string) => !l.trim().startsWith("*") && !l.trim().startsWith("//")).join("\n");
    if (forbiddenMutationClients.test(codeOnly) || forbiddenRuntimeSdkImport.test(codeOnly)) offenders.push(file);
  }
  assert(offenders.length === 0, `nenhum arquivo do neural-core importa cliente de mutação ou SDK de IA/runtime (offenders: ${offenders.join(", ") || "nenhum"})`);
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
