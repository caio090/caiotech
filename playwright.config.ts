import { defineConfig, devices } from "@playwright/test";

/**
 * Sprint E2E CI 3.0.2.2 — Playwright autenticado contra o ambiente de QA já
 * em execução (local: http://127.0.0.1:3100 iniciado via `npm run dev:qa`;
 * CI: o mesmo servidor, na mesma porta, iniciado dentro do runner pelo
 * workflow — nunca Vercel, nunca Production). Nenhum `webServer` automático
 * é configurado de propósito: derrubar o servidor local do usuário ao
 * final de uma run local seria destrutivo.
 */
const CI = !!process.env.CI;

const MOBILE_ONLY = [/dashboard-mobile\.spec\.ts/, /crm-mobile\.spec\.ts/];
const AUTH_INFRA = [/auth\.setup\.ts/];

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: ".tmp/playwright/test-results",
  fullyParallel: false,
  forbidOnly: true,
  retries: CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: CI
    ? [["list"], ["json", { outputFile: ".tmp/playwright/report.json" }]]
    : [["list"], ["html", { outputFolder: ".tmp/playwright/report", open: "never" }]],
  use: {
    channel: "chrome",
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: "auth-setup", testMatch: /auth\.setup\.ts/ },
    {
      // Roda só navigation-auth.spec.ts, sem storageState — a própria
      // suíte da descrição autenticada dentro do arquivo se auto-pula
      // quando o nome do projeto não é "unauthenticated" (ver o arquivo).
      name: "unauthenticated",
      testMatch: /navigation-auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "desktop-chrome",
      testIgnore: [...AUTH_INFRA, ...MOBILE_ONLY],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 }, storageState: ".tmp/playwright/auth/super-admin.json" },
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile-390",
      testMatch: [...MOBILE_ONLY, /overflow\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: ".tmp/playwright/auth/super-admin.json" },
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile-393",
      testMatch: [...MOBILE_ONLY, /overflow\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, storageState: ".tmp/playwright/auth/super-admin.json" },
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile-430",
      testMatch: [...MOBILE_ONLY, /overflow\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, storageState: ".tmp/playwright/auth/super-admin.json" },
      dependencies: ["auth-setup"],
    },
    {
      name: "tablet-768",
      testMatch: [/overflow\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 768, height: 1024 }, storageState: ".tmp/playwright/auth/super-admin.json" },
      dependencies: ["auth-setup"],
    },
  ],
});
