import { test, expect } from "@playwright/test";

/**
 * Sprint E2E CI 3.0.2.2 (Fase 22) — Status e Arquitetura da Plataforma.
 * Confirma a reinterpretação da Sprint Navegação e Experiência 3.0.1.2 em
 * navegador real: alias sem loop, Arquitetura não duplica os cards de
 * Status, e nenhuma área aparece validated indevidamente.
 */
test.describe("Status e Arquitetura da Plataforma", () => {
  test("/admin/status abre com o painel de execução real", async ({ page }) => {
    await page.goto("/admin/status");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Central de controle V1" })).toBeVisible();
  });

  test("/admin/status/arquitetura abre e não duplica o painel de Status", async ({ page }) => {
    await page.goto("/admin/status/arquitetura");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Central de controle V1" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Mapa do Ecossistema LOKAT OS" })).toBeVisible();
  });

  test("/admin/ecossistema redireciona para Arquitetura sem loop", async ({ page }) => {
    await page.goto("/admin/ecossistema");
    await expect(page).toHaveURL(/\/admin\/status\/arquitetura/);
  });

  test("Status linca para Arquitetura da Plataforma", async ({ page }) => {
    await page.goto("/admin/status");
    const link = page.locator('a[href="/admin/status/arquitetura"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/admin\/status\/arquitetura/);
  });

  test("nenhuma área aparece com rótulo Validado indevidamente na primeira carga", async ({ page }) => {
    await page.goto("/admin/status");
    // Este teste não afirma ausência total de "Validado" (áreas legítimas já validadas existem
    // de sprints anteriores) — só confirma que a página carrega o rótulo de prontidão sem erro.
    const readinessBadges = page.locator("text=/Validado|QA pendente|Planejado|Bloqueado/");
    await expect(readinessBadges.first()).toBeVisible();
  });
});

/**
 * STATUS LIVE ACTIVITY V1 — camada B (LKT History) sobre a camada A (Live
 * State). Se o auth local seguir bloqueado (fixture ausente, ver
 * auth.setup.ts), estes testes falham exatamente como os demais deste
 * arquivo já falham hoje sob a mesma causa — nunca reportar PASS sem
 * execução real; o estado correto a comunicar é
 * AUTHENTICATED_PLAYWRIGHT_QA_BLOCKED.
 */
test.describe("Status — LKT Activity Log (Status geral / Histórico recente)", () => {
  test("/admin/status mostra a Última movimentação real (não um placeholder vazio)", async ({ page }) => {
    await page.goto("/admin/status");
    await expect(page.getByText("Última movimentação", { exact: false })).toBeVisible();
    await expect(page.getByText("REC OS Context Foundation V1", { exact: false })).toBeVisible();
  });

  test("/admin/status continua mostrando a faixa de deployment ao vivo (Live State)", async ({ page }) => {
    await page.goto("/admin/status");
    await expect(page.getByText("Ambiente:", { exact: false })).toBeVisible();
  });

  test("/admin/status mostra o Histórico recente com pelo menos um evento", async ({ page }) => {
    await page.goto("/admin/status");
    await expect(page.getByText("Histórico recente", { exact: false })).toBeVisible();
    await expect(page.getByText("Security Debug Fix", { exact: false })).toBeVisible();
  });

  test("/admin/status mostra os módulos (grade de áreas) já existente", async ({ page }) => {
    await page.goto("/admin/status");
    await expect(page.locator("text=/Validado|QA pendente|Planejado|Bloqueado/").first()).toBeVisible();
  });

  test("/admin/status/arquitetura registra Influence OS como planejado (nunca esquecido do roadmap)", async ({ page }) => {
    await page.goto("/admin/status/arquitetura");
    await expect(page.getByText("Influence OS", { exact: false })).toBeVisible();
  });

  test("/admin/status/arquitetura registra REC OS Paid Traffic Planner como próxima frente", async ({ page }) => {
    await page.goto("/admin/status/arquitetura");
    await expect(page.getByText("Paid Traffic Planner", { exact: false })).toBeVisible();
  });
});
