"use client";

import { useState } from "react";
import type { FaqItem } from "../types";

interface FaqProps {
  items: FaqItem[];
}

/**
 * Questions fréquentes — accordéon ouvert/fermé.
 * Client component pour gérer le state d'expansion.
 *
 * SEO bonus : structure HTML sémantique (details/summary) recommandée par
 * Google, mais on garde divs+button pour styling 100% custom.
 */
export function Faq({ items }: FaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!items.length) return null;

  return (
    <section id="faq" className="rs-section">
      <div className="rs-container">
        <div className="rs-section__head">
          <p className="rs-eyebrow">FAQ</p>
          <h2 className="rs-display rs-section__title">Questions fréquentes</h2>
        </div>

        <div className="rs-faq__list">
          {items.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={`${item.question}-${i}`} className="rs-faq__item">
                <button
                  type="button"
                  className="rs-faq__trigger"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : i)}
                >
                  <span>{item.question}</span>
                  <span className="rs-faq__chevron" aria-hidden>
                    {open ? "–" : "+"}
                  </span>
                </button>
                {open && (
                  <div className="rs-faq__answer">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
