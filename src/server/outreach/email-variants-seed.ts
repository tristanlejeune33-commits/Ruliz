import "server-only";

/**
 * Variants d'emails initiaux pour la campagne pilote 2 000.
 *
 * 3 variants × 4 steps = 12 emails au total.
 * Les variables {{...}} sont remplacées par Smartlead.ai au moment de l'envoi
 * depuis le CSV des prospects (custom fields).
 *
 * Variables disponibles côté Smartlead :
 *   {{nom}}           Nom du restaurant
 *   {{ville}}         Ville
 *   {{first_name}}    Prénom propriétaire (best-effort depuis email)
 *   {{preview_url}}   https://ruliz-panel.fr/preview/{cardToken}
 *   {{unsubscribe}}   Lien désabonnement
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

// Wrap commun pour tous les emails (signature + footer légal)
function wrap(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
${content}
<p style="margin-top:32px;color:#555;font-size:14px;">
  Bien à vous,<br/>
  <strong>Tristan</strong> — fondateur de Ruliz<br/>
  <a href="https://ruliz-panel.fr" style="color:#26438A;">ruliz-panel.fr</a>
</p>
<hr style="margin-top:32px;border:none;border-top:1px solid #eee;"/>
<p style="color:#999;font-size:12px;margin-top:16px;">
  Vous recevez cet email car votre établissement est référencé sur les annuaires gastronomiques publics français.
  <a href="{{unsubscribe}}" style="color:#999;">Se désinscrire de ces communications</a>
</p>
</body></html>`;
}

export const EMAIL_VARIANTS_SEED: EmailVariantSeed[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1 — J+0 (initial)
  // ═══════════════════════════════════════════════════════════════════════
  {
    campaign: CAMPAIGN,
    step: 1,
    variant: "A",
    subject: "{{nom}}, votre carte digitale est prête (5 min)",
    bodyHtml: wrap(`
<p>Bonjour {{first_name}},</p>

<p>J'ai créé une démo de la carte digitale de <strong>{{nom}}</strong> en partant de votre site.
Vous pouvez la voir telle qu'elle apparaîtra à vos clients qui scanneront le QR code à table :</p>

<p style="text-align:center;margin:24px 0;">
  <a href="{{preview_url}}" style="background:#26438A;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">
    👀 Voir ma carte digitale
  </a>
</p>

<p>Elle inclut :</p>
<ul>
  <li><strong>Traduction automatique</strong> en 7 langues (touristes anglais, allemands, italiens...)</li>
  <li><strong>QR code à imprimer</strong> pour les tables</li>
  <li><strong>Photos + allergènes</strong> pour chaque plat</li>
  <li><strong>Modification en 2 clics</strong> depuis votre téléphone</li>
</ul>

<p>Si ça vous parle, activez votre compte directement depuis la page (29,90 €/mois, 7 jours gratuits).
Si ça ne vous parle pas, dites-le moi et je vous laisse tranquille.</p>
    `),
    generatedBy: "human",
  },
  {
    campaign: CAMPAIGN,
    step: 1,
    variant: "B",
    subject: "J'ai refait votre carte (en 7 langues)",
    bodyHtml: wrap(`
<p>Bonjour {{first_name}},</p>

<p>Je suis allé sur votre site de <strong>{{nom}}</strong> à {{ville}}. J'ai pris votre menu
et j'en ai fait une carte digitale moderne, scannable par QR code, traduite en 7 langues :</p>

<p style="text-align:center;margin:24px 0;">
  <a href="{{preview_url}}" style="background:#26438A;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">
    👉 Voir le résultat
  </a>
</p>

<p>C'est 100% personnalisable une fois activé : photos, descriptions, prix, allergènes.</p>

<p>Le scénario type :</p>
<ul>
  <li>Un client allemand entre, scanne le QR sur la table</li>
  <li>Il voit votre carte traduite (sans Google Translate moche)</li>
  <li>Il commande 18% de plus en moyenne — il comprend mieux</li>
</ul>

<p>29,90 €/mois, 7 jours d'essai. Si ça ne vous intéresse pas, ignorez ce mail.</p>
    `),
    generatedBy: "human",
  },
  {
    campaign: CAMPAIGN,
    step: 1,
    variant: "C",
    subject: "+18% de tickets moyens grâce à votre carte traduite",
    bodyHtml: wrap(`
<p>Bonjour {{first_name}},</p>

<p>Question rapide : combien de touristes étrangers passent chez <strong>{{nom}}</strong> chaque semaine ?</p>

<p>Si la réponse est "plusieurs", il y a une statistique qui devrait vous intéresser :
les restaurants avec carte traduite à table voient leur <strong>ticket moyen monter de 15 à 22%</strong>
sur la clientèle étrangère (étude Toast 2024).</p>

<p>J'ai préparé une démo de votre carte digitale Ruliz avec traduction en 7 langues
+ QR code à table. Ça prend 30 secondes à regarder :</p>

<p style="text-align:center;margin:24px 0;">
  <a href="{{preview_url}}" style="background:#26438A;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">
    📱 Voir ma carte (démo)
  </a>
</p>

<p>Si vous décidez d'activer, c'est 29,90 €/mois (annulable n'importe quand).
Sinon, no hard feelings — je ne vous relancerai qu'une fois.</p>
    `),
    generatedBy: "human",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2 — J+3 (relance soft)
  // ═══════════════════════════════════════════════════════════════════════
  {
    campaign: CAMPAIGN,
    step: 2,
    variant: "A",
    subject: "Re: {{nom}}, votre carte digitale",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Je vous remontre ça au cas où mon premier message serait passé sous votre coude.</p>

<p>Votre carte digitale (prête, en 7 langues, scannable par QR) :</p>

<p style="text-align:center;margin:24px 0;">
  <a href="{{preview_url}}" style="background:#26438A;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">
    Voir ma carte
  </a>
</p>

<p>Vous n'avez littéralement rien à faire : je l'ai déjà construite. Vous l'activez (29,90 €/mois),
vous modifiez ce qui ne vous plaît pas, vous imprimez le QR. Total ~10 minutes.</p>
    `),
    generatedBy: "human",
  },
  {
    campaign: CAMPAIGN,
    step: 2,
    variant: "B",
    subject: "Vous avez vu votre démo ?",
    bodyHtml: wrap(`
<p>Bonjour {{first_name}},</p>

<p>Petit suivi : avez-vous eu 30 secondes pour voir la démo de votre carte Ruliz ?</p>

<p><a href="{{preview_url}}">👉 Lien de votre démo</a></p>

<p>Si ça ne vous parle pas, je le respecte — répondez juste "pas intéressé" et je ne vous écrirai plus.</p>

<p>Sinon, l'activation prend littéralement 2 minutes.</p>
    `),
    generatedBy: "human",
  },
  {
    campaign: CAMPAIGN,
    step: 2,
    variant: "C",
    subject: "{{nom}} → vos concurrents l'ont déjà",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Je relance parce que de plus en plus de restaurants à {{ville}} adoptent les cartes digitales.
Les clients touristes prennent l'habitude de scanner les QR codes — ne pas en avoir devient un signal négatif.</p>

<p>Votre démo Ruliz est toujours disponible : <a href="{{preview_url}}">cliquez ici</a>.</p>

<p>Activez-la en 2 minutes pour ne pas perdre le train.</p>
    `),
    generatedBy: "human",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3 — J+7 (témoignage + offre)
  // ═══════════════════════════════════════════════════════════════════════
  {
    campaign: CAMPAIGN,
    step: 3,
    variant: "A",
    subject: "Un patron de bistrot lyonnais m'a dit ça hier",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Hier, un patron de bistrot lyonnais (Pro depuis 3 mois) m'a écrit :</p>

<blockquote style="border-left:3px solid #26438A;padding-left:16px;color:#555;font-style:italic;">
  "Sur 100 tables ce week-end, 73 ont scanné le QR au lieu de demander la carte. Mes serveuses
  ont gagné 2h de service. Et les Allemands commandent enfin du vin au verre."
</blockquote>

<p>Le truc bête c'est que c'est exactement ce que Ruliz fait. Et votre démo est toujours là :</p>

<p><a href="{{preview_url}}" style="color:#26438A;font-weight:600;">→ Réouvrir ma démo</a></p>

<p>Offre spéciale outreach : le <strong>1er mois est offert</strong> si vous activez cette semaine.
Code promo automatique sur la page d'activation.</p>
    `),
    generatedBy: "human",
  },
  {
    campaign: CAMPAIGN,
    step: 3,
    variant: "B",
    subject: "1er mois gratuit pour {{nom}}",
    bodyHtml: wrap(`
<p>Bonjour {{first_name}},</p>

<p>Pour vous remercier d'avoir reçu mes mails (et ne pas les avoir signalés en spam 😅),
je vous offre le <strong>1er mois gratuit</strong> sur Ruliz Pro.</p>

<p>Aucun code à entrer, c'est appliqué automatiquement quand vous activez depuis cette URL :</p>

<p style="text-align:center;margin:24px 0;">
  <a href="{{preview_url}}" style="background:#26438A;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">
    Activer (1er mois offert)
  </a>
</p>

<p>Au pire vous payez 0 € le premier mois. Au mieux vous gagnez des tickets moyens. Pile-face.</p>
    `),
    generatedBy: "human",
  },
  {
    campaign: CAMPAIGN,
    step: 3,
    variant: "C",
    subject: "On a un problème, {{first_name}}",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Sincèrement, j'ai un petit problème : j'ai passé du temps à préparer votre démo
spécifiquement pour <strong>{{nom}}</strong>, et je vois qu'elle n'a pas été ouverte.</p>

<p>Ce n'est pas grave — peut-être que ce n'est pas le bon moment, ou pas le bon outil.</p>

<p>Mais avant de la supprimer définitivement, je vous laisse une dernière chance de la regarder :</p>

<p><a href="{{preview_url}}" style="color:#26438A;font-weight:600;">👉 Voir ma démo (30 secondes)</a></p>

<p>Si après 30 secondes ça ne vous parle pas, supprimez ce mail et je vous laisse tranquille pour de bon.</p>
    `),
    generatedBy: "human",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4 — J+14 (dernière relance, breakup)
  // ═══════════════════════════════════════════════════════════════════════
  {
    campaign: CAMPAIGN,
    step: 4,
    variant: "A",
    subject: "Dernière relance — je supprime votre démo demain",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>Pas de réponse depuis 14 jours → je suppose que ça ne vous intéresse pas.</p>

<p>Je vais supprimer la démo de {{nom}} demain à minuit pour libérer la place
pour d'autres prospects.</p>

<p>Si vous changez d'avis dans les prochaines heures :</p>

<p><a href="{{preview_url}}">→ Ouvrir ma démo une dernière fois</a></p>

<p>Sinon, je vous souhaite une belle continuation. Pas de hard feelings 🙂</p>
    `),
    generatedBy: "human",
  },
  {
    campaign: CAMPAIGN,
    step: 4,
    variant: "B",
    subject: "On se quitte bons amis ? 🤝",
    bodyHtml: wrap(`
<p>Bonjour {{first_name}},</p>

<p>C'est mon 4e et dernier message. Si je ne reçois pas de signal de vie d'ici demain,
je vous retire de ma liste de contacts définitivement.</p>

<p>Aucune rancune — chacun gère son temps, et j'imagine que vous gérez un restaurant, donc je comprends.</p>

<p>Si malgré tout vous voulez juste jeter un œil à ce que ça donnait pour vous :</p>

<p><a href="{{preview_url}}" style="color:#26438A;">Lien de votre démo (valide jusqu'à demain)</a></p>

<p>Sinon, belle continuation et bon service ! 👨‍🍳</p>
    `),
    generatedBy: "human",
  },
  {
    campaign: CAMPAIGN,
    step: 4,
    variant: "C",
    subject: "Je laisse tomber",
    bodyHtml: wrap(`
<p>{{first_name}},</p>

<p>OK je laisse tomber. C'était mon dernier mail.</p>

<p>Si jamais dans 6 mois vous vous souvenez que quelqu'un vous avait préparé une carte digitale
et que vous voulez retenter, mon email c'est <a href="mailto:tristan@ruliz-panel.fr">tristan@ruliz-panel.fr</a>.</p>

<p>D'ici là, votre démo reste accessible quelques jours : <a href="{{preview_url}}">cliquez ici</a>.</p>

<p>Bonne continuation et bons services à {{nom}}.</p>
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
