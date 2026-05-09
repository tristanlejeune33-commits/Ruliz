"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FlagIcon } from "@/components/shared/flag-icon";
import { usePanelLang } from "@/components/shared/panel-lang-context";
import { LANG_META, type SupportedLang } from "@/lib/langs";

/**
 * Picker de langue dans la topbar — change la **langue du panel** (sidebar,
 * boutons, hero, etc.) ainsi que la **langue de prévisualisation de la carte**
 * (le iframe dans l'éditeur). Une seule source de vérité = cookie
 * `ruliz_panel_lang` lu côté serveur.
 *
 * Précédente version : changeait UNIQUEMENT la lang de l'iframe → confusion
 * utilisateur (ils s'attendaient à ce que tout le panel passe en EN/ES/etc.).
 *
 * Le hook usePanelLang() est l'unique source : il expose `lang` (FR par défaut)
 * et `setLang(lang)` qui set le cookie + déclenche un router.refresh().
 *
 * On expose aussi un alias `usePreviewLang` pour rétrocompat avec le menu
 * editor qui utilise la lang pour son iframe.
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

/**
 * Hook backward-compatible : retourne la lang courante depuis le panel
 * Context. Le setter pousse vers `setLang` du Provider qui :
 *   1. Set le cookie ruliz_panel_lang
 *   2. router.refresh() → tous les Server Components re-render
 *      (sidebar, hero, breadcrumb, etc.)
 */
export function usePreviewLang(): [PreviewLang, (lang: PreviewLang) => void] {
  const { lang, setLang } = usePanelLang();
  return [lang as PreviewLang, (l) => setLang(l)];
}

export function PreviewLangPicker() {
  const { lang, setLang, t } = usePanelLang();
  const current = LANG_META[lang as SupportedLang];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("langPicker.aria")}
          title={`${t("langPicker.title")} : ${current.name}`}
        >
          <FlagIcon lang={lang as SupportedLang} width={20} rounded />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
          {t("langPicker.title")}
        </DropdownMenuLabel>
        {SUPPORTED_PREVIEW_LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={lang === l.code ? "bg-[var(--bg-elevated)]" : ""}
          >
            <FlagIcon
              lang={l.code as SupportedLang}
              width={18}
              rounded
              className="mr-2"
            />
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
