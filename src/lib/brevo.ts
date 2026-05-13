import "server-only";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/transactionalSMS/sms";

export function isBrevoConfigured() {
  return !!process.env.BREVO_API_KEY;
}

interface SendSmsOpts {
  /** Numéro destinataire au format international (ex: 33612345678). */
  recipient: string;
  /** Texte SMS (max 160 caractères pour 1 segment GSM). */
  content: string;
  /** Sender alphanumérique (max 11 chars) ou numérique (max 15). */
  sender?: string;
}

/**
 * Wrapper Brevo SMS · safe en l'absence de clé (no-op + log).
 */
export async function sendSms(
  opts: SendSmsOpts,
): Promise<{ ok: true; reference?: string } | { ok: false; error: string }> {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.warn(`[brevo.sms] BREVO_API_KEY absent · SMS pour ${opts.recipient} non envoyé`);
    return { ok: false, error: "BREVO_API_KEY absent" };
  }

  const sender =
    opts.sender ?? process.env.BREVO_SMS_SENDER ?? "Ruliz";

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        type: "transactional",
        sender,
        recipient: opts.recipient,
        content: opts.content,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Brevo ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = (await res.json()) as { reference?: string };
    return { ok: true, reference: data.reference };
  } catch (e) {
    console.error("[brevo.sms] exception:", e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Normalise un numéro français en format international E.164.
 * "06 12 34 56 78" → "33612345678"
 */
export function normalizeFrenchPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("33")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "33" + digits.slice(1);
  if (digits.length === 9) return "33" + digits;
  return digits;
}

/**
 * Normalise un numéro international E.164 pour Brevo.
 *
 * Accepte :
 *  - "+33 6 12 34 56 78" → "33612345678"
 *  - "06 12 34 56 78" → "33612345678" (par défaut pays FR)
 *  - "0032 470 12 34 56" → "32470123456" (Belgique)
 *  - "00 41 79 123 45 67" → "41791234567" (Suisse)
 *  - "+1 555 123 4567" → "15551234567"
 *
 * Si pas de préfixe international détecté et que défaut FR est demandé,
 * traite le numéro comme français (10 chiffres commençant par 0).
 */
export function normalizeInternationalPhone(
  input: string,
  defaultCountryCode: string = "33",
): { ok: true; value: string } | { ok: false; error: string } {
  const cleaned = input.trim();
  if (!cleaned) return { ok: false, error: "Numéro vide" };

  // Supprime espaces, tirets, parenthèses, points
  const digits = cleaned.replace(/[^\d+]/g, "");

  // Cas "+CCxxxxx" (format international avec +)
  if (digits.startsWith("+")) {
    const numbers = digits.slice(1);
    if (numbers.length < 8 || numbers.length > 15) {
      return { ok: false, error: "Numéro international invalide (8-15 chiffres)" };
    }
    return { ok: true, value: numbers };
  }

  // Cas "00CCxxxxx" (format international avec 00)
  if (digits.startsWith("00")) {
    const numbers = digits.slice(2);
    if (numbers.length < 8 || numbers.length > 15) {
      return { ok: false, error: "Numéro international invalide" };
    }
    return { ok: true, value: numbers };
  }

  // Cas FR par défaut : 10 chiffres commençant par 0
  if (digits.startsWith("0") && digits.length === 10) {
    return { ok: true, value: defaultCountryCode + digits.slice(1) };
  }

  // Déjà au format E.164 sans +
  if (digits.length >= 10 && digits.length <= 15) {
    return { ok: true, value: digits };
  }

  return {
    ok: false,
    error: "Format de numéro non reconnu (utilise +33 6 12 34 56 78 ou 06 12 34 56 78)",
  };
}
