"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCartCount } from "@/server/dashboard/boutique-cart-actions";

/**
 * Bouton panier boutique QR avec badge nombre d'articles.
 *
 * Affiché dans la topbar du dashboard. Le compteur est récupéré côté
 * serveur via la server action getCartCount et se rafraîchit :
 *  - À chaque changement de route (usePathname)
 *  - Toutes les 30 secondes en background (au cas où l'utilisateur ajoute
 *    dans un autre onglet)
 *
 * Quand count = 0 → badge caché.
 */
export function CartIconButton() {
  const pathname = usePathname();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const n = await getCartCount();
        if (!cancelled) setCount(n);
      } catch {
        // silently fail
      }
    };
    void fetchCount();
    // Refresh périodique léger (toutes les 30s)
    const interval = setInterval(fetchCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pathname]);

  const hasItems = count > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/dashboard/boutique/panier"
          className={`relative inline-flex size-9 items-center justify-center rounded-lg transition-colors ${
            hasItems
              ? "text-[var(--accent)] hover:bg-[var(--accent)]/10"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]"
          }`}
          aria-label={`Panier boutique${hasItems ? ` (${count} article${count > 1 ? "s" : ""})` : ""}`}
        >
          <ShoppingCart className="size-4" strokeWidth={1.75} />
          {hasItems && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent)] px-1 font-mono text-[9px] font-bold tabular-nums text-white ring-2 ring-[var(--bg-primary)]"
              aria-hidden
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {hasItems ? `Panier : ${count} article${count > 1 ? "s" : ""}` : "Panier boutique"}
      </TooltipContent>
    </Tooltip>
  );
}
