import { ImageResponse } from "next/og";
import { loadSiteV2ByIdOrSlug } from "@/server/public/restaurant-site-v2-loader";
import { hexToOklch } from "@/features/restaurant-site-v2/lib/hexToOklch";

/**
 * OG image dynamique pour `/site/[id]` (v2).
 *
 * 1200×630 généré à la volée au moment d'un share (iMessage / WhatsApp /
 * Twitter / Facebook). Cache automatique Next.js + ISR de la page.
 *
 * Pas de runtime edge — `@/lib/redis` (ioredis) requiert net/dns/crypto
 * indisponibles sur edge. Node runtime par défaut suffit largement.
 */

export const alt = "Restaurant — site vitrine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OgImage({ params }: Props) {
  const { id } = await params;
  const payload = await loadSiteV2ByIdOrSlug(id);

  // Fallback image si site désactivé ou inconnu
  if (!payload || !payload.enabled) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: "#0e0e10",
            color: "#fff",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            fontSize: 64,
          }}
        >
          Ruliz
        </div>
      ),
      { ...size },
    );
  }

  const { config } = payload;
  const accent = hexToOklch(config.accentColor);
  const heroImg = config.bannerUrl || config.heroImage || null;
  const eyebrow = config.city || "Restaurant";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
          background: heroImg ? "#000" : accent,
          color: "#fff",
          fontFamily: "serif",
        }}
      >
        {heroImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImg}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.55,
            }}
          />
        )}

        {/* Overlay gradient inspiré du veil hero banner */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.35) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: 80,
            width: "100%",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: 4,
              color: accent,
              fontWeight: 500,
              marginBottom: 18,
              fontFamily: "monospace",
            }}
          >
            {eyebrow} · Depuis {config.established}
          </div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 0.95,
              maxWidth: 1000,
              letterSpacing: -2.5,
            }}
          >
            {config.restaurantName}
          </div>
          {config.tagline && (
            <div
              style={{
                fontSize: 28,
                marginTop: 18,
                opacity: 0.85,
                fontFamily: "sans-serif",
                maxWidth: 760,
                lineHeight: 1.3,
              }}
            >
              {config.tagline}
            </div>
          )}
        </div>

        {/* Badge Ruliz */}
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 60,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 16,
            opacity: 0.7,
            fontFamily: "monospace",
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Propulsé par Ruliz
        </div>
      </div>
    ),
    { ...size },
  );
}
