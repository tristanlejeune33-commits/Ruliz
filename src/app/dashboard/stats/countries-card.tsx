"use client";

import { Globe2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CountriesCardProps {
  countries: Array<{ code: string; name: string; flag: string; count: number }>;
}

export function CountriesCard({ countries }: CountriesCardProps) {
  const total = countries.reduce((acc, c) => acc + c.count, 0);
  const top = countries.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Origine géographique</CardTitle>
            <CardDescription>Top 8 pays</CardDescription>
          </div>
          <Globe2 className="size-4 text-[var(--text-muted)]" />
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--text-muted)]">
            Aucun scan localisé sur la période.
          </p>
        ) : (
          <ul className="space-y-3">
            {top.map((c) => {
              const pct = Math.round((c.count / total) * 100);
              return (
                <li key={c.code} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-base leading-none" aria-hidden>
                        {c.flag}
                      </span>
                      <span className="truncate text-[var(--text-primary)]">
                        {c.name}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">
                      {c.count.toLocaleString("fr-FR")} {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {countries.length > 8 && (
          <p className="mt-3 text-[10px] text-[var(--text-muted)]">
            + {countries.length - 8} autre{countries.length - 8 > 1 ? "s" : ""} pays
          </p>
        )}
      </CardContent>
    </Card>
  );
}
