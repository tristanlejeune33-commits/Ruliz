import "server-only";

/**
 * Variants d'emails pour la campagne pilote 2 000 — REFONTE PRO.
 *
 * Principes de copywriting cold email pro 2026 :
 *  - Tutoiement (créer la proximité, démarquer des agences corporate)
 *  - Phrases courtes (5-12 mots)
 *  - Imperfections volontaires (parfois pas de majuscule, ton décontracté)
 *  - Pas de structure marketing visible (pas de bullets, pas de gras spammy)
 *  - Une seule idée par mail
 *  - Question ouverte à la fin pour déclencher reply
 *  - Personnalisation profonde via {{nom}}, {{ville}}, {{preview_url}}
 *  - Pas de tracking link sauf preview_url (anti spam filter)
 *  - HTML minimal (sonne moins corporate qu'un email stylé)
 *
 * Variables Smartlead disponibles :
 *   {{nom}}           → nom du restaurant
 *   {{ville}}         → ville
 *   {{first_name}}    → prénom propriétaire (best-effort)
 *   {{preview_url}}   → https://ruliz-panel.fr/preview/{cardToken}
 *   {{unsubscribe}}   → lien désabonnement légal
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
 * Wrap MINIMAL — pas de signature corporate, pas de logo branded.
 * Juste le contenu + une signature humaine + unsubscribe légal en bas.
 *
 * Plain HTML = paraît plus humain (les outils SaaS génèrent du HTML stylé,
 * un vrai humain envoie souvent du texte simple via Gmail).
 */
function wrap(content: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:580px;">
${content}
<p style="margin-top:18px;font-size:15px;color:#222;">
Tristan
</p>
<p style="margin-top:20px;color:#999;font-size:11px;line-height:1.4;">
PS — Si tu reçois pas ces mails à l'avenir, <a href="{{unsubscribe}}" style="color:#999;">clique ici</a>. Tu es contacté car ton resto est référencé sur les annuaires gastronomiques publics français.
</p>
</body></html>`;
}

export const EMAIL_VARIANTS_SEED: EmailVariantSeed[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — J+0 (initial)
  // 3 angles : curiosité personnalisée / observation directe / question simple
  // ═══════════════════════════════════════════════════════════════════════════

  {
    campaign: CAMPAIGN,
    step: 1,
    variant: "A",
    subject: "rapide question {{nom}}",
    bodyHtml: wrap(`
<p>Salut {{first_name}},</p>

<p>J'ai vu {{nom}} hier en cherchant un resto sur {{ville}}.<br/>
Bonne carte d'ailleurs.</p>

<p>Je te pose une question simple : tu as combien de touristes qui viennent chez toi par semaine ? Allemands, anglais, italiens.</p>

<p>Je te demande ça parce qu'on a un truc qui peut potentiellement t'intéresser. Une carte digitale scannable QR code, traduite automatiquement en 7 langues. Tes serveurs gagnent du temps, les clients étrangers commandent plus.</p>

<p>Comme c'est plus simple à montrer qu'à expliquer, j'ai pris ton menu en ligne et j'ai fait une démo pour {{nom}}.</p>

<p>30 secondes pour regarder :<br/>
<a href="{{preview_url}}" style="color:#26438A;text-decoration:underline;">{{preview_url}}</a></p>

<p>Si ça te parle on en discute. Si non répond moi "pas intéressé" et je te laisse tranquille.</p>
`),
    generatedBy: "human",
  },

  {
    campaign: CAMPAIGN,
    step: 1,
    variant: "B",
    subject: "j'ai refait ta carte {{first_name}}",
    bodyHtml: wrap(`
<p>Hello {{first_name}},</p>

<p>Sur le coup ça va paraitre bizarre mais j'ai pris ta carte sur ton site et j'en ai fait une version digitale.</p>

<p>C'est ici → <a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>(scannable sur mobile, traduite 7 langues, le client clique sur un plat il voit la photo + les allergènes).</p>

<p>Le but c'est de te montrer à quoi ça ressemblerait chez {{nom}}. Si tu veux l'activer pour de vrai c'est 30 secondes, sinon je supprime la démo dans 15 jours.</p>

<p>Tu en penses quoi ?</p>
`),
    generatedBy: "human",
  },

  {
    campaign: CAMPAIGN,
    step: 1,
    variant: "C",
    subject: "{{ville}} = beaucoup de touristes pour {{nom}} ?",
    bodyHtml: wrap(`
<p>Bonjour {{first_name}},</p>

<p>Tristan, fondateur de Ruliz.</p>

<p>Je contacte les restos {{ville}} parce qu'on bosse beaucoup avec des établissements qui ont une clientèle internationale.</p>

<p>L'idée c'est simple : QR code sur ta table → ton client scanne avec son tel → il voit ta carte en allemand, italien, espagnol, etc. Photos, allergènes, prix.</p>

<p>J'ai préparé un exemple personnalisé pour {{nom}} pour que tu voies à quoi ça ressemble :<br/>
<a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Pas besoin de me répondre si ça te parle pas. Si oui dis-moi simplement "ok" et je t'explique en 2 phrases.</p>
`),
    generatedBy: "human",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — J+3 (relance soft)
  // Court, non-agressif, on assume qu'il a pas eu le temps
  // ═══════════════════════════════════════════════════════════════════════════

  {
    campaign: CAMPAIGN,
    step: 2,
    variant: "A",
    subject: "re: rapide question {{nom}}",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Je remonte le mail d'avant.<br/>
T'as eu le temps de regarder la démo de ta carte ?</p>

<p><a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Si non-intéressé tu me dis, je continue ma vie.</p>
`),
    generatedBy: "human",
  },

  {
    campaign: CAMPAIGN,
    step: 2,
    variant: "B",
    subject: "petit retour sur ta démo ?",
    bodyHtml: wrap(`
<p>Hello {{first_name}},</p>

<p>Quick follow-up : t'as pu jeter un œil ?</p>

<p><a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>2 questions :</p>
<p>1. T'as une carte papier ou QR code actuellement chez {{nom}} ?<br/>
2. Tes serveurs parlent les langues étrangères ?</p>

<p>Je te demande ça pour savoir si on perd ton temps ou pas.</p>
`),
    generatedBy: "human",
  },

  {
    campaign: CAMPAIGN,
    step: 2,
    variant: "C",
    subject: "{{nom}}",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Je sais que tu reçois 100 mails par jour donc je fais court.</p>

<p>Ta démo Ruliz est toujours là :<br/>
<a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>30 secondes pour voir, 2 min pour activer si ça te parle. Je te laisse tranquille sinon.</p>
`),
    generatedBy: "human",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — J+7 (storytelling / proof / offre)
  // On donne du contexte + témoignage pour rassurer
  // ═══════════════════════════════════════════════════════════════════════════

  {
    campaign: CAMPAIGN,
    step: 3,
    variant: "A",
    subject: "un patron Lyonnais m'a dit ça hier",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Petite histoire vraie.</p>

<p>Hier un client (bistrot lyonnais, 40 couverts) m'a envoyé un message :</p>

<p style="border-left:3px solid #26438A;padding:0 16px;margin:16px 0;color:#444;font-style:italic;">
"Sur 100 tables ce week-end, 73 ont scanné le QR au lieu de demander la carte. Mes serveurs ont gagné 2h de service. Et les Allemands commandent enfin du vin au verre."
</p>

<p>C'est ça que ça fait Ruliz concrètement.</p>

<p>Et ta démo pour {{nom}} est toujours en ligne :<br/>
<a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Tu veux qu'on en discute 10 min en visio cette semaine ?</p>
`),
    generatedBy: "human",
  },

  {
    campaign: CAMPAIGN,
    step: 3,
    variant: "B",
    subject: "ton premier mois gratuit chez {{nom}}",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Bon, j'ai compris, tu reçois beaucoup de prospection.</p>

<p>Pour te remercier d'avoir pas signalé mes mails en spam, je t'offre <strong>le premier mois gratuit</strong> sur Ruliz si tu actives cette semaine.</p>

<p>Aucun code promo, c'est appliqué automatiquement quand tu actives ici :<br/>
<a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Au pire tu paies 0 € le premier mois. Si tu détestes tu annules. Si tu kiffes tu continues à 29,90 €/mois.</p>

<p>Pile-face. T'as rien à perdre.</p>
`),
    generatedBy: "human",
  },

  {
    campaign: CAMPAIGN,
    step: 3,
    variant: "C",
    subject: "j'ai un problème avec ta démo",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>OK je te dis la vérité.</p>

<p>J'ai passé 30 min à préparer la démo personnalisée pour {{nom}}. Ton logo, ton menu, tes plats. Et je vois que tu l'as pas ouverte.</p>

<p>C'est pas grave hein, peut-être que c'est pas le bon timing.</p>

<p>Mais avant que je supprime tout :<br/>
<a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>30 secondes. Si tu trouves ça nul après 30 secondes je supprime et tu n'entendras plus jamais parler de moi.</p>
`),
    generatedBy: "human",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 — J+14 (breakup poli)
  // Le but : récupérer ceux qui ont scrollé sans répondre
  // ═══════════════════════════════════════════════════════════════════════════

  {
    campaign: CAMPAIGN,
    step: 4,
    variant: "A",
    subject: "dernière fois {{first_name}}",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Bon, je laisse tomber après ce mail.</p>

<p>Pas de réponse depuis 2 semaines = pas le bon timing. Aucun souci.</p>

<p>Ta démo reste en ligne 48h, après je la supprime :<br/>
<a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Si dans 6 mois tu te dis "tiens, ce truc de carte digitale, j'aurais dû essayer", mon mail c'est <a href="mailto:tristan@ruliz-panel.fr" style="color:#26438A;">tristan@ruliz-panel.fr</a>.</p>

<p>Belle continuation à {{nom}} 👨‍🍳</p>
`),
    generatedBy: "human",
  },

  {
    campaign: CAMPAIGN,
    step: 4,
    variant: "B",
    subject: "on se quitte bons amis ?",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>C'est mon 4e et dernier mail.</p>

<p>Si tu réponds pas d'ici demain je te retire de ma liste pour de bon, promis.</p>

<p>Si jamais ta curiosité te démange :<br/>
<a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>

<p>Sinon, sincèrement, bonne continuation. Ton resto a l'air bien.</p>
`),
    generatedBy: "human",
  },

  {
    campaign: CAMPAIGN,
    step: 4,
    variant: "C",
    subject: "ça t'arrive de répondre à un mail froid ?",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Question sincère : ça t'arrive de répondre à un cold email ?</p>

<p>Moi quand je reçois un mail comme le mien je le supprime souvent. Donc je comprends totalement.</p>

<p>Mais juste pour ma stat perso, si tu réponds 1 mot ça m'aiderait :</p>

<p>- "intéressé" = on en discute<br/>
- "pas le bon moment" = je te recontacte dans 6 mois<br/>
- "stop" = tu n'entendras plus parler de moi</p>

<p>Et au cas où tu veuilles voir ta démo :<br/>
<a href="{{preview_url}}" style="color:#26438A;">{{preview_url}}</a></p>
`),
    generatedBy: "human",
  },
];

/** Importe les 12 variants en DB (idempotent via upsert). */
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
