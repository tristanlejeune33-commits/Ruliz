"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowUpDown,
  Download,
  KeyRound,
  MoreHorizontal,
  Search,
  ShieldOff,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlanBadge, StatusBadge, type Plan, type Statut } from "@/components/shared/status-badge";
import { downloadCSV, toCSV } from "@/lib/csv";
import {
  sendResetPasswordEmail,
  setClientStatut,
  toggleClientDemo,
} from "@/server/admin/actions";

import type { Serialized } from "@/lib/serialize";
import type { ClientListItem } from "@/server/admin/queries";

type ClientRow = Serialized<ClientListItem>;

interface ClientsTableProps {
  clients: ClientRow[];
  initialFilters: { search: string; statut: string; plan: string };
}

export function ClientsTable({ clients, initialFilters }: ClientsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialFilters.search);
  const [statut, setStatut] = useState(initialFilters.statut);
  const [plan, setPlan] = useState(initialFilters.plan);
  const [isPending, startTransition] = useTransition();

  const updateFilter = (key: "q" | "statut" | "plan", value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`/admin/clients${params.size ? `?${params.toString()}` : ""}`);
    });
  };

  const sortedClients = useMemo(
    () =>
      [...clients].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [clients],
  );

  const handleExport = () => {
    const rows = sortedClients.map((c) => ({
      email: c.email,
      prenom: c.prenom ?? "",
      nom: c.nom ?? "",
      ville: c.ville ?? "",
      statut: c.statut,
      restaurants: c.restaurants.map((r) => r.nom).join(" · "),
      plans: c.restaurants.map((r) => r.plan).join(" · "),
      cree_le: format(new Date(c.createdAt), "yyyy-MM-dd"),
      derniere_connexion: c.lastLoginAt
        ? format(new Date(c.lastLoginAt), "yyyy-MM-dd HH:mm")
        : "",
    }));
    const csv = toCSV(rows, [
      { key: "email", label: "Email" },
      { key: "prenom", label: "Prénom" },
      { key: "nom", label: "Nom" },
      { key: "ville", label: "Ville" },
      { key: "statut", label: "Statut" },
      { key: "restaurants", label: "Restaurants" },
      { key: "plans", label: "Plans" },
      { key: "cree_le", label: "Créé le" },
      { key: "derniere_connexion", label: "Dernière connexion" },
    ]);
    downloadCSV(`ruliz-clients-${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Email, nom, restaurant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateFilter("q", search);
            }}
            className="pl-9"
          />
        </div>
        <Select value={statut} onValueChange={(v) => { setStatut(v); updateFilter("statut", v); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="actif">Actif</SelectItem>
            <SelectItem value="suspendu">Suspendu</SelectItem>
            <SelectItem value="archive">Archivé</SelectItem>
            <SelectItem value="demo_terminee">Démo terminée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={plan} onValueChange={(v) => { setPlan(v); updateFilter("plan", v); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous plans</SelectItem>
            <SelectItem value="freemium">Freemium</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!sortedClients.length}>
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[26%]">Client</TableHead>
            <TableHead className="w-[22%]">Restaurants</TableHead>
            <TableHead className="w-[14%]">Statut</TableHead>
            <TableHead className="w-[10%]">Démo</TableHead>
            <TableHead className="w-[16%]">
              <span className="inline-flex items-center gap-1.5">
                Inscrit
                <ArrowUpDown className="size-3" />
              </span>
            </TableHead>
            <TableHead className="w-[8%]">Connexion</TableHead>
            <TableHead className="w-[4%] sr-only">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedClients.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-sm text-[var(--text-muted)]">
                Aucun client trouvé.
              </TableCell>
            </TableRow>
          )}
          {sortedClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="group flex flex-col"
                >
                  <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                    {client.prenom} {client.nom}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{client.email}</span>
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {client.restaurants.length === 0 && (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                  {client.restaurants.slice(0, 2).map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <span className="truncate text-sm">{r.nom}</span>
                      <PlanBadge plan={r.plan as Plan} />
                    </div>
                  ))}
                  {client.restaurants.length > 2 && (
                    <span className="text-xs text-[var(--text-muted)]">
                      +{client.restaurants.length - 2} autres
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge statut={client.statut as Statut} />
              </TableCell>
              <TableCell>
                {client.demoActive ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--accent)]">
                    <Sparkles className="size-3" /> Active
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm text-[var(--text-secondary)]">
                  {format(new Date(client.createdAt), "d MMM yyyy", { locale: fr })}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-[var(--text-muted)]">
                  {client.lastLoginAt
                    ? formatDistanceToNow(new Date(client.lastLoginAt), {
                        addSuffix: true,
                        locale: fr,
                      })
                    : "Jamais"}
                </span>
              </TableCell>
              <TableCell>
                <RowActions
                  id={client.id}
                  email={client.email}
                  statut={client.statut as Statut}
                  demoActive={client.demoActive}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {isPending && (
        <p className="text-xs text-[var(--text-muted)]">Filtres en cours…</p>
      )}
    </div>
  );
}

function RowActions({
  id,
  email,
  statut,
  demoActive,
}: {
  id: number;
  email: string;
  statut: Statut;
  demoActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const isActive = statut === "actif";

  const handleStatutChange = (next: Statut) => {
    startTransition(async () => {
      const res = await setClientStatut(id, next);
      if (res.ok) toast.success(`Statut → ${next}`);
      else toast.error(res.error);
    });
  };

  const handleDemo = () => {
    startTransition(async () => {
      const res = await toggleClientDemo(id);
      if (res.ok) toast.success(demoActive ? "Démo désactivée" : "Démo activée");
      else toast.error(res.error);
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      const res = await sendResetPasswordEmail(email);
      if (res.ok) toast.success(`Email envoyé à ${email}`);
      else toast.error(res.error);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label="Actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleReset}>
          <KeyRound /> Reset mot de passe
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDemo}>
          <Sparkles /> {demoActive ? "Désactiver la démo" : "Activer la démo"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isActive ? (
          <DropdownMenuItem onClick={() => handleStatutChange("suspendu")}>
            <ShieldOff /> Suspendre
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => handleStatutChange("actif")}>
            <Sparkles /> Réactiver
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => handleStatutChange("archive")}
          className="text-[var(--color-destructive)] data-[highlighted]:text-[var(--color-destructive)]"
        >
          <Trash2 /> Archiver
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
