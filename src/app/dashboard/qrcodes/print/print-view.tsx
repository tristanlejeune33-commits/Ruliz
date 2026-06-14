"use client";

import { ArrowLeft, Printer } from "lucide-react";

interface PrintQr {
  id: string;
  codeUnique: string;
  pngUrl: string | null;
  label: string | null;
}

/**
 * Vue d'impression des QR codes.
 *
 * Sur écran : un panneau blanc plein écran (z-index élevé) qui recouvre la
 * chrome du dashboard, avec une barre d'outils (Imprimer / Retour).
 *
 * À l'impression : le bloc `@media print` masque toute l'app (visibility
 * trick) pour ne garder que la feuille `#qr-print-sheet`, et retire la barre
 * d'outils (.no-print). Une grille fixe 2 colonnes tient proprement en A4.
 */
export function QrcodesPrintView({
  restaurantName,
  qrcodes,
}: {
  restaurantName: string;
  qrcodes: PrintQr[];
}) {
  return (
    <div className="fixed inset-0 z-[9999] overflow-auto bg-white text-neutral-900">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #qr-print-sheet, #qr-print-sheet * { visibility: visible !important; }
          #qr-print-sheet { position: absolute; inset: 0; }
          .no-print { display: none !important; }
          @page { margin: 12mm; }
        }
      `}</style>

      {/* Barre d'outils (écran uniquement) */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-5 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          <ArrowLeft className="size-4" />
          Fermer
        </button>
        <p className="text-sm font-medium text-neutral-500">
          {qrcodes.length} QR code{qrcodes.length > 1 ? "s" : ""} à imprimer
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          <Printer className="size-4" />
          Imprimer
        </button>
      </div>

      {/* Feuille imprimable */}
      <div id="qr-print-sheet" className="mx-auto max-w-[800px] px-8 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{restaurantName}</h1>
          <p className="text-sm text-neutral-500">
            Scanne pour consulter la carte
          </p>
        </header>

        {qrcodes.length === 0 ? (
          <p className="py-16 text-center text-neutral-500">
            Aucun QR code actif à imprimer.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {qrcodes.map((qr) => (
              <div
                key={qr.id}
                className="flex break-inside-avoid flex-col items-center gap-2 rounded-2xl border border-neutral-200 p-5"
              >
                {qr.pngUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qr.pngUrl}
                    alt={`QR ${qr.label ?? qr.codeUnique}`}
                    className="h-auto w-full max-w-[220px]"
                  />
                )}
                <p className="text-center text-lg font-bold leading-tight">
                  {qr.label || "—"}
                </p>
                <p className="font-mono text-xs text-neutral-400">
                  {qr.codeUnique}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
