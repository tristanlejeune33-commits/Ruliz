"use client";

import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InsightsCardsProps {
  insights: string[];
}

export function InsightsCards({ insights }: InsightsCardsProps) {
  if (insights.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-[var(--accent)]" />
          Insights automatiques
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 md:grid-cols-2">
          {insights.map((insight, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 px-3 py-2.5 text-sm leading-snug"
            >
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
