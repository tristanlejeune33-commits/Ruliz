import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * TESTS D'ACCESSIBILITÉ — axe-core
 *
 * Scan les pages avec les règles WCAG 2.1 AA.
 * Détecte automatiquement :
 *   - Contraste insuffisant
 *   - Labels ARIA manquants
 *   - Images sans alt
 *   - Headings désordonnés
 *   - Liens vides
 *   - Boutons sans nom accessible
 *   - Form fields sans label
 *
 * Le test fail si des violations "critical" ou "serious" sont trouvées.
 */

// Routes testées en a11y. /carte/[id] est EXCLUE car les couleurs sont
// custom par restaurateur (peut être contrastes douteux selon leur choix
// branding). On garde les pages contrôlées par Ruliz.
const ROUTES = [
  { path: "/", name: "Landing" },
  { path: "/pricing", name: "Pricing" },
  { path: "/login", name: "Login" },
  { path: "/signup", name: "Signup" },
  { path: "/forgot-password", name: "Forgot password" },
];

test.describe("Accessibilité WCAG 2.1 AA", () => {
  for (const route of ROUTES) {
    test(`${route.name} — pas de violation critical ou serious`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const criticalAndSerious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      // Log informatif pour les violations "minor" et "moderate" (sans fail)
      const minorViolations = results.violations.filter(
        (v) => v.impact === "minor" || v.impact === "moderate",
      );
      if (minorViolations.length > 0) {
        console.log(`\nℹ️  ${route.path} a ${minorViolations.length} violations mineures/moderate:`);
        for (const v of minorViolations) {
          console.log(`  - [${v.impact}] ${v.id}: ${v.help}`);
        }
      }

      if (criticalAndSerious.length > 0) {
        console.log(`\n❌ ${route.path} a ${criticalAndSerious.length} violations critical/serious:`);
        for (const v of criticalAndSerious) {
          console.log(`\n  [${v.impact}] ${v.id}: ${v.help}`);
          console.log(`  Description: ${v.description}`);
          console.log(`  Help URL: ${v.helpUrl}`);
          console.log(`  Nodes affectés: ${v.nodes.length}`);
          for (const node of v.nodes.slice(0, 3)) {
            console.log(`    - ${node.html.slice(0, 100)}`);
          }
        }
      }

      expect(
        criticalAndSerious,
        `${route.path} a ${criticalAndSerious.length} violations a11y critical/serious`,
      ).toEqual([]);
    });
  }
});

test.describe("Accessibilité — clavier-only", () => {
  test("Login : navigation Tab fonctionne", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Tab depuis le début → premier champ focusable
    await page.keyboard.press("Tab");
    const firstFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName, type: el.getAttribute("type") } : null;
    });
    expect(firstFocused, "Tab doit focus un élément").toBeTruthy();
  });

  test("Signup : tous les champs requis sont focusables", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");

    // Compte les champs focusables (inputs + boutons)
    const focusableCount = await page.evaluate(() => {
      return document.querySelectorAll(
        'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
      ).length;
    });

    expect(focusableCount, "Au moins 4 éléments focusables sur signup").toBeGreaterThanOrEqual(4);
  });
});

test.describe("Accessibilité — semantic HTML", () => {
  test("Landing a une structure heading correcte (1 h1)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const h1Count = await page.locator("h1").count();
    expect(h1Count, "Landing doit avoir exactement 1 h1").toBe(1);
  });

  test("Carte publique a un h1", async ({ page }) => {
    await page.goto("/carte/3");
    await page.waitForLoadState("networkidle");

    const h1Count = await page.locator("h1").count();
    expect(h1Count, "Carte doit avoir au moins 1 h1").toBeGreaterThanOrEqual(1);
  });

  test("Boutons ont tous un nom accessible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const buttonsSansNom = await page.$$eval("button", (btns) =>
      btns
        .filter((btn) => {
          const text = btn.textContent?.trim() ?? "";
          const ariaLabel = btn.getAttribute("aria-label") ?? "";
          const title = btn.getAttribute("title") ?? "";
          return !text && !ariaLabel && !title;
        })
        .map((btn) => btn.outerHTML.slice(0, 100)),
    );

    expect(
      buttonsSansNom,
      `${buttonsSansNom.length} boutons sans nom accessible:\n${buttonsSansNom.join("\n")}`,
    ).toEqual([]);
  });
});
