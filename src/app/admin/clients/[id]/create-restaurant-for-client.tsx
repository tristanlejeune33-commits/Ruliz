"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlagIcon } from "@/components/shared/flag-icon";
import { LANG_META, SUPPORTED_LANGS } from "@/lib/langs";
import { createRestaurantForClient } from "@/server/admin/actions";

type Langue = "fr" | "en" | "es" | "de" | "it" | "pt" | "zh";

interface Defaults {
  email?: string;
  telephone?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  langue?: Langue;
}

export function CreateRestaurantForClient({
  userId,
  defaults,
}: {
  userId: number;
  defaults?: Defaults;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState(defaults?.email ?? "");
  const [telephone, setTelephone] = useState(defaults?.telephone ?? "");
  const [adresse, setAdresse] = useState(defaults?.adresse ?? "");
  const [codePostal, setCodePostal] = useState(defaults?.codePostal ?? "");
  const [ville, setVille] = useState(defaults?.ville ?? "");
  const [pays, setPays] = useState(defaults?.pays ?? "France");
  const [langueNative, setLangueNative] = useState<Langue>(
    defaults?.langue ?? "fr",
  );

  function submit() {
    if (nom.trim().length === 0) {
      toast.error("Donne un nom au restaurant.");
      return;
    }
    startTransition(async () => {
      const res = await createRestaurantForClient({
        userId,
        nom,
        email,
        telephone,
        adresse,
        codePostal,
        ville,
        pays,
        langueNative,
      });
      if (res.ok) {
        toast.success("Restaurant créé pour ce client.");
        setNom("");
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
    <Card className="space-y-4 p-4">
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

      <Field label="Nom du restaurant *">
        <Input
          autoFocus
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Le Tire-Bouchon"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email de contact">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@resto.fr"
          />
        </Field>
        <Field label="Téléphone">
          <Input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="05 56 …"
          />
        </Field>
      </div>

      <Field label="Adresse">
        <Input
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="12 rue de la Paix"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Code postal">
          <Input
            value={codePostal}
            onChange={(e) => setCodePostal(e.target.value)}
            placeholder="33000"
          />
        </Field>
        <Field label="Ville">
          <Input
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Bordeaux"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Pays">
          <Input
            value={pays}
            onChange={(e) => setPays(e.target.value)}
            placeholder="France"
          />
        </Field>
        <Field label="Langue de la carte">
          <Select
            value={langueNative}
            onValueChange={(v) => setLangueNative(v as Langue)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGS.map((l) => (
                <SelectItem key={l} value={l}>
                  <span className="flex items-center gap-2">
                    <FlagIcon lang={l} width={18} rounded />
                    {LANG_META[l].name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-[var(--text-muted)]">
          Plan freemium par défaut (modifiable dans « Droits &amp; Plans »).
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Créer le restaurant
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
