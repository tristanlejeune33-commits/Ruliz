"use server";

import { z } from "zod";
import { sendMail } from "@/lib/resend";
import { requireAdmin } from "@/lib/session";
import {
  sendCommandeConfirmationToClient,
  sendCommandeNotificationToAdmin,
} from "@/server/boutique/emails";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const schema = z.object({
  to: z.email("Email invalide"),
  type: z.enum([
    "welcome",
    "reset-password",
    "team-invite",
    "boutique-confirm",
    "boutique-admin",
    "jeu-gain",
  ]),
});

/**
 * Envoie un email de test à une adresse arbitraire. Utilisé par la page
 * /admin/email-test pour valider que la config Resend + DNS marche
 * end-to-end après le setup d'un nouveau domaine.
 *
 * Réservé aux admins (les emails ont parfois des URLs absolutes qui
 * révèlent la structure du panel).
 */
export async function sendTestEmail(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }
  const { to, type } = parsed.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";

  try {
    switch (type) {
      case "welcome": {
        const res = await sendMail({
          to,
          subject: "Bienvenue sur Ruliz 🎉",
          html: simpleHtml(
            "Bienvenue sur Ruliz",
            `<p>Salut Tristan,</p>
             <p>Ton compte Ruliz est créé. Tu peux maintenant brancher ta carte digitale,
             générer tes QR codes et démarrer ton premier jeu d'avis.</p>
             <p style="margin-top: 24px;">
               <a href="${appUrl}/dashboard" class="btn">Accéder au dashboard</a>
             </p>`,
          ),
        });
        return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Échec" };
      }

      case "reset-password": {
        const res = await sendMail({
          to,
          subject: "Réinitialise ton mot de passe Ruliz",
          html: simpleHtml(
            "Mot de passe oublié ?",
            `<p>Salut,</p>
             <p>Tu as demandé à réinitialiser ton mot de passe. Clique sur le lien ci-dessous —
             il est valable 1h.</p>
             <p style="margin-top: 24px;">
               <a href="${appUrl}/reset-password?token=demo-test-token" class="btn">
                 Réinitialiser mon mot de passe
               </a>
             </p>
             <p style="color: #8892AB; font-size: 12px; margin-top: 32px;">
               Tu n'as pas fait cette demande ? Ignore ce mail, ton compte reste sûr.
             </p>`,
          ),
        });
        return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Échec" };
      }

      case "team-invite": {
        const res = await sendMail({
          to,
          subject: "Tristan t'invite sur Ruliz",
          html: simpleHtml(
            "Rejoins l'équipe Ruliz",
            `<p>Tristan t'a invité à rejoindre son équipe sur Ruliz pour gérer la carte du
             <strong>Bistrot Ruliz</strong>.</p>
             <p style="margin-top: 24px;">
               <a href="${appUrl}/signup?invite=demo-team-token" class="btn">Accepter l'invitation</a>
             </p>`,
          ),
        });
        return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Échec" };
      }

      case "boutique-confirm": {
        const res = await sendCommandeConfirmationToClient({
          commandeId: "TEST-001",
          clientNom: "Tristan",
          clientEmail: to,
          totalEuros: "47,80 €",
          items: [
            { nom: "QR Acrylique Pro × 2", quantite: 2, totalEuros: "39,80 €" },
            { nom: "Stickers vinyle (50)", quantite: 1, totalEuros: "8,00 €" },
          ],
          livraisonAdresseHtml:
            "<div>Tristan Lejeune</div><div>12 rue Sainte-Catherine</div><div>33000 Bordeaux</div>",
          notesClient: "Merci pour la rapidité !",
        });
        return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Échec" };
      }

      case "boutique-admin": {
        const res = await sendCommandeNotificationToAdmin({
          adminEmail: to,
          commandeId: "TEST-001",
          clientNom: "Marie Dubois",
          clientEmail: "marie.dubois@tirebouchon.fr",
          totalEuros: "47,80 €",
          items: [
            { nom: "QR Acrylique Pro × 2", quantite: 2, totalEuros: "39,80 €" },
            { nom: "Stickers vinyle (50)", quantite: 1, totalEuros: "8,00 €" },
          ],
          livraisonAdresseHtml:
            "<div>Marie Dubois</div><div>5 cours de l'Intendance</div><div>33000 Bordeaux</div>",
          notesClient: null,
        });
        return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Échec" };
      }

      case "jeu-gain": {
        const res = await sendMail({
          to,
          subject: "🎉 Tu as gagné — Roulette Ruliz",
          html: simpleHtml(
            "Bravo, tu as gagné !",
            `<p>Salut,</p>
             <p>Tu viens de gagner à la roulette d'avis du <strong>Bistrot Ruliz</strong> :</p>
             <div style="margin: 24px 0; padding: 20px; background: #EEF2FA; border-radius: 12px; text-align: center;">
               <div style="font-size: 32px; line-height: 1;">🍷</div>
               <div style="font-size: 18px; font-weight: 700; color: #26438A; margin-top: 8px;">
                 Bouteille de Margaux
               </div>
               <div style="margin-top: 16px; font-family: monospace; font-size: 14px; color: #0B1530;">
                 Code : <strong>RULIZ-DEMO-9X4K</strong>
               </div>
             </div>
             <p>Présente ce mail au serveur lors de ta prochaine visite — l'équipe te remettra ton lot.</p>
             <p style="color: #8892AB; font-size: 12px; margin-top: 32px;">
               À utiliser dans les 30 jours. Non cumulable avec d'autres offres.
             </p>`,
          ),
        });
        return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Échec" };
      }
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Wrapper HTML simple avec branding Ruliz (light DS, bleu signature).
 */
function simpleHtml(title: string, body: string): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; background: #FAFBFD; color: #0B1530; padding: 24px; line-height: 1.5;">
  <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #ECEFF5; border-radius: 16px; padding: 32px;">
    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #8892AB; margin-bottom: 12px;">
      Email de test · Ruliz
    </div>
    <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 16px; color: #0B1530;">
      ${title}
    </h1>
    <style>
      .btn {
        display: inline-block;
        padding: 12px 24px;
        background: #26438A;
        color: #FFFFFF !important;
        text-decoration: none;
        border-radius: 12px;
        font-weight: 600;
      }
    </style>
    ${body}
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ECEFF5; color: #8892AB; font-size: 12px; text-align: center;">
      Ruliz — SaaS de menus digitaux pour restaurants · <a href="https://ruliz-panel.fr" style="color: #26438A;">ruliz-panel.fr</a>
    </div>
  </div>
</div>
  `.trim();
}
