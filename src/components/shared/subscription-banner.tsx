"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, CreditCard, Gift, XCircle } from "lucide-react";

interface SubscriptionBannerProps {
  status: string | null;
  /** Statut métier du restaurant (suspendu / actif) */
  restaurantStatut: string;
  /** Plan actuel — utile pour différencier essai vs payant */
  currentPlan?: "freemium" | "pro" | "premium" | string;
  /** Date d'expiration du plan offert (essai 14j ou cadeau admin) */
  trialExpiresAt?: Date | string | null;
  /** Statut Stripe — si actif, on ne montre pas le bandeau d'essai */
  hasStripeSubscription?: boolean;
}

/**
 * Bandeau warning/error en haut du dashboard si le paiement Stripe pose
 * problème (past_due, unpaid, canceled, restaurant suspendu).
 *
 * Affichage conditionnel — null si tout va bien.
 */
export function SubscriptionBanner({
  status,
  restaurantStatut,
  currentPlan,
  trialExpiresAt,
  hasStripeSubscription,
}: SubscriptionBannerProps) {
  if (restaurantStatut === "suspendu") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-lg border border-[rgb(220,38,38)]/40 bg-[rgba(239,68,68,0.08)] p-4 text-sm text-[rgb(127,29,29)]"
      >
        <XCircle className="size-5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">
            🚫 Service suspendu — paiement échoué
          </p>
          <p className="mt-0.5">
            Ton abonnement n&apos;a pas pu être prélevé. Ta carte publique
            est <strong>désactivée</strong> jusqu&apos;à ce que tu mettes à jour
            ton moyen de paiement.
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="shrink-0 rounded-md bg-[rgb(220,38,38)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          Régler maintenant
        </Link>
      </motion.div>
    );
  }

  if (status === "past_due" || status === "unpaid") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-lg border border-[rgb(217,119,6)]/40 bg-[rgba(245,158,11,0.08)] p-4 text-sm text-[rgb(146,64,14)]"
      >
        <AlertTriangle className="size-5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">⚠️ Paiement en retard</p>
          <p className="mt-0.5">
            Stripe n&apos;a pas pu débiter ton moyen de paiement. Mets-le à
            jour avant la prochaine échéance, sinon ton service sera suspendu
            automatiquement.
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="shrink-0 rounded-md bg-[rgb(217,119,6)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <CreditCard className="mr-1 inline size-3" />
          Mettre à jour
        </Link>
      </motion.div>
    );
  }

  // === Bandeau essai gratuit (cadeau de bienvenue 14j ou cadeau admin) ===
  // Affiché uniquement si :
  //  - Une date d'expiration est posée
  //  - Elle est dans le futur
  //  - Aucun abonnement Stripe actif (sinon = payant, pas d'essai)
  if (
    trialExpiresAt &&
    !hasStripeSubscription &&
    (currentPlan === "pro" || currentPlan === "premium")
  ) {
    const expiresDate =
      typeof trialExpiresAt === "string"
        ? new Date(trialExpiresAt)
        : trialExpiresAt;
    const now = new Date();
    const msLeft = expiresDate.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 3600 * 1000)));

    if (msLeft > 0) {
      const isPremium = currentPlan === "premium";
      const urgent = daysLeft <= 3;
      return (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
            urgent
              ? "border-[rgb(217,119,6)]/40 bg-[rgba(245,158,11,0.08)] text-[rgb(146,64,14)]"
              : "border-[var(--accent)]/30 bg-[var(--accent)]/8 text-[var(--text-primary)]"
          }`}
        >
          <Gift
            className={`size-5 shrink-0 ${
              urgent ? "" : "text-[var(--accent)]"
            }`}
          />
          <div className="flex-1">
            <p className="font-semibold">
              🎁 Essai {isPremium ? "Premium" : "Pro"} offert —{" "}
              {daysLeft > 1 ? `${daysLeft} jours restants` : "dernier jour !"}
            </p>
            <p className="mt-0.5 opacity-80">
              {urgent
                ? "Ton essai se termine bientôt. Abonne-toi pour garder toutes les fonctionnalités sans interruption."
                : "Profite de toutes les fonctionnalités Premium gratuitement. Tu peux t'abonner à tout moment pour continuer après l'essai."}
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <CreditCard className="mr-1 inline size-3" />
            S&apos;abonner
          </Link>
        </motion.div>
      );
    }
  }

  return null;
}
