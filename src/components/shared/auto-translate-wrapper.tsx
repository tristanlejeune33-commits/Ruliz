"use client";

import { useEffect, useRef } from "react";
import { usePanelLang } from "./panel-lang-context";
import {
  getPanelTranslations,
  translatePanelBatch,
} from "@/server/dashboard/translate-panel-actions";

// v4 : bump après le fix « le dico preloaded d'une langue (ex: PT) était
// appliqué — et caché — pour les AUTRES langues lors d'un changement en place »
// (cause de « portugais partout » + « ça ne traduit plus »). Invalide les
// caches client pollués des versions <= v3.
const LOCAL_STORAGE_PREFIX = "ruliz_t_v4_";

/**
 * Wrapper qui auto-traduit TOUS les text nodes du DOM enfant.
 *
 * Stratégie :
 *   1. Au mount + à chaque changement de lang, scanne le DOM enfant
 *   2. Récupère tous les text nodes avec du contenu FR non-traduit
 *   3. Pour chaque texte unique → check localStorage cache
 *   4. Pour les non-cachés → batch call serverAction translatePanelBatch
 *   5. Substitue chaque text node par sa traduction
 *
 * Effet :
 *   - Pas besoin de wrapper chaque string avec <T>
 *   - Toutes les pages dashboard sont auto-traduites
 *   - Cache à vie en localStorage + DB partagé
 *
 * Limitations :
 *   - Pas de traduction des attributs (placeholder, alt, title, aria-label)
 *     → ceux-là restent en FR (acceptable pour MVP, ils sont rarement traduits
 *     de toute façon)
 *   - Un petit flicker FR→EN au premier load d'une page non-cachée (~500ms)
 *
 * Performance :
 *   - Cache localStorage hit : 0ms (instant)
 *   - Cache DB hit (1ère visite de cet user) : ~80ms server roundtrip
 *   - Anthropic miss (1ère visite globale) : ~1-2s server roundtrip
 *   - Après warm-up : que des hits localStorage
 */
/**
 * Flag module-level : true pendant que NOS writes mutent les text nodes.
 * L'observer ignore les mutations pendant ce temps pour éviter la boucle
 * infinie (nos writes characterData re-déclencheraient translatePage).
 */
let isApplyingTranslations = false;

export function AutoTranslateWrapper({
  children,
  preloaded = {},
  preloadedLang = "fr",
}: {
  children: React.ReactNode;
  /** Dictionnaire {sourceFR: traduit} injecté par le serveur (cache DB) pour
   *  la langue `preloadedLang` → appliqué sans aller-retour réseau. */
  preloaded?: Record<string, string>;
  /** Langue pour laquelle `preloaded` a été calculé côté serveur. On ne
   *  l'applique QUE si elle correspond à la langue courante (sinon, lors d'un
   *  changement de langue en place, on appliquerait — et cacherait — le dico
   *  de l'ancienne langue pour la nouvelle). */
  preloadedLang?: string;
}) {
  const { lang } = usePanelLang();
  const containerRef = useRef<HTMLDivElement>(null);
  // Map node → original FR text (pour retraduire si on rebascule en FR)
  const originalTextsRef = useRef<WeakMap<Text, string>>(new WeakMap());
  // Réfs au dico injecté + sa langue (évite de remettre l'effet en deps).
  // Mis à jour dans un effet (interdit d'écrire une ref pendant le render).
  const preloadedRef = useRef(preloaded);
  const preloadedLangRef = useRef(preloadedLang);
  useEffect(() => {
    preloadedRef.current = preloaded;
    preloadedLangRef.current = preloadedLang;
  });
  // Cache du dico complet d'une langue chargé en UNE requête (getPanelTranslations)
  // → évite N appels serveur chaîne par chaîne au changement de langue.
  const serverDictRef = useRef<{ lang: string; dict: Record<string, string> }>({
    lang: "",
    dict: {},
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    // === IMPORTANT : on scanne document.body, PAS le container ===
    // Les modals, dropdowns, selects, sheets, toasts (Radix/Sonner) sont
    // rendus via PORTAL directement sous <body>, donc HORS du container.
    // L'ancienne version ne scannait que le container → tous les overlays
    // restaient en français ("le sélecteur de langue ne fonctionne pas").
    // Ce wrapper n'existe que dans les layouts dashboard/admin, donc tout
    // ce qui est à l'écran appartient au panel → scanner body est safe.
    const scanRoot = document.body;

    // Si on revient en FR, restaure tous les textes originaux
    if (lang === "fr") {
      isApplyingTranslations = true;
      const walker = document.createTreeWalker(scanRoot, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const original = originalTextsRef.current.get(node);
        if (original) {
          node.nodeValue = original;
        }
      }
      setTimeout(() => {
        isApplyingTranslations = false;
      }, 0);
      return;
    }

    // Scan et traduit
    let cancelled = false;

    const translatePage = async () => {
      // 0) Restaure d'abord les textes ORIGINAUX (français) avant de traduire.
      // Sinon, en passant d'une langue à une autre (ex: ES → EN), on collecte
      // le texte DÉJÀ traduit (espagnol) et on l'envoie à Anthropic avec la
      // consigne « traduis du français » → il le renvoie tel quel → l'UI reste
      // BLOQUÉE sur la langue précédente ("ça a traduit que en espagnol").
      // On repart donc toujours du français source.
      isApplyingTranslations = true;
      const restoreWalker = document.createTreeWalker(
        scanRoot,
        NodeFilter.SHOW_TEXT,
      );
      let restoreNode: Text | null;
      while ((restoreNode = restoreWalker.nextNode() as Text | null)) {
        const original = originalTextsRef.current.get(restoreNode);
        if (original != null) restoreNode.nodeValue = original;
      }
      isApplyingTranslations = false;

      // 1) Collecte les text nodes éligibles
      const textNodesByText = new Map<string, Text[]>();
      const walker = document.createTreeWalker(
        scanRoot,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const text = node.nodeValue?.trim() ?? "";
            // Filtre les nodes vides ou non pertinents
            if (text.length < 2) return NodeFilter.FILTER_REJECT;
            // Évite les nodes dans <script>, <style>, <code>, etc.
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (["script", "style", "code", "pre", "noscript", "textarea"].includes(tag)) {
              return NodeFilter.FILTER_REJECT;
            }
            // Évite les nodes opt-out
            if (parent.closest("[data-no-translate]")) {
              return NodeFilter.FILTER_REJECT;
            }
            // Évite les chaînes purement numériques / symbol
            if (/^[\d\s.,€$%/+\-*()[\]{}|]*$/.test(text)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        },
      );

      let current: Text | null;
      while ((current = walker.nextNode() as Text | null)) {
        const trimmed = current.nodeValue?.trim() ?? "";
        if (!trimmed) continue;

        // Garde la version originale pour pouvoir restaurer
        if (!originalTextsRef.current.has(current)) {
          originalTextsRef.current.set(current, current.nodeValue ?? "");
        }

        const list = textNodesByText.get(trimmed);
        if (list) list.push(current);
        else textNodesByText.set(trimmed, [current]);
      }

      if (textNodesByText.size === 0) return;

      // 2) CACHE LOCAL D'ABORD (100% synchrone, AUCUN réseau) : dico injecté
      //    par le serveur > localStorage. Si tout est en cache → instantané.
      const fromCache: Record<string, string> = {};
      const toFetch: string[] = [];
      const usePreloaded = preloadedLangRef.current === lang;
      for (const text of textNodesByText.keys()) {
        const pre = usePreloaded ? preloadedRef.current[text] : undefined;
        if (pre) {
          fromCache[text] = pre;
          try {
            localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${lang}:${text}`, pre);
          } catch {
            // storage plein → pas grave
          }
          continue;
        }
        try {
          const cached = localStorage.getItem(
            `${LOCAL_STORAGE_PREFIX}${lang}:${text}`,
          );
          if (cached !== null) {
            fromCache[text] = cached;
            continue;
          }
        } catch {
          // ignore
        }
        toFetch.push(text);
      }

      // 3) Applique le cache local IMMÉDIATEMENT.
      applyTranslations(textNodesByText, fromCache);
      // Tout était en cache local → terminé, aucun aller-retour serveur.
      if (toFetch.length === 0) return;
      if (cancelled) return;

      // 4) Manquants : on charge TOUT le cache DB de la langue en UNE requête
      //    (au lieu de N), mémorisé par langue. On applique les correspondances.
      if (serverDictRef.current.lang !== lang) {
        try {
          const dict = await getPanelTranslations(lang);
          if (cancelled) return;
          serverDictRef.current = { lang, dict };
        } catch {
          serverDictRef.current = { lang, dict: {} };
        }
      }
      const serverDict =
        serverDictRef.current.lang === lang ? serverDictRef.current.dict : {};
      const fromServer: Record<string, string> = {};
      const stillMissing: string[] = [];
      for (const text of toFetch) {
        const t = serverDict[text];
        if (t) {
          fromServer[text] = t;
          try {
            localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${lang}:${text}`, t);
          } catch {
            // storage plein → pas grave
          }
        } else {
          stillMissing.push(text);
        }
      }
      applyTranslations(textNodesByText, fromServer);

      // 5) Reste vraiment absent du cache → Anthropic (rare si pré-traduit).
      if (stillMissing.length === 0) return;
      if (cancelled) return;

      try {
        const fetched = await translatePanelBatch(stillMissing, lang);
        if (cancelled) return;

        // Cache localStorage — MAIS jamais une traduction == source.
        // Un texte renvoyé inchangé = soit un échec Anthropic (rate-limit,
        // timeout → translatePanelBatch retourne l'original), soit un nom
        // propre. Le cacher figerait la langue en français POUR TOUJOURS
        // (cause du "it/pt/zh ne marchent pas" : un hoquet pendant leur
        // 1ʳᵉ traduction avait caché le français). On le laisse se re-fetcher.
        for (const [text, translation] of Object.entries(fetched)) {
          if (translation === text) continue;
          try {
            localStorage.setItem(
              `${LOCAL_STORAGE_PREFIX}${lang}:${text}`,
              translation,
            );
          } catch {
            // storage full, ignore
          }
        }

        applyTranslations(textNodesByText, fetched);
      } catch (err) {
        console.warn("[AutoTranslate] batch failed:", err);
      }
    };

    translatePage();

    // Observer : retraduit si le DOM change.
    // characterData: true est CRITIQUE — React met à jour le texte des
    // nodes existants via mutation characterData (pas childList). Sans ce
    // flag, chaque re-render React qui remettait le texte FR d'origine
    // passait inaperçu → la page "revenait en français" après une
    // interaction (hover, state update, navigation soft). C'était la
    // cause principale du sélecteur de langue "qui ne marche pas".
    const observer = new MutationObserver(() => {
      if (cancelled) return;
      // Ignore les mutations causées par NOS propres writes (anti-boucle)
      if (isApplyingTranslations) return;
      // Debounce un peu pour éviter de spammer
      window.clearTimeout((window as unknown as { __translateTimer?: number }).__translateTimer);
      (window as unknown as { __translateTimer?: number }).__translateTimer = window.setTimeout(() => {
        if (!cancelled && !isApplyingTranslations) translatePage();
      }, 300);
    });
    observer.observe(scanRoot, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [lang]);

  return (
    <div ref={containerRef} data-translate-root>
      {children}
    </div>
  );
}

/**
 * Applique un mapping {textFR: textTraduit} aux text nodes correspondants.
 * Préserve les whitespaces autour du texte.
 *
 * Le flag isApplyingTranslations couvre nos writes pour que l'observer
 * characterData ne re-déclenche pas translatePage en boucle. Il est
 * relâché au prochain tick (les callbacks MutationObserver des writes
 * synchrones sont déjà en file à ce moment-là et seront ignorés).
 */
function applyTranslations(
  textNodesByText: Map<string, Text[]>,
  translations: Record<string, string>,
): void {
  isApplyingTranslations = true;
  try {
    for (const [text, nodes] of textNodesByText.entries()) {
      const translation = translations[text];
      if (!translation || translation === text) continue;

      for (const node of nodes) {
        const original = node.nodeValue ?? "";
        // Préserve les whitespaces avant/après
        const leadingWs = original.match(/^\s*/)?.[0] ?? "";
        const trailingWs = original.match(/\s*$/)?.[0] ?? "";
        node.nodeValue = `${leadingWs}${translation}${trailingWs}`;
      }
    }
  } finally {
    setTimeout(() => {
      isApplyingTranslations = false;
    }, 0);
  }
}
