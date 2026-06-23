"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { SUPPORTED_LANGS } from "@/lib/langs";
import { getAnthropic } from "@/server/translation/anthropic";

export type ImportResult =
  | {
      ok: true;
      data: { categories: number; produits: number; vignettes: number; allergenes: number };
    }
  | { ok: false; error: string };

type Langue = "fr" | "en" | "es" | "de" | "it" | "pt" | "zh";

/**
 * Codes vignettes connus (cf. seed). Claude doit retourner ces codes exacts.
 */
const VIGNETTE_CODES = [
  "vegetarien",
  "vegan",
  "sans_gluten",
  "fait_maison",
  "epice",
  "bio",
  "local",
  "signature",
] as const;

/**
 * Codes allergènes UE 14 (cf. seed).
 */
const ALLERGENE_CODES = [
  "gluten",
  "crustaces",
  "oeufs",
  "poissons",
  "arachides",
  "soja",
  "lait",
  "fruits_a_coque",
  "celeri",
  "moutarde",
  "sesame",
  "sulfites",
  "lupin",
  "mollusques",
] as const;

/**
 * Schéma JSON attendu en réponse d'Anthropic.
 * On force un format strict pour pouvoir l'insérer en DB sans gymnastique.
 */
const importedMenuSchema = z.object({
  categories: z
    .array(
      z.object({
        titre: z.string().min(1).max(255),
        icone: z.string().max(50).optional().or(z.literal("")),
        modeAffichage: z
          .enum(["liste", "grille", "carrousel"])
          .optional()
          .default("liste"),
        produits: z
          .array(
            z.object({
              titre: z.string().min(1).max(255),
              description: z.string().max(2000).optional().or(z.literal("")),
              prix: z.number().nullable().optional(),
              descriptionPrix: z.string().max(255).optional().or(z.literal("")),
              /** Codes vignettes détectées automatiquement */
              vignettes: z.array(z.string()).optional().default([]),
              /** Codes allergènes détectés automatiquement */
              allergenes: z.array(z.string()).optional().default([]),
            }),
          )
          .default([]),
      }),
    )
    .min(1, "Aucune catégorie détectée"),
});

type ImportedMenu = z.infer<typeof importedMenuSchema>;

const VISION_MODEL = "claude-haiku-4-5-20251001";

const LANG_LABELS: Record<Langue, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
};

/**
 * System prompt partagé image OCR / texte collé. Le format JSON cible et les
 * règles de détection vignettes/allergènes sont identiques ; seule la source
 * (image vs texte) change dans le message utilisateur.
 */
function buildSystemPrompt(langLabel: string): string {
  return `You are an assistant specialized in structuring restaurant menus.
Extract the full structure of the provided menu as VALID JSON.

Output ONLY a JSON object — no markdown fences, no commentary, no preamble.

JSON shape:
{
  "categories": [
    {
      "titre": "Entrées",
      "icone": "salad",
      "modeAffichage": "liste",
      "produits": [
        {
          "titre": "Foie gras maison",
          "description": "Servi avec confit d'oignon et toast brioché",
          "prix": 18.50,
          "descriptionPrix": "",
          "vignettes": ["fait_maison", "signature"],
          "allergenes": ["gluten", "oeufs"]
        }
      ]
    }
  ]
}

Rules for category-level fields:
- "icone" should be a Lucide icon name in lowercase (salad, beef, wine, coffee, dessert, fish, pizza, etc.) — null/empty if unsure
- "modeAffichage" must be exactly one of: "liste" | "grille" | "carrousel" (default "liste")

Rules for product-level fields:
- "prix" is a number (decimal). Use null if no price visible.
- "descriptionPrix" is for things like "12,5cl / 75cl" or "par personne" — empty string if N/A.

Rules for AUTOMATIC TAG DETECTION (vignettes + allergens):
You must analyze each product description and add tags BASED ON THE INGREDIENTS visible.

VIGNETTES (product type tags) — choose 0-3 from this exact list:
- "vegetarien" → if no meat/fish (vegetable, cheese, eggs OK)
- "vegan" → if no animal product at all (no eggs, no dairy, no honey)
- "sans_gluten" → if explicitly mentioned "sans gluten" / "gluten-free"
- "fait_maison" → if "maison", "fait maison", "homemade" mentioned
- "epice" → if visibly spicy (chili, peppers, "épicé", "spicy", "piquant")
- "bio" → if "bio" / "organic" mentioned
- "local" → if "local", "producteur local", "fermier", "régional" mentioned
- "signature" → if "spécialité maison", "plat signature", "incontournable", or visually highlighted
- Use ONLY these codes (lowercase, with underscores). Empty array [] if no match.

ALLERGÈNES (UE 14) — analyze the dish ingredients and add ALL applicable from this list:
- "gluten" → wheat, barley, rye, oats, beer, pasta, bread, breading, flour
- "crustaces" → shrimp, lobster, crab, langoustine
- "oeufs" → egg, mayo, hollandaise, brioche, pasta fresh
- "poissons" → fish (any kind)
- "arachides" → peanuts (rare in French menus, mostly Asian)
- "soja" → soy sauce, tofu, edamame
- "lait" → milk, cream, cheese (any), butter, yogurt
- "fruits_a_coque" → almonds, walnuts, hazelnuts, pistachios, pecans, cashews
- "celeri" → celery (often in soups/stocks)
- "moutarde" → mustard, vinaigrette
- "sesame" → sesame seeds, tahini
- "sulfites" → wine, vinegar, dried fruits (default for any wine product)
- "lupin" → lupin flour (rare)
- "mollusques" → mussels, oysters, clams, scallops, snails

CRITICAL:
- Don't invent items or ingredients not present.
- Don't HALLUCINATE allergens — only add if the ingredient is clearly mentioned.
- Keep all titles + descriptions in the original language (${langLabel}).
- Group items under their visible category headers. If no clear category, use "Carte" as default.`;
}

// === Récupération + détection du type d'un fichier menu distant ============

const MAX_FETCH_BYTES = 8 * 1024 * 1024; // 8 MB
const FETCH_TIMEOUT_MS = 12_000;

/** Media types image acceptés par l'API Anthropic. */
type AnthropicImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

type MenuSource =
  | { ok: true; kind: "image"; mediaType: AnthropicImageMediaType; base64: string }
  | { ok: true; kind: "document"; base64: string }
  | { ok: false; error: string };

/**
 * Détecte le type réel d'un fichier par ses magic-bytes (plus fiable que le
 * Content-Type, souvent absent ou "application/octet-stream" sur R2 / CDN).
 */
function sniff(
  buf: Buffer,
):
  | { kind: "image"; mediaType: AnthropicImageMediaType }
  | { kind: "document" }
  | null {
  if (buf.length < 4) return null;
  // JPEG : FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return { kind: "image", mediaType: "image/jpeg" };
  // PNG : 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return { kind: "image", mediaType: "image/png" };
  // GIF : 47 49 46
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46)
    return { kind: "image", mediaType: "image/gif" };
  // PDF : 25 50 44 46 (%PDF)
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)
    return { kind: "document" };
  // WebP : "RIFF" .... "WEBP"
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return { kind: "image", mediaType: "image/webp" };
  return null;
}

/**
 * Récupère un fichier menu (image ou PDF) depuis une URL et le renvoie en
 * base64 avec son media type. C'est NOUS qui fetchons (pas Claude via
 * `type: "url"`) : ça corrige le « bug import par url » où Claude n'arrivait
 * pas à récupérer des liens protégés / lents / non-image et renvoyait une
 * erreur cryptique. On valide aussi le type réel et la taille.
 */
async function fetchMenuSource(url: string): Promise<MenuSource> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal, redirect: "follow" });
  } catch {
    return {
      ok: false,
      error:
        "Impossible de récupérer le fichier depuis cette URL (lien inaccessible ou trop lent).",
    };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `Le lien renvoie une erreur ${res.status}. Vérifie que l'URL est bien publique.`,
    };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength === 0) {
    return { ok: false, error: "Le lien ne renvoie aucun contenu." };
  }
  if (buf.byteLength > MAX_FETCH_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 8 Mo)." };
  }

  const detected = sniff(buf);
  if (!detected) {
    return {
      ok: false,
      error:
        "Ce lien ne pointe pas vers une image ou un PDF. Utilise plutôt l'onglet « Coller le texte ».",
    };
  }

  const base64 = buf.toString("base64");
  if (detected.kind === "document") {
    return { ok: true, kind: "document", base64 };
  }
  return { ok: true, kind: "image", mediaType: detected.mediaType, base64 };
}

// === Appel Anthropic + parsing commun ======================================

async function callAnthropicForMenu(
  content: Anthropic.MessageParam["content"],
  systemPrompt: string,
): Promise<{ ok: true; data: ImportedMenu } | { ok: false; error: string }> {
  const client = getAnthropic();
  if (!client) {
    return { ok: false, error: "ANTHROPIC_API_KEY manquante côté serveur." };
  }

  let response;
  try {
    response = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: 4096,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });
  } catch (err) {
    console.error("[menu-import] Anthropic call failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error ? `Anthropic : ${err.message}` : "Erreur Anthropic",
    };
  }

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    return { ok: false, error: "Pas de réponse texte d'Anthropic." };
  }

  // Strip un éventuel fenced markdown au cas où
  const raw = block.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: "Réponse Anthropic non-JSON. Réessaie avec un menu plus lisible.",
    };
  }

  const validated = importedMenuSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: `Format détecté invalide : ${validated.error.issues[0]?.message ?? "structure inconnue"}`,
    };
  }
  return { ok: true, data: validated.data };
}

// === Insertion en base (partagée image / texte) ============================

async function persistImportedMenu(
  restoBigId: bigint,
  menu: ImportedMenu,
  remplacerExistant: boolean,
): Promise<ImportResult> {
  // Optionnel : remplace tout le menu existant
  if (remplacerExistant) {
    await prisma.categorie.deleteMany({ where: { restaurantId: restoBigId } });
  }

  // Pré-charge les codes vignettes + allergènes pour les résoudre en IDs DB
  // + la devise par défaut du resto pour les produits importés.
  const [allVignettes, allAllergenes, restoMeta] = await Promise.all([
    prisma.vignette.findMany({ select: { id: true, code: true } }),
    prisma.allergene.findMany({ select: { id: true, code: true } }),
    prisma.restaurant.findUnique({
      where: { id: restoBigId },
      select: { deviseDefault: true },
    }),
  ]);
  const deviseImport = restoMeta?.deviseDefault ?? "€";
  const vignetteByCode = new Map(allVignettes.map((v) => [v.code, v.id]));
  const allergeneByCode = new Map(allAllergenes.map((a) => [a.code, a.id]));

  // Position de départ (append après l'existant)
  const existingMax = await prisma.categorie.findFirst({
    where: { restaurantId: restoBigId, parentId: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  let categoriePosition = (existingMax?.position ?? 0) + 1;

  let nbCategories = 0;
  let nbProduits = 0;
  let nbVignettesLink = 0;
  let nbAllergenesLink = 0;

  for (const cat of menu.categories) {
    const createdCat = await prisma.categorie.create({
      data: {
        restaurantId: restoBigId,
        titre: cat.titre,
        icone: cat.icone || null,
        modeAffichage: cat.modeAffichage,
        affiche: true,
        position: categoriePosition,
        scheduleType: "always",
        scheduleDays: "1234567",
      },
    });
    nbCategories += 1;
    categoriePosition += 1;

    let produitPosition = 1;
    for (const p of cat.produits) {
      // Filtre les codes inconnus (Claude pourrait inventer)
      const validVignetteIds = (p.vignettes ?? [])
        .filter((c) => (VIGNETTE_CODES as readonly string[]).includes(c))
        .map((c) => vignetteByCode.get(c))
        .filter((id): id is number => typeof id === "number");

      const validAllergeneIds = (p.allergenes ?? [])
        .filter((c) => (ALLERGENE_CODES as readonly string[]).includes(c))
        .map((c) => allergeneByCode.get(c))
        .filter((id): id is number => typeof id === "number");

      await prisma.produit.create({
        data: {
          categorieId: createdCat.id,
          titre: p.titre,
          description: p.description || null,
          prix: p.prix ?? null,
          descriptionPrix: p.descriptionPrix || null,
          devise: deviseImport,
          statut: "affiche",
          position: produitPosition,
          scheduleType: "always",
          scheduleDays: "1234567",
          vignettes: {
            create: validVignetteIds.map((id) => ({ vignetteId: id })),
          },
          allergenes: {
            create: validAllergeneIds.map((id) => ({ allergeneId: id })),
          },
        },
      });
      nbProduits += 1;
      nbVignettesLink += validVignetteIds.length;
      nbAllergenesLink += validAllergeneIds.length;
      produitPosition += 1;
    }
  }

  // Invalidation des caches de la carte publique (ISR + data cache + Redis).
  revalidatePath("/dashboard/menu");
  revalidatePath(`/carte/${restoBigId.toString()}`);
  revalidateTag("public-menu");
  if (redis) {
    try {
      const keys = SUPPORTED_LANGS.map(
        (l) => `carte:${restoBigId.toString()}:${l}`,
      );
      await redis.del(...keys);
    } catch (err) {
      console.warn("[menu-import] redis purge failed:", err);
    }
  }

  // Pré-traduction : on traduit toute la carte importée dans les 7 langues en
  // arrière-plan (après la réponse), pour qu'aucun client ne voie une carte
  // partielle « mot par mot » au 1er scan dans une autre langue.
  after(async () => {
    try {
      const { translateRestaurantMenu } = await import(
        "@/server/translation/service"
      );
      await translateRestaurantMenu({ restaurantId: restoBigId });
      revalidateTag("public-menu");
      if (redis) {
        const keys = SUPPORTED_LANGS.map(
          (l) => `carte:${restoBigId.toString()}:${l}`,
        );
        await redis.del(...keys).catch(() => null);
      }
    } catch (err) {
      console.warn("[menu-import] pré-traduction échouée:", err);
    }
  });

  return {
    ok: true,
    data: {
      categories: nbCategories,
      produits: nbProduits,
      vignettes: nbVignettesLink,
      allergenes: nbAllergenesLink,
    },
  };
}

// === Actions publiques =====================================================

/**
 * Importe un menu depuis une PHOTO (ou un PDF) — par upload R2 ou URL collée.
 *
 * Contrairement à l'ancienne version qui passait `source: { type: "url" }`
 * (Claude devait fetcher l'URL → échouait souvent sur liens lents/protégés/
 * non-image), on récupère NOUS-MÊMES le fichier, on valide son type réel via
 * magic-bytes, et on l'envoie en base64. Supporte image + PDF.
 */
export async function importMenuFromImage(input: {
  restaurantId: string;
  imageUrl: string;
  langue?: Langue;
  remplacerExistant?: boolean;
}): Promise<ImportResult> {
  let restoBigId: bigint;
  try {
    restoBigId = BigInt(input.restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }

  const owned = await assertRestaurantOwner(restoBigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  if (!/^https?:\/\//i.test(input.imageUrl)) {
    return { ok: false, error: "URL d'image invalide (doit commencer par http(s)://)" };
  }

  const source = await fetchMenuSource(input.imageUrl);
  if (!source.ok) return { ok: false, error: source.error };

  const langue = input.langue ?? "fr";
  const langLabel = LANG_LABELS[langue];

  const fileBlock: Anthropic.ContentBlockParam =
    source.kind === "image"
      ? {
          type: "image",
          source: { type: "base64", media_type: source.mediaType, data: source.base64 },
        }
      : {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: source.base64 },
        };

  const result = await callAnthropicForMenu(
    [
      fileBlock,
      {
        type: "text",
        text: `Extract the menu from this ${langLabel} restaurant menu. Return only valid JSON as specified.`,
      },
    ],
    buildSystemPrompt(langLabel),
  );
  if (!result.ok) return { ok: false, error: result.error };

  return persistImportedMenu(restoBigId, result.data, input.remplacerExistant ?? false);
}

/**
 * Importe un menu depuis du TEXTE collé (copié depuis le site web du resto,
 * un PDF, un Word, etc.). Chemin le plus fiable : aucun OCR, aucune URL à
 * fetcher. Claude structure simplement le texte en catégories + produits.
 */
export async function importMenuFromText(input: {
  restaurantId: string;
  text: string;
  langue?: Langue;
  remplacerExistant?: boolean;
}): Promise<ImportResult> {
  let restoBigId: bigint;
  try {
    restoBigId = BigInt(input.restaurantId);
  } catch {
    return { ok: false, error: "Identifiant restaurant invalide" };
  }

  const owned = await assertRestaurantOwner(restoBigId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  const text = input.text.trim();
  if (text.length < 10) {
    return { ok: false, error: "Colle le texte de ton menu (trop court pour être analysé)." };
  }
  if (text.length > 20_000) {
    return {
      ok: false,
      error: "Texte trop long (max ~20 000 caractères). Importe en plusieurs fois.",
    };
  }

  const langue = input.langue ?? "fr";
  const langLabel = LANG_LABELS[langue];

  const result = await callAnthropicForMenu(
    [
      {
        type: "text",
        text: `Here is the raw text of a ${langLabel} restaurant menu. Structure it as JSON per the rules.\n\n---\n${text}\n---`,
      },
    ],
    buildSystemPrompt(langLabel),
  );
  if (!result.ok) return { ok: false, error: result.error };

  return persistImportedMenu(restoBigId, result.data, input.remplacerExistant ?? false);
}
