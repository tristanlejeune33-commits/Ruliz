import Link from "next/link";
import type { RestaurantSiteBranding, RestaurantSiteConfig } from "../types";

interface HeroProps {
  branding: RestaurantSiteBranding;
  config: RestaurantSiteConfig;
}

/**
 * Hero du site — 4 variants :
 *  - split    : image + texte côte à côte (élégant brasserie)
 *  - banner   : image plein écran + overlay (immersif)
 *  - centered : minimaliste, pas d'image, juste un gros titre
 *  - video    : vidéo loop muted en arrière-plan + overlay
 *
 * Les valeurs par défaut viennent du branding du resto, le config peut
 * tout override.
 */
export function Hero({ branding, config }: HeroProps) {
  const hero = config.hero;
  const title = hero.title || branding.nom;
  const subtitle = hero.subtitle || branding.description || "";
  const eyebrow = hero.eyebrow || "";
  const imageUrl = hero.imageUrl || branding.banniereUrl || "";
  const videoUrl = hero.videoUrl || "";
  const ctaLabel = hero.ctaLabel || "Voir la carte";
  const ctaUrl = hero.ctaUrl || `/carte/${branding.id}`;

  const HeroContent = ({ inverse = false }: { inverse?: boolean }) => (
    <>
      {eyebrow && (
        <p className="rs-eyebrow" style={inverse ? { color: "#fff" } : undefined}>
          {eyebrow}
        </p>
      )}
      <h1 className="rs-display rs-hero__title">{title}</h1>
      {subtitle && <p className="rs-hero__subtitle">{subtitle}</p>}
      <div className="rs-hero__actions">
        <Link href={ctaUrl} className="rs-btn rs-btn--primary">
          {ctaLabel}
        </Link>
        {config.sections.reservation && (
          <a href="#reservation" className="rs-btn rs-btn--ghost">
            Réserver
          </a>
        )}
      </div>
    </>
  );

  // ====== variant: banner ======
  if (hero.variant === "banner") {
    return (
      <section id="top" className="rs-hero rs-hero--banner">
        <div className="rs-hero__bg" aria-hidden>
          {imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "var(--rs-accent)" }} />
          )}
        </div>
        <div className="rs-hero__overlay" aria-hidden />
        <div className="rs-container">
          <HeroContent inverse />
        </div>
      </section>
    );
  }

  // ====== variant: video ======
  if (hero.variant === "video") {
    return (
      <section id="top" className="rs-hero rs-hero--banner rs-hero--video">
        <div className="rs-hero__bg" aria-hidden>
          {videoUrl ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              poster={imageUrl || undefined}
              preload="metadata"
            >
              <source src={videoUrl} type="video/mp4" />
            </video>
          ) : imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "var(--rs-accent)" }} />
          )}
        </div>
        <div className="rs-hero__overlay" aria-hidden />
        <div className="rs-container">
          <HeroContent inverse />
        </div>
      </section>
    );
  }

  // ====== variant: centered (minimaliste, pas d'image) ======
  if (hero.variant === "centered") {
    return (
      <section id="top" className="rs-hero rs-hero--centered">
        <div className="rs-container" style={{ textAlign: "center" }}>
          <HeroContent />
        </div>
      </section>
    );
  }

  // ====== variant: split (default) ======
  return (
    <section id="top" className="rs-hero rs-hero--split">
      <div className="rs-container">
        <div className="rs-hero__grid">
          <div className="rs-hero__content">
            <HeroContent />
          </div>

          <div className="rs-hero__image">
            {imageUrl ? (
              <img src={imageUrl} alt={`${branding.nom} — ${eyebrow || "restaurant"}`} />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background:
                    "linear-gradient(135deg, var(--rs-accent), color-mix(in oklab, var(--rs-accent) 60%, black))",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
