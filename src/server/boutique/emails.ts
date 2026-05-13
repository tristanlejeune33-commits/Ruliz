import "server-only";
import { sendMail } from "@/lib/resend";
import {
  emailLayout,
  lead,
  p,
  infoBox,
  itemsTable,
  totalRow,
  escapeHtml,
} from "@/lib/email-template";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";

interface CommandeEmailData {
  commandeId: string;
  clientNom: string;
  clientEmail: string;
  totalEuros: string; // déjà formaté ("12,50 €")
  items: Array<{
    nom: string;
    quantite: number;
    totalEuros: string;
  }>;
  livraisonAdresseHtml: string; // bloc multi-ligne
  notesClient?: string | null;
}

/** Email envoyé au CLIENT · confirmation de commande. */
export async function sendCommandeConfirmationToClient(data: CommandeEmailData) {
  const html = emailLayout({
    title: `Commande #${data.commandeId} confirmée`,
    eyebrow: "Boutique Ruliz",
    preheader: `Ta commande de ${data.totalEuros} a bien été reçue. On revient sous 24h.`,
    body: `
      ${lead(`Salut ${escapeHtml(data.clientNom)},`)}
      ${p(`On a bien reçu ta commande <strong>#${escapeHtml(data.commandeId)}</strong>. On revient vers toi sous 24h pour le paiement et la livraison.`)}

      ${itemsTable(data.items)}
      ${totalRow("Total HT", data.totalEuros)}

      <div style="margin:24px 0;padding:16px;background:#F6F8FC;border-radius:12px;">
        <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8892AB;font-weight:700;font-family:'SF Mono',ui-monospace,monospace;">
          📦 Livraison
        </p>
        <div style="color:#0B1530;font-size:14px;line-height:1.5;">
          ${data.livraisonAdresseHtml}
        </div>
      </div>

      ${
        data.notesClient
          ? infoBox(
              `<strong>Tes notes :</strong> ${escapeHtml(data.notesClient)}`,
            )
          : ""
      }
    `,
    cta: {
      label: "Suivre ma commande",
      url: `${APP_URL}/dashboard/boutique/commandes`,
    },
    footnote:
      "Une question sur ta commande ? Réponds à cet email, on s'en occupe.",
  });

  return sendMail({
    to: data.clientEmail,
    subject: `Ta commande Ruliz #${data.commandeId} est bien reçue`,
    html,
  });
}

/** Email envoyé à l'ADMIN · notification d'une nouvelle commande à traiter. */
export async function sendCommandeNotificationToAdmin(
  data: CommandeEmailData & { adminEmail: string },
) {
  const html = emailLayout({
    title: "Nouvelle commande boutique",
    eyebrow: "Notification admin",
    preheader: `${data.clientNom} vient de commander pour ${data.totalEuros}.`,
    body: `
      ${lead(`<strong>${escapeHtml(data.clientNom)}</strong> (${escapeHtml(data.clientEmail)}) vient de passer une commande <strong>#${escapeHtml(data.commandeId)}</strong>.`)}

      ${itemsTable(data.items)}
      ${totalRow("Total HT", data.totalEuros)}

      <div style="margin:24px 0;padding:16px;background:#F6F8FC;border-radius:12px;">
        <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8892AB;font-weight:700;font-family:'SF Mono',ui-monospace,monospace;">
          📦 Livraison
        </p>
        <div style="color:#0B1530;font-size:14px;line-height:1.5;">
          ${data.livraisonAdresseHtml}
        </div>
      </div>

      ${
        data.notesClient
          ? infoBox(
              `<strong>Notes du client :</strong> ${escapeHtml(data.notesClient)}`,
            )
          : ""
      }
    `,
    cta: {
      label: "Traiter dans l'admin →",
      url: `${APP_URL}/admin/boutique/commandes`,
    },
  });

  return sendMail({
    to: data.adminEmail,
    subject: `[Boutique] Nouvelle commande #${data.commandeId} · ${data.totalEuros}`,
    html,
  });
}
