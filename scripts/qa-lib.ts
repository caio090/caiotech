/**
 * Sprint Recovery 2.1.3 — utilitários compartilhados pelos scripts oficiais
 * de QA local (qa-dev-launcher, qa-info, qa-smoke, qa-doctor). Módulo puro
 * Node (sem `@/`, sem Next.js) para poder rodar via `node scripts/*.ts`
 * fora do processo do Next, exatamente como scripts/check-workspace-mutation-coverage.ts.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { LOCAL_QA_CONFIG } from "../src/config/local-qa.ts";

export const ROOT = join(import.meta.dirname, "..");

export function git(args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export interface GitInfo {
  branch: string;
  head: string;
  originMain: string;
  workingTreeClean: boolean;
}

export function getGitInfo(): GitInfo {
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const originMain = git(["rev-parse", "origin/main"]);
  const status = git(["status", "--short"]);
  // Working tree "rastreado limpo" ignora linhas de untracked ("??") — só
  // conta como sujo se existir uma alteração RASTREADA pendente.
  const trackedChanges = status.split("\n").filter((line) => line.trim() !== "" && !line.startsWith("??"));
  return { branch, head, originMain, workingTreeClean: trackedChanges.length === 0 };
}

export type LocalQaSessionStatus = "starting" | "ready" | "unhealthy" | "stopped" | "unknown";
export type LocalQaSessionMode = "development" | "production";

export interface LocalQaSession {
  project: string;
  branch: string;
  head: string;
  originMain: string;
  host: string;
  port: number;
  pid: number;
  mode: LocalQaSessionMode;
  startedAt: string;
  timezone: string;
  logFile: string;
  status: LocalQaSessionStatus;
}

export function sessionFilePath(): string {
  return join(ROOT, LOCAL_QA_CONFIG.sessionFile);
}

export function writeSession(session: LocalQaSession): void {
  const path = sessionFilePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(session, null, 2) + "\n", "utf8");
}

export function readSession(): LocalQaSession | null {
  const path = sessionFilePath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as LocalQaSession;
  } catch {
    return null;
  }
}

/** Nunca mata processo automaticamente — só reporta se o PID ainda existe. */
export function isPidAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export interface RouteCheckResult {
  route: string;
  ok: boolean;
  status: number | null;
  location: string | null;
  durationMs: number;
  error: string | null;
}

// 15s (não 8s): a primeira visita a uma rota em `next dev` compila sob
// demanda — em hardware com memória restrita (ver hotfixes de Workspaces
// 1.0.10/1.0.11) isso já foi observado levando mais de 8s na primeira
// chamada de uma rota "fria". Rotas já visitadas respondem em <100ms.
export async function checkRoute(baseUrl: string, route: string, timeoutMs = 15000): Promise<RouteCheckResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual", signal: controller.signal });
    const durationMs = Date.now() - started;
    return { route, ok: true, status: response.status, location: response.headers.get("location"), durationMs, error: null };
  } catch (error) {
    const durationMs = Date.now() - started;
    const timedOut = error instanceof Error && error.name === "AbortError";
    return { route, ok: false, status: null, location: null, durationMs, error: timedOut ? "timeout" : "connection_refused_or_error" };
  } finally {
    clearTimeout(timer);
  }
}

export function nowIsoInTimezone(timezone: string): string {
  return new Date().toLocaleString("sv-SE", { timeZone: timezone }).replace(" ", "T");
}
