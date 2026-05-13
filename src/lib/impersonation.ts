import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { auth } from "./auth";
import { headers } from "next/headers";

/**
 * Impersonation admin → client
 *
 * Quand un admin a besoin d'aider un client (SAV, debug d'une carte cassée),
 * il peut "se mettre dans la peau" de cet utilisateur pour voir et modifier
 * son dashboard exactement comme le ferait le client lui-même.
 *
 * Mécanisme :
 *   1. Cookie httpOnly `ruliz_impersonate_user_id` = ID du user impersonné
 *   2. Le helper `getActingUserId()` retourne :
 *      - L'ID impersonné si admin authentifié + cookie présent
 *      - L'ID réel du user connecté sinon
 *   3. Toutes les queries dashboard (getCurrentRestaurant, assertRestaurantOwner)
 *      passent par `getActingUserId()` au lieu d'accéder directement au userId
 *      via auth_user
 *   4. Un banner sticky est affiché tant que l'impersonation est active
 *   5. Toute action critique (start/stop) est loguée dans la table `logs`
 *      pour traçabilité
 *
 * Sécurité :
 *   - Seul un admin authentifié peut DÉMARRER une impersonation
 *   - Le cookie expire automatiquement après 8h
 *   - L'admin garde son auth_user d'origine (la vraie session reste admin),
 *     seul le "user agissant" sur le dashboard est différent
 */

export const IMPERSONATE_COOKIE = "ruliz_impersonate_user_id";
// TTL réduit à 1h (vs 8h initial) : durcissement de défense en profondeur.
// Si un admin oublie de quitter le mode SAV, son cookie expire au bout d'1h
// au lieu de rester actif toute une journée. Plus court = moins de fenêtre
// d'attaque si la session admin est compromise.
const IMPERSONATE_TTL_SECONDS = 60 * 60; // 1 heure

/** Lit l'ID impersonné depuis le cookie. null si pas d'impersonation. */
export async function getImpersonatedUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(IMPERSONATE_COOKIE)?.value;
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Retourne le userId à utiliser pour les queries du dashboard.
 *
 * Si :
 *   - Pas de session → null (le caller redirige)
 *   - Session normale (non-admin OU admin sans cookie) → le userId du authUser
 *   - Admin + cookie impersonate → le userId impersonné
 *
 * Cette fonction est le point central de tout le système d'impersonation.
 */
export async function getActingUserId(): Promise<{
  /** L'ID utilisé pour les queries (impersonné si applicable, sinon réel) */
  actingUserId: number;
  /** Le user réellement connecté (toujours = authUser de la session Better-Auth) */
  realUserId: number;
  /** True si on est en mode impersonation (admin acting as client) */
  isImpersonating: boolean;
  /** Infos du user impersonné · null si non-impersonating */
  impersonatedUser: {
    id: number;
    prenom: string | null;
    nom: string | null;
    email: string;
  } | null;
} | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true, user: { select: { role: true } } },
  });
  if (!authUser?.userId) return null;
  const realUserId = authUser.userId;

  const isAdmin = authUser.user?.role === "admin";
  const impersonatedId = await getImpersonatedUserId();

  // Mode impersonation valide : admin + cookie
  if (isAdmin && impersonatedId) {
    const target = await prisma.user.findUnique({
      where: { id: impersonatedId },
      select: { id: true, prenom: true, nom: true, email: true },
    });
    if (target) {
      return {
        actingUserId: target.id,
        realUserId,
        isImpersonating: true,
        impersonatedUser: target,
      };
    }
    // Cookie présent mais target introuvable → on ignore l'impersonation
  }

  return {
    actingUserId: realUserId,
    realUserId,
    isImpersonating: false,
    impersonatedUser: null,
  };
}

/** Set le cookie impersonate (server action only). */
export async function setImpersonateCookie(targetUserId: number) {
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, targetUserId.toString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: IMPERSONATE_TTL_SECONDS,
    path: "/",
  });
}

/** Clear le cookie impersonate (server action only). */
export async function clearImpersonateCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);
}
