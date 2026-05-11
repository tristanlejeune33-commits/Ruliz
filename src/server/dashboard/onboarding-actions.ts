"use server";

import { prisma } from "@/lib/db";
import { requireDashboard } from "@/lib/session";

/**
 * Server actions du tour onboarding (bulle guidée).
 *
 * Robustesse : toutes les opérations sont try/catch — si la migration
 * `20260511120000_user_onboarding` n'est pas encore appliquée sur la DB
 * (Railway en cours de redeploy, rollback, etc.), on retombe sur des
 * defaults safe (pas de bulle) au lieu de crasher tout le dashboard avec
 * un P2022 "column does not exist".
 *
 * Note Prisma : sur Windows le client est verrouillé (EPERM) ce qui empêche
 * la régénération des types après ajout de colonnes. On caste les payloads
 * en `as never` côté update pour bypasser les types stale.
 */

export type OnboardingActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Retourne `true` si l'erreur Prisma indique une colonne manquante (P2022)
 * ou table manquante (P2021) — typiquement quand la migration n'a pas
 * encore tourné.
 */
function isMissingSchemaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "P2022" || code === "P2021";
}

/**
 * Récupère l'état d'onboarding de l'utilisateur courant.
 * Retourne null si non authentifié, ou si la migration n'a pas encore tourné.
 */
export async function getOnboardingState(): Promise<{
  step: number;
  completed: boolean;
  skipped: boolean;
  selfScanned: boolean;
} | null> {
  let session;
  try {
    session = await requireDashboard();
  } catch {
    return null;
  }

  let authUser;
  try {
    authUser = await prisma.authUser.findUnique({
      where: { id: session.user.id },
      select: { userId: true },
    });
  } catch {
    return null;
  }
  if (!authUser?.userId) return null;

  // Champs ajoutés par migration 20260511120000_user_onboarding.
  const selectPayload = {
    onboardingStep: true,
    onboardingCompleted: true,
    onboardingSkipped: true,
    onboardingSelfScanned: true,
  };

  let user: unknown;
  try {
    user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: selectPayload as never,
    });
  } catch (err) {
    if (isMissingSchemaError(err)) {
      // Migration pas encore appliquée → on désactive silencieusement le
      // tour. Réessaiera au prochain refresh une fois la migration passée.
      console.warn(
        "[onboarding] schema pas à jour (P2022) — bulle désactivée le temps que la migration tourne",
      );
      return null;
    }
    throw err;
  }

  if (!user) return null;
  const u = user as {
    onboardingStep?: number;
    onboardingCompleted?: boolean;
    onboardingSkipped?: boolean;
    onboardingSelfScanned?: boolean;
  };

  return {
    step: u.onboardingStep ?? 0,
    completed: u.onboardingCompleted ?? false,
    skipped: u.onboardingSkipped ?? false,
    selfScanned: u.onboardingSelfScanned ?? false,
  };
}

/**
 * Marque l'étape courante du tour. Si step === 1 et qu'on n'a jamais démarré,
 * on note onboardingStartedAt. Si step === 6 (dernière), on complète.
 */
export async function setOnboardingStep(
  step: number,
): Promise<OnboardingActionResult> {
  if (step < 0 || step > 6) {
    return { ok: false, error: "Étape invalide" };
  }

  let session;
  try {
    session = await requireDashboard();
  } catch {
    return { ok: false, error: "Non authentifié" };
  }

  const authUser = await prisma.authUser
    .findUnique({
      where: { id: session.user.id },
      select: { userId: true },
    })
    .catch(() => null);
  if (!authUser?.userId) {
    return { ok: false, error: "Compte introuvable" };
  }

  const payload: Record<string, unknown> = { onboardingStep: step };
  if (step === 1) {
    payload.onboardingStartedAt = new Date();
  }
  if (step >= 6) {
    payload.onboardingCompleted = true;
    payload.onboardingCompletedAt = new Date();
  }

  try {
    await prisma.user.update({
      where: { id: authUser.userId },
      data: payload as never,
    });
    return { ok: true };
  } catch (err) {
    if (isMissingSchemaError(err)) {
      console.warn(
        "[onboarding] setStep : schema pas à jour — étape non persistée",
      );
      return { ok: true }; // silencieux : le tour fonctionne côté client même sans persistance
    }
    return { ok: false, error: "Update échoué" };
  }
}

/**
 * L'utilisateur clique "Passer le tour" — on ne réaffichera plus la bulle.
 */
export async function skipOnboarding(): Promise<OnboardingActionResult> {
  let session;
  try {
    session = await requireDashboard();
  } catch {
    return { ok: false, error: "Non authentifié" };
  }

  const authUser = await prisma.authUser
    .findUnique({
      where: { id: session.user.id },
      select: { userId: true },
    })
    .catch(() => null);
  if (!authUser?.userId) {
    return { ok: false, error: "Compte introuvable" };
  }

  try {
    await prisma.user.update({
      where: { id: authUser.userId },
      data: { onboardingSkipped: true } as never,
    });
    return { ok: true };
  } catch (err) {
    if (isMissingSchemaError(err)) {
      console.warn("[onboarding] skip : schema pas à jour — non persisté");
      return { ok: true };
    }
    return { ok: false, error: "Skip échoué" };
  }
}

/**
 * L'utilisateur clique "Refaire le tour" depuis l'aide.
 * Reset step à 0 et clear skipped/completed.
 */
export async function restartOnboarding(): Promise<OnboardingActionResult> {
  let session;
  try {
    session = await requireDashboard();
  } catch {
    return { ok: false, error: "Non authentifié" };
  }

  const authUser = await prisma.authUser
    .findUnique({
      where: { id: session.user.id },
      select: { userId: true },
    })
    .catch(() => null);
  if (!authUser?.userId) {
    return { ok: false, error: "Compte introuvable" };
  }

  try {
    await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        onboardingStep: 0,
        onboardingSkipped: false,
        onboardingCompleted: false,
        onboardingCompletedAt: null,
      } as never,
    });
    return { ok: true };
  } catch (err) {
    if (isMissingSchemaError(err)) {
      return {
        ok: false,
        error:
          "La fonctionnalité didacticiel s'active après le prochain déploiement. Réessaie dans quelques minutes.",
      };
    }
    return { ok: false, error: "Restart échoué" };
  }
}

/**
 * Marque que l'utilisateur a scanné son propre QR depuis le tour.
 * Appelé par /carte/[id] quand on détecte ?ref=onboarding-self.
 */
export async function markOnboardingSelfScanned(
  userId: number,
): Promise<OnboardingActionResult> {
  if (!Number.isFinite(userId) || userId <= 0) {
    return { ok: false, error: "userId invalide" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingSelfScanned: true } as never,
    });
    return { ok: true };
  } catch (err) {
    if (isMissingSchemaError(err)) {
      // Migration pas appliquée → on ignore silencieusement, la carte
      // publique continue de s'afficher normalement.
      return { ok: true };
    }
    return { ok: false, error: "Update échoué" };
  }
}
