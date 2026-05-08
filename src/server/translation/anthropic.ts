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
- Keep proper nouns and brand names in original form.
- Keep wine names, cheese names like "chèvre", regional specialities in French.
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

  // No-op si même langue ou texte vide
  if (!text.trim()) return { ok: true, text };
  if (targetLang === (opts.sourceLang ?? "fr")) return { ok: true, text };

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
          content: `Translate the following French text to ${LANG_LABELS[targetLang]}.\n\nText:\n${text}`,
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
  targetLang: SupportedLang;
}): Promise<
  | {
      ok: true;
      titre: string;
      description: string | null;
      descriptionPrix: string | null;
    }
  | { ok: false; error: string }
> {
  const { titre, description, descriptionPrix, targetLang } = opts;

  if (targetLang === "fr") {
    return { ok: true, titre, description, descriptionPrix };
  }

  const client = getAnthropic();
  if (!client) return { ok: false, error: "ANTHROPIC_API_KEY missing" };

  // Build a structured prompt that returns three blocks delimited by markers.
  const parts: string[] = [];
  parts.push(`<<<TITRE>>>\n${titre}`);
  if (description) parts.push(`<<<DESCRIPTION>>>\n${description}`);
  if (descriptionPrix) parts.push(`<<<DESC_PRIX>>>\n${descriptionPrix}`);

  const userMessage = `Translate the following French restaurant menu fields to ${LANG_LABELS[targetLang]}.

Each field is delimited by markers like <<<NAME>>>. Output the translation using the EXACT same markers, in the EXACT same order, with no other text.

${parts.join("\n\n")}`;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const block = res.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") {
      return { ok: false, error: "No text in Anthropic response" };
    }

    const out = block.text;
    const titreMatch = /<<<TITRE>>>\n([\s\S]*?)(?=\n<<<|$)/.exec(out);
    const descMatch = /<<<DESCRIPTION>>>\n([\s\S]*?)(?=\n<<<|$)/.exec(out);
    const dpMatch = /<<<DESC_PRIX>>>\n([\s\S]*?)(?=\n<<<|$)/.exec(out);

    return {
      ok: true,
      titre: titreMatch?.[1]?.trim() ?? titre,
      description: description ? (descMatch?.[1]?.trim() ?? description) : null,
      descriptionPrix: descriptionPrix
        ? (dpMatch?.[1]?.trim() ?? descriptionPrix)
        : null,
    };
  } catch (err) {
    console.error("[anthropic.translateProduit]", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
