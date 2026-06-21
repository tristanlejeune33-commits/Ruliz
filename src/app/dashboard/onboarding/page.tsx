import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireDashboard } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Bienvenue Ruliz",
};

export default async function OnboardingPage() {
  const session = await requireDashboard();
  const authUser = await prisma.authUser.findUnique({
    where: { id: session.user.id },
    select: {
      userId: true,
      user: { select: { langueNative: true } },
    },
  });

  // Si l'utilisateur a déjà un restaurant, on ne devrait pas être ici.
  if (authUser?.userId) {
    const existing = await prisma.restaurant.findFirst({
      where: { userId: authUser.userId },
      select: { id: true },
    });
    if (existing) redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-xl py-12">
      <Card>
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-[var(--accent)]/15">
            <Sparkles className="size-5 text-[var(--accent)]" />
          </div>
          <CardTitle>Bienvenue sur Ruliz 🎉</CardTitle>
          <CardDescription>
            Crée ton premier restaurant pour démarrer. Tu pourras affiner les
            détails (logo, couleurs, réseaux sociaux) juste après.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            defaultLangue={
              (authUser?.user?.langueNative as
                | "fr"
                | "en"
                | "es"
                | "de"
                | "it"
                | "pt"
                | "zh"
                | undefined) ?? "fr"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
