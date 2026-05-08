import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carte · Ruliz",
};

// Force light mode + system fonts for the public menu : maximum legibility,
// minimum bundle, fonts that have full glyph coverage for ZH/AR/etc.
export default function CarteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen antialiased"
      style={{
        background: "oklch(0.99 0 0)",
        color: "oklch(0.145 0 0)",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
      data-public-menu="true"
    >
      {children}
    </div>
  );
}
