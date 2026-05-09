"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { updateBoutiqueCommande } from "@/server/admin/boutique/actions";

type Statut =
  | "en_attente"
  | "en_preparation"
  | "expediee"
  | "livree"
  | "annulee";

interface SerializedCommande {
  id: string;
  produitId: string;
  userId: number;
  restaurantId: string | null;
  quantite: number;
  prixUnitaire: number;
  totalCentimes: number;
  devise: string;
  livraisonNom: string | null;
  livraisonAdresse: string | null;
  livraisonVille: string | null;
  livraisonCodePostal: string | null;
  livraisonPays: string | null;
  livraisonTelephone: string | null;
  notesClient: string | null;
  notesAdmin: string | null;
  statut: Statut;
  createdAt: string;
  produit: {
    id: string;
    nom: string;
    slug: string;
    imageUrl: string | null;
  };
  user: {
    id: number;
    email: string;
    prenom: string | null;
    nom: string | null;
    telephone: string | null;
  };
  restaurant: { id: string; nom: string } | null;
}

const STATUT_TONE: Record<Statut, { label: string; classes: string }> = {
  en_attente: {
    label: "En attente",
    classes:
      "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)]",
  },
  en_preparation: {
    label: "En préparation",
    classes:
      "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
  },
  expediee: {
    label: "Expédiée",
    classes:
      "border-[var(--neon-violet)]/30 bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]",
  },
  livree: {
    label: "Livrée",
    classes:
      "border-[var(--neon-success)]/30 bg-[var(--neon-success-soft)] text-[var(--neon-success)]",
  },
  annulee: {
    label: "Annulée",
    classes:
      "border-[var(--neon-danger)]/30 bg-[var(--neon-danger-soft)] text-[var(--neon-danger)]",
  },
};

export function CommandesAdminTable({
  commandes,
}: {
  commandes: SerializedCommande[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleStatutChange = (id: string, newStatut: Statut) => {
    setPendingId(id);
    startTransition(async () => {
      const res = await updateBoutiqueCommande({ id, statut: newStatut });
      setPendingId(null);
      if (res.ok) {
        toast.success("Statut mis à jour");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  if (commandes.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-12 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Aucune commande pour l&apos;instant.
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          Les clients pourront commander dès qu&apos;un produit sera publié.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Produit</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="hidden lg:table-cell">Livraison</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commandes.map((c) => {
            const tone = STATUT_TONE[c.statut];
            const fullName =
              [c.user.prenom, c.user.nom].filter(Boolean).join(" ") ||
              c.user.email;
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded-md bg-[var(--bg-glass-strong)]">
                    {c.produit.imageUrl ? (
                      <Image
                        src={c.produit.imageUrl}
                        alt=""
                        width={40}
                        height={40}
                        unoptimized
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageOff
                        className="size-4 text-[var(--text-tertiary)]"
                        strokeWidth={1.75}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-[var(--text-primary)]">
                    {c.produit.nom}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">
                    × {c.quantite}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-[var(--text-primary)]">
                    {fullName}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">
                    {c.user.email}
                  </div>
                  {c.restaurant && (
                    <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                      {c.restaurant.nom}
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs">
                  {c.livraisonAdresse ? (
                    <>
                      <div>{c.livraisonNom}</div>
                      <div className="text-[var(--text-tertiary)]">
                        {c.livraisonAdresse}
                      </div>
                      <div className="text-[var(--text-tertiary)]">
                        {[c.livraisonCodePostal, c.livraisonVille, c.livraisonPays]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </>
                  ) : (
                    <span className="text-[var(--text-tertiary)]">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {(c.totalCentimes / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: c.devise,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "hidden inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium md:inline-flex",
                        tone.classes,
                      )}
                    >
                      {tone.label}
                    </span>
                    <Select
                      value={c.statut}
                      onValueChange={(v) => handleStatutChange(c.id, v as Statut)}
                      disabled={pendingId === c.id}
                    >
                      <SelectTrigger className="h-7 w-[140px]">
                        {pendingId === c.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="en_preparation">En préparation</SelectItem>
                        <SelectItem value="expediee">Expédiée</SelectItem>
                        <SelectItem value="livree">Livrée</SelectItem>
                        <SelectItem value="annulee">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-[var(--text-tertiary)]">
                  {format(new Date(c.createdAt), "d MMM yyyy", { locale: fr })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
