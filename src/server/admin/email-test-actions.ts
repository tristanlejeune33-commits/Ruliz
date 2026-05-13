"use server";

import { z } from "zod";
import { sendMail } from "@/lib/resend";
import {
  emailLayout,
  lead,
  p,
  hero,
  infoBox,
  code,
  warnBox,
} from "@/lib/email-template";
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
 * Tous les templates utilisent emailLayout() de lib/email-template pour
 * le branding Ruliz cohérent (logo, bleu signature, footer légal).
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
          html: emailLayout({
            title: "Bienvenue sur Ruliz",
            eyebrow: "Création de compte",
            preheader:
              "Ton compte Ruliz est créé. Première étape : brancher ta carte digitale.",
            body: `
              ${lead("Salut Tristan,")}
              ${p("Ton compte Ruliz est <strong>créé</strong> 🎉. Tu peux maintenant brancher ta carte digitale, générer tes QR codes et démarrer ton premier jeu d'avis.")}
              ${infoBox(`<strong>Premiers pas suggérés :</strong>
                <ol style="margin:8px 0 0;padding-left:20px;color:#4A5573;font-size:14px;line-height:1.7;">
                  <li>Renseigne les <strong>infos de ton restaurant</strong> (nom, logo, bannière)</li>
                  <li>Crée ta <strong>première catégorie</strong> et ajoute tes plats</li>
                  <li>Génère un <strong>QR code</strong> à coller sur tes tables</li>
                  <li>Lance la <strong>roulette d'avis Google</strong> pour récolter des avis</li>
                </ol>`)}
            `,
            cta: { label: "Accéder au dashboard", url: `${appUrl}/dashboard` },
            footnote:
              "Besoin d'aide ? Réponds à cet email, l'équipe Ruliz te répondra dans la journée.",
          }),
        });
        return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Échec" };
      }

      case "reset-password": {
        const res = await sendMail({
          to,
          subject: "Réinitialise ton mot de passe Ruliz",
          html: emailLayout({
            title: "Réinitialise ton mot de passe",
            eyebrow: "Récupération de compte",
            preheader:
              "Lien valable 1h pour choisir un nouveau mot de passe Ruliz.",
            body: `
              ${lead("Salut,")}
              ${p("Tu as demandé à réinitialiser ton mot de passe sur Ruliz. Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.")}
              ${infoBox("⏱️ Ce lien est valable <strong>1 heure</strong>. Au-delà, il faudra refaire une demande.")}
            `,
            cta: {
              label: "Choisir un nouveau mot de passe",
              url: `${appUrl}/reset-password?token=demo-test-token`,
            },
            footnote:
              "Tu n'es pas à l'origine de cette demande ? Ignore cet email · ton compte reste sûr.",
          }),
        });
        return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Échec" };
      }

      case "team-invite": {
        const res = await sendMail({
          to,
          subject: "Tristan t'invite sur Ruliz",
          html: emailLayout({
            title: "Bienvenue dans l'équipe",
            eyebrow: "Invitation Ruliz",
            preheader:
              "Tristan t'a invité comme éditeur de la carte du Bistrot Ruliz.",
            body: `
              ${lead("Salut,")}
              ${p("<strong>Tristan</strong> t'a invité à rejoindre son équipe sur Ruliz pour gérer la carte du <strong>Bistrot Ruliz</strong>.")}
              ${infoBox(`<strong>Ton rôle :</strong> Éditeur<br>
                <span style="color:#8892AB;font-size:13px;">Tu pourras modifier la carte, ajouter des produits et gérer les QR codes.</span>`)}
            `,
            cta: {
              label: "Accepter l'invitation",
              url: `${appUrl}/signup?invite=demo-team-token`,
            },
          }),
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
            { nom: "QR Acrylique Pro", quantite: 2, totalEuros: "39,80 €" },
            { nom: "Stickers vinyle (50)", quantite: 1, totalEuros: "8,00 €" },
          ],
          livraisonAdresseHtml:
            "<div><strong>Tristan Lejeune</strong></div><div>12 rue Sainte-Catherine</div><div>33000 Bordeaux · France</div>",
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
            { nom: "QR Acrylique Pro", quantite: 2, totalEuros: "39,80 €" },
            { nom: "Stickers vinyle (50)", quantite: 1, totalEuros: "8,00 €" },
          ],
          livraisonAdresseHtml:
            "<div><strong>Marie Dubois</strong></div><div>Le Tire-Bouchon</div><div>5 cours de l'Intendance</div><div>33000 Bordeaux · France</div>",
          notesClient: null,
        });
        return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Échec" };
      }

      case "jeu-gain": {
        const res = await sendMail({
          to,
          subject: "🎉 Tu as gagné · Roulette du Bistrot Ruliz",
          html: emailLayout({
            title: "Bravo, tu as gagné !",
            eyebrow: "Roulette d'avis Google",
            preheader:
              "Tu as gagné une bouteille de Margaux à la roulette du Bistrot Ruliz.",
            body: `
              ${lead("Félicitations !")}
              ${p("Tu viens de gagner à la roulette d'avis du <strong>Bistrot Ruliz</strong> :")}
              ${hero({
                emoji: "🍷",
                title: "Bouteille de Margaux",
                subtitle: "Médoc · grand cru bourgeois",
              })}
              ${p(`Ton code à présenter à l'équipe : ${code("RULIZ-DEMO-9X4K")}`)}
              ${warnBox(
                "<strong>Important :</strong> Présente ce mail (ou juste le code) au serveur lors de ta prochaine visite. Le code est unique et personnel · non transférable.",
              )}
            `,
            footnote:
              "Code valable 30 jours dans le restaurant participant. Non cumulable avec d'autres offres. Non échangeable contre de l'argent.",
          }),
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
