import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isR2Configured, uploadBuffer } from "@/lib/r2";
import type { SupportedLang } from "@/lib/langs";

/**
 * Diagnostic endpoint **admin uniquement** (verrouillé).
 *
 * Avant : accessible à tout user connecté, ce qui exposait :
 *   - L'énumération des services configurés (Stripe, Anthropic, R2, Brevo…)
 *   - L'URL R2 publique (recon réseau)
 *   - Un PUT R2 réel via ?r2test=1 → pollution de bucket triviale
 *
 * Maintenant : check session + role 'admin' → 401/403 sinon. Pas de
 * redirect() ici (on est dans une route handler API, on veut un vrai
 * status code pas un 307).
 */
export async function GET(req: Request) {
  // 1. Auth : doit être connecté
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Authz : doit être admin (rôle métier sur la table users)
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { user: { select: { role: true } } },
  });
  if (authUser?.user?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden admin role required" },
      { status: 403 },
    );
  }

  const present = (k: string) =>
    !!(process.env[k] && process.env[k]!.trim().length > 0);

  const url = new URL(req.url);
  const runR2Test = url.searchParams.get("r2test") === "1";
  const runTransTest = url.searchParams.get("transtest") === "1";

  // Test de traduction RÉEL : confirme que la clé Anthropic est non seulement
  // présente mais VALIDE et que le modèle traduit bien (titres de catégories
  // inclus). Décisif pour diagnostiquer « la carte n'est pas traduite » :
  //   - keyPresent:false        → ajouter ANTHROPIC_API_KEY dans Railway
  //   - ok:false (401/permission) → clé invalide/expirée
  //   - ok:true + translated visible → le pipeline marche, c'est de la
  //     donnée périmée côté resto (re-traduire) et non un bug de prod.
  let transTest:
    | {
        ok: true;
        menuPath: Array<{ src: string; lang: string; translated: string }>;
        panelPath: Array<{ src: string; lang: string; translated: string }>;
      }
    | { ok: false; path: "menu" | "panel"; error: string }
    | { skipped: true } = { skipped: true };

  if (runTransTest) {
    try {
      // 1. Chemin MENU (translateText) — utilisé par la carte publique.
      const { translateText } = await import("@/server/translation/anthropic");
      const menuCases: Array<{ src: string; lang: "de" | "en" }> = [
        { src: "Desserts", lang: "de" },
        { src: "Saucisse purée", lang: "en" },
      ];
      const menuPath: Array<{ src: string; lang: string; translated: string }> =
        [];
      for (const c of menuCases) {
        const r = await translateText({
          text: c.src,
          targetLang: c.lang,
          sourceLang: "fr",
        });
        if (!r.ok) {
          transTest = { ok: false, path: "menu", error: `${c.src}→${c.lang}: ${r.error}` };
          break;
        }
        menuPath.push({ src: c.src, lang: c.lang, translated: r.text });
      }

      // 2. Chemin PANEL (translatePanelString) — utilisé par le dashboard ET
      //    le mini-site vitrine. C'est CE chemin qui doit marcher pour que la
      //    traduction auto de l'interface / du site fonctionne.
      const panelPath: Array<{ src: string; lang: string; translated: string }> =
        [];
      if (menuPath.length === menuCases.length) {
        const { translatePanelString } = await import(
          "@/server/dashboard/translate-panel-actions"
        );
        // Même phrase source vers les 6 langues cibles : on voit immédiatement
        // lesquelles le serveur sait traduire (diagnostic « it/pt/zh ne
        // marchent pas »).
        const panelCases: Array<{ src: string; lang: SupportedLang }> = [
          { src: "Réserver une table", lang: "en" },
          { src: "Réserver une table", lang: "es" },
          { src: "Réserver une table", lang: "de" },
          { src: "Réserver une table", lang: "it" },
          { src: "Réserver une table", lang: "pt" },
          { src: "Réserver une table", lang: "zh" },
        ];
        for (const c of panelCases) {
          const r = await translatePanelString(c.src, c.lang);
          if (!r.ok) {
            transTest = { ok: false, path: "panel", error: `${c.src}→${c.lang}: ${r.error}` };
            break;
          }
          panelPath.push({ src: c.src, lang: c.lang, translated: r.text });
        }
        if (panelPath.length === panelCases.length) {
          transTest = { ok: true, menuPath, panelPath };
        }
      }
    } catch (err) {
      transTest = {
        ok: false,
        path: "menu",
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      };
    }
  }

  let r2TestResult:
    | { ok: true; publicUrl: string }
    | { ok: false; error: string }
    | { skipped: true } = { skipped: true };

  if (runR2Test) {
    if (!isR2Configured()) {
      r2TestResult = { ok: false, error: "R2 non configuré (variables manquantes)" };
    } else {
      try {
        const tinyPng = Buffer.from(
          "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
          "hex",
        );
        const url = await uploadBuffer({
          key: `_diag/test-${Date.now()}.png`,
          body: tinyPng,
          contentType: "image/png",
        });
        if (url) {
          r2TestResult = { ok: true, publicUrl: url };
        } else {
          r2TestResult = { ok: false, error: "uploadBuffer a retourné null" };
        }
      } catch (err) {
        r2TestResult = {
          ok: false,
          error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        };
      }
    }
  }

  return NextResponse.json({
    node: process.version,
    env: process.env.NODE_ENV,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    services: {
      database: present("DATABASE_URL"),
      redis: present("REDIS_URL"),
      anthropic: present("ANTHROPIC_API_KEY"),
      inngestEvent: present("INNGEST_EVENT_KEY"),
      inngestSignature: present("INNGEST_SIGNING_KEY"),
      r2: {
        accountId: present("R2_ACCOUNT_ID"),
        accessKeyId: present("R2_ACCESS_KEY_ID"),
        secretAccessKey: present("R2_SECRET_ACCESS_KEY"),
        bucketName: present("R2_BUCKET_NAME"),
        publicUrl: present("R2_PUBLIC_URL"),
        publicUrlSample:
          process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? null,
      },
      stripe: {
        secret: present("STRIPE_SECRET_KEY"),
        webhook: present("STRIPE_WEBHOOK_SECRET"),
        proPriceId: present("STRIPE_PRO_PRICE_ID"),
        premiumPriceId: present("STRIPE_PREMIUM_PRICE_ID"),
      },
      resend: present("RESEND_API_KEY"),
    },
    r2Test: r2TestResult,
    transTest,
    hint: runR2Test
      ? null
      : "Ajoute ?r2test=1 (PUT R2 réel) ou ?transtest=1 (traduction Anthropic réelle) à l'URL",
  });
}
