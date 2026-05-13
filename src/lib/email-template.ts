/**
 * Template HTML maitre pour tous les emails transactionnels Ruliz.
 *
 * Design :
 *   - Largeur max 600px (standard email, marche partout)
 *   - Background canvas #FAFBFD (sobre, sans fond visuel coloré)
 *   - Container blanc avec radius 16px + ombre subtile
 *   - Logo Ruliz wordmark en header (servi depuis ruliz-panel.fr)
 *   - Bleu signature #26438A pour les CTAs et accents
 *   - Footer avec liens légaux + adresse
 *
 * Compatibilité :
 *   - Inline styles obligatoires (Gmail/Outlook strip <style> régulièrement)
 *   - Pas de flexbox ni grid CSS (mal supportés par Outlook)
 *   - Tables pour le layout horizontal centré
 *   - Couleurs en hex (pas de oklch ou var() qui plantent en email)
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ruliz-panel.fr";
const LOGO_URL = `${APP_URL}/brand/logo-full.png`;

/* ============================================================
 * COULEURS synchronisées avec le DS light (#26438A signature)
 * ============================================================ */
const C = {
  bg: "#FAFBFD",
  surface: "#FFFFFF",
  border: "#ECEFF5",
  textPrimary: "#0B1530",
  textSecondary: "#4A5573",
  textMuted: "#8892AB",
  brand: "#26438A",
  brandHover: "#1E3670",
  brandSoft: "#EEF2FA",
  success: "#1A7F5A",
  successSoft: "#E6F4EE",
  danger: "#B91C3B",
  dangerSoft: "#FCE8EC",
  warning: "#B45309",
  warningSoft: "#FEF3C7",
} as const;

export interface EmailLayoutOpts {
  /** Titre H1 affiché en haut du body (sous le logo). */
  title: string;
  /** Aperçu inbox (preheader, max 80 chars idéalement). */
  preheader?: string;
  /** Eyebrow mono uppercase au-dessus du titre (ex: "Récupération de compte"). */
  eyebrow?: string;
  /** Corps du message en HTML (sera enrobé dans le container). */
  body: string;
  /** Call-to-action principal bouton bleu plein. */
  cta?: { label: string; url: string };
  /** Note de bas de page (ex: "Si tu n'es pas à l'origine de cette demande…"). */
  footnote?: string;
}

/**
 * Génère le HTML complet d'un email Ruliz.
 */
export function emailLayout({
  title,
  preheader,
  eyebrow,
  body,
  cta,
  footnote,
}: EmailLayoutOpts): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${C.textPrimary};-webkit-font-smoothing:antialiased;">
${
  preheader
    ? `<!-- Preheader : visible en aperçu inbox, masqué dans le body -->
<div style="display:none;font-size:1px;color:${C.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${escapeHtml(preheader)}
</div>`
    : ""
}

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${C.bg};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">

        <!-- ============== HEADER avec logo ============== -->
        <tr>
          <td align="center" style="padding:0 0 24px;">
            <a href="${APP_URL}" style="text-decoration:none;display:inline-block;">
              <img src="${LOGO_URL}" alt="Ruliz" width="100" height="32" style="display:block;height:32px;width:auto;border:0;outline:none;">
            </a>
          </td>
        </tr>

        <!-- ============== CARD ============== -->
        <tr>
          <td style="background:${C.surface};border:1px solid ${C.border};border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(11,21,48,0.04);">

            ${
              eyebrow
                ? `<p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:${C.textMuted};font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;">
                ${escapeHtml(eyebrow)}
              </p>`
                : ""
            }

            <h1 style="margin:0 0 20px;font-size:24px;line-height:1.2;letter-spacing:-0.02em;color:${C.textPrimary};font-weight:700;">
              ${escapeHtml(title)}
            </h1>

            <div style="font-size:15px;line-height:1.6;color:${C.textSecondary};">
              ${body}
            </div>

            ${
              cta
                ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:32px auto 0;">
                <tr>
                  <td align="center" style="background:${C.brand};border-radius:12px;">
                    <a href="${cta.url}" style="display:inline-block;padding:14px 28px;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:-0.005em;border-radius:12px;">
                      ${escapeHtml(cta.label)}
                    </a>
                  </td>
                </tr>
              </table>`
                : ""
            }

            ${
              footnote
                ? `<p style="margin:32px 0 0;padding-top:24px;border-top:1px solid ${C.border};font-size:12px;line-height:1.5;color:${C.textMuted};">
                ${footnote}
              </p>`
                : ""
            }
          </td>
        </tr>

        <!-- ============== FOOTER ============== -->
        <tr>
          <td align="center" style="padding:24px 16px 0;font-size:12px;line-height:1.6;color:${C.textMuted};">
            <p style="margin:0 0 8px;">
              <strong style="color:${C.textSecondary};">Ruliz</strong>
              Menus digitaux pour restaurants ambitieux
            </p>
            <p style="margin:0 0 12px;">
              <a href="${APP_URL}/legal/mentions-legales" style="color:${C.brand};text-decoration:none;">CGV</a>
              <span style="color:${C.border};margin:0 8px;"> </span>
              <a href="${APP_URL}/legal/politique-confidentialite" style="color:${C.brand};text-decoration:none;">Confidentialité</a>
              <span style="color:${C.border};margin:0 8px;"> </span>
              <a href="${APP_URL}" style="color:${C.brand};text-decoration:none;">ruliz-panel.fr</a>
            </p>
            <p style="margin:0;font-size:11px;color:${C.textMuted};opacity:0.7;">
              Tu reçois cet email parce que tu as un compte Ruliz.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`.trim();
}

/* ============================================================
 * Helpers de blocs pour le body
 * ============================================================ */

/** Paragraphe simple. */
export function p(content: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.textSecondary};">${content}</p>`;
}

/** Paragraphe avec ton "lead" plus marqué (1er paragraphe). */
export function lead(content: string): string {
  return `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:${C.textPrimary};">${content}</p>`;
}

/** Petit séparateur visuel (espace). */
export function spacer(height = 16): string {
  return `<div style="height:${height}px;line-height:${height}px;font-size:1px;">&nbsp;</div>`;
}

/** Encart info (bleu Ruliz). */
export function infoBox(content: string): string {
  return `<div style="margin:24px 0;padding:16px;background:${C.brandSoft};border-left:3px solid ${C.brand};border-radius:8px;font-size:14px;line-height:1.6;color:${C.textPrimary};">${content}</div>`;
}

/** Encart succès. */
export function successBox(content: string): string {
  return `<div style="margin:24px 0;padding:16px;background:${C.successSoft};border-left:3px solid ${C.success};border-radius:8px;font-size:14px;line-height:1.6;color:${C.textPrimary};">${content}</div>`;
}

/** Encart attention/warning. */
export function warnBox(content: string): string {
  return `<div style="margin:24px 0;padding:16px;background:${C.warningSoft};border-left:3px solid ${C.warning};border-radius:8px;font-size:14px;line-height:1.6;color:${C.textPrimary};">${content}</div>`;
}

/** Encart danger (action critique). */
export function dangerBox(content: string): string {
  return `<div style="margin:24px 0;padding:16px;background:${C.dangerSoft};border-left:3px solid ${C.danger};border-radius:8px;font-size:14px;line-height:1.6;color:${C.textPrimary};">${content}</div>`;
}

/** Code / token mis en valeur. */
export function code(value: string): string {
  return `<code style="display:inline-block;padding:2px 8px;background:${C.brandSoft};border-radius:6px;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:${C.brand};font-weight:600;">${escapeHtml(value)}</code>`;
}

/** Hero avec icône emoji + texte centré (pour les events spéciaux). */
export function hero(opts: { emoji: string; title: string; subtitle?: string }): string {
  return `<div style="margin:8px 0 24px;padding:32px 16px;background:${C.brandSoft};border-radius:12px;text-align:center;">
    <div style="font-size:48px;line-height:1;margin-bottom:12px;">${opts.emoji}</div>
    <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:${C.brand};margin-bottom:${opts.subtitle ? "8px" : "0"};">
      ${escapeHtml(opts.title)}
    </div>
    ${opts.subtitle ? `<div style="font-size:13px;color:${C.textSecondary};">${escapeHtml(opts.subtitle)}</div>` : ""}
  </div>`;
}

/** Table simple : array of [label, value]. */
export function dataTable(rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([label, value]) => `<tr>
      <td style="padding:8px 12px 8px 0;font-size:13px;color:${C.textMuted};border-bottom:1px solid ${C.border};vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:8px 0;font-size:14px;color:${C.textPrimary};font-weight:500;border-bottom:1px solid ${C.border};text-align:right;">
        ${value}
      </td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0 24px;border-collapse:collapse;">
    ${body}
  </table>`;
}

/** List d'items avec prix (pour les commandes boutique). */
export function itemsTable(items: Array<{ nom: string; quantite?: number; totalEuros: string }>): string {
  const rows = items
    .map(
      (item) => `<tr>
      <td style="padding:12px 0;font-size:14px;color:${C.textPrimary};border-bottom:1px solid ${C.border};">
        ${escapeHtml(item.nom)}${item.quantite && item.quantite > 1 ? ` <span style="color:${C.textMuted};">× ${item.quantite}</span>` : ""}
      </td>
      <td style="padding:12px 0;text-align:right;font-size:14px;color:${C.textPrimary};font-weight:600;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;border-bottom:1px solid ${C.border};">
        ${escapeHtml(item.totalEuros)}
      </td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;border-collapse:collapse;">
    <thead>
      <tr>
        <th align="left" style="padding:8px 0;border-bottom:2px solid ${C.border};font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${C.textMuted};font-weight:700;">Produit</th>
        <th align="right" style="padding:8px 0;border-bottom:2px solid ${C.border};font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${C.textMuted};font-weight:700;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Total final en gras + bleu. */
export function totalRow(label: string, value: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 16px;border-collapse:collapse;">
    <tr>
      <td style="padding:16px 0 0;font-size:16px;font-weight:700;color:${C.textPrimary};">${escapeHtml(label)}</td>
      <td style="padding:16px 0 0;text-align:right;font-size:20px;font-weight:700;color:${C.brand};font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;">${escapeHtml(value)}</td>
    </tr>
  </table>`;
}

/* ============================================================
 * Utilitaire
 * ============================================================ */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export { escapeHtml };
