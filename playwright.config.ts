import { defineConfig, devices } from "@playwright/test";

/**
 * Sprint QA Local 3.0.2 — Playwright autenticado contra o ambiente de QA
 * local já em execução (nunca contra Production). Nenhum webServer
 * automático é configurado de propósito: o servidor em
 * http://127.0.0.1:3100 já existe (npm run dev:qa) e deve continuar vivo
 * depois do QA — deixar o Playwright derrubá-lo ao final seria destrutivo.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: ".tmp/playwright/test-results",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: ".tmp/playwright/report", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "auth-setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "unauthenticated",
      testMatch: /navigation-auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "desktop-chrome",
      testIgnore: [/auth\.setup\.ts/, /navigation-auth\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 }, storageState: ".tmp/playwright/auth/super-admin.json" },
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile-390",
      testIgnore: [/auth\.setup\.ts/, /navigation-auth\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: ".tmp/playwright/auth/super-admin.json" },
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile-393",
      testIgnore: [/auth\.setup\.ts/, /navigation-auth\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, storageState: ".tmp/playwright/auth/super-admin.json" },
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile-430",
      testIgnore: [/auth\.setup\.ts/, /navigation-auth\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, storageState: ".tmp/playwright/auth/super-admin.json" },
      dependencies: ["auth-setup"],
    },
    {
      name: "tablet-768",
      testIgnore: [/auth\.setup\.ts/, /navigation-auth\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 768, height: 1024 }, storageState: ".tmp/playwright/auth/super-admin.json" },
      dependencies: ["auth-setup"],
    },
  ],
});
