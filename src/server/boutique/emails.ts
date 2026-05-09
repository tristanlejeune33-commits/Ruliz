import "server-only";
import { sendMail } from "@/lib/resend";

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

const STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
  background: #FAFBFD;
  color: #0B1530;
  padding: 24px;
  line-height: 1.5;
`;

const CONTAINER_STYLE = `
  max-width: 560px;
  margin: 0 auto;
  background: #FFFFFF;
  border: 1px solid #ECEFF5;
  border-radius: 16px;
  padding: 32px;
`;

const TITLE_STYLE = `
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  color: #0B1530;
`;

const TABLE_STYLE = `
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
`;

function itemsHtml(items: CommandeEmailData["items"]): string {
  return items
    .map(
      (i) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #F1F4FA; color: #0B1530;">
          ${escapeHtml(i.nom)}
          <span style="color: #8892AB; font-family: monospace; margin-left: 8px;">×${i.quantite}</span>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #F1F4FA; text-align: right; font-family: monospace; color: #0B1530;">
          ${escapeHtml(i.totalEuros)}
        </td>
      </tr>
    `,
    )
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Email envoyé au CLIENT — confirmation de commande. */
export async function sendCommandeConfirmationToClient(data: CommandeEmailData) {
  const html = `
<div style="${STYLE}">
  <div style="${CONTAINER_STYLE}">
    <h1 style="${TITLE_STYLE}">Commande confirmée ✦</h1>
    <p style="margin: 0 0 16px; color: #4A5573;">
      Bonjour ${escapeHtml(data.clientNom)}, on a bien reçu ta commande
      <strong style="color: #0B1530; font-family: monospace;">#${escapeHtml(data.commandeId)}</strong>.
      On revient vers toi sous 24h pour le paiement et la livraison.
    </p>

    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #ECEFF5; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #8892AB; font-weight: 700;">
            Produit
          </th>
          <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #ECEFF5; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #8892AB; font-weight: 700;">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml(data.items)}
        <tr>
          <td style="padding: 16px 0 0; font-weight: 700; font-size: 15px;">Total HT</td>
          <td style="padding: 16px 0 0; text-align: right; font-family: monospace; font-weight: 700; font-size: 18px; color: #26438A;">
            ${escapeHtml(data.totalEuros)}
          </td>
        </tr>
      </tbody>
    </table>

    <div style="margin: 24px 0; padding: 16px; background: #F6F8FC; border-radius: 12px;">
      <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #8892AB; font-weight: 700;">
        Livraison
      </p>
      <div style="color: #0B1530; font-size: 14px;">
        ${data.livraisonAdresseHtml}
      </div>
    </div>

    ${
      data.notesClient
        ? `<div style="margin: 16px 0; padding: 16px; background: #EEF2FA; border-left: 3px solid #26438A; border-radius: 8px;">
            <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #26438A; font-weight: 700;">Tes notes</p>
            <p style="margin: 0; font-size: 14px; color: #0B1530;">${escapeHtml(data.notesClient)}</p>
          </div>`
        : ""
    }

    <p style="margin: 24px 0 0; color: #8892AB; font-size: 12px; text-align: center;">
      Suis ta commande dans <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz.app"}/dashboard/boutique/commandes" style="color: #26438A;">ton dashboard Ruliz</a>.
    </p>
  </div>
</div>
`.trim();

  return sendMail({
    to: data.clientEmail,
    subject: `Ta commande Ruliz #${data.commandeId} est bien reçue`,
    html,
  });
}

/** Email envoyé à l'ADMIN — notification d'une nouvelle commande à traiter. */
export async function sendCommandeNotificationToAdmin(
  data: CommandeEmailData & { adminEmail: string },
) {
  const html = `
<div style="${STYLE}">
  <div style="${CONTAINER_STYLE}">
    <h1 style="${TITLE_STYLE}">Nouvelle commande boutique</h1>
    <p style="margin: 0 0 16px; color: #4A5573;">
      <strong>${escapeHtml(data.clientNom)}</strong> (${escapeHtml(data.clientEmail)})
      vient de passer une commande
      <strong style="font-family: monospace;">#${escapeHtml(data.commandeId)}</strong>.
    </p>

    <table style="${TABLE_STYLE}">
      ${itemsHtml(data.items)}
      <tr>
        <td style="padding: 16px 0 0; font-weight: 700; font-size: 15px;">Total HT</td>
        <td style="padding: 16px 0 0; text-align: right; font-family: monospace; font-weight: 700; font-size: 18px; color: #26438A;">
          ${escapeHtml(data.totalEuros)}
        </td>
      </tr>
    </table>

    <div style="margin: 24px 0; padding: 16px; background: #F6F8FC; border-radius: 12px;">
      <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #8892AB; font-weight: 700;">
        Livraison
      </p>
      <div style="color: #0B1530; font-size: 14px;">
        ${data.livraisonAdresseHtml}
      </div>
    </div>

    ${
      data.notesClient
        ? `<div style="margin: 16px 0; padding: 16px; background: #EEF2FA; border-left: 3px solid #26438A; border-radius: 8px;">
            <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #26438A; font-weight: 700;">Notes du client</p>
            <p style="margin: 0; font-size: 14px; color: #0B1530;">${escapeHtml(data.notesClient)}</p>
          </div>`
        : ""
    }

    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz.app"}/admin/boutique/commandes"
       style="display: inline-block; padding: 12px 24px; background: #26438A; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 16px;">
      Traiter dans l'admin →
    </a>
  </div>
</div>
`.trim();

  return sendMail({
    to: data.adminEmail,
    subject: `[Boutique] Nouvelle commande #${data.commandeId} — ${data.totalEuros}`,
    html,
  });
}
