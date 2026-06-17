"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlagIcon } from "@/components/shared/flag-icon";
import { usePanelLang } from "@/components/shared/panel-lang-context";
import { LANG_META, SUPPORTED_LANGS, type SupportedLang } from "@/lib/langs";

/**
 * Sélecteur de langue VISIBLE pour le header du site vitrine.
 *
 * Contrairement au picker ghost-icon du dashboard (discret, dans une topbar
 * déjà dense), ici on veut une pastille explicite (drapeau + nom + chevron)
 * pour qu'un visiteur la repère immédiatement. Même source de vérité :
 * usePanelLang() / cookie ruliz_panel_lang → l'AutoTranslateWrapper retraduit
 * toute la page au changement.
 */
export function MarketingLangPicker() {
  const { lang, setLang } = usePanelLang();
  const current = LANG_META[lang as SupportedLang];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Choisir la langue"
          className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-glass)] bg-[var(--bg-elevated)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <FlagIcon lang={lang as SupportedLang} width={18} rounded />
          <span className="hidden sm:inline">{current.name}</span>
          <ChevronDown className="size-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_LANGS.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLang(l)}
            className={lang === l ? "bg-[var(--bg-elevated)]" : ""}
          >
            <FlagIcon lang={l} width={18} rounded className="mr-2" />
            {LANG_META[l].name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
