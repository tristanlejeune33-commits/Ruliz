"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Wrapper qui anime les transitions entre pages dashboard.
 * Fade + slide vertical doux (8px) à chaque changement de pathname.
 *
 * On utilise le pathname comme `key` pour que AnimatePresence recrée
 * le composant à chaque navigation → exit + enter animations.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{
          duration: 0.25,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
