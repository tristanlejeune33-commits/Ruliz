import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration Playwright pour Ruliz E2E.
 *
 * Cibles testées :
 *   - Smoke routes publiques (landing, pricing, auth pages, carte)
 *   - Parcours utilisateur (signup, login, navigation dashboard)
 *   - Tests visuels (screenshots de régression)
 *   - Responsive (mobile / tablet / desktop)
 *   - Accessibilité (axe-core)
 *
 * Variables d'environnement :
 *   - BASE_URL : URL à tester (défaut https://ruliz-panel.fr)
 *   - CARTE_IDS : IDs cartes publiques à tester (défaut "3,4")
 *   - CI : true en GitHub Actions (active retry + screenshots only on failure)
 *
 * Usage :
 *   pnpm test:e2e                  # tous les tests
 *   pnpm test:e2e:ui               # interface graphique
 *   pnpm test:e2e:headed           # voir le navigateur
 *   pnpm test:e2e -- smoke         # juste smoke tests
 *   pnpm test:e2e:report           # ouvrir le rapport HTML
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Timeout par test (60s suffit pour les pages Next.js SSR)
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  // Fail vite si un test foire
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    process.env.CI ? ["github"] : ["null"],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "https://ruliz-panel.fr",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
    // User-agent identifiable pour pas se confondre avec un vrai visiteur
    userAgent:
      "Mozilla/5.0 RulizE2E/1.0 (+https://ruliz-panel.fr/bot) Playwright",
    // Locale FR pour matcher les textes
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },

  projects: [
    // ─── Tests Desktop (par défaut) ─────────────────────────────────────
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },

    // ─── Tests Mobile ──────────────────────────────────────────────────
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone 14"],
      },
      testMatch: /carte-publique|responsive|visual\.spec\.ts/,
    },

    // ─── Tests Tablet ──────────────────────────────────────────────────
    {
      name: "chromium-tablet",
      use: {
        ...devices["iPad Mini"],
      },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
});
