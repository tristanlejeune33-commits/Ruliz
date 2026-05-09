"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { getAnthropic } from "@/server/translation/anthropic";

export type ImportResult =
  | { ok: true; data: { categories: number; produits: number } }
  | { ok: false; error: string };

/**
 * Schéma JSON attendu en réponse d'Anthropic Vision.
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
            }),
          )
          .default([]),
      }),
    )
    .min(1, "Aucune catégorie détectée dans l'image"),
});

const VISION_MODEL = "claude-haiku-4-5-20251001";

/**
 * Demande à Claude Vision d'analyser une image de menu papier (ou PDF page)
 * et de retourner un JSON structuré (catégories + produits + prix).
 *
 * On utilise Haiku 4.5 qui supporte la vision et coûte ~10x moins cher que
 * Sonnet pour cette tâche. La précision est suffisante pour des menus papier
 * clairement structurés.
 *
 * Limites :
 *  - Image max ~5 MB (taille raisonnable pour un menu)
 *  - Si l'image est floue ou multi-colonnes complexes, certains produits
 *    peuvent être manqués → l'utilisateur peut éditer après import
 */
export async function importMenuFromImage(input: {
  restaurantId: string;
  imageUrl: string;
  /** Langue dans laquelle le menu est rédigé (par défaut FR) */
  langue?: "fr" | "en" | "es" | "de" | "it" | "pt" | "zh";
  /** Si true, écrase tout le menu existant. Sinon append en plus. */
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

  const client = getAnthropic();
  if (!client) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY manquante côté serveur.",
    };
  }

  if (!/^https?:\/\//i.test(input.imageUrl)) {
    return { ok: false, error: "URL d'image invalide (doit commencer par https://)" };
  }

  const langue = input.langue ?? "fr";
  const langLabels: Record<typeof langue, string> = {
    fr: "French",
    en: "English",
    es: "Spanish",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    zh: "Chinese",
  };

  const systemPrompt = `You are an OCR assistant specialized in restaurant menus.
Analyze the menu image carefully and extract its full structure as VALID JSON.

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
          "descriptionPrix": ""
        }
      ]
    }
  ]
}

Rules:
- "icone" should be a Lucide icon name in lowercase (salad, beef, wine, coffee, dessert, fish, pizza, etc.) — null/empty if unsure
- "modeAffichage" must be exactly one of: "liste" | "grille" | "carrousel" (default "liste")
- "prix" is a number (decimal). Use null if no price visible.
- "descriptionPrix" is for things like "12,5cl / 75cl" or "par personne" — empty string if N/A.
- Keep all titles + descriptions in the original language (${langLabels[langue]}).
- Don't invent items not visible in the image.
- Group items under their visible category headers. If no clear category, use "Carte" as default.`;

  let response;
  try {
    response = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: 4096,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: input.imageUrl },
            },
            {
              type: "text",
              text: `Extract the menu from this ${langLabels[langue]} restaurant menu image. Return only valid JSON as specified.`,
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.error("[importMenuFromImage] Anthropic call failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Anthropic Vision : ${err.message}`
          : "Erreur Anthropic Vision",
    };
  }

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    return { ok: false, error: "Pas de réponse texte d'Anthropic" };
  }

  // Strip un éventuel fenced markdown au cas où
  const raw = block.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: "Réponse Anthropic non-JSON. Réessaye avec une image plus nette.",
    };
  }

  const validated = importedMenuSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: `Format JSON invalide : ${validated.error.issues[0]?.message ?? "structure inconnue"}`,
    };
  }

  // Optionnel : remplace tout le menu existant
  if (input.remplacerExistant) {
    await prisma.categorie.deleteMany({
      where: { restaurantId: restoBigId },
    });
  }

  // Récupère la position de départ (append après l'existant)
  const existingMax = await prisma.categorie.findFirst({
    where: { restaurantId: restoBigId, parentId: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  let categoriePosition = (existingMax?.position ?? 0) + 1;

  let nbCategories = 0;
  let nbProduits = 0;

  for (const cat of validated.data.categories) {
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
      await prisma.produit.create({
        data: {
          categorieId: createdCat.id,
          titre: p.titre,
          description: p.description || null,
          prix: p.prix ?? null,
          descriptionPrix: p.descriptionPrix || null,
          devise: "€",
          statut: "affiche",
          position: produitPosition,
        },
      });
      nbProduits += 1;
      produitPosition += 1;
    }
  }

  revalidatePath("/dashboard/menu");
  revalidatePath(`/carte/${restoBigId.toString()}`);

  return {
    ok: true,
    data: { categories: nbCategories, produits: nbProduits },
  };
}
