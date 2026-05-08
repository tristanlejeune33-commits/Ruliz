import Link from "next/link";
import {
  ArrowRight,
  Globe2,
  QrCode,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: QrCode,
    title: "QR codes générés en un clic",
    body: "Une carte = un QR code unique. Imprime-le sur tes sets de table, ton bar, tes vitrines.",
  },
  {
    icon: Globe2,
    title: "7 langues, traduites par IA",
    body: "Anthropic Claude traduit ton menu en EN, ES, DE, IT, PT, ZH. Mis en cache à vie : zéro latence pour tes clients.",
  },
  {
    icon: UtensilsCrossed,
    title: "Éditeur drag & drop",
    body: "Catégories, plats, allergènes, vignettes, suggestions cross-sell — réorganise comme un Notion.",
  },
  {
    icon: Sparkles,
    title: "Roulette d'avis Google",
    body: "Le client laisse un avis Google, gagne un café, un dessert. Tu remontes dans le ranking local.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-[var(--border-subtle)] px-6 py-24 md:py-36">
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, var(--accent) 0%, transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.5 0.18 280) 0%, transparent 40%)",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mb-6">
            <Sparkles className="size-3" /> 14 jours d&apos;essai Pro offerts
          </Badge>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Le menu digital{" "}
            <span className="bg-gradient-to-br from-[var(--accent)] to-[oklch(0.7_0.18_280)] bg-clip-text text-transparent">
              que tes clients méritent.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-[var(--text-secondary)] md:text-xl">
            QR code, traduction IA en 7 langues, éditeur drag-and-drop, jeu d&apos;avis Google.
            Tout ce dont ton restaurant a besoin pour scaler le service à table.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">
                Démarrer gratuitement <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/carte/demo">Voir une carte démo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <Badge variant="secondary">Fonctionnalités</Badge>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Tout ce que tu veux. Rien de superflu.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="p-6 hover:border-[var(--accent)]/40">
                <f.icon className="mb-4 size-6 text-[var(--accent)]" />
                <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-[var(--border-subtle)] px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary">Tarifs HT</Badge>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            3 formules, sans engagement.
          </h2>
          <p className="mt-3 text-[var(--text-secondary)]">
            Page de tarifs détaillée à venir en Phase 5.
          </p>
        </div>
      </section>
    </div>
  );
}
