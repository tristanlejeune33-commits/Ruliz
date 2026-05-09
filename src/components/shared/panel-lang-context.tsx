"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
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
 * lue depuis le cookie httpOnly. Tout composant client peut ensuite faire
 * `const { t } = usePanelLang()` puis `t("nav.dashboard")`.
 *
 * Note : la lang est immutable côté Provider (pas de useState) car on veut
 * que le changement passe par le cookie + un router.refresh() pour que les
 * Server Components (sidebar nav, etc.) re-render avec la bonne lang. C'est
 * ce que fait setLang ci-dessous.
 */
export function PanelLangProvider({ initialLang, children }: ProviderProps) {
  const router = useRouter();

  const setLang = useCallback(
    (newLang: PanelLang) => {
      if (typeof document === "undefined") return;
      document.cookie = `${PANEL_LANG_COOKIE}=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      // Force un re-render server-side complet pour que la sidebar (Server)
      // et les autres composants serveur récupèrent la nouvelle lang.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<PanelLangContextValue>(
    () => ({
      lang: initialLang,
      setLang,
      t: (key: string) => serverT(key, initialLang),
    }),
    [initialLang, setLang],
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
