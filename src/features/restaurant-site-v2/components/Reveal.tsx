"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Index dans une stagger list — multiplie le delay base 80ms. */
  index?: number;
  /** Override delay manuel (ms). Prend le pas sur `index`. */
  delayMs?: number;
  className?: string;
}

const variants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Wrapper Framer Motion qui remplace les `.reveal` de la maquette.
 *
 * - fade-up 28px → 0
 * - duration 0.9s, ease cubic-bezier(.2,.7,.2,1)
 * - whileInView avec viewport.once = true (joue une seule fois)
 * - delay basé sur index (stagger) ou manuel
 *
 * On utilise une motion.div par défaut. Pour préserver la sémantique HTML
 * (article, section…), wrap des éléments interactifs avec Reveal autour.
 */
export function Reveal({
  children,
  index = 0,
  delayMs,
  className,
}: RevealProps) {
  const delay = typeof delayMs === "number" ? delayMs / 1000 : 0.08 * index;
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      variants={variants}
      transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
