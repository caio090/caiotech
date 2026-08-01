/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os-workflow/__tests__/rec-os-workflow.test.ts
 */
import {
  REC_OS_WORKFLOW_STAGES, findWorkflowStage, resolveMacroStage, REC_OS_STATUS_ALIASES,
  contentFormatRequiresScript, contentFormatUsesPageStructure, isEditorAssetHandoffReady,
  buildCalendarNavigationUrl, EDITOR_OS_LAYER_SCANNER_STATUS,
} from "../index";

let passed = 0;
let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] Quatro macroetapas exatas");
assert(REC_OS_WORKFLOW_STAGES.length === 4, "exatamente 4 macroetapas");
assert(REC_OS_WORKFLOW_STAGES.map((s) => s.id).join(",") === "radar,criar,produzir,finalizar", "ordem Radar→Criar→Produzir→Finalizar");
assert(!!findWorkflowStage("radar"), "Radar existe");
assert(!!findWorkflowStage("criar"), "Criar existe");
assert(!!findWorkflowStage("produzir"), "Produzir existe");
assert(!!findWorkflowStage("finalizar"), "Finalizar existe");
assert(findWorkflowStage("finalizar")!.nextStage === "agendar_publicar", "Agendar/Publicar fica fora da criação (nextStage de Finalizar)");

console.log("[test] Status canônicos preservados, nenhum renomeado");
for (const status of ["ideia", "briefing", "roteiro", "producao", "edicao", "revisao_interna", "enviado_aprovacao", "alteracao_solicitada", "aprovado", "pronto_para_agendar", "agendado", "publicado", "reprovado"]) {
  assert(resolveMacroStage(status) !== null, `status real "${status}" resolve para uma macroetapa`);
}
console.log("[test] Aliases preservados");
assert(REC_OS_STATUS_ALIASES.em_producao === "producao", "alias em_producao preservado");
assert(REC_OS_STATUS_ALIASES.ajuste === "alteracao_solicitada", "alias ajuste preservado");
assert(resolveMacroStage("em_producao") === resolveMacroStage("producao"), "alias resolve para a mesma macroetapa do status canônico");

console.log("[test] Roteiro condicional");
assert(contentFormatRequiresScript("video") === true, "vídeo exige roteiro");
assert(contentFormatRequiresScript("reel") === true, "Reel exige roteiro");
assert(contentFormatRequiresScript("arte_estatica") === false, "arte estática não exige roteiro");
assert(contentFormatRequiresScript("banner") === false, "banner não exige roteiro");
assert(contentFormatRequiresScript("outdoor") === false, "outdoor não exige roteiro");
assert(contentFormatRequiresScript(null) === false, "formato ausente nunca exige roteiro");
assert(contentFormatUsesPageStructure("carrossel") === true, "carrossel usa estrutura de páginas, não roteiro");
assert(contentFormatRequiresScript("carrossel") === false, "carrossel não é tratado como roteiro");

console.log("[test] Handoff EditorOS exige asset real");
assert(isEditorAssetHandoffReady({ assetId: null, fileUrl: null }) === false, "sem asset nem fileUrl, handoff não está pronto");
assert(isEditorAssetHandoffReady({ assetId: "a1", fileUrl: null }) === true, "com assetId, handoff está pronto");
assert(isEditorAssetHandoffReady({ assetId: null, fileUrl: "https://x/y.png" }) === true, "com fileUrl, handoff está pronto");

console.log("[test] Calendário contextual preserva contexto, nunca abre genérico");
const url = buildCalendarNavigationUrl("/admin/calendario", { workspaceId: "w1", clientId: "c1", campaignId: "camp1", contentId: "cont1", month: "2026-08", filters: { canal: "instagram" }, returnRoute: "/admin/contentos/criar?client=c1" });
assert(url.includes("client=c1") && url.includes("campaign=camp1") && url.includes("content_id=cont1") && url.includes("month=2026-08"), "todos os parâmetros de contexto preservados na URL");
assert(url.includes("return_to="), "rota de retorno preservada");
assert(!url.includes("google"), "nenhuma referência a Google na navegação de calendário (Google OAuth continua blocked)");

console.log("[test] Scanner honesto");
assert(EDITOR_OS_LAYER_SCANNER_STATUS.availability === "experimental", "scanner permanece experimental, nunca available");
assert(EDITOR_OS_LAYER_SCANNER_STATUS.label === "Experimental", "rótulo visível é Experimental");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
