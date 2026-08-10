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
async function selectFirstAuthorizedCompanyAndGoto(page: Page, targetPath: string): Promise<string> {
  await page.goto(`/contentos/selecionar-cliente?next=${encodeURIComponent(targetPath)}`);

  const noClientsMessage = page.getByText("Nenhum cliente cadastrado.");
  if (await noClientsMessage.isVisible().catch(() => false)) {
    throw new Error(
      "E2E_NO_AUTHORIZED_COMPANY_AVAILABLE — nenhuma Company real e visível foi encontrada para o usuário de QA em /contentos/selecionar-cliente. " +
        "O ambiente de QA precisa ter ao menos um client real cadastrado para estes testes.",
    );
  }

  // Sprint CI Repair V2 — o <nextjs-portal> do indicador de dev do Next.js
  // (só existe em `next dev`, nunca em produção) intercepta o hit-test de
  // pointer que .click() exige, mesmo com o botão real visible/enabled/
  // stable. Em vez de forçar o clique, usa-se ativação real por teclado:
  // todo <button> nativo responde a Enter quando focado — comportamento do
  // navegador, não um atalho de teste. Isso nunca depende de onde o portal
  // está desenhado na tela. Escopo pelo container real dos cards (nenhum
  // data-testid existe hoje nem nos cards nem no campo de busca).
  const clientCardsContainer = page.locator("div.space-y-2.mb-6");
  const firstClientCard = clientCardsContainer.locator("button").first();
  await expect(firstClientCard, "deve existir ao menos um card de cliente real e focável").toBeVisible({ timeout: 10_000 });
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
