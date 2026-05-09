"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, CreditCard, XCircle } from "lucide-react";

interface SubscriptionBannerProps {
  status: string | null;
  /** Statut métier du restaurant (suspendu / actif) */
  restaurantStatut: string;
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

  return null;
}
