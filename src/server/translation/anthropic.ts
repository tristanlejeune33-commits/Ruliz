import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { type SupportedLang } from "@/lib/langs";

export { SUPPORTED_LANGS, type SupportedLang } from "@/lib/langs";

let cached: Anthropic | null = null;

export function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Anthropic({ apiKey: key });
  return cached;
}

const LANG_LABELS: Record<SupportedLang, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Simplified Chinese",
};

const SYSTEM_PROMPT = `You are a professional restaurant menu translator.

Strict rules:
- TRANSLATE dish names and category names. A dish name like "Saucisse purée" MUST become "Sausage and mash" in English, "Tartare de bœuf" → "Beef tartare", "Entrées" → "Starters". Do NOT keep dish titles in the source language.
- Keep ONLY in original form: brand names ("Coca-Cola", "Ricard"), wine appellations ("Saint-Joseph", "Châteauneuf-du-Pape"), and protected/untranslatable food names where the original IS the international name ("foie gras", "crème brûlée", "tiramisu"). When in doubt, translate.
- Keep currency symbols (€, $, £) and numbers untouched.
- Use restaurant-menu register: concise, appetizing, professional.
- Output ONLY the translated text, no preamble, no quotes, no explanation.`;

const MODEL = "claude-haiku-4-5-20251001";

export async function translateText(opts: {
  text: string;
  targetLang: SupportedLang;
  sourceLang?: SupportedLang;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const { text, targetLang } = opts;
  const sourceLang = opts.sourceLang ?? "fr";

  // No-op si même langue ou texte vide
  if (!text.trim()) return { ok: true, text };
  if (targetLang === sourceLang) return { ok: true, text };

  const client = getAnthropic();
  if (!client) {
    return { ok: false, error: "ANTHROPIC_API_KEY missing" };
  }

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Translate the following ${LANG_LABELS[sourceLang]} text to ${LANG_LABELS[targetLang]}.\n\nText:\n${text}`,
        },
      ],
    });

    const block = res.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") {
      return { ok: false, error: "No text in Anthropic response" };
    }
    return { ok: true, text: block.text.trim() };
  } catch (err) {
    console.error("[anthropic.translate]", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Translate multiple fields in a single Anthropic call to reduce cost.
 * The fields are wrapped in JSON-like delimiters and the model returns
 * them in the same order.
 */
export async function translateProduitFields(opts: {
  titre: string;
  description: string | null;
  descriptionPrix: string | null;
  titreRemarque: string | null;
  descriptionRemarque: string | null;
  origine: string | null;
  targetLang: SupportedLang;
  /** Langue source (par défaut "fr" pour rétrocompat) */
  sourceLang?: SupportedLang;
}): Promise<
  | {
      ok: true;
      titre: string;
      description: string | null;
      descriptionPrix: string | null;
      titreRemarque: string | null;
      descriptionRemarque: string | null;
      origine: string | null;
    }
  | { ok: false; error: string }
> {
  const {
    titre,
    description,
    descriptionPrix,
    titreRemarque,
    descriptionRemarque,
    origine,
    targetLang,
  } = opts;
  const sourceLang = opts.sourceLang ?? "fr";

  if (targetLang === sourceLang) {
    return {
      ok: true,
      titre,
      description,
      descriptionPrix,
      titreRemarque,
      descriptionRemarque,
      origine,
    };
  }

  const client = getAnthropic();
  if (!client) return { ok: false, error: "ANTHROPIC_API_KEY missing" };

  // Build a structured prompt that returns blocks delimited by markers.
  const parts: string[] = [];
  parts.push(`<<<TITRE>>>\n${titre}`);
  if (description) parts.push(`<<<DESCRIPTION>>>\n${description}`);
  if (descriptionPrix) parts.push(`<<<DESC_PRIX>>>\n${descriptionPrix}`);
  if (titreRemarque) parts.push(`<<<TITRE_REMARQUE>>>\n${titreRemarque}`);
  if (descriptionRemarque)
    parts.push(`<<<DESC_REMARQUE>>>\n${descriptionRemarque}`);
  if (origine) parts.push(`<<<ORIGINE>>>\n${origine}`);

  const userMessage = `Translate the following ${LANG_LABELS[sourceLang]} restaurant menu fields to ${LANG_LABELS[targetLang]}.

Each field is delimited by markers like <<<NAME>>>. Output the translation using the EXACT same markers, in the EXACT same order, with no other text.

${parts.join("\n\n")}`;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const block = res.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") {
      return { ok: false, error: "No text in Anthropic response" };
    }

    const out = block.text;
    const extract = (marker: string): string | null => {
      const re = new RegExp(`<<<${marker}>>>\\n([\\s\\S]*?)(?=\\n<<<|$)`);
      const m = re.exec(out);
      return m?.[1]?.trim() ?? null;
    };

    return {
      ok: true,
      titre: extract("TITRE") ?? titre,
      description: description ? (extract("DESCRIPTION") ?? description) : null,
      descriptionPrix: descriptionPrix
        ? (extract("DESC_PRIX") ?? descriptionPrix)
        : null,
      titreRemarque: titreRemarque
        ? (extract("TITRE_REMARQUE") ?? titreRemarque)
        : null,
      descriptionRemarque: descriptionRemarque
        ? (extract("DESC_REMARQUE") ?? descriptionRemarque)
        : null,
      origine: origine ? (extract("ORIGINE") ?? origine) : null,
    };
  } catch (err) {
    console.error("[anthropic.translateProduit]", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
