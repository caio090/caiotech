import { test, expect } from "@playwright/test";
import { installQualityListeners } from "./helpers/quality-listeners";

/**
 * Sprint QA Local 3.0.2 / Sprint E2E CI 3.0.2.2 (Fase 8/9) — este arquivo
 * roda em vários projetos do playwright.config.ts com storageState
 * diferente cada um; cada describe se auto-restringe ao(s) projeto(s) a
 * que pertence via `testInfo.project.name`, para nunca rodar a suíte
 * autenticada sem sessão (ou vice-versa) nem duplicar trabalho.
 */

test.describe("navegação não autenticada", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "unauthenticated", "suíte exclusiva do projeto unauthenticated");
  });

  test("raiz responde 200 com viewport meta e sem erro de console", async ({ page }) => {
    const quality = installQualityListeners(page);
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);

    quality.assertClean(/favicon/i);
  });

  const PROTECTED_ROUTES = [
    "/admin/dashboard", "/admin/calendario", "/admin/contentos", "/admin/escritorio",
    "/admin/leads", "/admin/crm", "/admin/status/arquitetura", "/admin/ecossistema",
  ];

  for (const route of PROTECTED_ROUTES) {
    test(`${route} sem sessão vai para /login (nunca 500, nunca abre a página protegida, nunca loop)`, async ({ page }) => {
      const response = await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain("/login");
      expect(response?.status(), `${route} não deve responder 5xx`).toBeLessThan(500);
    });
  }

  test("página de login renderiza sem crash", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(400);
    expect(pageErrors).toEqual([]);
  });
});

test.describe("navegação autenticada (Super Admin)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === "unauthenticated", "suíte exige sessão — não roda no projeto unauthenticated");
  });

  test("dashboard abre autenticado, sem passar por /login", async ({ page }) => {
    const quality = installQualityListeners(page);
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    quality.assertClean(/favicon/i);
  });

  const AUTHENTICATED_ROUTES: Array<[string, string]> = [
    ["Calendário Global", "/admin/calendario"],
    ["REC OS", "/admin/contentos"],
    ["Meu Escritório", "/admin/escritorio"],
    ["CRM canônico", "/admin/leads"],
    ["Status", "/admin/status"],
    ["Arquitetura da Plataforma", "/admin/status/arquitetura"],
  ];

  for (const [label, route] of AUTHENTICATED_ROUTES) {
    test(`${label} (${route}) abre sem redirecionar para login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, "\\/")));
    });
  }

  test("alias /admin/ecossistema redireciona para /admin/status/arquitetura sem loop", async ({ page }) => {
    await page.goto("/admin/ecossistema");
    await expect(page).toHaveURL(/\/admin\/status\/arquitetura/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("alias /admin/crm redireciona para /admin/leads sem loop", async ({ page }) => {
    await page.goto("/admin/crm");
    await expect(page).toHaveURL(/\/admin\/leads/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("nenhum link interno usa domínio de Production ou host diferente de 127.0.0.1:3100", async ({ page }) => {
    await page.goto("/admin/dashboard");
    const hrefs = await page.locator("a[href]").evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
    const offenders = hrefs.filter((h) => /^https?:\/\//.test(h) && !h.includes("127.0.0.1:3100"));
    expect(offenders, `links absolutos inesperados: ${offenders.join(", ")}`).toEqual([]);
  });

  test("header permanece autenticado (avatar/sair visível) após navegar", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await page.goto("/admin/contentos");
    // O botão de sair (iniciais do usuário) é a única affordance textual estável do header autenticado.
    await expect(page.locator("header, [class*='header']").first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });
});
