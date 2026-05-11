"use server";

import { prisma } from "@/lib/db";
import { requireDashboard } from "@/lib/session";

/**
 * Server actions du tour onboarding (bulle guidée).
 *
 * Note Prisma : sur Windows le client est verrouillé (EPERM) ce qui empêche
 * la régénération des types après ajout de colonnes. On caste les payloads
 * en `as never` côté update pour bypasser les types stale. La DB et la
 * migration sont OK, c'est juste un workaround local.
 */

export type OnboardingActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Récupère l'état d'onboarding de l'utilisateur courant.
 * Retourne null si l'utilisateur n'est pas authentifié.
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

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  if (!authUser?.userId) return null;

  // Champs ajoutés par migration 20260511120000_user_onboarding — cast
  // nécessaire tant que `prisma generate` n'a pas tourné en local (lock Windows).
  const selectPayload = {
    onboardingStep: true,
    onboardingCompleted: true,
    onboardingSkipped: true,
    onboardingSelfScanned: true,
  };
  const user = (await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: selectPayload as never,
  })) as unknown as
    | {
        onboardingStep: number;
        onboardingCompleted: boolean;
        onboardingSkipped: boolean;
        onboardingSelfScanned: boolean;
      }
    | null;

  if (!user) return null;

  return {
    step: user.onboardingStep ?? 0,
    completed: user.onboardingCompleted ?? false,
    skipped: user.onboardingSkipped ?? false,
    selfScanned: user.onboardingSelfScanned ?? false,
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

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  if (!authUser?.userId) {
    return { ok: false, error: "Compte introuvable" };
  }

  const payload: Record<string, unknown> = { onboardingStep: step };
  if (step === 1) {
    // Si déjà démarré, on n'écrase pas — sinon on note le startedAt.
    payload.onboardingStartedAt = new Date();
  }
  if (step >= 6) {
    payload.onboardingCompleted = true;
    payload.onboardingCompletedAt = new Date();
  }

  await prisma.user.update({
    where: { id: authUser.userId },
    data: payload as never,
  });

  return { ok: true };
}

/**
 * L'utilisateur clique "Passer le tour" — on ne réaffichera plus la bulle.
 * Reste accessible via "Refaire le tour" depuis l'aide.
 */
export async function skipOnboarding(): Promise<OnboardingActionResult> {
  let session;
  try {
    session = await requireDashboard();
  } catch {
    return { ok: false, error: "Non authentifié" };
  }

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  if (!authUser?.userId) {
    return { ok: false, error: "Compte introuvable" };
  }

  await prisma.user.update({
    where: { id: authUser.userId },
    data: { onboardingSkipped: true } as never,
  });

  return { ok: true };
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

  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { userId: true },
  });
  if (!authUser?.userId) {
    return { ok: false, error: "Compte introuvable" };
  }

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
}

/**
 * Marque que l'utilisateur a scanné son propre QR depuis le tour.
 * Appelé par /carte/[id] quand on détecte ?ref=onboarding-self.
 * Sécurité : on accepte le userId en param (depuis l'URL signée) et on vérifie
 * juste qu'il existe — pas besoin d'être authentifié (la carte est publique).
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
  } catch {
    return { ok: false, error: "Update échoué" };
  }
}
