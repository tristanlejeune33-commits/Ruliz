"use client";

import { QrCode } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TopQrcodesCardProps {
  items: Array<{ id: string; codeUnique: string; count: number }>;
}

export function TopQrcodesCard({ items }: TopQrcodesCardProps) {
  const total = items.reduce((acc, i) => acc + i.count, 0);
  const max = items.reduce((m, i) => Math.max(m, i.count), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Top QR codes</CardTitle>
            <CardDescription>10 plus scannés</CardDescription>
          </div>
          <QrCode className="size-4 text-[var(--text-muted)]" />
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--text-muted)]">
            Aucun scan attribué à un QR code (les visiteurs sont arrivés via URL directe).
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => {
              const pct = max === 0 ? 0 : Math.round((item.count / max) * 100);
              return (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded bg-[var(--bg-elevated)] font-mono text-[10px] text-[var(--text-muted)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm">{item.codeUnique}</p>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {item.count.toLocaleString("fr-FR")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {total > 0 && (
          <p className="mt-3 text-[10px] text-[var(--text-muted)]">
            Total cumulé : {total.toLocaleString("fr-FR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
