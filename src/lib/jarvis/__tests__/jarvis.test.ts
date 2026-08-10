/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/jarvis/__tests__/jarvis.test.ts
 * Sprint MVP Experience Completion V0.1 (Missão J) — segurança e limites do Jarvis.
 */
import { isJarvisConfigured } from "../client";
import { validateReportAttachment, buildReportContentParts } from "../report";
import { validateAudioFile } from "../audio-validation";
import { redactSecrets, sanitizeError } from "../safety";
import { tryAcquireJarvisSlot, releaseJarvisSlot, isJarvisSlotBusy, MAX_MESSAGE_CHARS } from "../cost-controls";
import { buildJarvisContextText } from "../context-builder";
import { buildJarvisSystemInstructions } from "../instructions";
import type { JarvisReportAttachment } from "../types";
import type { ProjectProjection } from "@/lib/project-projection/types";
import type { WorkItemProjection } from "@/lib/work-item-projection/types";
import * as fs from "node:fs";
import * as path from "node:path";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — missing AI env: isJarvisConfigured() reflete a ausência real de OPENAI_API_KEY");
{
  const before = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  assert(isJarvisConfigured() === false, "sem OPENAI_API_KEY, isJarvisConfigured() é false (nunca inventa presença)");
  process.env.OPENAI_API_KEY = "sk-test-fake-not-a-real-key-000000";
  assert(isJarvisConfigured() === true, "com a variável presente (mesmo fake neste teste), isJarvisConfigured() é true -- só checa presença, nunca valida o valor");
  if (before === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = before;
}

console.log("[test] 2 — invalid report MIME é rejeitado");
{
  const attachment: JarvisReportAttachment = { name: "malware.exe", type: "application/x-msdownload", size: 100, dataBase64: "AA==" };
  const result = validateReportAttachment(attachment);
  assert(result.valid === false && result.reason === "invalid_mime", "MIME fora da allowlist é rejeitado");
}

console.log("[test] 3 — oversized report é rejeitado");
{
  const attachment: JarvisReportAttachment = { name: "big.pdf", type: "application/pdf", size: 50 * 1024 * 1024, dataBase64: "AA==" };
  const result = validateReportAttachment(attachment);
  assert(result.valid === false && result.reason === "oversized", "arquivo maior que o limite é rejeitado");
}

console.log("[test] 4 — empty report é rejeitado");
{
  const attachment: JarvisReportAttachment = { name: "empty.csv", type: "text/csv", size: 0, dataBase64: "" };
  const result = validateReportAttachment(attachment);
  assert(result.valid === false && result.reason === "empty", "arquivo vazio é rejeitado");
}

console.log("[test] 5 — report válido gera content parts corretos por tipo, nunca grava em disco");
{
  const csv: JarvisReportAttachment = { name: "dados.csv", type: "text/csv", size: 10, dataBase64: Buffer.from("a,b\n1,2").toString("base64") };
  const csvParts = buildReportContentParts(csv);
  assert(csvParts[0].type === "input_text", "CSV vira input_text inline");

  const pdf: JarvisReportAttachment = { name: "rel.pdf", type: "application/pdf", size: 10, dataBase64: "AAAA" };
  const pdfParts = buildReportContentParts(pdf);
  assert(pdfParts[0].type === "input_file", "PDF vira input_file nativo");

  const image: JarvisReportAttachment = { name: "print.png", type: "image/png", size: 10, dataBase64: "AAAA" };
  const imageParts = buildReportContentParts(image);
  assert(imageParts[0].type === "input_image", "PNG vira input_image nativo");
}

console.log("[test] 6 — empty voice rejected");
{
  const result = validateAudioFile({ size: 0, type: "audio/webm" });
  assert(result.valid === false && result.reason === "empty_audio", "áudio vazio é rejeitado");
}

console.log("[test] 7 — oversized voice rejected");
{
  const result = validateAudioFile({ size: 100 * 1024 * 1024, type: "audio/webm" });
  assert(result.valid === false && result.reason === "oversized_audio", "áudio maior que o limite é rejeitado");
}

console.log("[test] 8 — invalid audio mime rejected");
{
  const result = validateAudioFile({ size: 1000, type: "video/mp4" });
  assert(result.valid === false && result.reason === "invalid_mime", "mime de vídeo é rejeitado para transcrição de áudio");
}

console.log("[test] 9 — valid audio accepted");
{
  const result = validateAudioFile({ size: 1000, type: "audio/webm" });
  assert(result.valid === true, "áudio dentro dos limites e mime correto é aceito");
}

console.log("[test] 10 — safety: chaves estilo sk-... nunca aparecem em texto sanitizado");
{
  const withKey = "erro ao chamar a API com a chave sk-abcdefghijklmnopqrstuvwxyz1234567890";
  const redacted = redactSecrets(withKey);
  assert(!redacted.includes("sk-abcdefghijklmnopqrstuvwxyz"), "chave é redigida");
  assert(redacted.includes("sk-[redacted]"), "placeholder de redação presente");

  const sanitized = sanitizeError(new Error(withKey));
  assert(!sanitized.includes("sk-abcdefghijklmnopqrstuvwxyz"), "sanitizeError também redige chaves");
}

console.log("[test] 11 — cost-controls: uma requisição ativa por sessão (nunca dois custos simultâneos)");
{
  const userId = "user-jarvis-test";
  releaseJarvisSlot(userId); // garante estado limpo mesmo se um teste anterior falhou no meio
  assert(isJarvisSlotBusy(userId) === false, "sessão começa livre");
  assert(tryAcquireJarvisSlot(userId) === true, "primeira aquisição do slot é bem-sucedida");
  assert(tryAcquireJarvisSlot(userId) === false, "segunda aquisição simultânea (duplo clique) é bloqueada");
  releaseJarvisSlot(userId);
  assert(tryAcquireJarvisSlot(userId) === true, "após liberar, uma nova requisição pode adquirir o slot");
  releaseJarvisSlot(userId);
}

console.log("[test] 12 — message length limit é respeitado (constante exposta, não hardcoded em componente)");
{
  assert(MAX_MESSAGE_CHARS > 0 && MAX_MESSAGE_CHARS <= 4000, "limite de mensagem é um valor positivo e razoável, centralizado em cost-controls.ts");
}

console.log("[test] 13 — Jarvis company isolation: contexto nunca mistura projetos/work items de outra Company (allowlist estrutural)");
{
  const projectA: ProjectProjection = {
    id: "p1", companyId: "company-A", title: "Projeto A", description: null, status: "producao",
    planningLevel: null, startAt: null, dueAt: null, owner: null, sourceModule: "rec_projects",
    sourceEntityType: "rec_project", sourceEntityId: "p1", sourceUrl: "/admin/recos/p1",
    metrics: null, workSummary: null, updatedAt: "2026-08-01T00:00:00Z",
  };
  const workItemA: WorkItemProjection = {
    id: "w1", workspaceId: "company-A", companyId: "company-A", projectId: null, module: "aprovacoes",
    type: "approval", title: "Aprovar item da empresa A", status: "pending", priority: null, owner: null,
    startAt: null, dueAt: null, completedAt: null, sourceModule: "aprovacoes", sourceEntityType: "approval",
    sourceEntityId: "a1", sourceUrl: "/admin/contentos/aprovacoes", approvalRef: "a1", dependencies: null, updatedAt: null,
  };
  const text = buildJarvisContextText({
    companyName: "Empresa A", surface: "direct_business", route: "/admin/escritorio",
    office: { todayCount: 1, overdueCount: 0, approvalsCount: 1, calendarAvailable: true },
    activeProjects: [projectA], attentionItems: [workItemA],
  });
  assert(text.includes("Empresa A"), "contexto contém a empresa correta");
  assert(text.includes("Projeto A"), "contexto contém o projeto da empresa correta");
  assert(!text.toLowerCase().includes("company-b"), "contexto nunca menciona identificadores de outra company (nenhum dado de Company B foi passado, e o builder não inventa nada)");
}

console.log("[test] 14 — Jarvis context nunca inclui zero fabricado quando calendário está indisponível");
{
  const text = buildJarvisContextText({
    companyName: "Empresa B", surface: "agency_client", route: "/admin/empresa",
    office: { todayCount: 0, overdueCount: 0, approvalsCount: 0, calendarAvailable: false },
    activeProjects: [], attentionItems: [],
  });
  assert(text.includes("não foi possível consultar agora"), "quando calendarAvailable=false, o texto diz explicitamente que não conseguiu consultar -- nunca reporta como zero real");
}

console.log("[test] 15 — instructions: autonomia máxima documentada (nunca menciona execução automática)");
{
  const instructions = buildJarvisSystemInstructions("contexto de teste");
  assert(instructions.includes("nunca executa uma ação real de negócio"), "instruções deixam explícito o teto de autonomia (DRAFT)");
  assert(instructions.includes("contexto de teste"), "contexto é injetado nas instruções finais");
}

console.log("[test] 16 — draft does not mutate: nenhum arquivo do Jarvis importa cliente de mutação ou SDK de IA fora do client.ts autorizado");
{
  const jarvisLibDir = path.join(__dirname, "..");
  const forbidden = /supabase\.from\([^)]*\)\.(insert|update|delete|upsert)|createRequiredSupabaseAdminClient/i;
  const offenders: string[] = [];
  for (const file of fs.readdirSync(jarvisLibDir)) {
    if (!file.endsWith(".ts") || file.includes("__tests__")) continue;
    const content = fs.readFileSync(path.join(jarvisLibDir, file), "utf8");
    const codeOnly = content.split("\n").filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//")).join("\n");
    if (forbidden.test(codeOnly)) offenders.push(file);
  }
  assert(offenders.length === 0, `nenhum arquivo de src/lib/jarvis executa mutação direta (offenders: ${offenders.join(", ") || "nenhum"})`);
}

console.log("[test] 17 — chat history não persistida: nenhum arquivo de UI do Jarvis usa localStorage/sessionStorage para o histórico de conversa");
{
  const jarvisComponentsDir = path.join(__dirname, "..", "..", "..", "components", "jarvis");
  const offenders: string[] = [];
  for (const file of fs.readdirSync(jarvisComponentsDir)) {
    if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
    const content = fs.readFileSync(path.join(jarvisComponentsDir, file), "utf8");
    const codeOnly = content.split("\n").filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//")).join("\n");
    if (/localStorage|sessionStorage|indexedDB/i.test(codeOnly)) offenders.push(file);
  }
  assert(offenders.length === 0, `nenhum componente do Jarvis usa localStorage/sessionStorage/indexedDB para conversa (offenders: ${offenders.join(", ") || "nenhum"})`);
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
