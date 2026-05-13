import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listClients } from "@/server/admin/queries";
import { serialize } from "@/lib/serialize";
import { ClientsTable } from "./clients-table";

export const metadata: Metadata = {
  title: "Clients Admin Ruliz",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    plan?: string;
  }>;
}

export default async function AdminClientsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters = {
    search: params.q ?? "",
    statut: (params.statut as "actif" | "suspendu" | "archive" | "demo_terminee" | "all") ?? "all",
    plan: (params.plan as "freemium" | "pro" | "premium" | "all") ?? "all",
    limit: 100,
    offset: 0,
  };

  const { items, total } = await listClients(filters);
  const data = serialize(items);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">
            <Users className="size-3" />
            {total} {total > 1 ? "clients" : "client"}
          </Badge>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Gère les comptes restaurateurs, leurs plans et leurs statuts.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/clients/new">
            <Plus className="size-4" />
            Nouveau client
          </Link>
        </Button>
      </header>

      <ClientsTable clients={data} initialFilters={filters} />
    </div>
  );
}
