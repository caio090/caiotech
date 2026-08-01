/**
 * npm run qa:info — exibe projeto, branch, HEAD, origin/main, porta oficial
 * de QA, URL, porta de Production local, status do working tree, data/hora
 * e fuso. Não altera nada, não inicia servidor.
 */
import { LOCAL_QA_CONFIG } from "../src/config/local-qa.ts";
import { getGitInfo, nowIsoInTimezone, readSession, isPidAlive } from "./qa-lib.ts";

const git = getGitInfo();
const session = readSession();

console.log("=== LOKAT OS — QA Info ===");
console.log(`Projeto: ${LOCAL_QA_CONFIG.projectName}`);
console.log(`Branch: ${git.branch || "(desconhecida)"}`);
console.log(`HEAD: ${git.head || "(desconhecido)"}`);
console.log(`origin/main: ${git.originMain || "(desconhecido)"}`);
console.log(`Working tree rastreado: ${git.workingTreeClean ? "limpo" : "com alterações pendentes"}`);
console.log(`Porta oficial de QA: ${LOCAL_QA_CONFIG.qaPort} (${LOCAL_QA_CONFIG.qaBaseUrl})`);
console.log(`Porta Production local: ${LOCAL_QA_CONFIG.productionLocalPort} (${LOCAL_QA_CONFIG.productionLocalBaseUrl})`);
console.log(`Porta de desenvolvimento livre (nunca QA oficial): ${LOCAL_QA_CONFIG.freeDevPort}`);
console.log(`Data/hora (${LOCAL_QA_CONFIG.timezone}): ${nowIsoInTimezone(LOCAL_QA_CONFIG.timezone)}`);

if (session) {
  const alive = isPidAlive(session.pid);
  console.log("\n=== Sessão registrada ===");
  console.log(`PID: ${session.pid} (${alive ? "ativo" : "processo não encontrado — sessão pode estar obsoleta (stale)"})`);
  console.log(`Modo: ${session.mode} | Porta: ${session.port} | Status: ${session.status}`);
  console.log(`Branch registrada: ${session.branch} | HEAD registrado: ${session.head}`);
  console.log(`Log: ${session.logFile}`);
  if (session.branch !== git.branch || session.head !== git.head) {
    console.log("AVISO: a branch/HEAD da sessão registrada difere do estado atual do repositório.");
  }
} else {
  console.log("\nNenhuma sessão de QA registrada em .tmp/local-qa-session.json.");
}
