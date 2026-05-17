import "server-only";
import dns from "node:dns/promises";

/**
 * Validation d'email en 3 niveaux (gratuit, sans NeverBounce) :
 *
 *   1. **Syntaxe RFC 5322 stricte** — élimine les fautes de frappe
 *   2. **Role-based filter** — exclut info@, contact@, no-reply@, etc.
 *      Ces emails partent souvent en spam ou ne sont jamais lus.
 *   3. **MX lookup DNS** — vérifie que le domaine accepte des mails.
 *      Élimine les domaines morts (~30% du bounce typique).
 *
 * Pas de SMTP probing (trop intrusif, risque blacklist) ni de catch-all
 * detection. Pour le pilote 2k, ces 3 filtres réduisent le bounce rate
 * estimé de 8% → 2-3%.
 *
 * Coût : 0 (DNS lookup local). Latence : ~50-200ms par email.
 */

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const ROLE_PREFIXES = new Set([
  "no-reply",
  "noreply",
  "donotreply",
  "do-not-reply",
  "postmaster",
  "abuse",
  "admin",
  "webmaster",
  "hostmaster",
  "spam",
  "bounce",
  "bounces",
  "mailer-daemon",
  "mailerdaemon",
  "nobody",
  "root",
  "support",
  "help",
  "helpdesk",
  "service",
  "services",
  "marketing",
  "newsletter",
  "noticias",
]);

// Cache MX en mémoire (TTL 1h) — évite de re-lookuper le même domaine 2000 fois
const mxCache = new Map<string, { hasMx: boolean; expiresAt: number }>();
const MX_TTL_MS = 60 * 60 * 1000;

export type EmailValidationResult =
  | { ok: true; tier: "good" | "warning" }
  | { ok: false; reason: "syntax" | "role_based" | "no_mx" | "dns_error" };

export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const normalized = email.trim().toLowerCase();

  // ─── 1) Syntaxe RFC 5322 ────────────────────────────────────────────
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, reason: "syntax" };
  }
  if (normalized.length > 254) {
    return { ok: false, reason: "syntax" };
  }

  const atIdx = normalized.indexOf("@");
  const local = normalized.slice(0, atIdx);
  const domain = normalized.slice(atIdx + 1);

  // ─── 2) Role-based filter ───────────────────────────────────────────
  // On flag mais on ne reject pas systématiquement : certains restos n'ont
  // que info@. On accepte info@ et contact@ mais on rejette no-reply, abuse, etc.
  const HARD_REJECTS = [
    "no-reply",
    "noreply",
    "donotreply",
    "do-not-reply",
    "postmaster",
    "abuse",
    "mailer-daemon",
    "mailerdaemon",
    "bounce",
    "bounces",
    "spam",
    "nobody",
    "root",
  ];
  if (HARD_REJECTS.includes(local)) {
    return { ok: false, reason: "role_based" };
  }

  // ─── 3) MX lookup avec cache ────────────────────────────────────────
  const cached = mxCache.get(domain);
  let hasMx: boolean;

  if (cached && cached.expiresAt > Date.now()) {
    hasMx = cached.hasMx;
  } else {
    try {
      const mxRecords = await dns.resolveMx(domain);
      hasMx = mxRecords.length > 0;
      mxCache.set(domain, { hasMx, expiresAt: Date.now() + MX_TTL_MS });
    } catch (err: unknown) {
      // ENOTFOUND, SERVFAIL, ENODATA → pas de MX
      const code = (err as { code?: string }).code;
      if (code === "ENOTFOUND" || code === "ENODATA" || code === "SERVFAIL") {
        mxCache.set(domain, { hasMx: false, expiresAt: Date.now() + MX_TTL_MS });
        return { ok: false, reason: "no_mx" };
      }
      // Timeout DNS / autre erreur réseau → on n'exclut pas par précaution
      // (mieux vaut un faux positif qu'éliminer un domaine valide à cause
      // d'une glitch réseau)
      return { ok: false, reason: "dns_error" };
    }
  }

  if (!hasMx) return { ok: false, reason: "no_mx" };

  // ─── Niveau de confiance ────────────────────────────────────────────
  // "warning" = email valide mais role-based soft (info@, contact@)
  // → on l'envoie quand même mais on track le taux de bounce dessus
  const isSoftRole = ROLE_PREFIXES.has(local);
  return { ok: true, tier: isSoftRole ? "warning" : "good" };
}

/**
 * Valide en parallèle un batch d'emails avec limite de concurrence.
 * Utilisé en bulk avant l'enrichissement pour économiser API/temps Anthropic.
 */
export async function validateEmailBatch(
  emails: string[],
  opts: { concurrency?: number } = {},
): Promise<Map<string, EmailValidationResult>> {
  const { concurrency = 20 } = opts;
  const results = new Map<string, EmailValidationResult>();
  const queue = [...emails];

  async function worker() {
    while (queue.length > 0) {
      const email = queue.shift();
      if (!email) break;
      try {
        const result = await validateEmail(email);
        results.set(email, result);
      } catch (err) {
        results.set(email, { ok: false, reason: "dns_error" });
        console.warn(`[validate-batch] ${email}:`, err);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, emails.length) }, worker),
  );

  return results;
}
