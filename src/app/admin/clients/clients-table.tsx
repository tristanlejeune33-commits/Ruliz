"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowUpDown,
  Download,
  Eye,
  KeyRound,
  MoreHorizontal,
  ScanLine,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  setRestaurantPlanByStringId,
  toggleClientDemo,
} from "@/server/admin/actions";
import { cn } from "@/lib/utils";

import type { Serialized } from "@/lib/serialize";
import type { ClientListItem } from "@/server/admin/queries";

type ClientRow = Serialized<ClientListItem>;

type SortKey = "createdAtDesc" | "planDesc" | "planAsc" | "nameAsc" | "lastLoginDesc";

interface ClientsTableProps {
  clients: ClientRow[];
  initialFilters: { search: string; statut: string; plan: string };
}

const PLAN_RANK: Record<string, number> = {
  premium: 3,
  pro: 2,
  freemium: 1,
};

/** Renvoie le plan le plus haut parmi les restaurants d'un client. */
function highestPlan(c: ClientRow): { name: string; rank: number } {
  const ranks = c.restaurants.map((r) => ({
    name: r.plan,
    rank: PLAN_RANK[r.plan] ?? 0,
  }));
  if (ranks.length === 0) return { name: " ", rank: 0 };
  return ranks.reduce((a, b) => (b.rank > a.rank ? b : a));
}

export function ClientsTable({ clients, initialFilters }: ClientsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialFilters.search);
  const [statut, setStatut] = useState(initialFilters.statut);
  const [plan, setPlan] = useState(initialFilters.plan);
  const [sortBy, setSortBy] = useState<SortKey>("createdAtDesc");
  const [isPending, startTransition] = useTransition();

  const updateFilter = (key: "q" | "statut" | "plan", value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`/admin/clients${params.size ? `?${params.toString()}` : ""}`);
    });
  };

  const sortedClients = useMemo(() => {
    const arr = [...clients];
    switch (sortBy) {
      case "planDesc":
        return arr.sort((a, b) => highestPlan(b).rank - highestPlan(a).rank);
      case "planAsc":
        return arr.sort((a, b) => highestPlan(a).rank - highestPlan(b).rank);
      case "nameAsc":
        return arr.sort((a, b) =>
          `${a.prenom ?? ""} ${a.nom ?? ""}`
            .trim()
            .localeCompare(`${b.prenom ?? ""} ${b.nom ?? ""}`.trim(), "fr"),
        );
      case "lastLoginDesc":
        return arr.sort((a, b) => {
          const ax = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bx = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          return bx - ax;
        });
      case "createdAtDesc":
      default:
        return arr.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
  }, [clients, sortBy]);

  const handleExport = () => {
    const rows = sortedClients.map((c) => ({
      email: c.email,
      prenom: c.prenom ?? "",
      nom: c.nom ?? "",
      ville: c.ville ?? "",
      statut: c.statut,
      restaurants: c.restaurants.map((r) => r.nom).join(" "),
      plans: c.restaurants.map((r) => r.plan).join(" "),
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
        {/* Tri client-side : pas besoin de re-fetch, on travaille sur les data déjà chargées */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[200px]">
            <span className="inline-flex items-center gap-1.5">
              <ArrowUpDown className="size-3.5" />
              <SelectValue placeholder="Trier par" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAtDesc">Date d&apos;inscription (récent)</SelectItem>
            <SelectItem value="planDesc">Plan ↓ (Premium → Free)</SelectItem>
            <SelectItem value="planAsc">Plan ↑ (Free → Premium)</SelectItem>
            <SelectItem value="lastLoginDesc">Dernière connexion</SelectItem>
            <SelectItem value="nameAsc">Nom A-Z</SelectItem>
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
            <TableHead className="w-[20%]">Client</TableHead>
            <TableHead className="w-[18%]">Restaurants</TableHead>
            <TableHead className="w-[10%] text-right">
              <span className="inline-flex items-center justify-end gap-1.5">
                Revenus
              </span>
            </TableHead>
            <TableHead className="w-[10%] text-right">
              <span className="inline-flex items-center justify-end gap-1.5">
                <Eye className="size-3" />
                Vues uniques
              </span>
            </TableHead>
            <TableHead className="w-[10%] text-right">
              <span className="inline-flex items-center justify-end gap-1.5">
                <ScanLine className="size-3" />
                Scans
              </span>
            </TableHead>
            <TableHead className="w-[10%]">Statut</TableHead>
            <TableHead className="w-[8%]">Démo</TableHead>
            <TableHead className="w-[10%]">
              <span className="inline-flex items-center gap-1.5">
                Inscrit
                <ArrowUpDown className="size-3" />
              </span>
            </TableHead>
            <TableHead className="w-[4%] sr-only">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedClients.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-12 text-center text-sm text-[var(--text-muted)]">
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
                    <span className="text-xs text-[var(--text-muted)]"> </span>
                  )}
                  {client.restaurants.slice(0, 2).map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <span className="truncate text-sm">{r.nom}</span>
                      <PlanSwitcher
                        restaurantId={r.id.toString()}
                        currentPlan={r.plan as Plan}
                      />
                    </div>
                  ))}
                  {client.restaurants.length > 2 && (
                    <span className="text-xs text-[var(--text-muted)]">
                      +{client.restaurants.length - 2} autres
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={`font-mono text-sm tabular-nums ${
                    (client.revenueCentimes ?? 0) > 0
                      ? "font-semibold text-[var(--neon-success)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {(client.revenueCentimes ?? 0) > 0
                    ? `${((client.revenueCentimes ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`
                    : " "}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={`font-mono text-sm tabular-nums ${
                    (client.scansUniques ?? 0) > 0
                      ? "text-[var(--neon-cyan)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {(client.scansUniques ?? 0) > 0
                    ? (client.scansUniques ?? 0).toLocaleString("fr-FR")
                    : " "}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={`font-mono text-sm tabular-nums ${
                    (client.scansTotal ?? 0) > 0
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {(client.scansTotal ?? 0) > 0
                    ? (client.scansTotal ?? 0).toLocaleString("fr-FR")
                    : " "}
                </span>
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
                  <span className="text-xs text-[var(--text-muted)]"> </span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm text-[var(--text-secondary)]">
                  {format(new Date(client.createdAt), "d MMM yyyy", { locale: fr })}
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

/**
 * PlanSwitcher PlanBadge cliquable qui ouvre un popover avec 3 boutons
 * Free / Pro / Premium pour basculer le plan du restaurant en un click.
 *
 * Server action : setRestaurantPlanByStringId (déjà admin-protected).
 * Bypasse Stripe utile pour offrir un upgrade gratuit, débloquer une démo,
 * ou corriger un sub Stripe désynchronisé.
 */
function PlanSwitcher({
  restaurantId,
  currentPlan,
}: {
  restaurantId: string;
  currentPlan: Plan;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleChange = (next: Plan) => {
    if (next === currentPlan) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await setRestaurantPlanByStringId(restaurantId, next);
      if (res.ok) {
        toast.success(`Plan basculé en ${next}`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Plan actuel : ${currentPlan}. Cliquer pour changer.`}
          disabled={pending}
          className="cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          <PlanBadge plan={currentPlan} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="start">
        <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          Changer le plan
        </p>
        <div className="flex flex-col gap-1">
          <PlanOption
            label="Freemium"
            value="freemium"
            current={currentPlan}
            onClick={() => handleChange("freemium")}
            disabled={pending}
          />
          <PlanOption
            label="Pro"
            value="pro"
            current={currentPlan}
            onClick={() => handleChange("pro")}
            disabled={pending}
          />
          <PlanOption
            label="Premium"
            value="premium"
            current={currentPlan}
            onClick={() => handleChange("premium")}
            disabled={pending}
          />
        </div>
        <p className="mt-2 px-1 text-[10px] text-[var(--text-tertiary)]">
          Bypass Stripe loggé dans /admin/logs
        </p>
      </PopoverContent>
    </Popover>
  );
}

function PlanOption({
  label,
  value,
  current,
  onClick,
  disabled,
}: {
  label: string;
  value: Plan;
  current: Plan;
  onClick: () => void;
  disabled: boolean;
}) {
  const isActive = value === current;
  const TONE: Record<Plan, string> = {
    freemium: "text-[var(--text-secondary)]",
    pro: "text-[var(--neon-cyan)]",
    premium: "text-[var(--neon-violet)]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isActive}
      className={cn(
        "flex h-8 items-center justify-between rounded-md px-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-[var(--bg-glass-strong)] cursor-default"
          : "hover:bg-[var(--bg-glass-hover)] cursor-pointer",
        TONE[value],
      )}
    >
      <span>{label}</span>
      {isActive && (
        <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
          actuel
        </span>
      )}
    </button>
  );
}
