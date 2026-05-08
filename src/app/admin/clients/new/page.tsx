import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateClientForm } from "./create-form";

export const metadata: Metadata = {
  title: "Nouveau client · Admin Ruliz",
};

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/clients">
            <ArrowLeft className="size-3.5" />
            Tous les clients
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Créer un client</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Compte restaurateur. Tu peux activer la démo immédiatement, et il configurera son
          premier restaurant après sa première connexion.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
          <CardDescription>
            Le mot de passe est envoyé par email — le restaurateur peut le changer à la première connexion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
