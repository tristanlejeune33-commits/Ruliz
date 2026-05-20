"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import type { SupportedLang } from "@/lib/langs";

interface SiteLangSwitcherProps {
  current: SupportedLang;
}

/**
 * Lang switcher pour le site public — bouton compact avec emoji drapeau
 * qui ouvre un dropdown listant les 7 langues supportées.
 *
 * Le changement de lang se fait via push de l'URL avec ?lang=xx, ce qui
 * déclenche une nouvelle requête (server-side rerender + traduction du
 * config). Le contenu traduit est cache Redis 30min puis DB cache à vie.
 */

const LANGS: Array<{ code: SupportedLang; flag: string; label: string }> = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "pt", flag: "🇵🇹", label: "Português" },
  { code: "zh", flag: "🇨🇳", label: "中文" },
];

export function SiteLangSwitcher({ current }: SiteLangSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentMeta = LANGS.find((l) => l.code === current) ?? LANGS[0]!;

  const handleChange = (code: SupportedLang) => {
    if (code === current) return;
    startTransition(() => {
      // Préserve les autres query params éventuels
      const params = new URLSearchParams(searchParams.toString());
      if (code === "fr") {
        params.delete("lang");
      } else {
        params.set("lang", code);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <div className="rs-lang-switcher">
      <button
        type="button"
        className="rs-lang-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded="false"
        disabled={pending}
        title="Changer de langue"
      >
        <span className="rs-lang-switcher__flag">{currentMeta.flag}</span>
        <span className="rs-lang-switcher__code">
          {currentMeta.code.toUpperCase()}
        </span>
      </button>
      <ul className="rs-lang-switcher__menu" role="listbox">
        {LANGS.map((l) => (
          <li key={l.code}>
            <button
              type="button"
              className={`rs-lang-switcher__option ${
                l.code === current ? "rs-lang-switcher__option--active" : ""
              }`}
              onClick={() => handleChange(l.code)}
              role="option"
              aria-selected={l.code === current}
            >
              <span className="rs-lang-switcher__flag">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
