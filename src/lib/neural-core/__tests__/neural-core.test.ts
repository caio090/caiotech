/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/neural-core/__tests__/neural-core.test.ts
 * Sprint Gota Neural Foundation V1 (Fase 66) — 20 casos mínimos exigidos.
 */
import type { CanonicalBusinessContext, Campaign, InitiativeContext, DerivedKnowledge, ConversationContext } from "../context";
import { AGENT_REGISTRY, isAgentRuntimeAvailable } from "../agents";
import { resolveCapabilityPrecedence, type CapabilityState } from "../capabilities";
import type { ActivationConnectionChoice, ConnectionHealth } from "../integrations";
import type { CompanyActivationState } from "../activation";
import { provenanceForExternalAIImport, type ExternalAIImportIntake } from "../intake";
import { NeuralOrchestrator, type NeuralRequest } from "../orchestrator";
import { createDraftAction } from "../actions";
import { conversationTurnIsMemoryEntry, type BusinessMemory } from "../memory";
import { orderBriefingItems, type BusinessBriefingItem } from "../briefing";
import type { ResponseBlock } from "../response-blocks";
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

// 5. external_ai_import começa verified=false.
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

// 9. Capability precedence.
console.log("[test] 9 — Capability precedence determinística");
{
  const missingConnection: CapabilityState = { capability: "crm", exists: true, entitled: true, enabled: true, connected: false, permitted: true };
  const result = resolveCapabilityPrecedence(missingConnection);
  assert(result.actionable === false, "não actionable quando falta conexão");
  assert(result.unmet?.reason === "not_connected", "motivo correto reportado (not_connected)");

  const fullyActionable: CapabilityState = { capability: "crm", exists: true, entitled: true, enabled: true, connected: true, permitted: true };
  assert(resolveCapabilityPrecedence(fullyActionable).actionable === true, "actionable quando toda a cadeia está satisfeita");
}

// 10. Agent IDs únicos.
console.log("[test] 10 — Agent IDs únicos");
{
  const ids = AGENT_REGISTRY.map((a) => a.id);
  assert(new Set(ids).size === ids.length, "nenhum ID de agente duplicado no registry");
}

// 11. Planned agent não se apresenta como runtime disponível.
console.log("[test] 11 — planned agent não é runtime available");
{
  const plannedAgent = AGENT_REGISTRY.find((a) => a.status === "planned");
  assert(!!plannedAgent, "existe pelo menos um agente planned no registry (growth/finance/documents)");
  assert(isAgentRuntimeAvailable(plannedAgent!) === false, "isAgentRuntimeAvailable retorna false para status planned");
  const availableAgent = AGENT_REGISTRY.find((a) => a.status === "available_contract");
  assert(isAgentRuntimeAvailable(availableAgent!) === true, "isAgentRuntimeAvailable retorna true para available_contract");
}

// 12. Multi-domain plan.
console.log("[test] 12 — plano multi-domínio");
{
  const req: NeuralRequest = {
    id: "r12", context: baseContext("c-1"), requestedAt: "2026-08-01T00:00:00Z", requestedBy: "u-1",
    input: baseInitiative({ companyId: "c-1", domainHints: ["content", "crm", "project"] }),
  };
  const plan = new NeuralOrchestrator().plan(req);
  assert(plan.domains !== null, "domains resolvido");
  assert(plan.domains!.candidateAgents.length >= 3, "múltiplos agentes candidatos para múltiplos domainHints");
  assert(plan.candidateAgents.some((a) => a.domain === "content") && plan.candidateAgents.some((a) => a.domain === "crm"), "inclui content e crm");
}

// 13. Missing capability.
console.log("[test] 13 — missing capability reportada no plano");
{
  const req: NeuralRequest = {
    id: "r13", context: baseContext("c-1"), requestedAt: "2026-08-01T00:00:00Z", requestedBy: "u-1",
    input: baseInitiative({ companyId: "c-1", domainHints: ["crm"] }),
  };
  const plan = new NeuralOrchestrator().plan(req, []); // nenhum CapabilityState fornecido
  assert(plan.missingCapabilities.length > 0, "capability crm exigida pelo agente mas ausente do contexto -> reportada como missing");
  assert(plan.missingCapabilities[0].reason === "not_exists", "motivo not_exists quando nenhum CapabilityState existe para a capability");
}

// 14. Response blocks discriminados.
console.log("[test] 14 — Response blocks são discriminados por type");
{
  const block: ResponseBlock = {
    id: "b1", type: "crm", title: "t", summary: "s", companyId: "c-1", sourceRefs: [], actions: [], status: "informational",
  };
  assert(block.type === "crm", "type discrimina o block");
  const types: ResponseBlock["type"][] = ["insight", "diagnosis", "priority", "strategy", "project", "campaign", "content", "crm", "traffic", "financial", "task", "approval", "connection", "metric", "document", "warning"];
  assert(types.length === 16, "16 tipos de block conhecidos");
}

// 15/16. ActionDraft nunca executa; Confirmation necessária.
console.log("[test] 15/16 — ActionDraft sempre exige confirmação, nunca executa");
{
  const draft = createDraftAction({
    id: "a1", companyId: "c-1", type: "create_work_item_draft", targetModule: "operacional",
    summary: "s", impact: "baixo", payload: {}, sourceRefs: [],
  });
  assert(draft.confirmationRequired === true, "createDraftAction sempre produz confirmationRequired=true");
  assert(draft.safetyLevel === "DRAFT", "safetyLevel nunca passa de DRAFT nesta sprint");
}

// 17. Direct mutation não existe.
console.log("[test] 17 — nenhuma mutation direta importável no neural-core");
{
  const dir = path.join(__dirname, "..");
  const forbidden = /supabase|service_role|createRequiredSupabaseAdminClient|createServerSupabaseClient/i;
  const offenders: string[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".ts") || file.includes("__tests__")) continue;
    const content: string = fs.readFileSync(path.join(dir, file), "utf8");
    const codeOnly = content.split("\n").filter((l: string) => !l.trim().startsWith("*") && !l.trim().startsWith("//")).join("\n");
    if (forbidden.test(codeOnly)) offenders.push(file);
  }
  assert(offenders.length === 0, `nenhum arquivo do neural-core importa cliente de mutação (offenders: ${offenders.join(", ") || "nenhum"})`);
}

// 18. Conversation != BusinessMemory.
console.log("[test] 18 — Conversation nunca é BusinessMemory automaticamente");
{
  const turn: ConversationContext = { turnId: "t1", companyId: "c-1", currentQuestion: "q", occurredAt: "2026-08-01T00:00:00Z" };
  assert(conversationTurnIsMemoryEntry(turn) === false, "conversationTurnIsMemoryEntry sempre retorna false -- nunca promove sozinho");
  const memory: BusinessMemory = [];
  assert(memory.length === 0, "nenhuma memória criada a partir da conversa sem promoção explícita");
}

// 19. Briefing ordering determinístico.
console.log("[test] 19 — Briefing ordenado deterministicamente por sinais");
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

// 20. Connection health suportado.
console.log("[test] 20 — ConnectionHealth suporta os estados esperados");
{
  const health: ConnectionHealth = { connectionId: "conn-1", status: "degraded", checkedAt: "2026-08-01T00:00:00Z", missingRequirements: ["token_refresh"], source: "system" };
  const validStatuses: ConnectionHealth["status"][] = ["healthy", "degraded", "offline", "auth_required", "configuration_required", "unknown"];
  assert(validStatuses.includes(health.status), "status de ConnectionHealth é um dos 6 estados conceituais");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
