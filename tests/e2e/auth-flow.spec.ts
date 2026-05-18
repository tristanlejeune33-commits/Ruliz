import { test, expect } from "@playwright/test";

/**
 * AUTH FLOW — Tests parcours signup/login/forgot.
 * Pas de submit réel (pas créer de comptes pollution prod) :
 * on teste juste l'UI, la validation, et les redirects.
 */

test.describe("Page de connexion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("Affiche les champs email et password", async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("Bouton submit visible et accessible", async ({ page }) => {
    // Cherche un bouton avec texte "Connexion" ou "Se connecter" ou "Login"
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")',
    ).first();
    await expect(submitBtn).toBeVisible();
  });

  test("Lien vers signup présent", async ({ page }) => {
    const signupLink = page.locator('a[href*="signup"], a[href*="inscription"]').first();
    await expect(signupLink).toBeVisible();
  });

  test("Lien forgot password présent", async ({ page }) => {
    const forgotLink = page.locator('a[href*="forgot"], a[href*="oublie"]').first();
    await expect(forgotLink).toBeVisible();
  });

  test("Validation : email invalide bloque submit", async ({ page }) => {
    await page.fill('input[type="email"]', "pasunemail");
    await page.fill('input[type="password"]', "password123");

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Soit message d'erreur visible, soit le formulaire n'a pas soumis (toujours sur /login)
    await page.waitForTimeout(500);
    expect(page.url()).toContain("/login");
  });
});

test.describe("Page d'inscription", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("Affiche les champs requis (prénom, nom, email, password)", async ({ page }) => {
    // Cherche au moins email + password (les autres champs peuvent varier)
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Cherche un champ prénom (par autocomplete ou label)
    const prenomField = page.locator(
      'input[autocomplete="given-name"], input[name*="prenom" i], input[name*="firstname" i]',
    );
    await expect(prenomField).toBeVisible();
  });

  test("Bouton submit présent", async ({ page }) => {
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("compte"), button:has-text("Créer")',
    ).first();
    await expect(submitBtn).toBeVisible();
  });

  test("Lien vers login présent", async ({ page }) => {
    const loginLink = page.locator('a[href*="login"], a[href*="connexion"]').first();
    await expect(loginLink).toBeVisible();
  });

  test("Avec ?prospect=xxx (token invalide) : signup standard affiché", async ({ page }) => {
    // Token invalide → on revient au signup normal (pas d'erreur)
    await page.goto("/signup?prospect=invalid-token-xxx");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe("Page forgot password", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
  });

  test("Affiche un champ email", async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("Bouton submit présent", async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });

  test("Lien retour login", async ({ page }) => {
    const loginLink = page.locator('a[href*="login"]').first();
    await expect(loginLink).toBeVisible();
  });
});

test.describe("Routes protégées (sans auth)", () => {
  const PROTECTED_ROUTES = [
    "/dashboard",
    "/dashboard/menu",
    "/dashboard/restaurant",
    "/dashboard/settings",
    "/admin",
    "/admin/clients",
    "/admin/outreach",
  ];

  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirige vers /login sans auth`, async ({ page }) => {
      const response = await page.goto(route);
      const finalUrl = page.url();

      // Soit redirect vers /login, soit 401/403, soit page de connexion inline
      const isOnLogin =
        finalUrl.includes("/login") || finalUrl.includes("/signin");
      const status = response?.status() ?? 0;
      const isAuthError = status === 401 || status === 403;

      expect(
        isOnLogin || isAuthError,
        `${route} doit rediriger vers login ou renvoyer 401/403, got status=${status} url=${finalUrl}`,
      ).toBe(true);
    });
  }
});
