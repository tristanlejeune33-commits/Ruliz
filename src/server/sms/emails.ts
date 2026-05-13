import "server-only";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/resend";
import {
  emailLayout,
  lead,
  p,
  successBox,
  hero,
} from "@/lib/email-template";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";

/**
 * Email envoyé après un achat de pack SMS confirmé (webhook Stripe
 * checkout.session.completed mode=payment avec ruliz_sms_purchase_id).
 *
 * Récupère le user.email du restaurant + le nouveau solde pour afficher
 * un récap clair.
 */
export async function sendSmsPackConfirmation(opts: {
  restaurantId: bigint;
  packSize: number;
  pricePaidCentimes: number;
}) {
  const resto = await prisma.restaurant.findUnique({
    where: { id: opts.restaurantId },
    select: {
      nom: true,
      user: { select: { email: true, prenom: true } },
    },
  });
  if (!resto?.user?.email) {
    console.warn(
      `[sms-email] Pas d'email pour restaurant ${opts.restaurantId}, skip`,
    );
    return;
  }

  // Récupère le solde actuel pour info récap
  const balance = (await prisma.$queryRawUnsafe(
    `SELECT balance, total_acquired FROM sms_balance WHERE restaurant_id = $1`,
    opts.restaurantId,
  ).catch(() => [])) as Array<{ balance: number; total_acquired: number }>;
  const currentBalance = balance[0]?.balance ?? opts.packSize;

  const priceEuros = (opts.pricePaidCentimes / 100).toFixed(2).replace(".", ",");
  const firstName = resto.user.prenom?.trim() ?? "";

  await sendMail({
    to: resto.user.email,
    subject: `Pack ${opts.packSize} SMS crédité — Ruliz`,
    html: emailLayout({
      title: "Pack SMS crédité ✓",
      eyebrow: "Confirmation d'achat",
      preheader: `${opts.packSize} SMS ajoutés à ton solde · ${priceEuros}€ payés.`,
      body: `
        ${lead(`Salut${firstName ? ` ${firstName}` : ""},`)}
        ${p(`Ton paiement de <strong>${priceEuros} €</strong> est confirmé. Le pack <strong>${opts.packSize} SMS</strong> est crédité sur ton compte <strong>${resto.nom}</strong>.`)}
        ${hero({
          emoji: "📨",
          title: `${currentBalance} SMS disponibles`,
          subtitle: `Solde après crédit (+${opts.packSize} SMS)`,
        })}
        ${successBox(
          `<strong>Tu peux commencer à envoyer dès maintenant.</strong> Va dans <em>SMS Marketing</em> de ton dashboard pour lancer ta première campagne (anniversaires clients, événements, happy hour…).`,
        )}
      `,
      cta: {
        label: "Envoyer ma première campagne",
        url: `${APP_URL}/dashboard/sms`,
      },
      footnote: `Ta facture officielle (PDF) sera disponible dans <a href="${APP_URL}/dashboard/settings/factures" style="color:#26438A;">tes factures Ruliz</a> sous 1h. Reçu Stripe également envoyé en parallèle si tu as configuré la réception.`,
    }),
  });
}

/**
 * Email envoyé au CLIENT quand sa commande boutique est passée en
 * statut "payée" (webhook Stripe). Différent de sendCommandeConfirmation
 * qui est envoyé à la CRÉATION de commande (avant paiement).
 */
export async function sendBoutiquePaidConfirmation(opts: {
  commandeId: bigint;
  paidCentimes: number;
}) {
  const cmd = await prisma.boutiqueCommande.findUnique({
    where: { id: opts.commandeId },
    select: {
      id: true,
      livraisonNom: true,
      user: { select: { email: true, prenom: true } },
    },
  });
  if (!cmd?.user?.email) {
    console.warn(
      `[boutique-paid-email] Pas d'email pour commande ${opts.commandeId}, skip`,
    );
    return;
  }

  const priceEuros = (opts.paidCentimes / 100).toFixed(2).replace(".", ",");
  const firstName =
    cmd.user.prenom?.trim() || cmd.livraisonNom?.trim().split(" ")[0] || "";

  await sendMail({
    to: cmd.user.email,
    subject: `Paiement reçu — Commande #${cmd.id.toString()} en préparation`,
    html: emailLayout({
      title: "Paiement reçu, préparation lancée",
      eyebrow: "Boutique Ruliz",
      preheader: `Ta commande #${cmd.id.toString()} de ${priceEuros}€ est en préparation. Livraison sous 5 jours ouvrés.`,
      body: `
        ${lead(`Salut${firstName ? ` ${firstName}` : ""},`)}
        ${p(`On a bien reçu ton paiement de <strong>${priceEuros} €</strong> pour la commande <strong>#${cmd.id.toString()}</strong>. On lance la préparation tout de suite.`)}
        ${successBox(
          `📦 <strong>Délai de livraison estimé :</strong> 3 à 5 jours ouvrés.<br>Tu recevras un email avec le numéro de suivi dès l'expédition.`,
        )}
      `,
      cta: {
        label: "Suivre ma commande",
        url: `${APP_URL}/dashboard/boutique/commandes`,
      },
      footnote: `Ta facture (PDF) sera disponible dans <a href="${APP_URL}/dashboard/settings/factures" style="color:#26438A;">tes factures Ruliz</a>. Une question ? Réponds simplement à cet email.`,
    }),
  });
}
