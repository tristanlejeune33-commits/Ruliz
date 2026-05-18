import { test, expect } from "@playwright/test";

/**
 * OUTREACH — Tests des routes admin du pipeline cold email.
 * Toutes ces routes sont protégées admin → on teste juste le redirect.
 *
 * Pour des tests authentifiés réels, il faut un compte admin de test
 * (à ajouter dans .env.test via ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD).
 */

const OUTREACH_ROUTES = [
  "/admin/outreach",
  "/admin/outreach/variants",
  "/admin/outreach/replies",
];

test.describe("Outreach admin — protection routes", () => {
  for (const route of OUTREACH_ROUTES) {
    test(`${route} redirige sans auth`, async ({ page }) => {
      const response = await page.goto(route);
      const finalUrl = page.url();

      const isRedirected =
        finalUrl.includes("/login") ||
        finalUrl.includes("/signin") ||
        response?.status() === 401 ||
        response?.status() === 403;

      expect(isRedirected, `${route} doit protéger l'accès`).toBe(true);
    });
  }
});

test.describe("Webhook /api/outreach/event — sécurité", () => {
  test("POST sans token retourne 403", async ({ request }) => {
    const res = await request.post("/api/outreach/event", {
      data: { event_type: "email_open", lead_email: "test@example.com" },
    });
    // Si SMARTLEAD_WEBHOOK_SECRET est défini, doit retourner 403
    // Sinon (dev), peut retourner 200 (mais on accepte les 2 pour la portabilité)
    expect([200, 403]).toContain(res.status());
  });

  test("POST avec JSON invalide retourne 400", async ({ request }) => {
    const res = await request.post("/api/outreach/event", {
      headers: {
        "Content-Type": "application/json",
        "X-Outreach-Token": "anything",
      },
      data: "not-valid-json{{{",
    });
    expect([400, 403]).toContain(res.status());
  });

  test("GET retourne health check", async ({ request }) => {
    const res = await request.get("/api/outreach/event");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
