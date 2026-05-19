"use server";

import crypto from "node:crypto";
import { prisma } from "@/lib/db";
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

const SYSTEM_PROMPT = `You are a professional UI translator for a French SaaS dashboard.
Translate the following French interface text to {target_language_full_name}.

Strict rules:
- Keep the same tone (professional but friendly, tutoiement style if applicable)
- Keep technical terms in original form ONLY if they are commonly used internationally
  (e.g. "QR code" stays "QR code", but "tableau de bord" → "dashboard")
- Keep emoji untouched
- Keep brand names untouched ("Ruliz", "Stripe", etc.)
- Keep variable placeholders untouched (e.g. {{nom}}, {count}, %s)
- Match the EXACT length when possible (UI constraint)
- Output ONLY the translated text, no preamble, no quotes, no explanation`;

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
      return { ok: true, text: cached[0].translated };
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

    const translated = block.text.trim();

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
 * Traduit un batch en parallèle (1 call Anthropic par string, max 20 en concurrence).
 * Utilisé pour pré-warm le cache d'une page.
 */
export async function translatePanelBatch(
  texts: string[],
  lang: string,
): Promise<Record<string, string>> {
  if (!isSupportedLang(lang) || lang === "fr") {
    const result: Record<string, string> = {};
    for (const t of texts) result[t] = t;
    return result;
  }

  const concurrency = 20;
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
