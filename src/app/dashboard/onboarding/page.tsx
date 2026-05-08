import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Onboarding · Ruliz",
};

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <Card>
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-[var(--accent)]/15">
            <Sparkles className="size-5 text-[var(--accent)]" />
          </div>
          <CardTitle>Bienvenue sur Ruliz</CardTitle>
          <CardDescription>
            Tu n&apos;as pas encore de restaurant configuré. Contacte ton admin pour
            qu&apos;il en ajoute un, ou crée le premier dès maintenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled>Créer mon premier restaurant (bientôt)</Button>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Le wizard de création arrive en Phase 4.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
