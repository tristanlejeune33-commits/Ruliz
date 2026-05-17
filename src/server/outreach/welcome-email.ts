import "server-only";
import {
  emailLayout,
  hero,
  infoBox,
  lead,
  p,
  spacer,
  successBox,
} from "@/lib/email-template";
import { sendMail } from "@/lib/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";

/**
 * Email de bienvenue envoyé après activation d'un prospect.
 * Objectifs :
 *   1. Rassurer ("tout est ok, ta carte est là")
 *   2. Onboarder en 3 actions critiques (modifier carte / générer QR / inviter équipe)
 *   3. Pousser vers Stripe Pro (1er mois offert si activation outreach)
 */
export async function sendActivationWelcomeEmail(opts: {
  to: string;
  prenom: string;
  restaurantNom: string;
  restaurantId: bigint;
}): Promise<{ ok: boolean }> {
  const { to, prenom, restaurantNom, restaurantId } = opts;

  const dashboardUrl = `${APP_URL}/dashboard`;
  const menuUrl = `${APP_URL}/dashboard/menu`;
  const qrcodeUrl = `${APP_URL}/dashboard/qrcodes`;
  const carteUrl = `${APP_URL}/carte/${restaurantId}`;
  const billingUrl = `${APP_URL}/dashboard/settings?tab=billing`;

  const html = emailLayout({
    title: `Bienvenue chez Ruliz, ${prenom}`,
    preheader: `Votre carte digitale de ${restaurantNom} est active.`,
    body: `
${hero({
  emoji: "🎉",
  title: `Bienvenue ${prenom} !`,
  subtitle: `La carte de <strong>${restaurantNom}</strong> est en ligne.`,
})}

${lead(
  `Votre carte digitale est <strong>déjà accessible publiquement</strong>. Vous pouvez la consulter, la modifier et imprimer son QR code dès maintenant.`,
)}

${spacer(24)}

${successBox(`
  <p style="margin:0 0 8px;font-weight:600;">✅ Voici ce qui est déjà fait :</p>
  <ul style="margin:0;padding-left:20px;line-height:1.7;">
    <li>Votre carte est construite à partir de votre site web</li>
    <li>Vos catégories et plats sont organisés</li>
    <li>Logo + couleurs récupérés automatiquement</li>
    <li>Traduction en 7 langues lancée en arrière-plan (~5 min)</li>
  </ul>
`)}

${spacer(24)}

<h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0B1530;">
  Vos 3 prochaines étapes (10 minutes)
</h2>

${p(`<strong>1. Vérifiez et personnalisez votre carte</strong><br/>
La génération automatique fait du bon travail, mais c'est <em>votre</em> carte —
ajoutez vos photos, ajustez les descriptions, supprimez ce qui ne sert pas.`)}

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 16px;">
  <tr><td>
    <a href="${menuUrl}" style="display:inline-block;background:#26438A;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
      ✏️ Ouvrir l'éditeur de carte →
    </a>
  </td></tr>
</table>

${p(`<strong>2. Générez votre QR code à imprimer</strong><br/>
Le QR que vos clients scanneront sur la table. PDF imprimable, format A6 ou stickers.`)}

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 16px;">
  <tr><td>
    <a href="${qrcodeUrl}" style="display:inline-block;background:#26438A;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
      📱 Générer mon QR code →
    </a>
  </td></tr>
</table>

${p(`<strong>3. Voyez votre carte comme un client</strong><br/>
Ouvrez ce lien sur votre téléphone (ou scannez votre futur QR code) pour valider le rendu.`)}

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 16px;">
  <tr><td>
    <a href="${carteUrl}" style="display:inline-block;background:#fff;color:#26438A;border:1px solid #26438A;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
      👀 Voir ma carte publique →
    </a>
  </td></tr>
</table>

${spacer(32)}

${infoBox(`
  <p style="margin:0 0 8px;font-weight:600;">🎁 Bonus activation outreach</p>
  <p style="margin:0;">
    Comme vous avez activé via notre campagne, votre premier mois Pro est offert.
    Aucune action nécessaire — la promo s'applique automatiquement quand vous
    upgradez depuis votre dashboard.
  </p>
  <p style="margin:12px 0 0;">
    <a href="${billingUrl}" style="color:#26438A;font-weight:600;text-decoration:underline;">
      Voir les plans Pro →
    </a>
  </p>
`)}

${spacer(24)}

${p(`Une question ? Répondez simplement à ce mail, je lis personnellement chaque message.`)}

${p(`<strong>Tristan</strong><br/>
<span style="color:#555;font-size:14px;">Fondateur de Ruliz</span>`)}
`,
    footnote: `
      <a href="${dashboardUrl}" style="color:#26438A;">Accéder au dashboard</a>
      · <a href="${APP_URL}/legal/mentions-legales" style="color:#999;">Mentions légales</a>
    `,
  });

  const result = await sendMail({
    to,
    subject: `🎉 Votre carte ${restaurantNom} est active`,
    html,
  });

  return { ok: result.ok };
}
