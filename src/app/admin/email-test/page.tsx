import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { EmailTestForm } from "./email-test-form";

export const metadata: Metadata = {
  title: "Test emails · Ruliz Admin",
};

export default async function EmailTestPage() {
  const session = await requireAdmin();

  // Récupère l'email actuel de l'admin pour pré-remplir le destinataire
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: { user: { select: { email: true } } },
  });
  const defaultEmail = authUser?.user?.email ?? session.user.email;

  const hasResendKey = !!process.env.RESEND_API_KEY;
  const mailFrom = process.env.MAIL_FROM ?? "Ruliz <noreply@ruliz-panel.fr>";

  return (
    <div className="space-y-6">
      <header>
        <Badge variant="secondary">
          <Mail className="size-3" /> Test emails
        </Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Tester les emails transactionnels
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Envoie chaque type d&apos;email à une adresse de ton choix pour
          vérifier que la config Resend + DNS marche après le setup du
          domaine custom.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-4 text-sm">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Config actuelle
          </span>
        </div>
        <div className="mt-2 grid gap-1.5 text-xs">
          <div>
            <span className="text-[var(--text-tertiary)]">
              RESEND_API_KEY :
            </span>{" "}
            {hasResendKey ? (
              <span className="text-[var(--neon-success)]">✓ Définie</span>
            ) : (
              <span className="text-[var(--neon-danger)]">
                ✗ Absente — ajoute-la dans Railway Variables avant de tester
              </span>
            )}
          </div>
          <div>
            <span className="text-[var(--text-tertiary)]">MAIL_FROM :</span>{" "}
            <code className="font-mono text-[var(--text-primary)]">
              {mailFrom}
            </code>
          </div>
        </div>
      </div>

      <EmailTestForm defaultEmail={defaultEmail} />
    </div>
  );
}
