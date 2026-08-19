/**
 * npm run lkt:record -- --module "REC OS" --title "..." --kind FEATURE ...
 *
 * STATUS LIVE ACTIVITY V1 — ferramenta oficial para registrar um movimento
 * LKT em src/lib/lkt-activity/activity.json sem edição manual do JSON.
 * Cross-platform (Node puro, sem dependência de shell específico), não usa
 * Playwright nem Chrome. Gera id/timestamp, detecta a branch atual via git,
 * preserva o histórico existente (append-only -- nunca reescreve/apaga
 * eventos antigos), valida antes de gravar, mantém ordenação cronológica
 * na leitura (store.ts ordena, o arquivo em si só precisa ser append-only).
 *
 * Flags aceitas (todas string, repita --tests para múltiplas suítes):
 *   --module        (obrigatório)
 *   --title         (obrigatório)
 *   --kind          (obrigatório -- FEATURE|FIX|QA|RELEASE|ARCHITECTURE|BLOCKER|STATUS_CHANGE|MIGRATION|INTEGRATION)
 *   --description
 *   --status        (REAL|PARTIAL|DEMO|COMING_SOON|NOT_IMPLEMENTED|LEGACY|BLOCKED)
 *   --environment   (local|preview|production)
 *   --build         (PASS|FAIL|NOT_RUN)
 *   --deployment    (dpl_... -- opcional, nunca inventado quando desconhecido)
 *   --devUrl
 *   --blocker       (obrigatório quando --kind BLOCKER)
 *   --nextAction
 *   --commit        (SHA -- vira references[0].commit)
 *   --tests         (formato "suite:passed:failed", pode repetir a flag)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  type LktActivityEvent,
  type LktTestResult,
  validateLktActivityEvent,
} from "../src/lib/lkt-activity/types.ts";

const ACTIVITY_FILE = path.join(process.cwd(), "src", "lib", "lkt-activity", "activity.json");

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : undefined;
}

function argAll(name: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1]);
  }
  return out;
}

function currentBranch(): string | undefined {
  try {
    return execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}

function parseTests(raw: string[]): LktTestResult[] {
  const out: LktTestResult[] = [];
  for (const entry of raw) {
    const [suite, passedStr, failedStr] = entry.split(":");
    const passed = Number(passedStr);
    const failed = Number(failedStr);
    if (!suite || Number.isNaN(passed) || Number.isNaN(failed)) {
      throw new Error(`--tests inválido: "${entry}" (formato esperado suite:passed:failed)`);
    }
    out.push({ suite, passed, failed });
  }
  return out;
}

function nextId(existing: LktActivityEvent[]): string {
  let max = 0;
  for (const e of existing) {
    const m = /^evt-(\d+)$/.exec(e.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `evt-${String(max + 1).padStart(3, "0")}`;
}

function readExisting(): LktActivityEvent[] {
  if (!fs.existsSync(ACTIVITY_FILE)) return [];
  const raw = fs.readFileSync(ACTIVITY_FILE, "utf8").trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${ACTIVITY_FILE} não contém um array -- abortando para não corromper o histórico existente.`);
  return parsed as LktActivityEvent[];
}

function main() {
  const module_ = arg("module");
  const title = arg("title");
  const kind = arg("kind");
  const description = arg("description");
  const status = arg("status");
  const environment = arg("environment");
  const build = arg("build");
  const deployment = arg("deployment");
  const devUrl = arg("devUrl");
  const blocker = arg("blocker");
  const nextAction = arg("nextAction");
  const commit = arg("commit");
  const testsRaw = argAll("tests");

  const existing = readExisting();

  const candidate: Partial<LktActivityEvent> = {
    id: nextId(existing),
    timestamp: new Date().toISOString(),
    module: module_,
    title,
    kind: kind as LktActivityEvent["kind"],
    description,
    status: status as LktActivityEvent["status"] | undefined,
    environment: environment as LktActivityEvent["environment"] | undefined,
    branch: currentBranch(),
    build: build as LktActivityEvent["build"] | undefined,
    deployment,
    devUrl,
    blocker,
    nextAction,
    tests: testsRaw.length > 0 ? parseTests(testsRaw) : undefined,
    references: commit ? [{ commit }] : undefined,
  };

  const result = validateLktActivityEvent(candidate);
  if (!result.valid) {
    console.error("LKT_RECORD_INVALID_EVENT — evento rejeitado, nada foi gravado:");
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const updated = [...existing, candidate as LktActivityEvent];
  fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(updated, null, 2) + "\n", "utf8");

  console.log(`LKT_RECORD_OK — evento ${candidate.id} registrado em ${ACTIVITY_FILE}`);
  console.log(JSON.stringify(candidate, null, 2));
}

main();
