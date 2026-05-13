"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Gift,
  Key,
  Loader2,
  Mail,
  ShoppingBag,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendTestEmail } from "@/server/admin/email-test-actions";

type EmailType =
  | "welcome"
  | "reset-password"
  | "team-invite"
  | "boutique-confirm"
  | "boutique-admin"
  | "jeu-gain";

interface EmailKind {
  type: EmailType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const EMAIL_KINDS: EmailKind[] = [
  {
    type: "welcome",
    label: "Bienvenue (création compte)",
    description: "Envoyé après un signup réussi.",
    icon: UserPlus,
  },
  {
    type: "reset-password",
    label: "Mot de passe oublié",
    description: "Lien de réinitialisation valide 1h.",
    icon: Key,
  },
  {
    type: "team-invite",
    label: "Invitation équipe",
    description: "Quand un restaurateur invite un collaborateur.",
    icon: Users,
  },
  {
    type: "boutique-confirm",
    label: "Confirmation commande boutique",
    description: "Bon de commande envoyé au client après checkout.",
    icon: ShoppingBag,
  },
  {
    type: "boutique-admin",
    label: "Notification commande boutique (admin)",
    description: "Email envoyé à l'admin pour traiter une nouvelle commande.",
    icon: ShoppingBag,
  },
  {
    type: "jeu-gain",
    label: "Lot gagné à la roulette",
    description:
      "Email envoyé au gagnant avec le code à présenter au serveur.",
    icon: Gift,
  },
];

export function EmailTestForm({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [sentSet, setSentSet] = useState<Set<EmailType>>(new Set());
  const [pendingType, setPendingType] = useState<EmailType | null>(null);
  const [, startTransition] = useTransition();

  const handleSend = (type: EmailType) => {
    setPendingType(type);
    startTransition(async () => {
      const res = await sendTestEmail({ to: email, type });
      setPendingType(null);
      if (res.ok) {
        toast.success(`Email "${type}" envoyé à ${email}`);
        setSentSet((s) => new Set(s).add(type));
      } else {
        toast.error(`Échec : ${res.error}`);
      }
    });
  };

  const handleSendAll = () => {
    EMAIL_KINDS.forEach((kind, i) => {
      // Espacement de 800ms entre chaque pour ne pas spammer Resend
      setTimeout(() => handleSend(kind.type), i * 800);
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-5">
        <Label htmlFor="email" className="text-sm font-medium">
          Adresse email du destinataire
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tristan@example.fr"
          className="mt-2"
          autoComplete="off"
        />
        <p className="mt-2 text-xs text-[var(--text-tertiary)]">
          Reçois tous les emails à cette adresse pour vérifier le rendu visuel +
          la délivrabilité. Vérifie aussi les spams si tu reçois rien.
        </p>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={handleSendAll}
            disabled={pendingType !== null || !email}
            variant="primary"
          >
            <Mail className="size-4" strokeWidth={2} />
            Envoyer tous les emails (6×)
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {EMAIL_KINDS.map((kind) => {
          const Icon = kind.icon;
          const isSent = sentSet.has(kind.type);
          const isPending = pendingType === kind.type;
          return (
            <div
              key={kind.type}
              className="flex items-center gap-4 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-4 transition-colors hover:border-[var(--border-glass-hover)]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {kind.label}
                  </p>
                  {isSent && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--neon-success-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--neon-success)]">
                      <CheckCircle2 className="size-3" strokeWidth={2.5} />
                      Envoyé
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                  {kind.description}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSend(kind.type)}
                disabled={isPending || pendingType !== null || !email}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  <>
                    <Mail className="size-3.5" strokeWidth={1.75} />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
