"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity, Smartphone, Tablet, Monitor, HelpCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { countryMeta } from "@/lib/countries";
import { BROWSER_LABEL, type Browser, type Device } from "@/lib/user-agent";
import { LANG_META, isSupportedLang } from "@/lib/langs";
import { FlagIcon } from "@/components/shared/flag-icon";

export interface LiveScan {
  id: string;
  scannedAt: string;
  lang: string | null;
  pays: string | null;
  device: Device;
  browser: Browser;
  qrcodeCode: string | null;
}

interface LiveFeedProps {
  initialItems: LiveScan[];
}

const POLL_INTERVAL = 30_000;

export function LiveFeed({ initialItems }: LiveFeedProps) {
  const router = useRouter();
  const [items] = useState(initialItems);

  // Auto-refresh la page (qui est server-rendered) toutes les 30s pour
  // re-fetch les scans en server-side. Pas besoin d'un endpoint dédié.
  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--neon-success)] opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-[var(--neon-success)]" />
              </span>
              Live feed
            </CardTitle>
            <CardDescription>
              50 derniers scans refresh auto toutes les 30s
            </CardDescription>
          </div>
          <Activity className="size-4 text-[var(--text-muted)]" />
        </div>
      </CardHeader>
      <CardContent className="max-h-[480px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--text-muted)]">
            Aucun scan sur la période.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {items.map((s) => (
              <ScanRow key={s.id} scan={s} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ScanRow({ scan }: { scan: LiveScan }) {
  const country = countryMeta(scan.pays);
  const langMeta = isSupportedLang(scan.lang) ? LANG_META[scan.lang] : null;
  const Icon =
    scan.device === "mobile"
      ? Smartphone
      : scan.device === "tablet"
        ? Tablet
        : scan.device === "desktop"
          ? Monitor
          : HelpCircle;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="text-base leading-none" aria-hidden>
        {country.flag}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--text-primary)]">{country.name}</span>
          {langMeta && isSupportedLang(scan.lang) && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
              langue
              <FlagIcon lang={scan.lang} width={14} rounded />
            </span>
          )}
        </p>
        <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <Icon className="size-3" />
          {BROWSER_LABEL[scan.browser]}
          {scan.qrcodeCode && (
            <>
              <span className="px-0.5"> </span>
              <span className="font-mono">{scan.qrcodeCode}</span>
            </>
          )}
        </p>
      </div>
      <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
        {formatDistanceToNow(new Date(scan.scannedAt), {
          addSuffix: true,
          locale: fr,
        })}
      </span>
    </li>
  );
}
