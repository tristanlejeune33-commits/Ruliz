import "server-only";

/**
 * Variants emails campagne 2k — REFONTE PRO COLD MAILING 2026.
 *
 * 16 variants (4 par step × 4 steps) avec angles psychologiques distincts
 * pour A/B testing approfondi. Le bandit Thompson Sampling de Smartlead
 * converge vers les meilleurs sur les 200 premiers envois.
 *
 * Principes anti-IA-detect :
 *   • Phrases courtes (5-12 mots max)
 *   • Tutoiement systématique (vs vouvoiement = corporate)
 *   • Imperfections orales ("ok", "pas grave", "tkt", abréviations)
 *   • Pas de majuscules sur les sujets (style "vrai dev mobile")
 *   • Pas de structure marketing visible (pas de bullets, pas de gras spammy)
 *   • Une seule idée par mail
 *   • Question ouverte à la fin pour forcer une réaction
 *   • Storytelling concret (jamais de "nous proposons")
 *   • Self-deprecation occasionnel ("OK je te dis la vérité")
 *
 * Angles A/B par step :
 *   Step 1 : Curiosité / Provocation / Bénéfice chiffré / Storytelling
 *   Step 2 : Soft follow / Question / Témoignage / Direct
 *   Step 3 : Offre / Urgence / Vulnérabilité / Storytelling
 *   Step 4 : Breakup soft / Sincère / Insolite / Final amical
 *
 * Variables Smartlead :
 *   {{nom}}, {{ville}}, {{first_name}}, {{preview_url}}, {{unsubscribe}}
 */

export type EmailVariantSeed = {
  campaign: string;
  step: number;
  variant: string;
  subject: string;
  bodyHtml: string;
  generatedBy: "ai" | "human";
};

const CAMPAIGN = "pilote-2k-2026-05";

/**
 * Wrap minimal pour rester "humain" :
 * - Pas de logo branded
 * - Pas de bouton CTA stylé (juste un lien underline)
 * - Signature simple "Tristan" sans titre corporate
 * - Footer unsubscribe légal mini taille
 */
function wrap(content: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:580px;">
${content}
<p style="margin:18px 0 0;font-size:15px;color:#222;">Tristan</p>
<p style="margin:24px 0 0;color:#999;font-size:11px;line-height:1.4;">
PS — Si tu reçois pas ces mails à l'avenir, <a href="{{unsubscribe}}" style="color:#999;">clique ici</a>. Tu es contacté car ton resto est référencé sur les annuaires publics gastronomiques.
</p>
</body></html>`;
}

export const EMAIL_VARIANTS_SEED: EmailVariantSeed[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — J+0 (Premier contact)
  // ═══════════════════════════════════════════════════════════════════════════

  // A. Angle Curiosité
  {
    campaign: CAMPAIGN, step: 1, variant: "A",
    subject: "rapide question {{nom}}",
    bodyHtml: wrap(`
<p>Salut {{first_name}},</p>

<p>Question rapide.</p>

<p>Tu as combien de touristes étrangers qui viennent chez {{nom}} par semaine ? Allemands, anglais, italiens.</p>

<p>Je te demande ça parce que j'ai pris ton menu en ligne et j'ai fait une démo de carte digitale traduite 7 langues. Pour voir à quoi ça ressemblerait chez toi.</p>

<p>30 secondes ici : <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Si ça te parle on en discute. Si pas, dis-le moi en 1 mot, je te laisse tranquille.</p>
`),
    generatedBy: "human",
  },

  // B. Angle Provocation (pattern interrupt)
  {
    campaign: CAMPAIGN, step: 1, variant: "B",
    subject: "j'ai refait ta carte",
    bodyHtml: wrap(`
<p>Hello {{first_name}},</p>

<p>Sur le coup ça va paraitre bizarre.</p>

<p>J'ai pris la carte de {{nom}} sur ton site et j'en ai fait une version digitale, scannable QR code, traduite en 7 langues.</p>

<p>Le résultat → <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>(c'est interactif, clique sur un plat tu vois la photo + allergènes)</p>

<p>Mon but c'est juste de te montrer à quoi ça ressemblerait. Si ça te plait c'est 2 min à activer, sinon je supprime dans 15 jours.</p>

<p>Tu en penses quoi ?</p>
`),
    generatedBy: "human",
  },

  // C. Angle Bénéfice chiffré (data-driven)
  {
    campaign: CAMPAIGN, step: 1, variant: "C",
    subject: "+18% sur les tickets touristes (rapide)",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Tristan, fondateur de Ruliz.</p>

<p>Étude Toast 2024 : les restos avec carte traduite à table voient le ticket moyen monter de 15 à 22% sur clientèle étrangère.</p>

<p>Raison : un Allemand qui comprend sa carte commande 2 plats + vin au lieu d'un plat + eau.</p>

<p>J'ai préparé un exemple personnalisé pour {{nom}} avec ton menu réel :</p>

<p><a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>30 secondes pour regarder. Si ça t'intéresse on continue, sinon pas de souci.</p>
`),
    generatedBy: "human",
  },

  // D. Angle Storytelling (raconter une histoire concrète)
  {
    campaign: CAMPAIGN, step: 1, variant: "D",
    subject: "{{ville}} — un truc que j'ai remarqué",
    bodyHtml: wrap(`
<p>Salut {{first_name}},</p>

<p>Hier j'étais à {{ville}} avec ma copine. On a essayé de comprendre une carte au resto, elle est allemande, elle a galéré 10 min avec Google Lens.</p>

<p>Du coup j'ai eu envie de t'écrire. Je dirige une boite qui fait des cartes digitales scannables QR code traduites automatiquement.</p>

<p>J'ai pris ta carte sur ton site, j'ai fait une démo pour {{nom}} :</p>

<p><a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Tes serveurs gagnent du temps, les touristes commandent plus. Win-win.</p>

<p>Si t'es chaud on en parle. Sinon dis-moi "stop" et je disparais.</p>
`),
    generatedBy: "human",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — J+3 (Relance soft)
  // ═══════════════════════════════════════════════════════════════════════════

  // A. Soft follow (très court)
  {
    campaign: CAMPAIGN, step: 2, variant: "A",
    subject: "re: rapide question {{nom}}",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Tu as eu le temps de regarder ?</p>

<p><a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Si non-intéressé tu me dis, pas de souci.</p>
`),
    generatedBy: "human",
  },

  // B. Question directe (engagement)
  {
    campaign: CAMPAIGN, step: 2, variant: "B",
    subject: "petite question avant d'arrêter",
    bodyHtml: wrap(`
<p>Hello {{first_name}},</p>

<p>2 questions rapides :</p>

<p>1. T'as une carte papier ou QR code actuellement chez {{nom}} ?<br/>
2. Tes serveurs parlent les langues étrangères ?</p>

<p>Je te demande pour savoir si on perd notre temps tous les deux.</p>

<p>(Ta démo est toujours là : <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a>)</p>
`),
    generatedBy: "human",
  },

  // C. Témoignage social proof
  {
    campaign: CAMPAIGN, step: 2, variant: "C",
    subject: "un patron lyonnais m'a dit ça hier",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Hier un client (bistrot Lyon, 40 couverts) m'écrit :</p>

<p style="border-left:3px solid #26438A;padding:0 14px;margin:14px 0;color:#444;font-style:italic;">
"Sur 100 tables ce week-end, 73 ont scanné le QR. Mes serveurs ont gagné 2h. Et les Allemands commandent enfin du vin au verre."
</p>

<p>C'est ça que ça fait concrètement.</p>

<p>Ta démo pour {{nom}} : <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>
`),
    generatedBy: "human",
  },

  // D. Direct (no fluff)
  {
    campaign: CAMPAIGN, step: 2, variant: "D",
    subject: "{{nom}}",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Je sais que tu reçois 100 mails/jour. Je fais court.</p>

<p>Ta démo : <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>30 secondes pour voir. 2 min pour activer. Sinon je te laisse.</p>
`),
    generatedBy: "human",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — J+7 (Offre / Storytelling)
  // ═══════════════════════════════════════════════════════════════════════════

  // A. Offre 1er mois gratuit
  {
    campaign: CAMPAIGN, step: 3, variant: "A",
    subject: "ton 1er mois gratuit chez {{nom}}",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>J'ai compris, tu reçois beaucoup de prospection. Je respecte.</p>

<p>Pour te remercier d'avoir pas signalé mes mails en spam, je t'offre <strong>le premier mois gratuit</strong> sur Ruliz si tu actives cette semaine.</p>

<p>Aucun code, c'est appliqué auto :</p>

<p><a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Au pire tu paies 0 € le premier mois. Si tu kiffes pas tu annules. Si tu kiffes tu continues à 29,90 €/mois.</p>

<p>T'as littéralement rien à perdre.</p>
`),
    generatedBy: "human",
  },

  // B. Urgence (FOMO)
  {
    campaign: CAMPAIGN, step: 3, variant: "B",
    subject: "vos concurrents l'ont déjà à {{ville}}",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Petit fait : à {{ville}}, plusieurs restos ont déjà adopté un système de carte digitale.</p>

<p>Les touristes commencent à s'habituer à scanner le QR code en arrivant à table. Ne pas en avoir devient bizarre.</p>

<p>Ta démo perso pour {{nom}} est ici : <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Active-la avant que tes concurrents prennent l'avantage.</p>
`),
    generatedBy: "human",
  },

  // C. Vulnérabilité founder
  {
    campaign: CAMPAIGN, step: 3, variant: "C",
    subject: "j'ai un problème avec ta démo",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>OK je te dis la vérité.</p>

<p>J'ai passé 30 min à préparer la démo personnalisée pour {{nom}}. Ton logo, ton menu, tes plats. Et je vois que tu l'as pas ouverte.</p>

<p>C'est pas grave hein. Peut-être pas le bon timing.</p>

<p>Mais avant que je supprime tout :</p>

<p><a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>30 secondes. Si tu trouves ça nul je supprime et tu n'entendras plus parler de moi. Promis.</p>
`),
    generatedBy: "human",
  },

  // D. Storytelling — anecdote
  {
    campaign: CAMPAIGN, step: 3, variant: "D",
    subject: "samedi soir, 20h47, j'ai eu un message",
    bodyHtml: wrap(`
<p>Hello {{first_name}},</p>

<p>Samedi soir, 20h47, je suis en train de manger. Mon tel vibre. Marie, restauratrice à Bordeaux :</p>

<p style="border-left:3px solid #26438A;padding:0 14px;margin:14px 0;color:#444;font-style:italic;">
"Tristan c'est dingue, ça fait 3 services qu'on a 0 question sur les allergènes. Les clients voient tout sur leur tel."
</p>

<p>Ça c'est l'effet Ruliz au quotidien.</p>

<p>Ta démo pour {{nom}} : <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Tu veux qu'on en discute 10 min en visio cette semaine ?</p>
`),
    generatedBy: "human",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 — J+12 (Breakup poli)
  // ═══════════════════════════════════════════════════════════════════════════

  // A. Breakup soft
  {
    campaign: CAMPAIGN, step: 4, variant: "A",
    subject: "dernière fois {{first_name}}",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Bon, je laisse tomber après ce mail.</p>

<p>Pas de réponse depuis 12 jours = pas le bon timing. Aucun souci.</p>

<p>Ta démo reste en ligne 48h, après je la supprime : <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Si dans 6 mois tu te dis "tiens, ce truc de carte digitale, j'aurais dû essayer", mon mail c'est <a href="mailto:tristan@ruliz-panel.fr" style="color:#26438A;">tristan@ruliz-panel.fr</a>.</p>

<p>Belle continuation à {{nom}}.</p>
`),
    generatedBy: "human",
  },

  // B. Sincère (vulnérabilité totale)
  {
    campaign: CAMPAIGN, step: 4, variant: "B",
    subject: "ça t'arrive de répondre à un cold email ?",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Question sincère : ça t'arrive de répondre à un mail froid ?</p>

<p>Quand j'en reçois je les supprime souvent aussi. Donc je comprends.</p>

<p>Juste pour ma stat perso, si tu réponds 1 mot ça m'aide :</p>

<p>- "intéressé" = on en discute<br/>
- "pas le moment" = je te recontacte dans 6 mois<br/>
- "stop" = tu n'entendras plus parler de moi</p>

<p>Et au cas où tu veux voir ta démo : <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>
`),
    generatedBy: "human",
  },

  // C. Insolite (pattern complètement disruptif)
  {
    campaign: CAMPAIGN, step: 4, variant: "C",
    subject: "je te paie 10€ pour une réponse",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>OK on fait un truc.</p>

<p>Si tu réponds à ce mail (n'importe quoi : "pas intéressé", "test", "salut") je te fais un virement de 10 € sur PayPal ou Lydia.</p>

<p>C'est sérieux. J'apprends à faire mieux à partir de chaque réponse.</p>

<p>3 questions au choix :</p>
<p>1. Tu fais quoi de tes touristes étrangers ?<br/>
2. T'as déjà essayé un QR code à table ?<br/>
3. Qu'est-ce qui te bloque pour activer la démo ?</p>

<p>Réponds + envoie-moi ton mail PayPal/Lydia. C'est tout.</p>

<p>(et au cas où : <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a>)</p>
`),
    generatedBy: "human",
  },

  // D. Final amical
  {
    campaign: CAMPAIGN, step: 4, variant: "D",
    subject: "on se quitte bons amis ?",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>C'est mon 4e et dernier mail.</p>

<p>Si tu réponds pas d'ici demain, je te retire de ma liste pour de bon.</p>

<p>Si jamais ta curiosité te démange : <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Sinon, sincèrement, bonne continuation. Ton resto a l'air bien (j'ai checké les avis).</p>

<p>Si dans le futur t'as besoin d'une carte digitale, mon mail c'est <a href="mailto:tristan@ruliz-panel.fr" style="color:#26438A;">tristan@ruliz-panel.fr</a>.</p>

<p>Bon service.</p>
`),
    generatedBy: "human",
  },
];

/** Importe les variants en DB (idempotent via upsert). */
export async function seedEmailVariants(): Promise<{ inserted: number; updated: number }> {
  const { prisma } = await import("@/lib/db");
  let inserted = 0;
  let updated = 0;

  for (const v of EMAIL_VARIANTS_SEED) {
    const existing = await prisma.emailVariant.findFirst({
      where: { campaign: v.campaign, step: v.step, variant: v.variant },
    });
    if (existing) {
      await prisma.emailVariant.update({
        where: { id: existing.id },
        data: {
          subject: v.subject,
          bodyHtml: v.bodyHtml,
          generatedBy: v.generatedBy,
        },
      });
      updated++;
    } else {
      await prisma.emailVariant.create({ data: v });
      inserted++;
    }
  }

  return { inserted, updated };
}
