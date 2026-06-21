import "server-only";
import { cache } from "react";
import { headers } from "next/headers";

/**
 * Détection du pays (ISO-2) d'où provient la requête.
 *
 * Stratégie en 2 temps :
 *  1. Header géo direct si présent (`cf-ipcountry` quand le domaine est
 *     proxifié par Cloudflare, `x-vercel-ip-country` sur Vercel). Gratuit,
 *     instantané, zéro dépendance.
 *  2. Sinon (cas Railway sans proxy géo), on géolocalise l'IP cliente via
 *     GeoJS (API gratuite, sans clé, https://get.geojs.io). Timeout 2 s,
 *     fallback `null` en cas d'échec → le code appelant retombe sur ses
 *     valeurs par défaut.
 *
 * Retourne le code ISO-2 majuscule (ex: "ES") ou `null` si indéterminé.
 */
function isPublicIp(ip: string): boolean {
  if (!ip || ip === "anon") return false;
  if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("169.254.")) {
    return false;
  }
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return false;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return false;
  // IPv6 link-local / unique-local
  if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
    return false;
  }
  return true;
}

function isValidCountry(code: string): boolean {
  return /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1";
}

// `cache()` : dédup par requête → un seul appel GeoJS même si layout + page
// l'invoquent tous les deux (cas /signup).
export const detectCountry = cache(async (): Promise<string | null> => {
  const h = await headers();

  // 1. Header géo direct
  const headerCountry = (
    h.get("cf-ipcountry") ??
    h.get("x-vercel-ip-country") ??
    ""
  ).toUpperCase();
  if (isValidCountry(headerCountry)) return headerCountry;

  // 2. Géoloc de l'IP cliente
  const ip = (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0] ??
    h.get("x-real-ip") ??
    ""
  ).trim();
  if (!isPublicIp(ip)) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(
      `https://get.geojs.io/v1/ip/country/${encodeURIComponent(ip)}.json`,
      { signal: controller.signal, cache: "no-store" },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { country?: string };
    const code = (data.country ?? "").toUpperCase();
    return isValidCountry(code) ? code : null;
  } catch {
    return null;
  }
});
