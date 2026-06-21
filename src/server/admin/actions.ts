"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// ---------------- Schemas ----------------

const STATUTS = ["actif", "suspendu", "archive", "demo_terminee"] as const;
const PLANS = ["freemium", "pro", "premium"] as const;

const createClientSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  prenom: z.string().min(1).max(100),
  nom: z.string().min(1).max(100),
  telephone: z.string().max(20).optional().or(z.literal("")),
  adresse: z.string().max(500).optional().or(z.literal("")),
  codePostal: z.string().max(10).optional().or(z.literal("")),
  ville: z.string().max(100).optional().or(z.literal("")),
  pays: z.string().max(100).default("France"),
  demoActive: z.boolean().default(false),
});

const updateClientSchema = z.object({
  id: z.coerce.number().int().positive(),
  prenom: z.string().min(1).max(100),
  nom: z.string().min(1).max(100),
  telephone: z.string().max(20).optional().or(z.literal("")),
  adresse: z.string().max(500).optional().or(z.literal("")),
  codePostal: z.string().max(10).optional().or(z.literal("")),
  ville: z.string().max(100).optional().or(z.literal("")),
  pays: z.string().max(100),
});

// ---------------- Helpers ----------------

function emptyToNull<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = typeof v === "string" && v.trim() === "" ? null : v;
  }
  return out as T;
}

async function logAdminAction(action: string, details: Record<string, unknown>) {
  try {
    await prisma.log.create({
      data: {
        action: action.slice(0, 50),
        details: details as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    console.error("[admin.log] failed to write log", e);
  }
}

// ---------------- Actions ----------------

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createClient(input: unknown): Promise<ActionResult<{ id: number }>> {
  await requireAdmin();
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = emptyToNull(parsed.data);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec cet email." };
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      prenom: data.prenom,
      nom: data.nom,
      telephone: data.telephone ?? undefined,
      adresse: data.adresse ?? undefined,
      codePostal: data.codePostal ?? undefined,
      ville: data.ville ?? undefined,
      pays: data.pays,
      role: "client",
      statut: "actif",
      demoActive: data.demoActive,
    },
  });

  // === Préservation de la session admin ===========================
  // `auth.api.signUpEmail` + autoSignIn + plugin nextCookies connectent
  // automatiquement le NOUVEAU client et écrasent le cookie de session de
  // l'admin dans CETTE requête → l'admin se retrouvait connecté en client
  // sans pouvoir revenir. On capture le(s) cookie(s) de session admin avant,
  // on les restaure après, et on nettoie le cookie de cache + la session
  // orpheline créée pour le client (qu'il n'utilisera jamais).
  const cookieStore = await cookies();
  const adminSessionCookies = cookieStore
    .getAll()
    .filter((c) => c.name.includes("session_token"))
    .map((c) => ({ name: c.name, value: c.value }));

  // Better-Auth signUp pour créer le compte d'auth + hash password.
  const { user: authUser, token: clientSessionToken } =
    await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: `${data.prenom} ${data.nom}`,
      },
    });

  // Restaure la session admin : supprime le cookie de cache de session (qui
  // contient désormais les données du client) et réécrit le cookie de session
  // avec la valeur de l'admin.
  const isProd = process.env.NODE_ENV === "production";
  for (const c of cookieStore.getAll()) {
    if (c.name.includes("session_data")) cookieStore.delete(c.name);
  }
  for (const c of adminSessionCookies) {
    cookieStore.set(c.name, c.value, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  // Nettoie la session DB orpheline du client (le cookie a été écrasé).
  if (clientSessionToken) {
    await prisma.session
      .deleteMany({ where: { token: clientSessionToken } })
      .catch(() => null);
  }

  await prisma.authUser.update({
    where: { id: authUser.id },
    data: { userId: user.id },
  });

  await logAdminAction("client.create", { id: user.id, email: user.email });
  revalidatePath("/admin/clients");
  return { ok: true, data: { id: user.id } };
}

const createRestaurantForClientSchema = z.object({
  userId: z.coerce.number().int().positive(),
  nom: z.string().min(1, "Nom requis").max(255),
  ville: z.string().max(100).optional().or(z.literal("")),
  adresse: z.string().max(500).optional().or(z.literal("")),
  codePostal: z.string().max(10).optional().or(z.literal("")),
});

/**
 * Crée un restaurant POUR un client donné, depuis la fiche admin.
 *
 * Pourquoi : `createClient` ne crée que le compte (User + AuthUser), pas de
 * restaurant. Un client sans restaurant ne peut rien faire au login (et
 * l'impersonation renvoie sur /admin). L'admin peut donc amorcer le 1er
 * restaurant du client ici. Plan freemium par défaut (l'admin offre un plan
 * via l'onglet « Droits & Plans » si besoin).
 */
export async function createRestaurantForClient(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = createRestaurantForClientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }
  const data = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, langueNative: true, pays: true },
  });
  if (!user) return { ok: false, error: "Client introuvable." };

  const empty = (v: string | undefined) =>
    v && v.trim().length > 0 ? v.trim() : null;

  const restaurant = await prisma.restaurant.create({
    data: {
      userId: user.id,
      nom: data.nom.trim(),
      ville: empty(data.ville),
      adresse: empty(data.adresse),
      codePostal: empty(data.codePostal),
      pays: user.pays ?? "France",
      langueNative: user.langueNative ?? "fr",
      plan: "freemium",
      statut: "actif",
    },
  });

  await logAdminAction("client.restaurant.create", {
    userId: user.id,
    restaurantId: restaurant.id.toString(),
    nom: data.nom,
  });
  revalidatePath(`/admin/clients/${user.id}`);
  return { ok: true, data: { id: restaurant.id.toString() } };
}

export async function updateClient(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = emptyToNull(parsed.data);

  await prisma.user.update({
    where: { id: data.id },
    data: {
      prenom: data.prenom,
      nom: data.nom,
      telephone: data.telephone ?? null,
      adresse: data.adresse ?? null,
      codePostal: data.codePostal ?? null,
      ville: data.ville ?? null,
      pays: data.pays,
    },
  });

  await logAdminAction("client.update", { id: data.id });
  revalidatePath(`/admin/clients/${data.id}`);
  return { ok: true };
}

export async function setClientStatut(
  id: number,
  statut: (typeof STATUTS)[number],
): Promise<ActionResult> {
  await requireAdmin();
  if (!STATUTS.includes(statut)) return { ok: false, error: "Statut invalide" };

  await prisma.user.update({ where: { id }, data: { statut } });
  await logAdminAction("client.set_statut", { id, statut });
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}

export async function toggleClientDemo(id: number): Promise<ActionResult> {
  await requireAdmin();
  const current = await prisma.user.findUnique({ where: { id }, select: { demoActive: true } });
  if (!current) return { ok: false, error: "Client introuvable" };

  await prisma.user.update({
    where: { id },
    data: { demoActive: !current.demoActive },
  });
  await logAdminAction("client.toggle_demo", { id, value: !current.demoActive });
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}

export async function setRestaurantPlan(
  restaurantId: bigint,
  plan: (typeof PLANS)[number],
): Promise<ActionResult> {
  await requireAdmin();
  if (!PLANS.includes(plan)) return { ok: false, error: "Plan invalide" };
  await prisma.restaurant.update({ where: { id: restaurantId }, data: { plan } });
  await logAdminAction("restaurant.set_plan", { restaurantId: restaurantId.toString(), plan });
  revalidatePath("/admin/clients");
  revalidatePath("/admin/restaurants");
  return { ok: true };
}

const ROLES = ["admin", "client"] as const;

/**
 * Bascule le rôle d'un utilisateur entre `client` et `admin`.
 *
 * Garde-fou : on refuse de retirer le rôle admin si c'est le DERNIER admin
 * de la base sinon plus personne ne pourrait gérer le SaaS.
 */
export async function setUserRole(
  id: number,
  role: (typeof ROLES)[number],
): Promise<ActionResult> {
  await requireAdmin();
  if (!ROLES.includes(role)) return { ok: false, error: "Rôle invalide" };

  // Si on retire le rôle admin → vérifier qu'il en reste au moins 1 autre
  if (role === "client") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (target?.role === "admin" && adminCount <= 1) {
      return {
        ok: false,
        error:
          "Impossible : tu es le dernier admin. Promeus quelqu'un d'autre avant de te rétrograder.",
      };
    }
  }

  await prisma.user.update({ where: { id }, data: { role } });
  await logAdminAction("user.set_role", { id, role });
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}

/**
 * Wrapper string-friendly pour `setRestaurantPlan` (utilisable depuis un
 * Client Component sans gérer de BigInt côté browser).
 */
export async function setRestaurantPlanByStringId(
  restaurantId: string,
  plan: string,
): Promise<ActionResult> {
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }
  if (!PLANS.includes(plan as (typeof PLANS)[number])) {
    return { ok: false, error: "Plan invalide" };
  }
  return setRestaurantPlan(bigId, plan as (typeof PLANS)[number]);
}

/**
 * Offre N jours de Pro/Premium à un restaurant (bypass Stripe).
 *
 * Effets :
 *   - Set le plan (pro ou premium)
 *   - Set `planOffertExpiresAt = now + days` (étendable si déjà actif)
 *   - Stocke l'admin qui a accordé le cadeau pour audit
 *   - Logue dans la table logs
 *
 * Le plan restera actif jusqu'à `planOffertExpiresAt`. À l'expiration,
 * l'admin doit revert manuellement vers freemium (un cron pourrait
 * automatiser ça en V2).
 *
 * Si l'admin offre des jours en plus d'une période déjà active, on étend
 * depuis la date de fin actuelle (pas depuis now) → le client cumule.
 */
export async function grantPlanForDays(input: {
  restaurantId: string;
  plan: "pro" | "premium";
  days: number;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  let bigId: bigint;
  try {
    bigId = BigInt(input.restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }
  if (!["pro", "premium"].includes(input.plan)) {
    return { ok: false, error: "Plan invalide (pro ou premium uniquement)" };
  }
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 730) {
    return { ok: false, error: "Durée invalide (1 à 730 jours)" };
  }

  // Récupère l'admin user qui accorde le cadeau (pour audit)
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  const adminUserId = authUser?.userId ?? null;

  // === Rate-limit défense en profondeur ===
  // Max 10 octrois de plan offert / admin / 5 min. Un usage légitime
  // dépasse rarement 1-2 par session. Au-delà = comportement suspect
  // (compte admin compromis qui mass-grant des Premium gratuits).
  // Variante Redis pour partager le compteur si on scale horizontalement
  // (fallback in-memory si Redis indispo).
  if (adminUserId) {
    const { checkRateLimitRedis } = await import("@/lib/rate-limit");
    const rl = await checkRateLimitRedis(
      `grant-plan:${adminUserId}`,
      10,
      5 * 60_000,
    );
    if (!rl.allowed) {
      console.warn(
        `[security] grantPlanForDays rate-limited for admin ${adminUserId} ` +
          `(${rl.limit} octrois en 5 min). Possible compromission de compte.`,
      );
      return {
        ok: false,
        error:
          "Trop d'octrois récents. Pour ta sécurité, attends quelques minutes avant de réessayer (ou contacte un autre admin).",
      };
    }
  }

  const current = await prisma.restaurant.findUnique({
    where: { id: bigId },
    select: { planOffertExpiresAt: true } as never,
  });

  // Base de calcul : si une période est déjà active dans le futur, on
  // l'étend ; sinon on part de maintenant
  const currentExpiresAt = (current as unknown as {
    planOffertExpiresAt: Date | null;
  } | null)?.planOffertExpiresAt;
  const baseDate =
    currentExpiresAt && currentExpiresAt > new Date()
      ? currentExpiresAt
      : new Date();
  const newExpiresAt = new Date(baseDate.getTime() + input.days * 24 * 3600 * 1000);

  await prisma.restaurant.update({
    where: { id: bigId },
    data: {
      plan: input.plan,
      // Cast `as never` car client Prisma peut être stale localement
      planOffertExpiresAt: newExpiresAt,
      planOffertByUserId: adminUserId,
    } as never,
  });

  await logAdminAction("restaurant.grant_plan", {
    restaurantId: input.restaurantId,
    plan: input.plan,
    days: input.days,
    expiresAt: newExpiresAt.toISOString(),
    byAdmin: adminUserId,
  });

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients`);
  revalidatePath("/admin/restaurants");
  return { ok: true };
}

/**
 * Révoque immédiatement le cadeau de plan offert (rétrograde en freemium).
 * Utile si un admin a accordé par erreur, ou pour terminer prématurément.
 */
export async function revokeOfferedPlan(
  restaurantId: string,
): Promise<ActionResult> {
  await requireAdmin();
  let bigId: bigint;
  try {
    bigId = BigInt(restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }

  await prisma.restaurant.update({
    where: { id: bigId },
    data: {
      plan: "freemium",
      planOffertExpiresAt: null,
      planOffertByUserId: null,
    } as never,
  });

  await logAdminAction("restaurant.revoke_offered_plan", {
    restaurantId,
  });

  revalidatePath("/admin/clients");
  return { ok: true };
}

export async function sendResetPasswordEmail(email: string): Promise<ActionResult> {
  await requireAdmin();
  const valid = z.email().safeParse(email);
  if (!valid.success) return { ok: false, error: "Email invalide" };

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: "/reset-password",
      },
    });
    await logAdminAction("client.reset_password", { email });
    return { ok: true };
  } catch (err) {
    console.error("[admin.resetPassword]", err);
    return { ok: false, error: "Impossible d'envoyer l'email de réinitialisation" };
  }
}

/**
 * Suppression définitive d'un compte client par un admin (RGPD).
 *
 * Comportement identique au self-service deleteOwnAccount mais sans le check
 * "tape ton email" puisque c'est l'admin qui agit. Garde-fous :
 *   - Action réservée admin
 *   - Refuse de supprimer un autre admin (sécurité)
 *   - Audit log explicite avec userId admin qui agit
 *
 * Flow :
 *   1. Cancel Stripe subs actives
 *   2. Purge toutes les images R2 du client (logos, bannières, photos, QR)
 *   3. Soft-delete + anonymisation PII (User + Restaurants)
 *   4. Hard-delete AuthUser → empêche tout login
 *   5. Audit log
 */
export async function deleteClientAccount(
  clientUserId: number,
): Promise<ActionResult<{ purgedImages: number }>> {
  const adminSession = await requireAdmin();

  if (!Number.isInteger(clientUserId) || clientUserId <= 0) {
    return { ok: false, error: "Identifiant invalide" };
  }

  const target = await prisma.user.findUnique({
    where: { id: clientUserId },
    select: {
      id: true,
      email: true,
      role: true,
      stripeCustomerId: true,
    },
  });
  if (!target) return { ok: false, error: "Client introuvable" };

  // Sécu : on refuse de supprimer un admin via cette action (faut le faire à
  // la main en DB pour forcer la réflexion pas de bouton "delete admin" UI)
  if (target.role === "admin") {
    return {
      ok: false,
      error: "Impossible de supprimer un compte admin via cette action.",
    };
  }

  // Identifie l'admin qui agit (pour audit log)
  const actingAuth = await prisma.authUser.findUnique({
    where: { id: adminSession.user.id },
    select: { userId: true },
  });
  const actingAdminId = actingAuth?.userId ?? null;

  // === 1. Annule Stripe subs ===
  if (target.stripeCustomerId) {
    const { getStripe, isStripeConfigured } = await import("@/lib/stripe");
    if (isStripeConfigured()) {
      const stripe = getStripe();
      if (stripe) {
        try {
          const subs = await stripe.subscriptions.list({
            customer: target.stripeCustomerId,
            status: "all",
            limit: 100,
          });
          for (const sub of subs.data) {
            if (
              sub.status === "active" ||
              sub.status === "trialing" ||
              sub.status === "past_due"
            ) {
              await stripe.subscriptions
                .cancel(sub.id, { invoice_now: false, prorate: false })
                .catch((err) =>
                  console.warn(
                    `[admin.delete-account] cancel sub ${sub.id} failed:`,
                    err,
                  ),
                );
            }
          }
        } catch (err) {
          console.warn(
            "[admin.delete-account] list Stripe subs failed:",
            err,
          );
        }
      }
    }
  }

  // === 2. Purge images R2 ===
  const { deleteR2Batch, listR2Keys } = await import("@/lib/r2");
  const restos = await prisma.restaurant.findMany({
    where: { userId: target.id },
    select: { id: true },
  });
  let purgedImages = 0;
  for (const r of restos) {
    try {
      const keys = await listR2Keys(`restaurants/${r.id.toString()}/`);
      if (keys.length > 0) {
        const result = await deleteR2Batch(keys.map((k) => k.key));
        purgedImages += result.deleted;
      }
    } catch (err) {
      console.warn(
        `[admin.delete-account] R2 purge failed for resto ${r.id}:`,
        err,
      );
    }
  }

  // === 3. Soft-delete + anonymisation PII ===
  const anonEmail = `deleted-${target.id}-${Date.now()}@deleted.invalid`;
  await prisma.user.update({
    where: { id: target.id },
    data: {
      statut: "archive",
      email: anonEmail,
      prenom: null,
      nom: null,
      telephone: null,
      adresse: null,
      codePostal: null,
      ville: null,
      pays: null,
    },
  });
  await prisma.restaurant.updateMany({
    where: { userId: target.id },
    data: {
      statut: "archive",
      logoUrl: null,
      banniereUrl: null,
    },
  });

  // === 4. Hard-delete AuthUser (empêche tout futur login) ===
  try {
    await prisma.authUser.deleteMany({
      where: { userId: target.id },
    });
  } catch (err) {
    console.warn("[admin.delete-account] AuthUser delete failed:", err);
  }

  // === 5. Audit ===
  await logAdminAction("client.hard_delete", {
    targetUserId: target.id,
    byAdminUserId: actingAdminId,
    restoCount: restos.length,
    purgedImages,
  });

  revalidatePath("/admin/clients");
  return { ok: true, data: { purgedImages } };
}
