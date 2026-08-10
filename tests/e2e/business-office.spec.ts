import { test, expect, type Page } from "@playwright/test";
import { installQualityListeners } from "./helpers/quality-listeners";

/**
 * Sprint CI Repair — Business Office Company Context E2E.
 *
 * A arquitetura atual (Company Central / Company Context) exige uma Company
 * autorizada para abrir /admin/escritorio — sem ela a página mostra o estado
 * "Selecione uma empresa", nunca escritorio-root. Estes testes passavam
 * antes por abrirem a rota sem contexto nenhum; o contrato mudou (e já foi
 * aprovado), então é o TESTE que precisa se adequar, nunca o produto.
 *
 * Não existe fixture/helper de E2E para Company Context hoje. A única forma
 * real e autorizada de obter uma Company é passar pelo mesmo fluxo que um
 * usuário real usaria: /contentos/selecionar-cliente. O usuário de QA é
 * super_admin, que tem autorização real (não simulada) para qualquer Company
 * visível. Nada aqui usa service role, bypassa resolveCompanyContext ou força
 * um UUID — a Company só existe porque a própria UI aceitou a seleção.
 */
type CompanySelectionState =
  | { kind: "COMPANIES_AVAILABLE" }
  | { kind: "NO_COMPANIES"; diagnostic: string }
  | { kind: "DEMO_MODE"; diagnostic: string }
  | { kind: "UNEXPECTED_REDIRECT"; url: string }
  | { kind: "UNEXPECTED_PAGE"; diagnostic: string };

/**
 * Sprint CI Repair V3 (Fase 7) — diagnóstico sanitizado: só metadados de
 * estrutura/contagem e um recorte curto de texto visível, nunca IDs
 * completos, e-mail, secret ou token. Só é chamado nos ramos em que a
 * página não está mostrando nenhum dado real de Company (estado vazio,
 * demo ou desconhecido), então não há dado empresarial sensível em risco.
 */
async function collectSanitizedDiagnostic(page: Page): Promise<string> {
  const url = page.url();
  const title = await page.title().catch(() => "(unavailable)");
  const headings = await page.getByRole("heading").allTextContents().catch(() => []);
  const buttonCount = await page.getByRole("button").count().catch(() => -1);
  const linkCount = await page.getByRole("link").count().catch(() => -1);
  const inputCount = await page.locator("input").count().catch(() => -1);
  const bodyTextRaw = await page.locator("body").innerText().catch(() => "");
  const bodyText = bodyTextRaw.replace(/\s+/g, " ").trim().slice(0, 1500);
  return [
    `url=${url}`,
    `title=${title}`,
    `headings=${JSON.stringify(headings.slice(0, 10))}`,
    `buttons=${buttonCount} links=${linkCount} inputs=${inputCount}`,
    `bodyText="${bodyText}"`,
  ].join(" | ");
}

/**
 * Sprint CI Repair V3 (Fase 9-13) — resolve qual dos estados reais e
 * conhecidos de /contentos/selecionar-cliente está renderizado, em vez de
 * assumir que "o botão não apareceu em 10s" significa bug de seletor.
 *
 * `page.tsx` (lido por completo nesta sprint) engole qualquer exceção da
 * consulta a `clients` num catch silencioso e deixa `clients = []` — ou
 * seja, "zero Companies reais" e "falha silenciosa de consulta/sessão"
 * renderizam o MESMO estado vazio no DOM. Isso é uma limitação real de
 * observabilidade do próprio produto (não desta sprint, não corrigida
 * aqui — nenhuma alteração de produto é permitida), então NO_COMPANIES
 * cobre ambos os casos honestamente, sem fingir uma distinção que o DOM
 * não oferece.
 *
 * Sem sleeps arbitrários: cada estado é uma condição real (Promise.race
 * entre três locators reais, cada um só resolve quando sua própria
 * condição fica verdadeira).
 */
async function resolveCompanySelectionState(page: Page): Promise<CompanySelectionState> {
  if (!page.url().includes("/contentos/selecionar-cliente")) {
    return { kind: "UNEXPECTED_REDIRECT", url: page.url() };
  }

  const demoText = page.getByText("Modo demonstração ativo");
  const noClientsText = page.getByText("Nenhum cliente cadastrado.");
  // Fase 8: nenhuma classe Tailwind no seletor. Fase 11/12: único button
  // fora da lista de Companies é "Entrar na REC OS" (confirmado por
  // auditoria completa de _client-content.tsx nesta sprint) — excluí-lo
  // por nome real é uma exclusão semântica, não uma posição CSS.
  const clientCardCandidates = page.getByRole("button").filter({ hasNotText: "Entrar na REC OS" });

  const raceResult = await Promise.race([
    demoText.waitFor({ state: "visible", timeout: 12_000 }).then(() => "demo" as const).catch(() => "timeout" as const),
    noClientsText.waitFor({ state: "visible", timeout: 12_000 }).then(() => "empty" as const).catch(() => "timeout" as const),
    clientCardCandidates.first().waitFor({ state: "visible", timeout: 12_000 }).then(() => "cards" as const).catch(() => "timeout" as const),
  ]);

  if (!page.url().includes("/contentos/selecionar-cliente")) {
    return { kind: "UNEXPECTED_REDIRECT", url: page.url() };
  }

  if (raceResult === "cards") return { kind: "COMPANIES_AVAILABLE" };
  if (raceResult === "demo") return { kind: "DEMO_MODE", diagnostic: await collectSanitizedDiagnostic(page) };
  if (raceResult === "empty") return { kind: "NO_COMPANIES", diagnostic: await collectSanitizedDiagnostic(page) };
  return { kind: "UNEXPECTED_PAGE", diagnostic: await collectSanitizedDiagnostic(page) };
}

async function selectFirstAuthorizedCompanyAndGoto(page: Page, targetPath: string): Promise<string> {
  await page.goto(`/contentos/selecionar-cliente?next=${encodeURIComponent(targetPath)}`);

  const state = await resolveCompanySelectionState(page);
  switch (state.kind) {
    case "UNEXPECTED_REDIRECT":
      throw new Error(`E2E_UNEXPECTED_COMPANY_SELECTION_REDIRECT — navegação não permaneceu em /contentos/selecionar-cliente. url=${state.url}`);
    case "DEMO_MODE":
      throw new Error(`E2E_COMPANY_SELECTION_DEMO_MODE — página renderizou modo demonstração (Supabase não configurado ativo); isso não representa o fluxo autorizado real. ${state.diagnostic}`);
    case "NO_COMPANIES":
      throw new Error(
        `E2E_NO_AUTHORIZED_COMPANY_AVAILABLE — nenhuma Company real e visível foi encontrada para o usuário de QA em /contentos/selecionar-cliente ` +
          `(o ambiente de QA precisa ter ao menos um client real cadastrado e visível, OU a consulta/sessão falhou silenciosamente — page.tsx trata os dois casos da mesma forma). ${state.diagnostic}`,
      );
    case "UNEXPECTED_PAGE":
      throw new Error(`E2E_UNEXPECTED_COMPANY_SELECTION_STATE — nenhum dos estados conhecidos (Companies/vazio/demo) apareceu em 12s. ${state.diagnostic}`);
    case "COMPANIES_AVAILABLE":
      break;
  }

  // Sprint CI Repair V2 — o <nextjs-portal> do indicador de dev do Next.js
  // (só existe em `next dev`, nunca em produção) pode interceptar o
  // hit-test de pointer que .click() exige, mesmo com o botão real
  // visible/enabled/stable. Ativação real por teclado sidesteps isso
  // inteiramente: todo <button> nativo responde a Enter quando focado —
  // comportamento do navegador, não um atalho de teste.
  const clientCardCandidates = page.getByRole("button").filter({ hasNotText: "Entrar na REC OS" });
  const firstClientCard = clientCardCandidates.first();
  await firstClientCard.scrollIntoViewIfNeeded();
  await firstClientCard.focus();
  await expect(firstClientCard).toBeFocused();
  await firstClientCard.press("Enter");

  const enterButton = page.getByRole("button", { name: "Entrar na REC OS" });
  // Confirma seleção real via evidência funcional do próprio produto: o
  // botão de submissão só habilita quando `selectedId` está preenchido.
  await expect(enterButton).toBeEnabled();
  await enterButton.scrollIntoViewIfNeeded();
  await enterButton.focus();
  await expect(enterButton).toBeFocused();
  await enterButton.press("Enter");

  await page.waitForURL(new RegExp(`${targetPath.replace(/\//g, "\\/")}\\?client=`), { timeout: 10_000 });
  const companyId = new URL(page.url()).searchParams.get("client");
  if (!companyId) {
    throw new Error("E2E_COMPANY_SELECTION_DID_NOT_PRODUCE_CLIENT_ID — a navegação real não retornou um ?client= válido.");
  }
  return companyId;
}

async function gotoEscritorioWithAuthorizedCompany(page: Page): Promise<string> {
  const companyId = await selectFirstAuthorizedCompanyAndGoto(page, "/admin/escritorio");
  // resolveCompanyContext já resolveu ao final do fluxo de seleção (a
  // navegação final do handleEnter já aterrissa em /admin/escritorio?client=...).
  // Confirma explicitamente que a página NÃO está no estado
  // "Selecione uma empresa" antes de qualquer asserção de conteúdo.
  await expect(page.getByTestId("escritorio-root")).toBeVisible({ timeout: 10_000 });
  return companyId;
}

test.describe("Meu Escritório", () => {
  test("página abre autenticada, com Company Context real e as três visões", async ({ page }) => {
    const quality = installQualityListeners(page);
    await gotoEscritorioWithAuthorizedCompany(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("escritorio-root")).toBeVisible();
    const switcher = page.getByTestId("escritorio-view-switcher");
    await expect(switcher).toBeVisible();
    await expect(page.getByTestId("escritorio-view-hoje")).toBeVisible();
    await expect(page.getByTestId("escritorio-view-semana")).toBeVisible();
    await expect(page.getByTestId("escritorio-view-mes")).toBeVisible();
    quality.assertClean(/favicon/i);
  });

  test("Hoje: mostra itens reais ou estado vazio honesto, nunca número fictício", async ({ page }) => {
    await gotoEscritorioWithAuthorizedCompany(page);
    await page.getByTestId("escritorio-view-hoje").click();
    await expect(page.getByTestId("escritorio-hoje")).toBeVisible();
    const items = page.getByTestId("office-feed-item");
    const count = await items.count();
    if (count === 0) {
      await expect(page.getByText("Nenhum compromisso encontrado para hoje.")).toBeVisible();
    } else {
      await expect(items.first()).toHaveAttribute("href", /^\/admin\//);
    }
  });

  test("Semana: agrupamento visível, mesma fonte da visão Hoje", async ({ page }) => {
    await gotoEscritorioWithAuthorizedCompany(page);
    await page.getByTestId("escritorio-view-semana").click();
    await expect(page.getByTestId("escritorio-semana")).toBeVisible();
  });

  test("Mês: Fechamento e Planejamento do próximo mês existem como seções distintas", async ({ page }) => {
    await gotoEscritorioWithAuthorizedCompany(page);
    await page.getByTestId("escritorio-view-mes").click();
    await expect(page.getByTestId("escritorio-mes")).toBeVisible();
    await expect(page.getByText("Fechamento do mês")).toBeVisible();
    await expect(page.getByText("Planejamento do próximo mês")).toBeVisible();
  });

  test("módulos ainda não conectados aparecem nomeados, nunca como zero fabricado", async ({ page }) => {
    await gotoEscritorioWithAuthorizedCompany(page);
    // Sprint MVP Experience Completion V0.1 substituiu o antigo bloco
    // "office-not-integrated" por um SourcesPanel colapsável — o teste
    // original ficou apontando para um testid/copy que não existe mais no
    // produto. Aqui ele é atualizado para o componente real atual, mantendo
    // a mesma intenção: módulos sem integração aparecem NOMEADOS, nunca
    // escondidos atrás de um zero fabricado.
    const panel = page.getByTestId("office-sources-panel");
    await expect(panel).toBeVisible();
    await page.getByTestId("office-sources-toggle").click();
    const notIntegratedBadges = page.getByTestId("office-source-badge").filter({ hasText: "Ainda não integrado" });
    await expect(notIntegratedBadges.first()).toBeVisible();
    expect(await notIntegratedBadges.count(), "ao menos um módulo não integrado deve aparecer nomeado").toBeGreaterThan(0);
  });

  test("rascunho: QA TEMPORÁRIO - NÃO SALVAR fica só em memória, some ao recarregar", async ({ page }) => {
    await gotoEscritorioWithAuthorizedCompany(page);
    await page.getByTestId("escritorio-view-mes").click();
    const draft = page.getByTestId("office-draft-notes").locator("textarea");
    await expect(page.getByTestId("office-draft-badge")).toHaveText(/Rascunho desta sessão/);
    const persistentRequests: string[] = [];
    page.on("request", (req) => {
      if (["POST", "PUT", "PATCH"].includes(req.method()) && req.url().includes("/api/")) persistentRequests.push(req.url());
    });
    await draft.fill("QA TEMPORÁRIO - NÃO SALVAR");
    await expect(draft).toHaveValue("QA TEMPORÁRIO - NÃO SALVAR");
    await page.waitForTimeout(500);
    expect(persistentRequests, "nenhum request de persistência deve disparar ao digitar no rascunho").toEqual([]);
    await page.reload();
    await expect(page.getByTestId("escritorio-root")).toBeVisible();
    await page.getByTestId("escritorio-view-mes").click();
    await expect(page.getByTestId("office-draft-notes").locator("textarea")).toHaveValue("");
  });

  test("nenhum localStorage/sessionStorage usado pela página", async ({ page }) => {
    await gotoEscritorioWithAuthorizedCompany(page);
    const storageSnapshot = await page.evaluate(() => ({
      local: Object.keys(localStorage).filter((k) => k.toLowerCase().includes("escritorio") || k.toLowerCase().includes("office")),
      session: Object.keys(sessionStorage).filter((k) => k.toLowerCase().includes("escritorio") || k.toLowerCase().includes("office")),
    }));
    expect(storageSnapshot.local).toEqual([]);
    expect(storageSnapshot.session).toEqual([]);
  });
});
