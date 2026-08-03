import { test, expect } from "@playwright/test";
import { findOverflow, assertNoOverflow } from "./helpers/overflow";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 23) — helper de overflow em todas as rotas
 * autenticadas relevantes, nos 5 projetos (desktop-chrome, mobile-390/393/430,
 * tablet-768 — ver playwright.config.ts).
 */
const ROUTES = [
  "/admin/dashboard",
  "/admin/calendario",
  "/admin/contentos",
  "/admin/contentos/criar",
  "/admin/contentos/producao",
  "/admin/contentos/roadmap",
  "/admin/contentos/mapa-cliente",
  "/admin/escritorio",
  "/admin/leads",
  "/admin/meu-negocio",
  "/admin/status",
  "/admin/status/arquitetura",
  "/admin/relatorios",
  "/admin/visualizar",
];

test.describe("Overflow estrutural", () => {
  for (const route of ROUTES) {
    test(`${route} não tem overflow horizontal estrutural`, async ({ page }) => {
      const response = await page.goto(route);
      test.skip(page.url().includes("/login"), `${route} redirecionou para login para esta conta/superfície`);
      expect(response?.status(), `${route} não deve responder 5xx`).toBeLessThan(500);

      const report = await findOverflow(page);
      assertNoOverflow(report, route);
    });
  }
});
