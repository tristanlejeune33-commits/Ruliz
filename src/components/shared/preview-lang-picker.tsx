"use client";

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FlagIcon } from "@/components/shared/flag-icon";
import type { SupportedLang } from "@/lib/langs";

/**
 * Picker de langue affiché dans la topbar.
 *
 * Sa valeur est stockée dans localStorage sous "ruliz:preview-lang" et est
 * consommée par le menu editor pour rafraîchir l'iframe de preview avec
 * la bonne langue.
 *
 * Pour réagir aux changements depuis d'autres composants, on émet un
 * `CustomEvent("ruliz:preview-lang-changed")` sur window quand la valeur
 * change. Le menu editor écoute cet event.
 */

export const SUPPORTED_PREVIEW_LANGS = [
  { code: "fr", name: "Français" },
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "zh", name: "中文" },
] as const;

export type PreviewLang = (typeof SUPPORTED_PREVIEW_LANGS)[number]["code"];

const STORAGE_KEY = "ruliz:preview-lang";
const EVENT_NAME = "ruliz:preview-lang-changed";

/** Hook réutilisable : retourne la langue de preview courante + un setter. */
export function usePreviewLang(): [PreviewLang, (lang: PreviewLang) => void] {
  const [lang, setLangState] = useState<PreviewLang>("fr");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as PreviewLang | null;
    if (
      stored &&
      SUPPORTED_PREVIEW_LANGS.some((l) => l.code === stored)
    ) {
      setLangState(stored);
    }

    // Écoute les changements depuis d'autres tabs / composants
    const handleChange = (e: Event) => {
      const detail = (e as CustomEvent<PreviewLang>).detail;
      if (detail) setLangState(detail);
    };
    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, []);

  const setLang = (newLang: PreviewLang) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, newLang);
    setLangState(newLang);
    // Notifie tous les autres consumers (menu editor iframe etc)
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newLang }));
  };

  return [lang, setLang];
}

export function PreviewLangPicker() {
  const [lang, setLang] = usePreviewLang();
  const current = SUPPORTED_PREVIEW_LANGS.find((l) => l.code === lang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Changer la langue de la prévisualisation"
          title={`Langue de prévisualisation : ${current?.name ?? "Français"}`}
        >
          <FlagIcon
            lang={(current?.code ?? "fr") as SupportedLang}
            width={20}
            rounded
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {SUPPORTED_PREVIEW_LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={lang === l.code ? "bg-[var(--bg-elevated)]" : ""}
          >
            <FlagIcon lang={l.code as SupportedLang} width={18} rounded className="mr-2" />
            {l.name}
            {lang === l.code && (
              <span className="ml-auto text-xs text-[var(--text-muted)]">
                ●
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
