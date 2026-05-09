"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bouton qui déclenche window.print() — la CSS @media print du layout
 * masque le header/sidebar et imprime uniquement le bon de commande.
 */
export function PrintButton() {
  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      onClick={() => window.print()}
    >
      <Printer className="size-3.5" strokeWidth={1.75} />
      Imprimer / PDF
    </Button>
  );
}
