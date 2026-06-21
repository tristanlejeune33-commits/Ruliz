import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { getAnthropic } from "@/server/translation/anthropic";

/**
 * Génère une carte digitale depuis le menu source d'un prospect.
 *
 * Stratégie :
 *   1. Si menuSourceUrl pointe vers un PDF / image → Anthropic Vision OCR
 *   2. Si menuSourceUrl pointe vers HTML → fetch + Anthropic Haiku text parsing
 *   3. Sinon → génération générique par "type cuisine" basé sur le nom du resto
 *
 * Sortie : cardJson = { categories: [{ nom, produits: [{ nom, description, prix }] }] }
 *
 * Le restaurant n'est PAS créé en DB — juste un cardJson stocké sur le prospect.
 * L'insertion en Categorie/Produit se fait à l'activation (signup du resto).
 */

const VISION_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 4000;

const SYSTEM_PROMPT_OCR = `You are a French restaurant menu parser.
Extract the menu structure from the provided document (PDF or image).

Output ONLY a JSON object with this exact shape, no preamble, no markdown fences:

{
  "categories": [
    {
      "nom": "Entrées",
      "produits": [
        {
          "nom": "Carpaccio de boeuf",
          "description": "Fine tranches de boeuf, parmesan, roquette, huile de truffe",
          "prix": 14.50
        }
      ]
    }
  ]
}

Rules:
- Keep all text in French.
- "prix" must be a number in euros (use 0 if unknown).
- Skip wine/drinks lists unless they are the menu's main content.
- If a dish has no description, write a 5-8 word appetizing description.
- Maximum 8 categories, maximum 15 products per category.
- Group products logically: Entrées / Plats / Desserts / Boissons.`;

const SYSTEM_PROMPT_HTML = `You are a French restaurant menu parser.
Extract the menu structure from the provided HTML page content.

Output ONLY a JSON object with this exact shape, no preamble, no markdown fences:

{
  "categories": [
    {
      "nom": "Entrées",
      "produits": [
        {
          "nom": "Carpaccio de boeuf",
          "description": "Fine tranches de boeuf, parmesan, roquette",
          "prix": 14.50
        }
      ]
    }
  ]
}

Rules:
- Keep all text in French.
- "prix" must be a number in euros (use 0 if unknown).
- If the page is not a menu, output {"categories": []}.
- Maximum 8 categories, maximum 15 products per category.`;

const SYSTEM_PROMPT_FALLBACK = `You are a French restaurant menu writer.
Generate a believable menu for a French restaurant called "{NOM}" located in "{VILLE}".

Output ONLY a JSON object with the same shape as above.
The menu should reflect typical French bistronomy if no cuisine hint is given.
4 categories: Entrées (4 plats), Plats (6 plats), Desserts (4 plats), Boissons (4 items).
Prices should be realistic for "{NIVEAU_PRIX}" range.`;

export type GeneratedCard = {
  categories: Array<{
    nom: string;
    produits: Array<{
      nom: string;
      description: string;
      prix: number;
    }>;
  }>;
};

function parseJsonResponse(raw: string): GeneratedCard | null {
  // Robuste aux mardkown fences ou texte parasite
  let text = raw.trim();
  // Enlève ```json ... ```
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  // Trouve le premier { et le dernier }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.categories)) return null;
    return parsed as GeneratedCard;
  } catch {
    return null;
  }
}

/** Génère la carte d'un prospect. Update direct en DB. */
export async function generateCardForProspect(prospectId: bigint): Promise<{
  ok: boolean;
  source: "vision" | "html" | "fallback" | "failed";
  card?: GeneratedCard;
  error?: string;
}> {
  const prospect = await prisma.prospectRestaurant.findUnique({
    where: { id: prospectId },
    select: {
      id: true,
      nom: true,
      ville: true,
      niveauPrix: true,
      menuSourceUrl: true,
      menuSourceType: true,
    },
  });

  if (!prospect) throw new Error(`Prospect ${prospectId} not found`);

  const client = getAnthropic();
  if (!client) {
    return { ok: false, source: "failed", error: "ANTHROPIC_API_KEY missing" };
  }

  let card: GeneratedCard | null = null;
  let source: "vision" | "html" | "fallback" | "failed" = "failed";

  // ─── Tentative 1 : Vision OCR (PDF ou image) ──────────────────────────
  if (
    prospect.menuSourceUrl &&
    (prospect.menuSourceType === "pdf" || prospect.menuSourceType === "image")
  ) {
    try {
      const res = await client.messages.create({
        model: VISION_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        system: SYSTEM_PROMPT_OCR,
        messages: [
          {
            role: "user",
            content: [
              {
                type: prospect.menuSourceType === "pdf" ? "document" : "image",
                source: {
                  type: "url",
                  url: prospect.menuSourceUrl,
                },
              } as never,
              { type: "text", text: "Parse this menu." },
            ],
          },
        ],
      });
      const block = res.content.find((c) => c.type === "text");
      if (block && block.type === "text") {
        card = parseJsonResponse(block.text);
        if (card && card.categories.length > 0) source = "vision";
      }
    } catch (err) {
      console.warn("[generate-card] vision failed:", err);
    }
  }

  // ─── Tentative 2 : HTML parsing ───────────────────────────────────────
  if (!card && prospect.menuSourceUrl && prospect.menuSourceType === "html") {
    try {
      const html = await fetchSafe(prospect.menuSourceUrl);
      if (html) {
        // Strip HTML tags pour réduire les tokens
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 12000);

        const res = await client.messages.create({
          model: VISION_MODEL,
          max_tokens: MAX_TOKENS,
          temperature: 0.2,
          system: SYSTEM_PROMPT_HTML,
          messages: [{ role: "user", content: text }],
        });
        const block = res.content.find((c) => c.type === "text");
        if (block && block.type === "text") {
          card = parseJsonResponse(block.text);
          if (card && card.categories.length > 0) source = "html";
        }
      }
    } catch (err) {
      console.warn("[generate-card] html failed:", err);
    }
  }

  // ─── Tentative 3 : Fallback génératif ─────────────────────────────────
  if (!card) {
    try {
      const sys = SYSTEM_PROMPT_FALLBACK
        .replace("{NOM}", prospect.nom)
        .replace("{VILLE}", prospect.ville ?? "France")
        .replace("{NIVEAU_PRIX}", prospect.niveauPrix ?? "€€");
      const res = await client.messages.create({
        model: VISION_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.5,
        system: sys,
        messages: [{ role: "user", content: "Génère le menu." }],
      });
      const block = res.content.find((c) => c.type === "text");
      if (block && block.type === "text") {
        card = parseJsonResponse(block.text);
        if (card && card.categories.length > 0) source = "fallback";
      }
    } catch (err) {
      console.warn("[generate-card] fallback failed:", err);
    }
  }

  // ─── Persist ──────────────────────────────────────────────────────────
  if (!card || card.categories.length === 0) {
    await prisma.prospectRestaurant.update({
      where: { id: prospectId },
      data: {
        status: "failed",
        errorMessage: "card_generation_failed",
      },
    });
    return { ok: false, source: "failed", error: "card_generation_failed" };
  }

  const cardToken = crypto.randomBytes(16).toString("hex");

  await prisma.prospectRestaurant.update({
    where: { id: prospectId },
    data: {
      cardJson: card as never,
      cardToken,
      status: "generated",
      generatedAt: new Date(),
      errorMessage: null,
    },
  });

  return { ok: true, source, card };
}

async function fetchSafe(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "RulizBot/1.0 (+https://ruliz-panel.fr/bot) Menu parser",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
