import "server-only";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import type { SupportedLang } from "@/lib/langs";
import { isCategorieVisibleNow, getRestaurantLocalParts } from "@/lib/schedule";
import { getPlanConfig } from "@/lib/plan-config";
import type { Plan } from "@/lib/plans";

export { isSupportedLang } from "@/lib/langs";

const CACHE_TTL_SECONDS = 60 * 30; // 30 min Redis cache (ISR layer above is 60s)

export type PublicMenu = {
  restaurant: {
    id: string;
    nom: string;
    description: string | null;
    logoUrl: string | null;
    banniereUrl: string | null;
    /** Devise par défaut affichée si un produit n'a pas la sienne. */
    deviseDefault: string;
    /** Langue native dans laquelle le restaurateur a saisi la carte */
    langueNative: SupportedLang;
    /** light | dark */
    theme: "light" | "dark";
    /** modern | editorial | elegant pilote le choix de typo display. */
    fontStyle: "modern" | "editorial" | "elegant";
    /** Couleur d'accent (CTA, boutons). */
    couleurPrimaire: string | null;
    couleurSecondaire: string | null;
    /** Couleur de fond de la carte. */
    couleurFond: string | null;
    /** Couleur du titre du restaurant. */
    couleurTexteTitre: string | null;
    /** Couleur des titres de catégories. */
    couleurCategorie: string | null;
    /** Afficher la carte Google Maps dans le footer (opt-in restaurateur). */
    showMap: boolean;
    /** Afficher le nom du restaurant dans l'en-tête (default true). */
    showName: boolean;
    ville: string | null;
    pays: string | null;
    adresse: string | null;
    codePostal: string | null;
    telephone: string | null;
    email: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    siteWeb: string | null;
    googleReviewUrl: string | null;
    plan: "freemium" | "pro" | "premium";
  };
  /** Retirer le watermark « Propulsé par Ruliz » (feature removeBranding du
      plan, selon la matrice admin). */
  removeBranding: boolean;
  /** Jeu roulette actif si configuré (et dans la fenêtre date_debut/fin). */
  jeu: {
    id: string;
    cta: string;
    lots: Array<{
      label: string;
      probabilite: number;
      /** URL d'image/logo optionnelle (R2 ou externe) */
      imageUrl?: string;
    }>;
    requireGoogleReview: boolean;
    /** Si true, le modal s'ouvre automatiquement à l'ouverture de la carte */
    autoPopup: boolean;
    /** Délai en secondes avant l'auto-popup */
    autoPopupDelaySec: number;
  } | null;
  /** Pop-up actif à la date courante. */
  popup: {
    id: string;
    titre: string;
    description: string | null;
    imageUrl: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
  } | null;
  lang: SupportedLang;
  /** True if at least one fallback (FR) was used because translation is missing. */
  partiallyTranslated: boolean;
  categories: Array<MenuCategory>;
};

/**
 * Une catégorie ou sous-catégorie. Les sous-catégories sont identifiées par
 * leur titre/icone et listées dans `subCategories`. Une sous-catégorie peut
 * elle-même avoir des produits directement dans `produits`.
 */
export interface MenuCategory {
  id: string;
  titre: string;
  icone: string | null;
  modeAffichage: "liste" | "grille" | "carrousel";
  /** Couleur custom (override theme). NULL = utilise theme.primary */
  couleur: string | null;
  /** Type de créneau ("always", "happy_hour", etc.) exposé pour effet visuel */
  scheduleType: string;
  produits: Array<MenuProduit>;
  subCategories: Array<MenuCategory>;
}

export interface MenuProduit {
  id: string;
  titre: string;
  description: string | null;
  descriptionPrix: string | null;
  imageUrl: string | null;
  prix: number | null;
  devise: string;
  /** Variantes de prix pour les produits multi-volumes/tailles. null si
      pas de variante (utiliser `prix` simple alors). */
  prixVariantes: Array<{ label: string; prix: number }> | null;
  estNouveau: boolean;
  origine: string | null;
  titreRemarque: string | null;
  descriptionRemarque: string | null;
  vignettes: Array<{ code: string; labelFr: string; icone: string | null }>;
  allergenes: Array<{ code: string; labelFr: string }>;
  suggestionsIds: string[];
}

function cacheKey(restaurantId: bigint | string, lang: SupportedLang) {
  return `carte:${restaurantId.toString()}:${lang}`;
}

/**
 * Loads the menu of a restaurant, translated to `lang`, with 4-level cache:
 *   L1 Cloudflare (HTTP edge) handled in route headers
 *   L2 Next ISR handled by `revalidate` in the page
 *   L3 Redis handled here (`carte:{id}:{lang}`)
 *   L4 DB cache `produit_translations` and `categorie_translations`
 *
 * If a translation is missing for some product/categorie, fall back to FR
 * and flag `partiallyTranslated`. The Inngest worker fills the gaps async.
 */
export async function getPublicMenu(
  restaurantId: bigint,
  lang: SupportedLang,
): Promise<PublicMenu | null> {
  // L3 Redis lookup skip si client en mode "end" (connexion abandonnée).
  // L'app continue sans cache, on retombe sur la DB.
  if (redis && redis.status !== "end" && redis.status !== "close") {
    try {
      const cached = await redis.get(cacheKey(restaurantId, lang));
      if (cached) {
        return JSON.parse(cached) as PublicMenu;
      }
    } catch {
      // Erreur Redis = best-effort, déjà loggée 1x par lib/redis.ts.
      // On ne re-log pas ici pour éviter le spam des logs Railway.
    }
  }

  // L4 DB query with translations
  const [restaurant, jeuRow, popupRow] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        nom: true,
        statut: true,
        description: true,
        logoUrl: true,
        banniereUrl: true,
        deviseDefault: true,
        langueNative: true,
        theme: true,
        fontStyle: true,
        couleurPrimaire: true,
        couleurSecondaire: true,
        couleurFond: true,
        couleurTexteTitre: true,
        couleurCategorie: true,
        showMap: true,
        showName: true,
        ville: true,
        pays: true,
        adresse: true,
        codePostal: true,
        telephone: true,
        email: true,
        facebookUrl: true,
        instagramUrl: true,
        tiktokUrl: true,
        siteWeb: true,
        googleReviewUrl: true,
        plan: true,
        lunchStart: true,
        lunchEnd: true,
        dinnerStart: true,
        dinnerEnd: true,
        happyHourStart: true,
        happyHourEnd: true,
      },
    }),
    prisma.jeu.findFirst({
      where: {
        restaurantId,
        actif: true,
        // Filtre par fenêtre de planification : actif si pas de borne ou
        // si on est dans la fenêtre [dateDebut, dateFin].
        AND: [
          {
            OR: [
              { dateDebut: null },
              { dateDebut: { lte: new Date() } },
            ],
          },
          {
            OR: [
              { dateFin: null },
              { dateFin: { gte: new Date() } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    // On fetch jusqu'à 5 popups matching dates + actif puis on filtre côté
    // JS pour le planning hebdo (bitmap jours) + plage horaire conditions
    // qu'il serait laborieux d'exprimer en SQL pur.
    prisma.popup.findMany({
      where: {
        restaurantId,
        actif: true,
        OR: [
          { dateDebut: null, dateFin: null },
          { dateDebut: { lte: new Date() }, dateFin: { gte: new Date() } },
          { dateDebut: { lte: new Date() }, dateFin: null },
          { dateDebut: null, dateFin: { gte: new Date() } },
        ],
      },
      orderBy: { id: "desc" },
      take: 5,
    }),
  ]);
  if (!restaurant) return null;

  // Restaurant suspendu (paiements échoués) → on retourne null pour qu'il
  // soit traité comme inexistant (page 404 / "Service indisponible").
  // Le restaurateur doit régler son moyen de paiement pour réactiver.
  if (restaurant.statut === "suspendu") {
    console.log(
      `[getPublicMenu] restaurant ${restaurantId} is suspended blocking carte`,
    );
    return null;
  }

  type JeuConfigShape = {
    cta?: string;
    lots?: Array<{
      label: string;
      probabilite: number;
      imageUrl?: string;
    }>;
    require_google_review?: boolean;
  };
  const jeuConfig = (jeuRow?.configJson as unknown as JeuConfigShape | null) ?? null;
  const jeu =
    jeuRow && jeuConfig?.lots && jeuConfig.lots.length > 0
      ? {
          id: jeuRow.id.toString(),
          cta: jeuConfig.cta ?? "",
          lots: jeuConfig.lots,
          requireGoogleReview: jeuConfig.require_google_review ?? false,
          autoPopup: jeuRow.autoPopup ?? false,
          autoPopupDelaySec: jeuRow.autoPopupDelaySec ?? 3,
        }
      : null;

  // Filtre planning hebdo + plage horaire : on prend le PREMIER popup qui
  // matche le jour courant + l'heure courante (parmi les dates valides).
  // Logique :
  //   - joursActifs null OU bit du jour courant set → jour OK
  //   - heureDebut/heureFin null → toute la journée
  //   - sinon heureDebut <= now-time <= heureFin (comparaison string "HH:MM")
  //
  // CRUCIAL : on calcule "maintenant" dans le fuseau horaire DU RESTO et non
  // celui du serveur Railway (UTC). Sinon un resto à Auckland (UTC+13) voit
  // ses popups "lundi 12h-14h" déclenchés à 23h-01h UTC, donc jamais visibles
  // depuis son point de vue local. La récup du TZ est anticipée ici (le bloc
  // de filtrage des catégories plus bas en aura aussi besoin).
  const restoTimezone =
    (restaurant as { timezone?: string }).timezone || "Europe/Paris";
  const localParts = getRestaurantLocalParts(restoTimezone);
  const currentDayBit = 1 << localParts.jsDay; // 0=dim, 6=sam
  const currentTimeStr = localParts.timeHHMM;
  // Cast vers un type incluant les colonnes Stripe/schedule le client
  // Prisma local peut ne pas avoir été régénéré (problème Windows file lock).
  // Les colonnes existent en DB, Prisma findMany les retourne au runtime.
  const popupRowsTyped = popupRow as unknown as Array<
    (typeof popupRow)[number] & {
      joursActifs: number | null;
      heureDebut: string | null;
      heureFin: string | null;
    }
  >;
  const activeNowPopup = popupRowsTyped.find((p) => {
    // Jour de la semaine
    if (p.joursActifs !== null && p.joursActifs > 0) {
      if ((p.joursActifs & currentDayBit) !== currentDayBit) return false;
    }
    // Plage horaire
    if (p.heureDebut && p.heureFin) {
      if (currentTimeStr < p.heureDebut || currentTimeStr > p.heureFin) {
        return false;
      }
    }
    return true;
  });

  const popup = activeNowPopup
    ? {
        id: activeNowPopup.id.toString(),
        titre: activeNowPopup.titre ?? "",
        description: activeNowPopup.description,
        imageUrl: activeNowPopup.imageUrl,
        ctaLabel: activeNowPopup.ctaLabel,
        ctaUrl: activeNowPopup.ctaUrl,
      }
    : null;

  // Langue native du resto : on tape la version originale si lang === sourceLang
  const sourceLang = (restaurant.langueNative ?? "fr") as SupportedLang;
  const isSourceLang = lang === sourceLang;

  // Récupère TOUTES les catégories du restaurant (top-level + sous-catégories)
  // en une seule query, puis on les imbrique côté code.
  const allCategoriesRaw = await prisma.categorie.findMany({
    where: {
      restaurantId,
      affiche: true,
    },
    orderBy: { position: "asc" },
    include: {
      produits: {
        where: { statut: "affiche" },
        orderBy: { position: "asc" },
        include: {
          vignettes: { include: { vignette: true } },
          allergenes: { include: { allergene: true } },
          suggestionsIn: { orderBy: { position: "asc" } },
          translations: isSourceLang ? false : { where: { lang } },
        },
      },
      translations: isSourceLang ? false : { where: { lang } },
    },
  });

  // Filtre par créneau d'affichage (carte midi/soir/happy hour/custom)
  // Une catégorie sans schedule_type est "always" → toujours visible.
  // On passe les horaires customisés du resto pour que "lunch"/"dinner"/
  // "happy_hour" résolvent les heures depuis sa config.
  const restoHours = {
    lunchStart: restaurant.lunchStart,
    lunchEnd: restaurant.lunchEnd,
    dinnerStart: restaurant.dinnerStart,
    dinnerEnd: restaurant.dinnerEnd,
    happyHourStart: restaurant.happyHourStart,
    happyHourEnd: restaurant.happyHourEnd,
  };
  // restoTimezone est déjà extrait plus haut (avant le filtre popup).

  const categoriesRaw = allCategoriesRaw.filter((cat) =>
    isCategorieVisibleNow(
      {
        scheduleType: cat.scheduleType ?? "always",
        scheduleStart: cat.scheduleStart ?? null,
        scheduleEnd: cat.scheduleEnd ?? null,
        scheduleDays: cat.scheduleDays ?? "1234567",
      },
      undefined,
      restoHours,
      restoTimezone,
    ),
  );

  let partiallyTranslated = false;

  /** Mappe une catégorie Prisma → MenuCategory (récursivement vide pour subCategories). */
  const mapCategorie = (cat: (typeof categoriesRaw)[number]): MenuCategory => {
    const catTitre =
      !isSourceLang && cat.translations && cat.translations[0]?.titre
        ? cat.translations[0].titre
        : cat.titre;
    if (!isSourceLang && (!cat.translations || cat.translations.length === 0)) {
      partiallyTranslated = true;
    }

    return {
      id: cat.id.toString(),
      titre: catTitre,
      icone: cat.icone,
      modeAffichage: cat.modeAffichage,
      couleur: cat.couleur ?? null,
      scheduleType: cat.scheduleType ?? "always",
      subCategories: [], // rempli ensuite
      // Filtre les produits par leur propre créneau (peut override la catégorie)
      produits: cat.produits
        .filter((p) =>
          isCategorieVisibleNow(
            {
              scheduleType: p.scheduleType ?? "always",
              scheduleStart: p.scheduleStart ?? null,
              scheduleEnd: p.scheduleEnd ?? null,
              scheduleDays: p.scheduleDays ?? "1234567",
            },
            undefined,
            restoHours,
            restoTimezone,
          ),
        )
        .map((p) => {
        const trad = !isSourceLang ? p.translations?.[0] : undefined;
        if (!isSourceLang && !trad) partiallyTranslated = true;

        return {
          id: p.id.toString(),
          titre: trad?.titre ?? p.titre,
          description: trad?.description ?? p.description,
          descriptionPrix: trad?.descriptionPrix ?? p.descriptionPrix,
          imageUrl: p.imageUrl,
          prix: p.prix !== null ? Number(p.prix) : null,
          // Un restaurant = UNE devise. La devise par défaut du resto fait
          // foi (CHF, NZD, $…) : elle est SOURCE DE VÉRITÉ ici, sinon les
          // produits gardaient leur devise figée ("€") et le changement de
          // devise dans les réglages ne s'affichait jamais. `produit.devise`
          // ne sert plus que de filet si le resto n'a aucune devise définie.
          devise: restaurant.deviseDefault ?? p.devise ?? "€",
          // Variantes de prix : on parse le JSON Prisma (peut être null,
          // tableau ou autre selon stale du client). Filter strict pour
          // exposer seulement les entrées bien formées { label, prix }.
          prixVariantes: (() => {
            const raw = (p as unknown as { prixVariantes?: unknown })
              .prixVariantes;
            if (!Array.isArray(raw)) return null;
            const valid = raw
              .filter(
                (v): v is { label: string; prix: number } =>
                  typeof v === "object" &&
                  v !== null &&
                  typeof (v as { label?: unknown }).label === "string" &&
                  typeof (v as { prix?: unknown }).prix === "number",
              )
              .map((v) => ({ label: v.label, prix: v.prix }));
            return valid.length > 0 ? valid : null;
          })(),
          estNouveau: p.estNouveau,
          origine: trad?.origine ?? p.origine,
          titreRemarque: trad?.titreRemarque ?? p.titreRemarque,
          descriptionRemarque: trad?.descriptionRemarque ?? p.descriptionRemarque,
          vignettes: p.vignettes.map((v) => ({
            code: v.vignette.code,
            labelFr: v.vignette.labelFr,
            icone: v.vignette.icone,
          })),
          allergenes: p.allergenes.map((a) => ({
            code: a.allergene.code,
            labelFr: a.allergene.labelFr,
          })),
          suggestionsIds: p.suggestionsIn.map((s) => s.suggestionId.toString()),
        };
      }),
    };
  };

  // Map id → MenuCategory pour reconstruire la hiérarchie
  const byId = new Map<string, MenuCategory>();
  for (const cat of categoriesRaw) {
    byId.set(cat.id.toString(), mapCategorie(cat));
  }

  // Imbrique : pour chaque catégorie avec parentId, push dans subCategories du parent
  const categories: MenuCategory[] = [];
  for (const cat of categoriesRaw) {
    const mapped = byId.get(cat.id.toString())!;
    if (cat.parentId) {
      const parent = byId.get(cat.parentId.toString());
      if (parent) {
        parent.subCategories.push(mapped);
      } else {
        // Parent absent (peut-être désactivé) → on l'affiche en top-level
        categories.push(mapped);
      }
    } else {
      categories.push(mapped);
    }
  }

  // Watermark « Propulsé par Ruliz » : suit la feature removeBranding du plan
  // (matrice admin). Calculé sur cache miss uniquement (la valeur est ensuite
  // mise en cache Redis avec le reste du menu).
  const planCfg = await getPlanConfig();
  const planKey = (restaurant.plan as Plan) ?? "freemium";
  const removeBranding = planCfg[planKey]?.features.removeBranding ?? false;

  const menu: PublicMenu = {
    removeBranding,
    restaurant: {
      id: restaurant.id.toString(),
      nom: restaurant.nom,
      description: restaurant.description,
      logoUrl: restaurant.logoUrl,
      banniereUrl: restaurant.banniereUrl,
      deviseDefault: restaurant.deviseDefault ?? "€",
      langueNative: (restaurant.langueNative ?? "fr") as SupportedLang,
      theme: (restaurant.theme as "light" | "dark") ?? "light",
      fontStyle:
        (restaurant.fontStyle as "modern" | "editorial" | "elegant") ?? "editorial",
      couleurPrimaire: restaurant.couleurPrimaire,
      couleurSecondaire: restaurant.couleurSecondaire,
      couleurFond: restaurant.couleurFond,
      couleurTexteTitre: restaurant.couleurTexteTitre,
      couleurCategorie: restaurant.couleurCategorie,
      showMap: restaurant.showMap ?? false,
      showName: restaurant.showName ?? true,
      ville: restaurant.ville,
      pays: restaurant.pays,
      adresse: restaurant.adresse,
      codePostal: restaurant.codePostal,
      telephone: restaurant.telephone,
      email: restaurant.email,
      facebookUrl: restaurant.facebookUrl,
      instagramUrl: restaurant.instagramUrl,
      tiktokUrl: restaurant.tiktokUrl,
      siteWeb: restaurant.siteWeb,
      googleReviewUrl: restaurant.googleReviewUrl,
      plan: restaurant.plan,
    },
    jeu,
    popup,
    lang,
    partiallyTranslated,
    categories,
  };

  // Write to Redis (best-effort, don't block response). Skip si client en
  // mode "end" pas la peine d'envoyer dans un socket fermé.
  if (redis && redis.status !== "end" && redis.status !== "close") {
    redis
      .set(cacheKey(restaurantId, lang), JSON.stringify(menu), "EX", CACHE_TTL_SECONDS)
      .catch(() => {
        // Best-effort, erreurs déjà loggées 1x par lib/redis.ts. Silence ici.
      });
  }

  return menu;
}

/**
 * Fast existence check for ISR generateStaticParams.
 */
export async function listPublishableRestaurantIds(): Promise<string[]> {
  const list = await prisma.restaurant.findMany({
    where: { statut: "actif", plan: { in: ["pro", "premium"] } },
    select: { id: true },
  });
  return list.map((r) => r.id.toString());
}
