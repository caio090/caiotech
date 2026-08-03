import { test, expect } from "@playwright/test";

/**
 * Sprint QA Local 3.0.2 — cobertura que NÃO depende de autenticação
 * (bloqueada nesta sprint por falta de credencial de QA — ver
 * tests/e2e/auth.setup.ts e docs/qa/navigation-office-crm-local-browser-qa.md).
 * Roda sem storageState, contra o próprio servidor de QA em
 * http://127.0.0.1:3100 — nunca Production.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("navegação não autenticada", () => {
  test("raiz responde 200 com viewport meta e sem erro de console", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);

    expect(consoleErrors.filter((e) => !/favicon/i.test(e))).toEqual([]);
  });

  for (const route of ["/admin/calendario", "/admin/contentos", "/admin/escritorio", "/admin/leads", "/admin/crm", "/admin/status/arquitetura", "/admin/ecossistema"]) {
    test(`${route} sem sessão vai para /login (nunca 500, nunca abre a página protegida)`, async ({ page }) => {
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
