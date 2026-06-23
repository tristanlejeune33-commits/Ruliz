"use server";

import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { isSupportedLang, type SupportedLang } from "@/lib/langs";
import { getAnthropic } from "@/server/translation/anthropic";

/**
 * Traduction à la volée des strings du panel admin/dashboard.
 *
 * Stratégie :
 *   1. Si lang = "fr" → retourne le texte tel quel
 *   2. Sinon → check cache DB (clé : sha256(text) + lang)
 *   3. Si miss → appelle Anthropic Haiku → cache résultat → retourne
 *
 * Le cache est PARTAGÉ entre tous les users : la première fois qu'un text
 * est traduit en EN, tous les autres users EN voient la traduction
 * instantanément (pas de re-paiement Anthropic).
 *
 * Coût marginal :
 *   - 1 string FR de 50 chars → ~30 tokens Anthropic Haiku → ~$0.00006
 *   - 1000 strings × 6 langues = 6000 traductions = ~$0.36 one-shot
 *   - Une fois cachées : gratuit pour la vie du SaaS
 */

const SYSTEM_PROMPT = `You are a machine translation engine for a French SaaS dashboard UI.
Translate the input text to {target_language_full_name}.

ABSOLUTE rules (no exceptions):
- Output ONLY the translation. NEVER add commentary, preamble, quotes, or notes.
- NEVER ask a question. NEVER converse. You are a function: input → translation.
- If the input is a PROPER NOUN, brand, person/restaurant name, an email, a URL,
  or is already NOT in French (or not translatable), return it EXACTLY UNCHANGED.
- If you are unsure, return the input UNCHANGED. Do not explain.
- Keep emoji, numbers, currency symbols and placeholders ({{nom}}, {count}, %s) untouched.
- Keep brand names untouched ("Ruliz", "Stripe", "QR code", etc.).
- Keep the same tone (professional, friendly, tutoiement) and a similar length.`;

const LANG_LABELS: Record<SupportedLang, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Simplified Chinese",
};

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Détecte une réponse qui n'EST PAS une traduction : refus conversationnel du
 * modèle ("I appreciate your message, but…"), question, explication. Une vraie
 * traduction reste proche de la longueur source ; une réponse parasite est
 * disproportionnée. On filtre aussi quelques tournures conversationnelles.
 */
function looksLikeBadTranslation(source: string, output: string): boolean {
  if (!output) return true;
  if (output.length > source.length * 3 + 40) return true;
  const lower = output.toLowerCase();
  const tells = [
    "i appreciate",
    "could you please",
    "doesn't appear",
    "does not appear",
    "i'll translate",
    "i will translate",
    "provide the actual",
    "the actual french",
    "following the rules",
    "je traduirai",
    "pourriez-vous",
  ];
  return tells.some((t) => lower.includes(t));
}

type TranslateResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Traduit une string vers la lang cible. Avec cache DB.
 */
export async function translatePanelString(
  text: string,
  lang: string,
): Promise<TranslateResult> {
  if (!text || !text.trim()) return { ok: true, text };
  if (!isSupportedLang(lang)) {
    return { ok: false, error: "unsupported_lang" };
  }
  if (lang === "fr") return { ok: true, text };

  // Garantit que la table panel_translations_cache existe (créée par
  // ensureRuntimeSchema, jamais appelée ici avant → si aucune autre
  // route ne l'avait déclenchée, le cache DB était silencieusement
  // inopérant : chaque visite re-payait Anthropic).
  await ensureRuntimeSchema();

  const textHash = hashText(text);

  // 1) Check cache DB
  try {
    const cached = await prisma.$queryRawUnsafe<
      Array<{ translated: string }>
    >(
      `SELECT translated FROM "panel_translations_cache"
       WHERE text_hash = $1 AND lang = $2 LIMIT 1`,
      textHash,
      lang,
    );
    if (cached && cached.length > 0 && cached[0]) {
      // Ignore une entrée polluée (réponse conversationnelle cachée par erreur
      // avant ce fix) → on retombe sur une re-traduction propre ci-dessous.
      if (!looksLikeBadTranslation(text, cached[0].translated)) {
        return { ok: true, text: cached[0].translated };
      }
    }
  } catch (err) {
    console.warn("[translatePanel] cache lookup failed:", err);
    // Si cache plante, on continue avec Anthropic — pas bloquant
  }

  // 2) Cache miss → Anthropic Haiku
  const client = getAnthropic();
  if (!client) {
    return { ok: false, error: "anthropic_key_missing" };
  }

  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      temperature: 0.2,
      system: SYSTEM_PROMPT.replace(
        "{target_language_full_name}",
        LANG_LABELS[lang as SupportedLang],
      ),
      messages: [
        {
          role: "user",
          content: `Translate this French UI text:\n\n${text}`,
        },
      ],
    });

    const block = res.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") {
      return { ok: false, error: "no_text_in_response" };
    }

    let translated = block.text.trim();

    // Garde-fou : si le modèle a « conversé » au lieu de traduire (nom propre,
    // texte non-FR…), on garde le texte ORIGINAL et on le cache tel quel
    // (translated == source) pour ne pas re-appeler l'IA à chaque fois.
    if (looksLikeBadTranslation(text, translated)) {
      translated = text;
    }

    // 3) Cache result
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "panel_translations_cache" (text_hash, lang, source_text, translated)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (text_hash, lang) DO UPDATE SET translated = EXCLUDED.translated`,
        textHash,
        lang,
        text,
        translated,
      );
    } catch (err) {
      console.warn("[translatePanel] cache write failed:", err);
      // Pas bloquant si cache plante
    }

    return { ok: true, text: translated };
  } catch (err) {
    console.error("[translatePanel] Anthropic failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Récupère TOUTES les traductions en cache pour une langue (source → traduit).
 * Injectée côté serveur dans le layout du panel → l'AutoTranslateWrapper les
 * applique INSTANTANÉMENT au chargement, sans aller-retour réseau par string
 * (fini le « ça charge à l'ouverture »). Renvoie {} en fr ou si erreur.
 */
export async function getPanelTranslations(
  lang: string,
): Promise<Record<string, string>> {
  if (!isSupportedLang(lang) || lang === "fr") return {};
  try {
    await ensureRuntimeSchema();
    const rows = await prisma.$queryRawUnsafe<
      Array<{ source_text: string; translated: string }>
    >(
      `SELECT source_text, translated FROM "panel_translations_cache"
       WHERE lang = $1 LIMIT 5000`,
      lang,
    );
    const dict: Record<string, string> = {};
    for (const r of rows) {
      // On ignore les "traductions == source" (noms propres) : inutile à
      // injecter, et ça évite de gonfler le payload.
      if (r.translated && r.translated !== r.source_text) {
        dict[r.source_text] = r.translated;
      }
    }
    return dict;
  } catch {
    return {};
  }
}

/**
 * Traduit un batch en parallèle (1 call Anthropic par string, max 20 en concurrence).
 * Utilisé pour pré-warm le cache d'une page.
 */
export async function translatePanelBatch(
  texts: string[],
  lang: string,
  concurrency = 20,
): Promise<Record<string, string>> {
  if (!isSupportedLang(lang) || lang === "fr") {
    const result: Record<string, string> = {};
    for (const t of texts) result[t] = t;
    return result;
  }

  const result: Record<string, string> = {};
  const queue = [...texts];

  async function worker() {
    while (queue.length > 0) {
      const text = queue.shift();
      if (!text) break;
      const r = await translatePanelString(text, lang);
      result[text] = r.ok ? r.text : text;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, texts.length) }, worker),
  );

  return result;
}
