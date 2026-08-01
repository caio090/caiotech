/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/contentos/editor-os/__tests__/editor-os-handoff.structural.test.ts
 * Cobre Fase 33 (testes EditorOS) itens 57, 60, 61, 63, 65, 68 do brief da
 * Sprint REC OS 3.0.1.1 (53-56/58/59/62/64/66/67 já cobertos em
 * src/lib/rec-os-workflow/__tests__/editor-handoff.test.ts, lógica pura).
 */
import * as fs from "fs";
import * as path from "path";
import { buildEditorAssetHandoff, serializeEditorAssetHandoff, parseEditorAssetHandoff } from "@/lib/rec-os-workflow/editor-handoff";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 60 — campaignId preservado quando presente");
const withCampaign = buildEditorAssetHandoff({
  workspaceId: "c1", clientId: "c1", contentId: "ct1", campaignId: "camp-1",
  assetId: null, assetSource: "editor_os", fileUrl: null, mimeType: null, width: 1080, height: 1350,
  format: "story", destination: null, briefingId: null, conceptId: null,
  copy: null, restrictions: ["logo obrigatório"], returnRoute: "/admin/contentos/criar?client=c1",
});
const params = serializeEditorAssetHandoff(withCampaign);
assert(params.get("campaign_id") === "camp-1", "campaignId presente é serializado");
const parsed = parseEditorAssetHandoff({ client: params.get("client")!, content_id: params.get("content_id")!, campaign_id: params.get("campaign_id") ?? undefined });
assert(parsed.campaignId === "camp-1", "campaignId preservado no parse");

console.log("[test] 61/63 — dimensões e restrições existem no contrato (mesmo não sendo enviadas na URL)");
assert(withCampaign.width === 1080 && withCampaign.height === 1350, "width/height fazem parte do contrato EditorAssetHandoff");
assert(withCampaign.restrictions.length === 1, "restrictions faz parte do contrato — nunca vai para a URL (Fase 14), mas existe no objeto");
assert(!params.toString().includes("logo obrigat"), "restrictions não vaza para os parâmetros de URL");

console.log("[test] 57 — canvas nunca abre vazio (cliente inválido cai na mesma landing, nunca um editor sem contexto)");
const editorPage = read("src/app/admin/contentos/editor-os/page.tsx");
assert(editorPage.includes("EditorOSLandingState") && editorPage.includes("nunca redireciona"), "cliente ausente/inválido sempre volta para a landing com seletor, nunca abre o canvas sem contexto");

console.log("[test] 65 — 'Voltar ao conteúdo' preserva client/content_id/step=visual");
const workspace = read("src/app/admin/contentos/editor-os/EditorOSWorkspace.tsx");
assert(workspace.includes('"Voltar ao conteúdo"'), "rótulo real de retorno ao conteúdo existe");
const guidedFlow = read("src/app/admin/contentos/criar/_guided-create-flow.tsx");
assert(guidedFlow.includes("step=visual"), "returnRoute construída pelo Criar aponta de volta para o step Visual Final");

console.log("[test] 68 — Biblioteca de ativos continua honesta (planned), nunca simulada");
const guided = read("src/app/admin/contentos/criar/_guided-create-flow.tsx");
assert(guided.includes('data-testid="asset-library-disabled"') && guided.includes("Biblioteca de ativos ainda não disponível"), "card desabilitado com o texto exato exigido pelo brief");
assert(!guided.includes("Escolher no Arsenal"), "nenhum botão fingindo Arsenal funcional");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
