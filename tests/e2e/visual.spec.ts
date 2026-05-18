import { test, expect } from "@playwright/test";

/**
 * TESTS VISUELS DE RÉGRESSION
 *
 * Prend des screenshots de référence des pages critiques.
 * Au prochain run, Playwright compare pixel à pixel et alerte si différence.
 *
 * Première exécution :
 *   pnpm test:e2e -- visual --update-snapshots
 *   → Génère les images de référence dans tests/e2e/visual.spec.ts-snapshots/
 *
 * Exécutions suivantes :
 *   pnpm test:e2e -- visual
 *   → Compare avec les références, fail si diff > maxDiffPixels
 */

const ROUTES_TO_SNAPSHOT = [
  { path: "/", name: "landing" },
  { path: "/pricing", name: "pricing" },
  { path: "/login", name: "login" },
  { path: "/signup", name: "signup" },
  { path: "/forgot-password", name: "forgot-password" },
  { path: "/legal/mentions-legales", name: "mentions-legales" },
  { path: "/carte/3", name: "carte-publique" },
];

test.describe("Visual regression", () => {
  for (const route of ROUTES_TO_SNAPSHOT) {
    test(`Screenshot ${route.name}`, async ({ page }) => {
      await page.goto(route.path);
      // Attend que tout soit stable (fonts, images, animations)
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500); // safety net

      // Masque les éléments dynamiques (timestamps, random, etc.)
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"],
          [data-dynamic],
          time,
          .scan-counter {
            visibility: hidden !important;
          }
        `,
      });

      await expect(page).toHaveScreenshot(`${route.name}.png`, {
        fullPage: true,
        // Tolérance : 0.02% des pixels peuvent différer
        // (pour absorber les variations subpixel des fonts)
        maxDiffPixelRatio: 0.02,
        // Animation OFF
        animations: "disabled",
      });
    });
  }
});

test.describe("Visual — états interactifs", () => {
  test("Login form au focus", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').focus();
    await page.waitForTimeout(200);

    await expect(page.locator("form").first()).toHaveScreenshot("login-form-focus.png", {
      animations: "disabled",
    });
  });

  test("Carte publique avec mode dark forcé", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/carte/3");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("carte-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });
  });
});
