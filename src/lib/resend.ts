import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

/**
 * Expéditeur par défaut des emails transactionnels. Configurable via la
 * variable d'environnement `MAIL_FROM` (recommandé en prod).
 * Format attendu : "Ruliz <noreply@ruliz-panel.fr>".
 *
 * Le domaine de l'email doit être **vérifié chez Resend** (DNS SPF + DKIM
 * configurés chez le registrar) sinon les envois plantent en
 * "domain not verified".
 */
const DEFAULT_FROM =
  process.env.MAIL_FROM ?? "Ruliz <noreply@ruliz-panel.fr>";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Wrapper safe : log et no-op si Resend n'est pas configuré (dev local).
 * Renvoie `{ ok: boolean, id?: string }`.
 */
export async function sendMail({
  to,
  subject,
  html,
  from = DEFAULT_FROM,
}: SendMailOptions) {
  const resend = getResend();
  if (!resend) {
    console.warn(`[mail] RESEND_API_KEY absent · mail "${subject}" non envoyé à ${to}`);
    return { ok: false, skipped: true } as const;
  }

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error(`[mail] Erreur Resend pour ${to}:`, error);
      return { ok: false, error: error.message } as const;
    }
    return { ok: true, id: data?.id } as const;
  } catch (err) {
    console.error(`[mail] Exception Resend pour ${to}:`, err);
    return { ok: false, error: String(err) } as const;
  }
}
