"use client";

import { useEffect, useState } from "react";
import { usePanelLang } from "./panel-lang-context";
import { translatePanelString } from "@/server/dashboard/translate-panel-actions";

const LOCAL_STORAGE_PREFIX = "ruliz_t_";
const LOCAL_STORAGE_VERSION = "v1"; // bump pour invalider le cache local

/**
 * Composant qui auto-traduit le texte FR vers la langue du panel.
 *
 * Usage simple :
 *   <T>Bonjour le monde</T>
 *
 * Comportement :
 *   - Si lang = "fr" → affiche directement
 *   - Si lang ≠ "fr" :
 *       1. Check localStorage cache
 *       2. Si miss → call serverAction translatePanelString
 *       3. La serverAction check cache DB → si miss → Anthropic Haiku
 *       4. Cache localStorage + affiche
 *
 * Pendant le loading initial (avant traduction reçue), affiche le FR
 * comme fallback gracieux.
 *
 * Pour les attributs (placeholder, alt, title), utiliser useT() :
 *   const t = useT();
 *   <input placeholder={t("Votre email")} />
 */
interface TProps {
  /** Texte FR à traduire (single line, pas de JSX nested). */
  children: string;
  /** Si défini, utilisé comme fallback pendant le loading (sinon = children). */
  fallback?: string;
  /** Si défini : pas de traduction (force le FR, utile pour brand names). */
  noTranslate?: boolean;
}

export function T({ children, fallback, noTranslate }: TProps) {
  const { lang } = usePanelLang();
  const [translated, setTranslated] = useState<string>(
    fallback ?? children,
  );

  useEffect(() => {
    if (noTranslate || lang === "fr" || !children) {
      setTranslated(children);
      return;
    }

    const cacheKey = `${LOCAL_STORAGE_PREFIX}${LOCAL_STORAGE_VERSION}:${lang}:${children}`;

    // 1) Check localStorage cache
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached !== null) {
        setTranslated(cached);
        return;
      }
    } catch {
      // localStorage may be unavailable (incognito strict, etc.)
    }

    // 2) Fetch from server (avec cache DB + Anthropic en fallback)
    let cancelled = false;
    translatePanelString(children, lang).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTranslated(result.text);
        try {
          localStorage.setItem(cacheKey, result.text);
        } catch {
          // OK si le storage est plein
        }
      }
      // Si fail, on garde le fallback FR (déjà affiché)
    });

    return () => {
      cancelled = true;
    };
  }, [children, lang, noTranslate]);

  return <>{translated}</>;
}

/**
 * Hook pour traduire une string dans un contexte non-JSX (attribut,
 * notification toast, etc.).
 *
 * Usage :
 *   const t = useT();
 *   <input placeholder={t("Votre email")} />
 *   toast.success(t("Sauvegardé"));
 *
 * Comportement : retourne le FR au premier render, puis trigger un re-render
 * avec la traduction quand elle arrive. Utiliser <T> directement si possible
 * (meilleur perf et flicker minimal).
 */
export function useT(): (text: string) => string {
  const { lang } = usePanelLang();
  const [translations, setTranslations] = useState<Record<string, string>>({});

  return (text: string): string => {
    if (lang === "fr" || !text) return text;
    if (translations[text]) return translations[text]!;

    // Schedule async translation (best-effort)
    const cacheKey = `${LOCAL_STORAGE_PREFIX}${LOCAL_STORAGE_VERSION}:${lang}:${text}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached !== null) {
        // Update state next tick (avoid setState during render)
        Promise.resolve().then(() => {
          setTranslations((prev) =>
            prev[text] === cached ? prev : { ...prev, [text]: cached },
          );
        });
        return cached;
      }
    } catch {
      // ignore
    }

    Promise.resolve().then(async () => {
      const result = await translatePanelString(text, lang);
      if (result.ok) {
        try {
          localStorage.setItem(cacheKey, result.text);
        } catch {
          // ignore
        }
        setTranslations((prev) =>
          prev[text] === result.text ? prev : { ...prev, [text]: result.text },
        );
      }
    });

    return text; // fallback FR pendant que la traduction arrive
  };
}
