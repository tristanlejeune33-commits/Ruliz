/**
 * Centralise la résolution de l'URL de l'app, en tolérant qu'elle soit
 * configurée sans schéma (`ruliz.up.railway.app`) · on préfixe alors `https://`.
 *
 * À utiliser PARTOUT au lieu de `process.env.NEXT_PUBLIC_APP_URL` brut.
 */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "http://localhost:3000";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }
  // Localhost without schema → http
  if (raw.startsWith("localhost") || raw.startsWith("127.0.0.1")) {
    return `http://${raw}`;
  }
  return `https://${raw.replace(/\/$/, "")}`;
}

/** Idem pour BETTER_AUTH_URL. */
export function getAuthUrl(): string {
  const raw = process.env.BETTER_AUTH_URL?.trim();
  if (!raw) return getAppUrl();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }
  if (raw.startsWith("localhost") || raw.startsWith("127.0.0.1")) {
    return `http://${raw}`;
  }
  return `https://${raw.replace(/\/$/, "")}`;
}
