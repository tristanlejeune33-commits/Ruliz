import "server-only";

/**
 * Templates de réponses automatiques humanisées.
 *
 * Quand un prospect répond à un cold email, l'AI marketer (classifyReply)
 * détermine la catégorie de sa réponse. Cette table donne 3 variants de
 * réponse pour chaque catégorie, choisis aléatoirement.
 *
 * Délai humain avant envoi : 2-30 min (pas de réponse instantanée = suspect).
 *
 * Catégories gérées :
 *   • interested      → Réponse engageante, propose un call ou activation
 *   • question        → Répond à la question + relance softement
 *   • not_now         → Polite, propose rappel dans 60 jours
 *   • negative        → Stop séquence + pas de réponse envoyée
 *   • unsubscribe     → Stop séquence + accusé de désinscription
 *   • out_of_office   → Pas de réponse (l'AI sait que c'est auto)
 *   • wrong_person    → Demande politement si possible de forwarder
 *   • spam_complaint  → Stop séquence + pas de réponse (risque de l'aggraver)
 *
 * Variables disponibles :
 *   {{first_name}}    Prénom du prospect (best-effort)
 *   {{nom}}           Nom du restaurant
 *   {{preview_url}}   URL preview personnalisée
 *   {{calendly_url}}  https://calendly.com/tristan-ruliz/10min
 */

export type ReplyTemplate = {
  /** Catégorie reply classifiée par AI marketer */
  category:
    | "interested"
    | "question"
    | "not_now"
    | "negative"
    | "unsubscribe"
    | "out_of_office"
    | "wrong_person"
    | "spam_complaint";
  /** Variant (A/B/C) — choisi au hasard pour humaniser */
  variant: "A" | "B" | "C";
  /** Sujet du mail de réponse (généralement "Re: ...") */
  subject: string;
  /** Body texte plain (formaté en HTML par sendReply) */
  body: string;
  /** Si false : pas de réponse envoyée (juste stop séquence) */
  shouldReply: boolean;
};

export const REPLY_TEMPLATES: ReplyTemplate[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERESTED — Le prospect veut en savoir plus
  // ═══════════════════════════════════════════════════════════════════════════

  {
    category: "interested",
    variant: "A",
    shouldReply: true,
    subject: "re: ta démo {{nom}}",
    body: `Yes super {{first_name}} !

Pour activer c'est super simple : tu cliques sur le lien de ta démo, tu te crées un compte en 30 secondes (juste prénom + nom + mot de passe).

Ta carte est automatiquement importée avec ton logo, tes plats, tes catégories. Tu peux modifier ce que tu veux après.

{{preview_url}}

Tu veux qu'on cale 10 min en visio pour que je te montre tout ? Tu peux choisir un créneau ici : {{calendly_url}}

Ou tu peux juste activer en autonomie, tu vois ce que tu préfères.`,
  },

  {
    category: "interested",
    variant: "B",
    shouldReply: true,
    subject: "re: ok je veux voir",
    body: `Top {{first_name}} !

Ta démo est là : {{preview_url}}

Clique → Activer ma carte (bouton bleu en bas) → tu te crées un compte → c'est activé.

Si tu veux que je t'accompagne : on cale 10 min en visio, je te montre tout en partage d'écran. Créneaux ici : {{calendly_url}}

Sinon tu peux y aller solo, c'est vraiment pas compliqué.

Tu préfères quoi ?`,
  },

  {
    category: "interested",
    variant: "C",
    shouldReply: true,
    subject: "re: super",
    body: `{{first_name}} tu m'as fait plaisir.

OK voici le deal :

1. Tu vas sur ta démo : {{preview_url}}
2. Click "Activer ma carte" (en bas)
3. Création compte 30 sec
4. T'as ta vraie carte digitale active

Si tu veux que je t'aide live, propose-moi un créneau : {{calendly_url}}

Hâte de voir {{nom}} en ligne !`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUESTION — Le prospect pose une question avant de décider
  // ═══════════════════════════════════════════════════════════════════════════

  {
    category: "question",
    variant: "A",
    shouldReply: true,
    subject: "re: question {{nom}}",
    body: `Salut {{first_name}},

Bonne question, je te réponds.

[L'AI complétera cette partie selon la question spécifique]

Sinon ta démo est toujours là si tu veux re-regarder : {{preview_url}}

Et si t'as d'autres questions, n'hésite pas, c'est OK de poser tout ce que tu veux.`,
  },

  {
    category: "question",
    variant: "B",
    shouldReply: true,
    subject: "re: ta question",
    body: `Hello {{first_name}},

Merci de la question, je te réponds direct.

[L'AI complétera cette partie selon la question spécifique]

Si tu veux qu'on en discute en visio (10 min max), je peux te montrer tout en partage d'écran. Créneaux ici : {{calendly_url}}

Sinon ta démo : {{preview_url}}`,
  },

  {
    category: "question",
    variant: "C",
    shouldReply: true,
    subject: "re: {{nom}} — réponse",
    body: `{{first_name}},

Je te réponds rapidement :

[L'AI complétera cette partie selon la question spécifique]

Ta démo : {{preview_url}}

T'as d'autres questions ? Vas-y, je suis là.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOT_NOW — Le prospect est intéressé mais pas le moment
  // ═══════════════════════════════════════════════════════════════════════════

  {
    category: "not_now",
    variant: "A",
    shouldReply: true,
    subject: "re: pas le bon timing",
    body: `Pas de souci {{first_name}}, je comprends.

Je te recontacte dans 2-3 mois ? Si à ce moment-là c'est mieux pour {{nom}}, on en reparle.

Si tu veux que je note un truc spécifique (genre "rappeler en septembre" ou "attendre la saison"), dis-le moi.

Bonne continuation entre-temps.`,
  },

  {
    category: "not_now",
    variant: "B",
    shouldReply: true,
    subject: "re: on reverra ça",
    body: `OK {{first_name}}, ça marche.

Je te programme un rappel pour dans ~3 mois. Si entre-temps tu veux ré-ouvrir ta démo : {{preview_url}}

T'inquiète, pas de pression. Belle continuation à {{nom}}.`,
  },

  {
    category: "not_now",
    variant: "C",
    shouldReply: true,
    subject: "re: plus tard",
    body: `{{first_name}}, no problem.

Je te laisse tranquille. Je remettrai un mot dans quelques mois, voir si c'est mieux le timing.

Si jamais entre-temps t'as une question : <a href="mailto:tristan@ruliz-panel.fr">tristan@ruliz-panel.fr</a>

Bonne continuation.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEGATIVE — Refus catégorique (PAS de réponse, juste stop)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    category: "negative",
    variant: "A",
    shouldReply: false,
    subject: "",
    body: "",
  },
  {
    category: "negative",
    variant: "B",
    shouldReply: false,
    subject: "",
    body: "",
  },
  {
    category: "negative",
    variant: "C",
    shouldReply: false,
    subject: "",
    body: "",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UNSUBSCRIBE — Demande explicite (PAS de réponse, on respecte)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    category: "unsubscribe",
    variant: "A",
    shouldReply: false,
    subject: "",
    body: "",
  },
  {
    category: "unsubscribe",
    variant: "B",
    shouldReply: false,
    subject: "",
    body: "",
  },
  {
    category: "unsubscribe",
    variant: "C",
    shouldReply: false,
    subject: "",
    body: "",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OUT_OF_OFFICE — Réponse auto (pas de réponse needed)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    category: "out_of_office",
    variant: "A",
    shouldReply: false,
    subject: "",
    body: "",
  },
  {
    category: "out_of_office",
    variant: "B",
    shouldReply: false,
    subject: "",
    body: "",
  },
  {
    category: "out_of_office",
    variant: "C",
    shouldReply: false,
    subject: "",
    body: "",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WRONG_PERSON — Mauvaise personne, demande politement forward
  // ═══════════════════════════════════════════════════════════════════════════

  {
    category: "wrong_person",
    variant: "A",
    shouldReply: true,
    subject: "re: pas la bonne personne",
    body: `Ah désolé {{first_name}} !

Si c'est pas trop te demander, est-ce que tu peux forward mon mail au bon contact chez {{nom}} ? (la personne qui gère le menu/marketing typiquement)

Sinon donne-moi juste son nom/email, je le contacte directement.

Merci d'avance.`,
  },

  {
    category: "wrong_person",
    variant: "B",
    shouldReply: true,
    subject: "re: tu peux forwarder ?",
    body: `Oups, désolé pour la confusion {{first_name}}.

Tu connais qui s'occupe du marketing/menu chez {{nom}} ? Si tu peux me filer son contact ou forward mon mail je te serai reconnaissant.

Merci !`,
  },

  {
    category: "wrong_person",
    variant: "C",
    shouldReply: true,
    subject: "re: pas le bon contact",
    body: `{{first_name}}, désolé !

Tu peux soit forward mon mail à la bonne personne chez {{nom}}, soit me filer son contact ?

Sinon je m'arrête là. Merci de ta patience.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPAM_COMPLAINT — Menace de signaler (PAS de réponse, ça peut empirer)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    category: "spam_complaint",
    variant: "A",
    shouldReply: false,
    subject: "",
    body: "",
  },
  {
    category: "spam_complaint",
    variant: "B",
    shouldReply: false,
    subject: "",
    body: "",
  },
  {
    category: "spam_complaint",
    variant: "C",
    shouldReply: false,
    subject: "",
    body: "",
  },
];

/**
 * Pick un template aléatoirement pour une catégorie donnée.
 * Si shouldReply=false sur tous les variants, retourne null (= ne pas répondre).
 */
export function pickReplyTemplate(
  category: ReplyTemplate["category"],
): ReplyTemplate | null {
  const matches = REPLY_TEMPLATES.filter((t) => t.category === category);
  if (matches.length === 0) return null;
  const allBlank = matches.every((t) => !t.shouldReply);
  if (allBlank) return null;

  const repliable = matches.filter((t) => t.shouldReply);
  const idx = Math.floor(Math.random() * repliable.length);
  return repliable[idx] ?? null;
}

/**
 * Interpole les variables {{...}} dans le body/subject d'un template.
 */
export function renderTemplate(
  template: string,
  vars: {
    first_name: string;
    nom: string;
    preview_url: string;
    calendly_url?: string;
  },
): string {
  return template
    .replace(/\{\{first_name\}\}/g, vars.first_name)
    .replace(/\{\{nom\}\}/g, vars.nom)
    .replace(/\{\{preview_url\}\}/g, vars.preview_url)
    .replace(
      /\{\{calendly_url\}\}/g,
      vars.calendly_url ?? "https://calendly.com/tristan-ruliz/10min",
    );
}

/**
 * Délai humain aléatoire avant d'envoyer une réponse auto.
 * Entre 2 et 30 minutes — on simule un humain qui voit son mail puis répond.
 */
export function humanDelayMs(): number {
  const minMs = 2 * 60 * 1000;
  const maxMs = 30 * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs) + minMs);
}
