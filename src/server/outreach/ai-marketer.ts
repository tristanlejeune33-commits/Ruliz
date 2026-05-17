import "server-only";
import { prisma } from "@/lib/db";
import { getAnthropic } from "@/server/translation/anthropic";

/**
 * AI Marketer — remplace l'expert mailing freelance (~700€/mois) par
 * Anthropic Haiku (~10$/mois).
 *
 * Deux capacités principales :
 *
 *   1. **generateVariantImprovement** — analyse les stats des variants
 *      existants et propose un nouveau variant qui performe mieux
 *      (sujet + body), basé sur ce qui a marché et ce qui n'a pas.
 *
 *   2. **classifyReply** — classifie une réponse entrante en
 *      "interested" / "not_now" / "negative" / "question" / "unsubscribe"
 *      et propose une réponse contextuelle si pertinent.
 */

const MODEL = "claude-haiku-4-5-20251001";

// ────────────────────────────────────────────────────────────────────────────
// 1) Générateur de variant amélioré
// ────────────────────────────────────────────────────────────────────────────

const VARIANT_GENERATOR_SYSTEM = `Tu es un expert en cold email B2B SaaS pour restaurateurs francophones.
Tu analyses les performances d'emails A/B testés et tu proposes un nouveau variant
qui devrait performer mieux.

Tes principes :
- Sujet court (< 50 caractères), curiosity gap, sans emoji spammy
- Body court (< 150 mots), ton humain et direct
- Personnalisation : utilise {{nom}} (nom resto), {{ville}}, {{first_name}}, {{preview_url}}
- Pas de jargon corporate. Tu écris comme un fondateur qui démarre, pas un département marketing
- Toujours un CTA unique et clair
- Toujours un mécanisme de respect (réponse "pas intéressé" possible)

Output UNIQUEMENT du JSON valide :
{
  "variant": "D",
  "subject": "...",
  "bodyHtml": "<p>...</p>...",
  "hypothesis": "Brève explication de pourquoi ce variant devrait mieux performer (1-2 phrases)"
}

Pas de markdown fences, pas de préamble.`;

type VariantGenInput = {
  campaign: string;
  step: number;
  existingVariants: Array<{
    variant: string;
    subject: string;
    bodyHtml: string;
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  }>;
};

type VariantGenOutput = {
  variant: string;
  subject: string;
  bodyHtml: string;
  hypothesis: string;
};

export async function generateVariantImprovement(
  input: VariantGenInput,
): Promise<{ ok: true; data: VariantGenOutput } | { ok: false; error: string }> {
  const client = getAnthropic();
  if (!client) return { ok: false, error: "ANTHROPIC_API_KEY missing" };

  if (input.existingVariants.length === 0) {
    return { ok: false, error: "No existing variants to learn from" };
  }

  // Construit le contexte stats
  const variantsContext = input.existingVariants
    .map((v) => {
      const openR = v.sent > 0 ? ((v.opened / v.sent) * 100).toFixed(1) : "0.0";
      const clickR = v.sent > 0 ? ((v.clicked / v.sent) * 100).toFixed(1) : "0.0";
      const convR = v.sent > 0 ? ((v.converted / v.sent) * 100).toFixed(1) : "0.0";
      return `Variant ${v.variant}:
  Sujet: "${v.subject}"
  Envoyés: ${v.sent}, Open: ${openR}%, Click: ${clickR}%, Conv: ${convR}%
  Body (extrait): ${v.bodyHtml.replace(/<[^>]+>/g, " ").slice(0, 300)}...`;
    })
    .join("\n\n");

  const nextLetter = String.fromCharCode(
    65 + input.existingVariants.length, // A=0, B=1, C=2 → D, E, ...
  );

  const prompt = `Voici les stats des variants existants pour la campagne "${input.campaign}", step ${input.step} :

${variantsContext}

Propose un nouveau variant "${nextLetter}" qui devrait mieux performer.
Analyse :
- Quel variant a le meilleur open rate ? Qu'est-ce qui fait sa différence ?
- Quel variant a le meilleur click rate ? Qu'est-ce qui le distingue ?
- Quelles sont les faiblesses des variants moins performants ?
- Ton hypothèse : qu'est-ce qu'on pourrait essayer qu'on n'a pas encore essayé ?

Génère le JSON.`;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.7,
      system: VARIANT_GENERATOR_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const block = res.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") {
      return { ok: false, error: "No text in response" };
    }

    const parsed = extractJson<VariantGenOutput>(block.text);
    if (!parsed) {
      return { ok: false, error: "Failed to parse JSON response" };
    }

    return { ok: true, data: parsed };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 2) Classifier de replies
// ────────────────────────────────────────────────────────────────────────────

const CLASSIFIER_SYSTEM = `Tu es un classifieur de réponses email pour un cold-outreach SaaS.
Tu reçois la réponse d'un prospect (restaurateur français) et tu dois :

1. La classifier en UNE catégorie :
   - "interested"     : Le prospect veut en savoir plus / accepter
   - "question"       : Il pose une question avant de décider
   - "not_now"        : Pas intéressé maintenant mais pas hostile
   - "negative"       : Refus catégorique / agacement
   - "unsubscribe"    : Demande explicite de désinscription
   - "out_of_office"  : Réponse auto OOO / vacances
   - "wrong_person"   : "Vous vous trompez de personne"
   - "spam_complaint" : "Arrêtez de me spammer" / menace de signaler

2. Proposer une réponse de Tristan (fondateur) si pertinent :
   - "interested" / "question" → réponse cordiale qui pousse vers l'activation
   - "not_now" → réponse polie qui propose un rappel dans 3 mois
   - Pour les autres → null (on ne répond pas)

Ton de Tristan : direct, humain, sans corporate-speak, max 100 mots.
Toujours signer "Tristan".

Output UNIQUEMENT du JSON valide :
{
  "category": "interested|question|not_now|negative|unsubscribe|out_of_office|wrong_person|spam_complaint",
  "confidence": 0.0-1.0,
  "shouldReply": true|false,
  "replyText": "Texte de réponse OU null",
  "reasoning": "1 phrase pour expliquer ta classif"
}

Pas de markdown, pas de préamble.`;

export type ReplyClassification = {
  category:
    | "interested"
    | "question"
    | "not_now"
    | "negative"
    | "unsubscribe"
    | "out_of_office"
    | "wrong_person"
    | "spam_complaint";
  confidence: number;
  shouldReply: boolean;
  replyText: string | null;
  reasoning: string;
};

export async function classifyReply(opts: {
  replyText: string;
  prospectNom: string;
  prospectVille?: string | null;
  previewUrl?: string;
}): Promise<
  | { ok: true; data: ReplyClassification }
  | { ok: false; error: string }
> {
  const client = getAnthropic();
  if (!client) return { ok: false, error: "ANTHROPIC_API_KEY missing" };

  const context = `Contexte :
- Restaurant : ${opts.prospectNom}${opts.prospectVille ? ` (${opts.prospectVille})` : ""}
${opts.previewUrl ? `- URL preview : ${opts.previewUrl}` : ""}

Réponse reçue du prospect :
"""
${opts.replyText.slice(0, 2000)}
"""

Classifie et propose une réponse si pertinent.`;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.3,
      system: CLASSIFIER_SYSTEM,
      messages: [{ role: "user", content: context }],
    });

    const block = res.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") {
      return { ok: false, error: "No text in response" };
    }

    const parsed = extractJson<ReplyClassification>(block.text);
    if (!parsed) {
      return { ok: false, error: "Failed to parse JSON" };
    }

    return { ok: true, data: parsed };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 3) Helpers
// ────────────────────────────────────────────────────────────────────────────

function extractJson<T>(raw: string): T | null {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 4) Orchestration : génère + insère un nouveau variant pour la campagne
// ────────────────────────────────────────────────────────────────────────────

/**
 * Worker top-level : pour chaque step d'une campagne, génère un nouveau
 * variant basé sur les stats actuelles. Insert en DB et le rend actif.
 *
 * À appeler depuis un cron Inngest hebdo (lundi 9h par exemple).
 */
export async function aiMarketerWeeklyTick(opts: {
  campaign: string;
  minSentPerStep?: number;
}): Promise<{
  steps: Array<{
    step: number;
    generated: boolean;
    variant?: string;
    hypothesis?: string;
    error?: string;
  }>;
}> {
  const { campaign, minSentPerStep = 50 } = opts;

  const results: Array<{
    step: number;
    generated: boolean;
    variant?: string;
    hypothesis?: string;
    error?: string;
  }> = [];

  for (const step of [1, 2, 3, 4]) {
    const existing = await prisma.emailVariant.findMany({
      where: { campaign, step, active: true },
    });

    const totalSent = existing.reduce((sum, v) => sum + v.sent, 0);
    if (totalSent < minSentPerStep) {
      results.push({
        step,
        generated: false,
        error: `not_enough_data (${totalSent}/${minSentPerStep})`,
      });
      continue;
    }

    const gen = await generateVariantImprovement({
      campaign,
      step,
      existingVariants: existing.map((v) => ({
        variant: v.variant,
        subject: v.subject,
        bodyHtml: v.bodyHtml,
        sent: v.sent,
        opened: v.opened,
        clicked: v.clicked,
        converted: v.converted,
      })),
    });

    if (!gen.ok) {
      results.push({ step, generated: false, error: gen.error });
      continue;
    }

    await prisma.emailVariant.create({
      data: {
        campaign,
        step,
        variant: gen.data.variant,
        subject: gen.data.subject,
        bodyHtml: gen.data.bodyHtml,
        generatedBy: "ai",
        active: true,
      },
    });

    results.push({
      step,
      generated: true,
      variant: gen.data.variant,
      hypothesis: gen.data.hypothesis,
    });
  }

  return { steps: results };
}
