"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  MoreHorizontal,
  ShieldOff,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  deleteClientAccount,
  sendResetPasswordEmail,
  setClientStatut,
  toggleClientDemo,
} from "@/server/admin/actions";
import type { Statut } from "@/components/shared/status-badge";

interface ClientActionsProps {
  id: number;
  email: string;
  statut: Statut;
  demoActive: boolean;
}

export function ClientActions({ id, email, statut, demoActive }: ClientActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isActive = statut === "actif";

  const onStatut = (next: Statut) =>
    startTransition(async () => {
      const res = await setClientStatut(id, next);
      if (res.ok) {
        toast.success(`Statut mis à jour : ${next}`);
        router.refresh();
      } else toast.error(res.error);
    });

  const onDemo = () =>
    startTransition(async () => {
      const res = await toggleClientDemo(id);
      if (res.ok) {
        toast.success(demoActive ? "Démo désactivée" : "Démo activée");
        router.refresh();
      } else toast.error(res.error);
    });

  const onReset = () =>
    startTransition(async () => {
      const res = await sendResetPasswordEmail(email);
      if (res.ok) toast.success(`Email envoyé à ${email}`);
      else toast.error(res.error);
    });

  const onHardDelete = () =>
    startTransition(async () => {
      const res = await deleteClientAccount(id);
      if (res.ok) {
        toast.success(
          `Compte supprimé. ${res.data?.purgedImages ?? 0} image${(res.data?.purgedImages ?? 0) > 1 ? "s" : ""} purgée${(res.data?.purgedImages ?? 0) > 1 ? "s" : ""} de R2.`,
          { duration: 6000 },
        );
        router.push("/admin/clients");
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onReset} disabled={pending}>
        <KeyRound className="size-3.5" /> Reset password
      </Button>
      <Button
        variant={demoActive ? "secondary" : "outline"}
        size="sm"
        onClick={onDemo}
        disabled={pending}
      >
        <Sparkles className="size-3.5" />
        {demoActive ? "Désactiver démo" : "Activer démo"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={pending}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Plus d&apos;actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isActive ? (
            <DropdownMenuItem onClick={() => onStatut("suspendu")}>
              <ShieldOff /> Suspendre le compte
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onStatut("actif")}>
              <Sparkles /> Réactiver le compte
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-[var(--color-destructive)] data-[highlighted]:text-[var(--color-destructive)]"
              >
                <Trash2 /> Archiver le compte
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archiver ce compte ?</AlertDialogTitle>
                <AlertDialogDescription>
                  L&apos;utilisateur ne pourra plus se connecter. Ses restaurants restent
                  visibles dans l&apos;admin mais sortent du dashboard. Action réversible
                  via Réactiver.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => onStatut("archive")}>
                  Archiver
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Suppression définitive (RGPD) · purge images R2 + anonymise PII +
              annule Stripe + empêche tout futur login. Action irréversible. */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-[var(--neon-danger)] data-[highlighted]:text-[var(--neon-danger)]"
              >
                <Trash2 /> Supprimer définitivement (RGPD)
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[var(--neon-danger)]">
                  Supprimer définitivement ce compte ?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Action <strong>irréversible</strong>. Cette suppression :
                  <ul className="mt-2 ml-4 list-disc space-y-0.5 text-xs">
                    <li>Annule les souscriptions Stripe actives</li>
                    <li>Purge toutes les images R2 du client (logos, photos…)</li>
                    <li>Anonymise les données personnelles (email, nom, téléphone, adresse)</li>
                    <li>Archive les restaurants et empêche tout login</li>
                    <li>
                      Conserve les <strong>factures et BC</strong> (obligation
                      comptable 10 ans)
                    </li>
                  </ul>
                  À utiliser uniquement sur demande RGPD du client ou compte
                  abandonné depuis 6+ mois.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onHardDelete}
                  className="bg-[var(--neon-danger)] hover:bg-[var(--neon-danger)]/90"
                >
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
