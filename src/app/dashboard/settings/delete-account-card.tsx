"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { deleteOwnAccount } from "@/server/dashboard/account-delete-actions";

interface DeleteAccountCardProps {
  userEmail: string;
}

/**
 * Carte "Zone dangereuse" · suppression de compte self-service (RGPD).
 *
 * Double confirmation (anti-fat-finger) :
 *   1. Dialog explicite avec warning rouge listant tout ce qui va être supprimé
 *   2. Re-tape ton email exact
 *   3. Tape "SUPPRIMER" en majuscules
 *   4. Bouton "Supprimer définitivement" · disabled tant que pas confirmé
 *
 * Après succès → redirige vers la landing avec un toast d'au revoir.
 */
export function DeleteAccountCard({ userEmail }: DeleteAccountCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [phraseDraft, setPhraseDraft] = useState("");

  const emailMatches =
    emailDraft.trim().toLowerCase() === userEmail.toLowerCase();
  const phraseMatches = phraseDraft === "SUPPRIMER";
  const canSubmit = emailMatches && phraseMatches && !pending;

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteOwnAccount({
        confirmEmail: emailDraft.trim(),
        confirmPhrase: phraseDraft,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Sign out côté Better-Auth pour clear le cookie de session local
      await authClient.signOut().catch(() => null);
      toast.success(
        `Compte supprimé. ${res.data?.purgedImages ?? 0} fichier${(res.data?.purgedImages ?? 0) > 1 ? "s" : ""} retiré${(res.data?.purgedImages ?? 0) > 1 ? "s" : ""} du stockage. À bientôt !`,
        { duration: 6000 },
      );
      // Hard refresh pour purger le state Next.js + cookies côté navigateur
      window.location.href = "/";
    });
  };

  return (
    <Card className="border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)]/20">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--neon-danger-soft)] text-[var(--neon-danger)] ring-1 ring-[var(--neon-danger)]/30">
            <AlertTriangle className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <CardTitle className="text-[var(--neon-danger)]">
              Zone dangereuse
            </CardTitle>
            <CardDescription className="mt-1">
              Supprime définitivement ton compte Ruliz, tes restaurants, tes
              QR codes, tes photos et toutes les données associées.{" "}
              <strong>Action irréversible.</strong>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="border-[var(--neon-danger)]/40 text-[var(--neon-danger)] hover:bg-[var(--neon-danger-soft)] hover:text-[var(--neon-danger)]"
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              Supprimer mon compte
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[var(--neon-danger)]">
                <AlertTriangle className="size-5" strokeWidth={2} />
                Supprimer définitivement ton compte ?
              </DialogTitle>
              <DialogDescription className="pt-2">
                Cette action supprimera <strong>définitivement</strong> :
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <ul className="ml-1 space-y-1 text-sm text-[var(--text-secondary)]">
                <Li>
                  Tes <strong>restaurants</strong> et leurs cartes (catégories,
                  produits, allergènes, suggestions)
                </Li>
                <Li>
                  Tes <strong>QR codes</strong> générés et leurs statistiques de
                  scan
                </Li>
                <Li>
                  Tes <strong>logos, bannières et photos</strong> de produits
                  (purgés du stockage)
                </Li>
                <Li>
                  Tes <strong>roulettes / jeux</strong> et la base de
                  participants
                </Li>
                <Li>
                  Tes <strong>contacts clients SMS</strong>
                </Li>
                <Li>
                  Ton <strong>abonnement Stripe</strong> est résilié
                  immédiatement (sans pro-rata)
                </Li>
              </ul>

              <div className="rounded-lg border border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] p-3 text-xs text-[var(--text-secondary)]">
                <strong className="text-[var(--neon-violet)]">À noter :</strong>{" "}
                Les <strong>factures et bons de commande</strong> sont
                conservés en archives (obligation comptable 10 ans, art.
                L123-22 Code de commerce) mais toutes tes données personnelles
                sont anonymisées.
              </div>

              <div className="space-y-2 pt-2">
                <div>
                  <Label className="text-xs">
                    1. Confirme ton email :{" "}
                    <span className="font-mono text-[var(--text-tertiary)]">
                      {userEmail}
                    </span>
                  </Label>
                  <Input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    placeholder="Re-tape ton email exact"
                    className="mt-1 font-mono"
                    autoComplete="off"
                    disabled={pending}
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    2. Tape{" "}
                    <span className="font-mono text-[var(--neon-danger)]">
                      SUPPRIMER
                    </span>{" "}
                    en majuscules
                  </Label>
                  <Input
                    value={phraseDraft}
                    onChange={(e) => setPhraseDraft(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="mt-1 font-mono uppercase"
                    autoComplete="off"
                    disabled={pending}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setEmailDraft("");
                  setPhraseDraft("");
                }}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleDelete}
                disabled={!canSubmit}
                className="bg-[var(--neon-danger)] hover:bg-[var(--neon-danger)]/90"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" strokeWidth={1.75} />
                )}
                Supprimer définitivement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative pl-5 before:absolute before:left-0 before:top-[0.55em] before:size-1.5 before:rounded-full before:bg-[var(--neon-danger)]">
      {children}
    </li>
  );
}
