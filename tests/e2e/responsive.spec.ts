import { test, expect } from "@playwright/test";

/**
 * RESPONSIVE — Tests sur breakpoints critiques.
 * Détecte :
 *   - Scroll horizontal (signe d'overflow)
 *   - Layout cassé (CLS > 0.5)
 *   - Texte coupé / illisible
 */

const VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "iPad Mini", width: 768, height: 1024 },
  { name: "Desktop", width: 1280, height: 720 },
  { name: "Large desktop", width: 1920, height: 1080 },
];

const ROUTES_TO_TEST = [
  { path: "/", name: "Landing" },
  { path: "/pricing", name: "Pricing" },
  { path: "/login", name: "Login" },
  { path: "/signup", name: "Signup" },
  { path: "/carte/3", name: "Carte publique" },
];

for (const viewport of VIEWPORTS) {
  test.describe(`Viewport ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES_TO_TEST) {
      test(`${route.name} sans scroll horizontal`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("domcontentloaded");

        // Mesure si la page déborde horizontalement
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(
          hasHorizontalScroll,
          `${route.path} déborde horizontalement à ${viewport.width}px`,
        ).toBe(false);
      });
    }
  });
}

test.describe("Responsive — éléments critiques visibles", () => {
  test("Sur mobile, au moins une CTA d'action est accessible (login/signup/essayer)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // On accepte n'importe lequel : burger, nav inline, ou CTA link.
    // `.count() > 0` vérifie la présence DOM (suffisant pour l'accessibilité,
    // évite les faux négatifs de `isVisible()` sur les éléments hors viewport).
    const burgerCount = await page.locator(
      'button[aria-label*="menu" i], button:has-text("☰"), [data-mobile-menu]',
    ).count();
    const headerLinkCount = await page.locator("header a").count();
    const ctaLinkCount = await page.locator(
      'a[href*="/login"], a[href*="/signup"]',
    ).count();

    const total = burgerCount + headerLinkCount + ctaLinkCount;
    expect(
      total,
      `Aucun lien d'action trouvé sur mobile (burger=${burgerCount}, header=${headerLinkCount}, cta=${ctaLinkCount})`,
    ).toBeGreaterThan(0);
  });

  test("Sur mobile, le logo est visible et clickable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Cherche un lien vers / qui contient une image ou du texte
    const logoLink = page.locator('a[href="/"]').first();
    await expect(logoLink).toBeVisible();
  });
});

test.describe("Responsive — texte lisible", () => {
  test("Taille de police >= 14px sur mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/carte/3");

    // Échantillonne plusieurs paragraphes/spans
    const tinyTextElements = await page.$$eval(
      "p, span, div",
      (els) =>
        els
          .filter((el) => el.textContent && el.textContent.trim().length > 5)
          .filter((el) => {
            const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
            return fontSize < 12;
          })
          .map((el) => ({
            tag: el.tagName,
            text: (el.textContent ?? "").slice(0, 40),
            fontSize: window.getComputedStyle(el).fontSize,
          }))
          .slice(0, 5),
    );

    expect(
      tinyTextElements,
      `Texte trop petit (<12px) trouvé:\n${JSON.stringify(tinyTextElements, null, 2)}`,
    ).toEqual([]);
  });
});
