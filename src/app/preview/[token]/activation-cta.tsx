"use client";

import Link from "next/link";
import { Rocket } from "lucide-react";

interface Props {
  token: string;
  compact?: boolean;
  full?: boolean;
}

/**
 * CTA d'activation — pousse vers /signup avec le token prospect dans l'URL.
 * Le formulaire de signup reprend automatiquement les infos prospect.
 */
export function ActivationCta({ token, compact, full }: Props) {
  const href = `/signup?prospect=${encodeURIComponent(token)}`;

  if (compact) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow hover:bg-slate-100"
      >
        Activer
        <Rocket className="size-3.5" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-slate-800 ${
        full ? "w-full" : ""
      }`}
    >
      <Rocket className="size-5" />
      Activer ma carte Ruliz
    </Link>
  );
}
