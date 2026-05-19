"use client";

import { useEffect, useRef } from "react";
import { usePanelLang } from "./panel-lang-context";
import { translatePanelBatch } from "@/server/dashboard/translate-panel-actions";

const LOCAL_STORAGE_PREFIX = "ruliz_t_v1_";

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
export function AutoTranslateWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lang } = usePanelLang();
  const containerRef = useRef<HTMLDivElement>(null);
  // Map node → original FR text (pour retraduire si on rebascule en FR)
  const originalTextsRef = useRef<WeakMap<Text, string>>(new WeakMap());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    // Si on revient en FR, restaure tous les textes originaux
    if (lang === "fr") {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const original = originalTextsRef.current.get(node);
        if (original) {
          node.nodeValue = original;
        }
      }
      return;
    }

    // Scan et traduit
    let cancelled = false;

    const translatePage = async () => {
      // 1) Collecte les text nodes éligibles
      const textNodesByText = new Map<string, Text[]>();
      const walker = document.createTreeWalker(
        container,
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
            if (["script", "style", "code", "pre", "noscript"].includes(tag)) {
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

      // 2) Check localStorage cache + collect missing
      const fromCache: Record<string, string> = {};
      const toFetch: string[] = [];

      for (const text of textNodesByText.keys()) {
        const cacheKey = `${LOCAL_STORAGE_PREFIX}${lang}:${text}`;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached !== null) {
            fromCache[text] = cached;
            continue;
          }
        } catch {
          // ignore
        }
        toFetch.push(text);
      }

      // 3) Apply cached translations immédiatement
      applyTranslations(textNodesByText, fromCache);

      // 4) Fetch missing translations (batch)
      if (toFetch.length === 0) return;
      if (cancelled) return;

      try {
        const fetched = await translatePanelBatch(toFetch, lang);
        if (cancelled) return;

        // Cache localStorage
        for (const [text, translation] of Object.entries(fetched)) {
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

    // Observer : retraduit si le DOM change (nouvelle page, modal s'ouvre, etc.)
    const observer = new MutationObserver(() => {
      if (cancelled) return;
      // Debounce un peu pour éviter de spammer
      window.clearTimeout((window as unknown as { __translateTimer?: number }).__translateTimer);
      (window as unknown as { __translateTimer?: number }).__translateTimer = window.setTimeout(() => {
        if (!cancelled) translatePage();
      }, 300);
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: false,
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
 */
function applyTranslations(
  textNodesByText: Map<string, Text[]>,
  translations: Record<string, string>,
): void {
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
}
