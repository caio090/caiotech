/**
 * Utilitário único, não listado como script npm oficial: registra em
 * .tmp/local-qa-session.json um servidor que já estava rodando ANTES da
 * criação do padrão desta sprint (Sprint Recovery 2.1.3), sem reiniciá-lo —
 * "não encerrar o servidor correto". Uso pontual, não parte do fluxo
 * padrão (que passa a ser sempre `npm run dev:qa`, que já registra a
 * sessão sozinho).
 *
 * node scripts/qa-register-existing-session.ts --pid 2952 --port 3100 --logFile .tmp/meu-negocio-dna-8ps-qa.log
 */
import { getGitInfo, isPidAlive, nowIsoInTimezone, writeSession } from "./qa-lib.ts";
import { LOCAL_QA_CONFIG } from "../src/config/local-qa.ts";

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const pid = Number.parseInt(parseArg("pid", "-1"), 10);
const port = Number.parseInt(parseArg("port", String(LOCAL_QA_CONFIG.qaPort)), 10);
const logFile = parseArg("logFile", ".tmp/lokat-os-qa-3100.log");

if (!isPidAlive(pid)) {
  console.error(`PID ${pid} não está ativo — nada registrado.`);
  process.exit(1);
}

const git = getGitInfo();
writeSession({
  project: LOCAL_QA_CONFIG.projectName,
  branch: git.branch, head: git.head, originMain: git.originMain,
  host: LOCAL_QA_CONFIG.qaHost, port, pid, mode: "development",
  startedAt: nowIsoInTimezone(LOCAL_QA_CONFIG.timezone),
  timezone: LOCAL_QA_CONFIG.timezone,
  logFile, status: "ready",
});
console.log(`Sessão registrada retroativamente para PID ${pid} na porta ${port} (branch=${git.branch}, HEAD=${git.head}).`);
