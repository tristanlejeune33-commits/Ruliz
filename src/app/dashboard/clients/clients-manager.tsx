"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Cake,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createClient,
  deleteClient,
  updateClient,
} from "@/server/dashboard/clients-actions";

interface Client {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  anniversaire: string | null;
  source: string | null;
  optInSms: boolean;
  createdAt: string;
}

interface ClientsManagerProps {
  restaurantId: string;
  initialClients: Client[];
}

export function ClientsManager({
  restaurantId,
  initialClients,
}: ClientsManagerProps) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "roulette">(
    "all",
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialClients.filter((c) => {
      if (sourceFilter === "manual" && c.source !== "manual") return false;
      if (sourceFilter === "roulette" && c.source !== "roulette") return false;
      if (!q) return true;
      return (
        c.prenom?.toLowerCase().includes(q) ||
        c.nom?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telephone?.includes(q)
      );
    });
  }, [initialClients, search, sourceFilter]);

  return (
    <div>
      {/* Toolbar : recherche + filtres + bouton ajout */}
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Recherche par nom, email, téléphone…"
              className="pl-8"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "manual", "roulette"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSourceFilter(s)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  sourceFilter === s
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]"
                }`}
              >
                {s === "all" ? "Tous" : s === "manual" ? "Manuels" : "Roulette"}
              </button>
            ))}
          </div>
        </div>

        <ClientFormDialog
          restaurantId={restaurantId}
          mode="create"
          trigger={
            <Button type="button" size="sm">
              <UserPlus className="size-3.5" />
              Ajouter un client
            </Button>
          }
        />
      </div>

      {/* Table / Liste */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-12 text-center">
          <Users className="size-8 text-[var(--text-tertiary)]" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {initialClients.length === 0
              ? "Aucun client pour l'instant"
              : "Aucun résultat avec ce filtre"}
          </p>
          {initialClients.length === 0 && (
            <ClientFormDialog
              restaurantId={restaurantId}
              mode="create"
              trigger={
                <Button type="button" size="sm" variant="outline">
                  <Plus className="size-3.5" />
                  Ajouter ton premier client
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {filtered.map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              restaurantId={restaurantId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// LIGNE CLIENT
// ============================================================

function ClientRow({
  client,
  restaurantId,
}: {
  client: Client;
  restaurantId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const fullName =
    [client.prenom, client.nom].filter(Boolean).join(" ") || "Sans nom";

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteClient({ restaurantId, id: client.id });
      if (res.ok) {
        toast.success("Client supprimé");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-3 p-3 hover:bg-[var(--bg-glass)]/30">
      {/* Avatar coloré selon source */}
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          client.source === "manual"
            ? "bg-[var(--accent)]/15 text-[var(--accent)]"
            : client.source === "roulette"
              ? "bg-[var(--neon-violet-soft)] text-[var(--neon-violet)]"
              : "bg-[var(--bg-glass-strong)] text-[var(--text-tertiary)]"
        }`}
      >
        {(client.prenom?.[0] || client.nom?.[0] || "?").toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[var(--text-primary)]">
            {fullName}
          </span>
          <Badge
            variant={client.source === "manual" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {client.source === "manual"
              ? "Manuel"
              : client.source === "roulette"
                ? "Roulette"
                : client.source ?? "—"}
          </Badge>
          {!client.optInSms && (
            <Badge variant="destructive" className="text-[10px]">
              Opt-out SMS
            </Badge>
          )}
          {client.anniversaire && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
              <Cake className="size-2.5" />
              {format(new Date(client.anniversaire), "d MMM", { locale: fr })}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-[var(--text-tertiary)]">
          {client.telephone && (
            <span className="inline-flex items-center gap-1 font-mono">
              <Phone className="size-3" />
              +{client.telephone}
            </span>
          )}
          {client.email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3" />
              {client.email}
            </span>
          )}
          <span>
            Ajouté{" "}
            {format(new Date(client.createdAt), "d MMM yyyy", { locale: fr })}
          </span>
        </div>
      </div>

      <div className="flex gap-1">
        <ClientFormDialog
          restaurantId={restaurantId}
          mode="edit"
          initial={client}
          trigger={
            <Button type="button" size="sm" variant="ghost" disabled={pending}>
              <Pencil className="size-3.5" />
            </Button>
          }
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              aria-label="Supprimer"
            >
              <Trash2 className="size-3.5 text-[var(--neon-danger)]" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
              <AlertDialogDescription>
                {fullName} sera retiré de ta base. Ses participations à la
                roulette resteront en historique. Action irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

// ============================================================
// DIALOG AJOUT / ÉDITION
// ============================================================

function ClientFormDialog({
  restaurantId,
  mode,
  initial,
  trigger,
}: {
  restaurantId: string;
  mode: "create" | "edit";
  initial?: Client;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [prenom, setPrenom] = useState(initial?.prenom ?? "");
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [telephone, setTelephone] = useState(initial?.telephone ?? "");
  const [anniversaire, setAnniversaire] = useState(
    initial?.anniversaire ?? "",
  );
  const [optInSms, setOptInSms] = useState(initial?.optInSms ?? true);

  const reset = () => {
    setPrenom(initial?.prenom ?? "");
    setNom(initial?.nom ?? "");
    setEmail(initial?.email ?? "");
    setTelephone(initial?.telephone ?? "");
    setAnniversaire(initial?.anniversaire ?? "");
    setOptInSms(initial?.optInSms ?? true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        restaurantId,
        prenom,
        nom,
        email,
        telephone,
        anniversaire,
        optInSms,
      };
      const res =
        mode === "edit" && initial
          ? await updateClient({ ...payload, id: initial.id })
          : await createClient(payload);

      if (res.ok) {
        toast.success(
          mode === "edit" ? "Client mis à jour" : "Client ajouté à ta base",
        );
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Modifier un client" : "Ajouter un client"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Mets à jour les informations de ce client."
              : "Ajoute un client manuellement (ancien client, contact carnet, etc.). Tu pourras lui envoyer des SMS via ta base."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Prénom</Label>
              <Input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Marc"
                maxLength={100}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Nom</Label>
              <Input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Dupont"
                maxLength={100}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">
              Téléphone <span className="text-[var(--neon-danger)]">*</span>
            </Label>
            <Input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="06 12 34 56 78 (ou +33 6 12 34 56 78)"
              maxLength={30}
              className="mt-1 font-mono"
              required
            />
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              Format français accepté (06 / +33). Pour l&apos;international,
              utilise le préfixe (+32 Belgique, +41 Suisse, +1 USA…).
            </p>
          </div>

          <div>
            <Label className="text-xs">Email (optionnel)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marc.dupont@email.fr"
              maxLength={255}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">
              Anniversaire (optionnel, pour l&apos;automatisation)
            </Label>
            <Input
              type="date"
              value={anniversaire}
              onChange={(e) => setAnniversaire(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-2.5">
            <div>
              <Label className="text-xs">Accepte les SMS marketing</Label>
              <p className="text-[10px] text-[var(--text-muted)]">
                Si décoché, ce client ne recevra aucun SMS (RGPD).
              </p>
            </div>
            <Switch checked={optInSms} onCheckedChange={setOptInSms} />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {mode === "edit" ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
