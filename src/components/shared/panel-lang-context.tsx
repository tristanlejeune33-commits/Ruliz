"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { t as serverT, type PanelLang } from "@/lib/panel-i18n";

interface PanelLangContextValue {
  lang: PanelLang;
  setLang: (lang: PanelLang) => void;
  t: (key: string) => string;
}

const PanelLangContext = createContext<PanelLangContextValue>({
  lang: "fr",
  setLang: () => {},
  t: (key) => serverT(key, "fr"),
});

export const PANEL_LANG_COOKIE = "ruliz_panel_lang";

interface ProviderProps {
  /** Lang lue côté serveur (cookie) puis hydratée côté client. */
  initialLang: PanelLang;
  children: React.ReactNode;
}

/**
 * Provider mis dans le dashboard layout (server component) qui passe la lang
 * lue depuis le cookie. Tout composant client peut ensuite faire
 * `const { t } = usePanelLang()` puis `t("nav.dashboard")`.
 *
 * La lang est un ÉTAT LOCAL initialisé depuis `initialLang` : au clic, on la
 * met à jour IMMÉDIATEMENT (drapeau + auto-traduction du DOM) sans attendre
 * le round-trip serveur. On écrit aussi le cookie + `router.refresh()` pour
 * que les Server Components (sidebar nav) se re-render dans la bonne langue.
 *
 * Avant : `lang` était figée sur `initialLang` (pas de state). Si le
 * `router.refresh()` ne repropageait pas la nouvelle valeur, le drapeau ne
 * changeait jamais et le DOM n'était jamais retraduit.
 */
export function PanelLangProvider({ initialLang, children }: ProviderProps) {
  const router = useRouter();
  const [lang, setLangState] = useState<PanelLang>(initialLang);

  // Si le serveur pousse une nouvelle initialLang (navigation, refresh),
  // on resynchronise l'état local. No-op quand on vient de la changer soi-même.
  useEffect(() => {
    setLangState(initialLang);
  }, [initialLang]);

  const setLang = useCallback(
    (newLang: PanelLang) => {
      setLangState(newLang); // maj optimiste immédiate (UI + auto-translate)
      if (typeof document !== "undefined") {
        document.cookie = `${PANEL_LANG_COOKIE}=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      }
      // Sync les Server Components (sidebar nav, etc.) avec la nouvelle lang.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<PanelLangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string) => serverT(key, lang),
    }),
    [lang, setLang],
  );

  return (
    <PanelLangContext.Provider value={value}>
      {children}
    </PanelLangContext.Provider>
  );
}

/**
 * Hook côté Client. Retourne :
 *   - lang : la langue panel actuelle (lue depuis cookie)
 *   - setLang(lang) : change la lang (cookie + router.refresh)
 *   - t(key) : traduit une clé dans la lang courante
 */
export function usePanelLang() {
  return useContext(PanelLangContext);
}
