"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Dimensions logiques d'un iPhone 14 Pro — l'iframe rend la carte à cette
 * largeur INTERNE quelle que soit la taille visuelle dans le dashboard.
 *
 * Pourquoi ? Avant ça l'iframe rendait la carte à sa largeur visuelle
 * (320-380 px) alors que les vrais smartphones modernes font 390-430 px.
 * Du coup le layout de la carte (titres, badges, descriptions) ne wrappait
 * pas pareil entre preview et live mobile. Avec cette technique, ce que
 * l'utilisateur voit dans la preview = exactement ce qu'il verra sur
 * son iPhone 14 Pro ou équivalent Android.
 *
 * iPhone 14 Pro : 393×852 logiques (au scale 3x natif). Référence solide :
 * c'est entre l'iPhone SE (375) et le Galaxy S24 Ultra (412), donc ça
 * couvre 90% du parc mobile.
 */
const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;

interface PhoneFrameProps {
  src: string;
  title?: string;
  /** Clé de re-mount pour forcer un reload de l'iframe */
  reloadKey?: string | number;
  /** Largeur visuelle max en px (l'iframe rend toujours en 393 px interne) */
  maxWidth?: number;
  /** Classes additionnelles pour le wrapper (bordure, ombre, etc.) */
  className?: string;
  /** Pour data-attributes (onboarding, tests, etc.) */
  dataAttrs?: Record<string, string>;
}

export function PhoneFrame({
  src,
  title,
  reloadKey,
  maxWidth = 380,
  className,
  dataAttrs,
}: PhoneFrameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(maxWidth / PHONE_WIDTH);

  // Observe la largeur réelle du wrapper et ajuste le scale.
  // Si le wrapper fait moins que maxWidth (small screen), on scale-down.
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          setScale(w / PHONE_WIDTH);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visualHeight = PHONE_HEIGHT * scale;

  return (
    <div
      ref={wrapRef}
      className={
        className ??
        "overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-xl"
      }
      style={{
        width: "100%",
        maxWidth: `${maxWidth}px`,
        height: `${visualHeight}px`,
        position: "relative",
      }}
      {...(dataAttrs ?? {})}
    >
      <iframe
        key={reloadKey}
        src={src}
        title={title}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${PHONE_WIDTH}px`,
          height: `${PHONE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          border: 0,
          display: "block",
        }}
      />
    </div>
  );
}
