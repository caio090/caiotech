/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os-workflow/__tests__/editor-handoff.test.ts
 * Cobre Fase 33 (testes EditorOS) itens 53-68 do brief da Sprint REC OS 3.0.1.1.
 */
import {
  buildEditorAssetHandoff, validateEditorAssetHandoff, serializeEditorAssetHandoff, parseEditorAssetHandoff,
} from "../editor-handoff";
import { isEditorAssetHandoffReady, EDITOR_OS_LAYER_SCANNER_STATUS } from "../types";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 53/54 — handoff construído e validado");
const handoff = buildEditorAssetHandoff({
  workspaceId: "client-1", clientId: "client-1", contentId: "content-1", campaignId: null,
  assetId: null, assetSource: "upload", fileUrl: null, mimeType: null, width: null, height: null,
  format: "reel", destination: "production", briefingId: null, conceptId: null,
  copy: "texto sensível do briefing", restrictions: [], returnRoute: "/admin/contentos/criar?client=client-1",
});
assert(!!handoff.createdAt, "createdAt preenchido automaticamente");
assert(validateEditorAssetHandoff(handoff).length === 0, "handoff completo passa na validação");

console.log("[test] 55 — handoff inválido rejeitado");
const invalid = buildEditorAssetHandoff({ ...handoff, clientId: "", returnRoute: "https://evil.example.com" });
const errors = validateEditorAssetHandoff(invalid);
assert(errors.length >= 2, "clientId vazio e returnRoute fora de /admin/ geram erro cada");

console.log("[test] 56 — asset obrigatório (isEditorAssetHandoffReady)");
assert(!isEditorAssetHandoffReady({ assetId: null, fileUrl: null }), "sem assetId nem fileUrl não está pronto");
assert(isEditorAssetHandoffReady({ assetId: "a1", fileUrl: null }), "com assetId está pronto");

console.log("[test] 14 — nunca coloca o objeto inteiro (copy/restrictions) na URL");
const params = serializeEditorAssetHandoff(handoff);
assert(!params.toString().includes("sensível") && !params.toString().toLowerCase().includes("copy"), "copy nunca aparece nos parâmetros serializados");
assert(params.get("client") === "client-1" && params.get("content_id") === "content-1", "apenas client/content_id como parâmetros mínimos");
assert(params.get("has_asset") === "false", "has_asset reflete isEditorAssetHandoffReady (sem assetId/fileUrl aqui)");

console.log("[test] 58/59/60/61/62/63/64 — parse preserva contentId/clientId/campaignId/formato/returnRoute");
const parsed = parseEditorAssetHandoff({
  client: params.get("client")!, content_id: params.get("content_id")!,
  campaign_id: params.get("campaign_id") ?? undefined, format: params.get("format") ?? undefined,
  has_asset: params.get("has_asset") ?? undefined, handoff_at: params.get("handoff_at") ?? undefined,
  return_to: params.get("return_to") ?? undefined,
});
assert(parsed.clientId === "client-1", "contentId/clientId preservados no parse");
assert(parsed.contentId === "content-1", "contentId preservado no parse");
assert(parsed.format === "reel", "formato preservado no parse");
assert(parsed.returnRoute === "/admin/contentos/criar?client=client-1", "returnRoute preservada no parse");
assert(!parsed.expired, "handoff recém-criado não está expirado");

console.log("[test] 66 — handoff expirado detectado só pelo carimbo de tempo, nunca quebra");
const oldTimestamp = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3h atrás > TTL de 2h
const expiredParsed = parseEditorAssetHandoff({ client: "c", content_id: "x", handoff_at: oldTimestamp, return_to: "/admin/contentos" });
assert(expiredParsed.expired === true, "carimbo com mais de 2h é considerado expirado");
const garbageParsed = parseEditorAssetHandoff({ client: undefined, content_id: undefined, handoff_at: "not-a-date" });
assert(garbageParsed.expired === false && garbageParsed.clientId === null, "entrada adulterada nunca lança, nunca concede acesso — só vira null/false");

console.log("[test] 67/68 — scanner continua experimental, biblioteca continua planned (regressão desta sprint)");
assert(EDITOR_OS_LAYER_SCANNER_STATUS.availability === "experimental", "scanner permanece experimental (nunca habilitado nesta sprint)");
assert(EDITOR_OS_LAYER_SCANNER_STATUS.label === "Experimental", "rótulo Experimental preservado");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
