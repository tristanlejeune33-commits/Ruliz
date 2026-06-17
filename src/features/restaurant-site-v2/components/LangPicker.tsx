"use client";

import { useState } from "react";
import { FlagIcon } from "@/components/shared/flag-icon";
import { usePanelLang } from "@/components/shared/panel-lang-context";
import { LANG_META, SUPPORTED_LANGS, type SupportedLang } from "@/lib/langs";

/**
 * Sélecteur de langue du mini-site (dans la navbar). Style rs2 (cf.
 * styles.css `.rs2-lang*`). Source de vérité = usePanelLang() ; au changement,
 * l'AutoTranslateWrapper retraduit tout le contenu de la page.
 */
export function LangPicker() {
  const { lang, setLang } = usePanelLang();
  const [open, setOpen] = useState(false);
  const current = lang as SupportedLang;

  return (
    // data-no-translate : garde les noms de langues en endonymes (Français,
    // English, Deutsch…) quelle que soit la langue active de la page.
    <div className="rs2-lang" data-no-translate>
      <button
        type="button"
        className="rs2-lang-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choisir la langue"
        aria-expanded={open}
      >
        <FlagIcon lang={current} width={18} rounded />
        <span className="rs2-lang-name">{LANG_META[current].name}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden
          className="rs2-lang-chevron"
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <>
          <div
            className="rs2-lang-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <ul className="rs2-lang-menu" role="listbox">
            {SUPPORTED_LANGS.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  className="rs2-lang-item"
                  data-active={l === current ? "true" : undefined}
                  onClick={() => {
                    setLang(l);
                    setOpen(false);
                  }}
                >
                  <FlagIcon lang={l} width={18} rounded />
                  <span>{LANG_META[l].name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
