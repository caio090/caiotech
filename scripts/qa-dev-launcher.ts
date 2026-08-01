/**
 * Sprint Recovery 2.1.3 — lançador oficial do QA local. Usado por
 * `npm run dev:qa` / `npm run start:qa`. Sobe `next dev` ou `next start` como
 * processo filho, registra o PID/branch/HEAD reais em
 * .tmp/local-qa-session.json e espelha stdout/stderr para um log — nunca
 * inclui segredo, cookie, token ou e-mail no arquivo de sessão (só
 * metadados de processo/git).
 *
 * Uso: node scripts/qa-dev-launcher.ts --mode development|production --port 3100
 */
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { LOCAL_QA_CONFIG } from "../src/config/local-qa.ts";
import { ROOT, getGitInfo, nowIsoInTimezone, writeSession, type LocalQaSessionMode } from "./qa-lib.ts";

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const mode = parseArg("mode", "development") as LocalQaSessionMode;
const port = Number.parseInt(parseArg("port", String(LOCAL_QA_CONFIG.qaPort)), 10);
const host = LOCAL_QA_CONFIG.qaHost;
const logFile = mode === "development" ? ".tmp/lokat-os-qa-3100.log" : `.tmp/lokat-os-qa-${port}.log`;
const logPath = join(ROOT, logFile);

mkdirSync(dirname(logPath), { recursive: true });
if (existsSync(logPath)) {
  appendFileSync(logPath, `\n\n----- nova sessão iniciada em ${nowIsoInTimezone(LOCAL_QA_CONFIG.timezone)} (${LOCAL_QA_CONFIG.timezone}) -----\n\n`);
}

const nextArgs = mode === "development"
  ? ["next", "dev", "--webpack", "--hostname", host, "--port", String(port)]
  : ["next", "start", "--hostname", host, "--port", String(port)];

const child = spawn("npx", nextArgs, { cwd: ROOT, shell: true });

const gitInfo = getGitInfo();
writeSession({
  project: LOCAL_QA_CONFIG.projectName,
  branch: gitInfo.branch,
  head: gitInfo.head,
  originMain: gitInfo.originMain,
  host, port, pid: child.pid ?? -1, mode,
  startedAt: nowIsoInTimezone(LOCAL_QA_CONFIG.timezone),
  timezone: LOCAL_QA_CONFIG.timezone,
  logFile, status: "starting",
});

console.log(`[qa-dev-launcher] mode=${mode} host=${host} port=${port} pid=${child.pid} log=${logFile}`);

child.stdout?.on("data", (chunk: Buffer) => {
  const text = chunk.toString();
  process.stdout.write(text);
  appendFileSync(logPath, text);
  if (/Ready in|✓ Ready/.test(text)) {
    writeSession({ ...getSessionBase(), status: "ready" });
  }
});
child.stderr?.on("data", (chunk: Buffer) => {
  const text = chunk.toString();
  process.stderr.write(text);
  appendFileSync(logPath, text);
});
child.on("exit", (code) => {
  writeSession({ ...getSessionBase(), status: "stopped" });
  console.log(`[qa-dev-launcher] processo filho encerrado, exit=${code}`);
});

function getSessionBase() {
  return {
    project: LOCAL_QA_CONFIG.projectName,
    branch: gitInfo.branch, head: gitInfo.head, originMain: gitInfo.originMain,
    host, port, pid: child.pid ?? -1, mode,
    startedAt: nowIsoInTimezone(LOCAL_QA_CONFIG.timezone),
    timezone: LOCAL_QA_CONFIG.timezone,
    logFile,
  };
}
