"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { FAB } from "@/components/ui/fab";

/**
 * MenuFab — FAB mobile pour ouvrir la carte publique en preview.
 *
 * Le bouton inline "Voir la carte publique" est `hidden lg:inline-flex`
 * donc invisible sur mobile. Le FAB le remplace pour rester accessible
 * d'un pouce dans la zone basse de l'écran.
 */
export function MenuFab({ restaurantId }: { restaurantId: string }) {
  return (
    <FAB
      asChild
      icon={<Eye />}
      label="Voir ma carte publique"
    >
      <Link
        href={`/carte/${restaurantId}`}
        target="_blank"
        rel="noreferrer"
      />
    </FAB>
  );
}
