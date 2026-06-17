"use client";

import { useEffect, useState } from "react";
import {
  PanelLangProvider,
  PANEL_LANG_COOKIE,
} from "@/components/shared/panel-lang-context";
import { AutoTranslateWrapper } from "@/components/shared/auto-translate-wrapper";
import { isSupportedLang, type SupportedLang } from "@/lib/langs";

/**
 * Enveloppe le mini-site restaurant pour le rendre multilingue, en réutilisant
 * la machinerie d'auto-traduction (PanelLangProvider + AutoTranslateWrapper +
 * cookie partagé `ruliz_panel_lang`).
 *
 * Particularité vitrine : on lit la langue préférée du visiteur CÔTÉ CLIENT
 * (pas de cookie côté serveur) pour ne PAS casser l'ISR (`revalidate=120`) de
 * la page /site/[id]. La majorité des visiteurs n'ont pas de cookie → ils
 * voient le site dans sa langue d'origine (FR) sans flicker, et peuvent
 * basculer via le sélecteur. `refreshOnChange={false}` car le contenu est
 * traduit uniquement côté client (rien de traduit côté serveur à resync).
 */
export function SiteLangShell({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<SupportedLang>("fr");

  useEffect(() => {
    // 1. Choix explicite précédent (cookie) → prioritaire.
    const m = document.cookie.match(
      new RegExp(`(?:^|; )${PANEL_LANG_COOKIE}=([^;]+)`),
    );
    const cookieLang = m?.[1];
    if (isSupportedLang(cookieLang)) {
      setLang(cookieLang);
      return;
    }
    // 2. Sinon, DÉTECTION AUTOMATIQUE de la langue du navigateur : un client
    //    allemand qui ouvre le site le voit traduit en allemand sans cliquer.
    //    ("fr" = langue source, rien à traduire → on reste tel quel.)
    const navLang = navigator.language?.split("-")[0]?.toLowerCase();
    if (isSupportedLang(navLang) && navLang !== "fr") {
      setLang(navLang);
    }
  }, []);

  return (
    <PanelLangProvider initialLang={lang} refreshOnChange={false}>
      <AutoTranslateWrapper>{children}</AutoTranslateWrapper>
    </PanelLangProvider>
  );
}
