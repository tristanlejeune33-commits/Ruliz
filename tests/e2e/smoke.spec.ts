import { test, expect } from "@playwright/test";

/**
 * SMOKE TESTS — Vérifie que toutes les routes publiques répondent en 200.
 * Pas de fonctionnalité testée, juste "ça boot pas en erreur".
 */

test.describe("Smoke — routes publiques", () => {
  const PUBLIC_ROUTES = [
    { path: "/", name: "Landing" },
    { path: "/pricing", name: "Pricing" },
    { path: "/login", name: "Login" },
    { path: "/signup", name: "Signup" },
    { path: "/forgot-password", name: "Forgot password" },
    { path: "/legal/mentions-legales", name: "Mentions légales" },
    { path: "/legal/politique-confidentialite", name: "Politique de confidentialité" },
  ];

  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path}) répond en 200`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status(), `${route.path} doit retourner 200`).toBe(200);
      // Vérifie que la page rend du HTML (pas une erreur en plain text)
      const title = await page.title();
      expect(title, `${route.path} doit avoir un title`).toBeTruthy();
      expect(title.length).toBeGreaterThan(3);
    });
  }
});

test.describe("Smoke — API publiques", () => {
  test("API /api/health retourne 200", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("ok");
  });

  test("API /api/inngest GET répond (sans crash)", async ({ request }) => {
    const res = await request.get("/api/inngest");
    // Inngest peut retourner :
    //   - 200 si introspection autorisée
    //   - 401 si signing key requis et absent (cas par défaut en prod)
    //   - 405 si la version n'accepte pas GET
    // L'important = ne pas crasher (500).
    expect([200, 401, 405]).toContain(res.status());
  });
});

test.describe("Smoke — sécurité headers", () => {
  test("CSP headers présents sur la landing", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};

    // Headers de sécurité critiques
    expect(
      headers["content-security-policy"] || headers["x-content-security-policy"],
      "CSP doit être défini",
    ).toBeTruthy();

    expect(headers["x-frame-options"] || headers["content-security-policy"]).toBeTruthy();
  });

  test("HTTPS forcé (pas de mixed content)", async ({ page }) => {
    const response = await page.goto("/");
    const url = response?.url() ?? "";
    expect(url.startsWith("https://"), "L'URL doit être en HTTPS").toBe(true);
  });
});

test.describe("Smoke — 404 handling", () => {
  test("Route inexistante retourne 404 avec page propre", async ({ page }) => {
    const response = await page.goto("/route-qui-existe-pas-12345");
    expect(response?.status()).toBe(404);
    // Vérifie qu'on a une page 404 stylée (pas juste "Not Found")
    const body = await page.content();
    expect(body.length).toBeGreaterThan(500);
  });

  test("Carte inexistante retourne 404", async ({ page }) => {
    const response = await page.goto("/carte/999999");
    expect(response?.status()).toBe(404);
  });

  test("Preview avec token invalide retourne 404", async ({ page }) => {
    const response = await page.goto("/preview/invalid-token-xxx");
    expect(response?.status()).toBe(404);
  });
});
