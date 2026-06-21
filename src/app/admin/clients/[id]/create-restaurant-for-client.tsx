"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { createRestaurantForClient } from "@/server/admin/actions";

export function CreateRestaurantForClient({ userId }: { userId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (nom.trim().length === 0) {
      toast.error("Donne un nom au restaurant.");
      return;
    }
    startTransition(async () => {
      const res = await createRestaurantForClient({ userId, nom, ville });
      if (res.ok) {
        toast.success("Restaurant créé pour ce client.");
        setNom("");
        setVille("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        Créer un restaurant
      </Button>
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Building2 className="size-4 text-[var(--accent)]" />
          Nouveau restaurant
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label="Annuler"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs">Nom *</Label>
          <Input
            autoFocus
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Le Tire-Bouchon"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Ville</Label>
          <Input
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Bordeaux"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Annuler
        </Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Créer
        </Button>
      </div>
      <p className="text-[11px] text-[var(--text-muted)]">
        Plan freemium par défaut. Tu pourras offrir un plan depuis l&apos;onglet
        « Droits &amp; Plans ».
      </p>
    </Card>
  );
}
