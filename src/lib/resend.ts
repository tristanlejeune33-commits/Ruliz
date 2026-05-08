import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

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
  from = "Ruliz <noreply@ruliz.app>",
}: SendMailOptions) {
  const resend = getResend();
  if (!resend) {
    console.warn(`[mail] RESEND_API_KEY absent — mail "${subject}" non envoyé à ${to}`);
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
