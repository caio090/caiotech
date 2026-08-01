/**
 * npm run qa:smoke — smoke test padronizado contra a porta oficial de QA
 * (127.0.0.1:3100). "/" deve responder 200; toda rota /admin/* deve
 * responder um redirect (3xx) para /login sem sessão. HTTP 500 ou timeout
 * fazem o script falhar (exit 1). 307 nunca é tratado como erro.
 */
import { LOCAL_QA_CONFIG } from "../src/config/local-qa.ts";
import { checkRoute } from "./qa-lib.ts";

async function main() {
  const baseUrl = LOCAL_QA_CONFIG.qaBaseUrl;
  console.log(`[qa:smoke] alvo: ${baseUrl}`);
  let allOk = true;

  for (const route of LOCAL_QA_CONFIG.expectedRoutes) {
    const result = await checkRoute(baseUrl, route);
    const isRoot = route === "/";
    const expectedOk = result.ok && (isRoot ? result.status === 200 : result.status !== null && result.status >= 300 && result.status < 400);
    const is500 = result.status !== null && result.status >= 500;

    let line = `  ${expectedOk ? "ok " : "FAIL"} - ${route} -> `;
    if (result.error === "timeout") line += "timeout";
    else if (result.error) line += "conexão recusada / erro";
    else if (is500) line += `HTTP ${result.status} (erro de servidor)`;
    else line += `HTTP ${result.status}${result.location ? ` -> ${result.location}` : ""} (${result.durationMs}ms)`;

    console.log(line);
    if (!expectedOk) allOk = false;
  }

  console.log(allOk ? "\nPASS" : "\nFAIL");
  process.exit(allOk ? 0 : 1);
}

main();
