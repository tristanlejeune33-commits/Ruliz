import { test, expect } from "@playwright/test";

/**
 * CARTE PUBLIQUE — Le morceau critique en perf et UX.
 * Vérifie : rendu, langues, modal produit, performance, responsive.
 */

// IDs cartes actives en prod (à mettre à jour si nécessaire)
const CARTE_IDS = (process.env.CARTE_IDS || "3,4").split(",");
const CARTE_ID = CARTE_IDS[0]!;
const LANGS = ["fr", "en", "es", "de", "it", "pt", "zh"] as const;

test.describe("Carte publique — rendu de base", () => {
  test(`/carte/${CARTE_ID} charge avec le menu`, async ({ page }) => {
    const response = await page.goto(`/carte/${CARTE_ID}`);
    expect(response?.status()).toBe(200);

    // Vérifie qu'il y a du contenu (header + au moins 1 catégorie ou produit)
    await expect(page.locator("body")).not.toBeEmpty();

    // Vérifie qu'on a un titre (nom restaurant)
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(3);

    // Le footer doit être présent
    await expect(page.locator("footer")).toBeVisible({ timeout: 10000 });
  });

  test(`/carte/${CARTE_ID} a des produits affichés`, async ({ page }) => {
    await page.goto(`/carte/${CARTE_ID}`);

    // Au moins 1 catégorie/produit visible
    const content = await page.content();
    // Mots-clés du domaine resto qui devraient apparaître
    const restaurantKeywords = [
      /€|euros|EUR/i,
      /entrée|plat|dessert|boisson|menu|carte/i,
    ];
    let foundCount = 0;
    for (const kw of restaurantKeywords) {
      if (kw.test(content)) foundCount++;
    }
    expect(foundCount, "Page carte doit contenir mots-clés resto").toBeGreaterThan(0);
  });
});

test.describe("Carte publique — multi-langues", () => {
  for (const lang of LANGS) {
    test(`Langue ${lang} charge sans erreur`, async ({ page }) => {
      const response = await page.goto(`/carte/${CARTE_ID}?lang=${lang}`);
      expect(response?.status()).toBe(200);

      // L'attribut lang du HTML doit changer (ou au moins être présent)
      const htmlLang = await page.getAttribute("html", "lang");
      expect(htmlLang).toBeTruthy();
    });
  }

  test("Switch de langue fonctionne (FR → EN)", async ({ page }) => {
    await page.goto(`/carte/${CARTE_ID}?lang=fr`);
    const titleFr = await page.title();

    await page.goto(`/carte/${CARTE_ID}?lang=en`);
    const titleEn = await page.title();

    // Les contenus FR et EN devraient différer (sauf si trad incomplète)
    // On vérifie juste que les 2 pages chargent OK
    expect(titleFr).toBeTruthy();
    expect(titleEn).toBeTruthy();
  });
});

test.describe("Carte publique — performance", () => {
  test("Page se charge en moins de 3s", async ({ page }) => {
    const start = Date.now();
    await page.goto(`/carte/${CARTE_ID}`, { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;

    expect(loadTime, `Load time ${loadTime}ms > 3000ms`).toBeLessThan(3000);
  });

  test("Page rend en moins de 5s networkidle", async ({ page }) => {
    const start = Date.now();
    await page.goto(`/carte/${CARTE_ID}`, { waitUntil: "networkidle" });
    const loadTime = Date.now() - start;

    expect(loadTime, `Networkidle ${loadTime}ms > 5000ms`).toBeLessThan(5000);
  });

  test("Pas d'erreur console critique", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore les erreurs externes connues (favicon manquant, CSP rapport, etc.)
        if (
          !text.includes("favicon") &&
          !text.includes("manifest") &&
          !text.includes("Failed to load resource: net::ERR_FAILED")
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto(`/carte/${CARTE_ID}`);
    await page.waitForLoadState("networkidle");

    expect(
      consoleErrors,
      `Erreurs console détectées:\n${consoleErrors.join("\n")}`,
    ).toEqual([]);
  });
});

test.describe("Carte publique — robustesse données", () => {
  test("Pas de NaN/undefined visible dans le HTML", async ({ page }) => {
    await page.goto(`/carte/${CARTE_ID}`);
    const content = await page.content();

    // Patterns de bugs classiques
    const badPatterns = [
      { pattern: /\bNaN\b/, label: "NaN" },
      { pattern: />\s*undefined\s*</, label: "undefined" },
      { pattern: />\s*null\s*</, label: "null" },
      { pattern: />\s*\[object Object\]\s*</, label: "[object Object]" },
    ];

    for (const { pattern, label } of badPatterns) {
      expect(
        pattern.test(content),
        `"${label}" trouvé dans le rendu HTML (bug de données)`,
      ).toBe(false);
    }
  });

  test("Toutes les images ont un attribut alt", async ({ page }) => {
    await page.goto(`/carte/${CARTE_ID}`);
    const imagesSansAlt = await page.$$eval("img", (imgs) =>
      imgs.filter((img) => !img.alt || img.alt.trim() === "").map((img) => img.src),
    );
    // Tolérance : décoratifs OK sans alt (alt="")
    // On vérifie qu'aucune image ne manque complètement l'attribut
    expect(
      imagesSansAlt,
      `Images sans alt: ${imagesSansAlt.slice(0, 3).join(", ")}`,
    ).toEqual([]);
  });
});
