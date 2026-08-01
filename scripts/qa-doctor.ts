/**
 * npm run qa:doctor — valida o ambiente de QA local de ponta a ponta:
 * projeto/branch/HEAD, working tree, sessão registrada (PID vivo, não
 * obsoleta), porta 3100 respondendo, e ausência de HTTP 500 nas rotas
 * principais. Nunca mata processo, nunca inicia servidor — só diagnostica.
 */
import { LOCAL_QA_CONFIG } from "../src/config/local-qa.ts";
import { checkRoute, getGitInfo, isPidAlive, readSession } from "./qa-lib.ts";

async function main() {
  let ok = true;
  const fail = (label: string) => { console.error(`  FAIL - ${label}`); ok = false; };
  const pass = (label: string) => console.log(`  ok - ${label}`);

  console.log("=== LOKAT OS — QA Doctor ===");

  const git = getGitInfo();
  if (git.branch) pass(`branch identificada: ${git.branch}`); else fail("não foi possível identificar a branch atual");
  if (git.head) pass(`HEAD identificado: ${git.head}`); else fail("não foi possível identificar o HEAD");
  if (git.workingTreeClean) pass("working tree rastreado limpo"); else fail("existem alterações rastreadas pendentes");

  const session = readSession();
  if (!session) {
    fail("nenhuma sessão registrada em .tmp/local-qa-session.json (servidor pode não ter sido iniciado via dev:qa/start:qa)");
  } else {
    const alive = isPidAlive(session.pid);
    if (!alive) {
      fail(`PID ${session.pid} da sessão registrada não existe mais — sessão stale, não confiar nela`);
    } else {
      pass(`PID ${session.pid} da sessão registrada está ativo`);
    }
    if (session.branch !== git.branch || session.head !== git.head) {
      fail(`sessão registrada pertence a branch/HEAD diferentes do estado atual (sessão: ${session.branch}@${session.head}, atual: ${git.branch}@${git.head})`);
    } else {
      pass("sessão registrada pertence à branch/HEAD atuais");
    }
  }

  const baseUrl = LOCAL_QA_CONFIG.qaBaseUrl;
  const rootResult = await checkRoute(baseUrl, "/");
  if (rootResult.status === 200) pass(`raiz (${baseUrl}/) responde HTTP 200`);
  else fail(`raiz (${baseUrl}/) não respondeu 200 (obtido: ${rootResult.status ?? rootResult.error})`);

  for (const route of LOCAL_QA_CONFIG.expectedRoutes) {
    if (route === "/") continue;
    const result = await checkRoute(baseUrl, route);
    const is500 = result.status !== null && result.status >= 500;
    if (result.error) fail(`${route} — ${result.error}`);
    else if (is500) fail(`${route} — HTTP ${result.status} (erro de servidor)`);
    else pass(`${route} — HTTP ${result.status}, sem erro de servidor`);
  }

  console.log(ok ? "\nPASS" : "\nFAIL");
  process.exit(ok ? 0 : 1);
}

main();
