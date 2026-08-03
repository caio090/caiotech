/**
 * Sprint E2E CI 3.0.2.2 (Fase 7/38) — lê o reporter JSON do Playwright
 * (.tmp/playwright/report.json) e imprime um resumo em Markdown SANITIZADO
 * (sem e-mail/senha/token/cookie/header/dado de página) para
 * $GITHUB_STEP_SUMMARY. Nunca imprime valor de secret — só nomes de
 * arquivo/teste/projeto/rota e contagens.
 *
 * Executar: node scripts/e2e-summary.ts (mesmo padrão dos demais scripts
 * de QA — depende do suporte nativo a TypeScript do Node 22.6+/24, por
 * isso o workflow usa Node 24, não Node 20 — ver Fase 33 do brief e
 * docs/qa/github-actions-authenticated-e2e.md).
 */
import fs from "node:fs";
import path from "node:path";

interface PWResult {
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  duration: number;
}
interface PWTest {
  title: string;
  projectName: string;
  results: PWResult[];
}
interface PWSpec {
  title: string;
  file: string;
  tests: PWTest[];
}
interface PWSuite {
  title: string;
  file?: string;
  specs?: PWSpec[];
  suites?: PWSuite[];
}
interface PWReport {
  suites: PWSuite[];
  stats?: { expected: number; unexpected: number; skipped: number; flaky: number; duration: number };
}

const REPORT_PATH = path.join(process.cwd(), ".tmp/playwright/report.json");

function collectSpecs(suite: PWSuite, out: PWSpec[]) {
  if (suite.specs) out.push(...suite.specs);
  if (suite.suites) for (const s of suite.suites) collectSpecs(s, out);
}

function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.log("## LOKAT OS — E2E summary\n\nNenhum relatório encontrado em `.tmp/playwright/report.json` (execução não chegou a rodar o Playwright ou falhou antes de gerar o reporter).");
    return;
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8")) as PWReport;
  const specs: PWSpec[] = [];
  for (const suite of report.suites) collectSpecs(suite, specs);

  let passed = 0, failed = 0, skipped = 0, flaky = 0, total = 0;
  const failedTests: string[] = [];
  const perProject = new Map<string, { passed: number; failed: number; skipped: number }>();

  for (const spec of specs) {
    for (const t of spec.tests) {
      total++;
      const last = t.results[t.results.length - 1];
      const proj = perProject.get(t.projectName) ?? { passed: 0, failed: 0, skipped: 0 };
      if (!last || last.status === "skipped") { skipped++; proj.skipped++; }
      else if (last.status === "passed") {
        if (t.results.length > 1) flaky++;
        passed++; proj.passed++;
      } else {
        failed++; proj.failed++;
        failedTests.push(`${t.projectName} › ${path.basename(spec.file)} › ${spec.title} › ${t.title}`);
      }
      perProject.set(t.projectName, proj);
    }
  }

  const durationS = report.stats ? (report.stats.duration / 1000).toFixed(1) : "?";

  const lines: string[] = [];
  lines.push("## LOKAT OS — E2E summary");
  lines.push("");
  lines.push(`- Branch: \`${process.env.GITHUB_REF_NAME ?? "?"}\``);
  lines.push(`- SHA: \`${(process.env.GITHUB_SHA ?? "?").slice(0, 12)}\``);
  lines.push(`- Total: ${total} · Passed: ${passed} · Failed: ${failed} · Skipped: ${skipped} · Flaky: ${flaky}`);
  lines.push(`- Duração: ${durationS}s`);
  lines.push("");
  lines.push("### Por projeto");
  lines.push("");
  lines.push("| Projeto | Passed | Failed | Skipped |");
  lines.push("|---|---|---|---|");
  for (const [proj, counts] of perProject) {
    lines.push(`| ${proj} | ${counts.passed} | ${counts.failed} | ${counts.skipped} |`);
  }

  if (failedTests.length > 0) {
    lines.push("");
    lines.push("### Testes falhos");
    lines.push("");
    for (const name of failedTests) lines.push(`- ${name}`);
  }

  console.log(lines.join("\n"));
}

main();
