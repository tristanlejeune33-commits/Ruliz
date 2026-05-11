import { Coins, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SmsBalanceCardProps {
  balance: number;
  totalAcquired: number;
  totalSpent: number;
}

/**
 * Affichage du solde SMS en gros, avec stats cumulées (total acheté / dépensé).
 * Couleur du chiffre principal change si solde faible :
 *  - > 50 : violet accent (OK)
 *  - 10-50 : jaune (attention)
 *  - 0-10 : rouge (urgent, achète un pack)
 */
export function SmsBalanceCard({
  balance,
  totalAcquired,
  totalSpent,
}: SmsBalanceCardProps) {
  const tone =
    balance === 0
      ? "empty"
      : balance < 10
        ? "danger"
        : balance < 50
          ? "warn"
          : "ok";

  const balanceColor = {
    ok: "text-[var(--accent)]",
    warn: "text-[var(--neon-violet)]",
    danger: "text-[var(--neon-danger)]",
    empty: "text-[var(--text-tertiary)]",
  }[tone];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Gros chiffre */}
        <div className="flex items-center gap-4">
          <div
            className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/30"
            aria-hidden
          >
            <Coins className="size-7" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Crédit SMS disponible
            </p>
            <p
              className={`text-4xl font-bold tabular-nums leading-tight ${balanceColor}`}
            >
              {balance.toLocaleString("fr-FR")}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {tone === "empty"
                ? "Achète un pack pour envoyer ton 1er SMS"
                : tone === "danger"
                  ? "Solde faible : pense à recharger"
                  : tone === "warn"
                    ? "Tu peux encore envoyer quelques SMS"
                    : "De quoi faire de belles campagnes"}
            </p>
          </div>
        </div>

        {/* Stats cumulées */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs uppercase tracking-wider text-[var(--text-muted)]">
              <TrendingUp className="size-3" strokeWidth={1.75} />
              Total acheté
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {totalAcquired.toLocaleString("fr-FR")}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs uppercase tracking-wider text-[var(--text-muted)]">
              <TrendingDown className="size-3" strokeWidth={1.75} />
              Total envoyé
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {totalSpent.toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
