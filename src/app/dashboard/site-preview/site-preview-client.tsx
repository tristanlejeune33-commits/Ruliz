"use client";

import { useState } from "react";
import { RestaurantSite } from "@/features/restaurant-site-v2/RestaurantSite";
import {
  DEMO_CONFIGS,
  DEMO_OPTIONS,
  type DemoSlug,
} from "@/features/restaurant-site-v2/data";

/**
 * Toggle visuel pour switcher entre les 3 démos.
 *
 * Le picker est positionné en `position: fixed` bottom-left, par-dessus
 * le site rendu, en glassmorphism léger pour rester discret sans gêner
 * l'évaluation visuelle. Z-index supérieur au float-cta (200) → 1000.
 */
export function SitePreviewClient() {
  const [slug, setSlug] = useState<DemoSlug>("tire-bouchon");
  const config = DEMO_CONFIGS[slug];

  return (
    <>
      {/* Le site lui-même — pleine largeur */}
      <RestaurantSite key={slug} config={config} />

      {/* Picker démo en overlay */}
      <div
        style={{
          position: "fixed",
          left: 18,
          bottom: 18,
          zIndex: 1000,
          background: "rgba(20,20,22,0.92)",
          color: "#fff",
          backdropFilter: "blur(14px) saturate(180%)",
          borderRadius: 16,
          padding: 14,
          boxShadow: "0 12px 36px rgba(0,0,0,0.25)",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          maxWidth: 260,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.55,
          }}
        >
          Phase validation — démo
        </p>
        <div
          style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}
        >
          {DEMO_OPTIONS.map((opt) => {
            const active = opt.slug === slug;
            return (
              <button
                key={opt.slug}
                type="button"
                onClick={() => setSlug(opt.slug)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                  border: active
                    ? "1px solid rgba(255,255,255,0.28)"
                    : "1px solid transparent",
                  color: "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 13,
                  transition: "background 200ms, border-color 200ms",
                }}
              >
                <span style={{ fontWeight: 500 }}>{opt.label}</span>
                <span style={{ fontSize: 10, opacity: 0.6 }}>{opt.meta}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
