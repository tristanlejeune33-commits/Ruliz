import type { SupportedLang } from "@/lib/langs";

/**
 * Dictionnaire de traductions pour la carte publique.
 *
 * 3 catégories de strings :
 *  1. UI strings statiques (boutons, labels)
 *  2. Vignettes (catalogue partagé fr/en/es/de/it/pt/zh)
 *  3. Allergènes (idem)
 *
 * Au lieu d'une lib i18n complète, on hardcode tout ici car :
 *  - Le vocabulaire est fini et stable (UE 14 allergènes, ~10 vignettes)
 *  - On évite un round-trip Anthropic pour des labels qui ne changent jamais
 *  - Les traductions sont validées humainement, pas générées
 */

type Dict<T extends string> = Record<T, Record<SupportedLang, string>>;

// ---------------------------------------------------------------------------
// UI strings statiques
// ---------------------------------------------------------------------------

export const UI = {
  allergens: {
    fr: "Allergènes :",
    en: "Allergens:",
    es: "Alérgenos:",
    de: "Allergene:",
    it: "Allergeni:",
    pt: "Alergénios:",
    zh: "过敏原：",
  },
  origine: {
    fr: "Origine",
    en: "Origin",
    es: "Origen",
    de: "Herkunft",
    it: "Origine",
    pt: "Origem",
    zh: "产地",
  },
  voirPhoto: {
    fr: "Voir photo",
    en: "View photo",
    es: "Ver foto",
    de: "Foto ansehen",
    it: "Vedi foto",
    pt: "Ver foto",
    zh: "查看照片",
  },
  voirDetails: {
    fr: "Voir détails",
    en: "View details",
    es: "Ver detalles",
    de: "Details ansehen",
    it: "Vedi dettagli",
    pt: "Ver detalhes",
    zh: "查看详情",
  },
  aMarier: {
    fr: "À marier avec :",
    en: "Pair with:",
    es: "Marida con:",
    de: "Dazu passt:",
    it: "Da abbinare a:",
    pt: "Combina com:",
    zh: "搭配推荐：",
  },
  notreCarte: {
    fr: "Notre carte",
    en: "Our menu",
    es: "Nuestra carta",
    de: "Unsere Karte",
    it: "Il nostro menu",
    pt: "A nossa carta",
    zh: "我们的菜单",
  },
  nouveau: {
    fr: "Nouveau",
    en: "New",
    es: "Nuevo",
    de: "Neu",
    it: "Nuovo",
    pt: "Novo",
    zh: "新品",
  },
  bientotDispo: {
    fr: "La carte sera bientôt disponible.",
    en: "The menu will be available soon.",
    es: "La carta estará disponible pronto.",
    de: "Die Karte ist bald verfügbar.",
    it: "Il menu sarà presto disponibile.",
    pt: "A carta estará brevemente disponível.",
    zh: "菜单即将上线。",
  },
  aucunPlat: {
    fr: "Aucun plat dans cette catégorie pour l'instant.",
    en: "No items in this category yet.",
    es: "No hay platos en esta categoría todavía.",
    de: "Noch keine Gerichte in dieser Kategorie.",
    it: "Nessun piatto in questa categoria al momento.",
    pt: "Ainda não há pratos nesta categoria.",
    zh: "此分类暂无菜品。",
  },
  jeuConcoursTitre: {
    fr: "Jeu Concours 🎉",
    en: "Prize Game 🎉",
    es: "Sorteo 🎉",
    de: "Gewinnspiel 🎉",
    it: "Concorso 🎉",
    pt: "Concurso 🎉",
    zh: "抽奖游戏 🎉",
  },
  jeuConcoursDesc: {
    fr: "Donnez votre avis sur Google ou abonnez-vous à nos réseaux pour tenter de gagner !",
    en: "Leave a Google review or follow us on social media to win prizes!",
    es: "¡Deja una reseña en Google o síguenos en redes sociales para ganar premios!",
    de: "Hinterlassen Sie eine Google-Bewertung oder folgen Sie uns, um Preise zu gewinnen!",
    it: "Lascia una recensione su Google o seguici sui social per vincere premi!",
    pt: "Deixa uma avaliação no Google ou segue-nos para ganhar prémios!",
    zh: "在谷歌留下评论或关注我们的社交媒体即可参与抽奖！",
  },
  tournerLaRoue: {
    fr: "Tourner la roue",
    en: "Spin the wheel",
    es: "Girar la rueda",
    de: "Rad drehen",
    it: "Gira la ruota",
    pt: "Girar a roda",
    zh: "转动转盘",
  },
  propulsePar: {
    fr: "Propulsé par",
    en: "Powered by",
    es: "Desarrollado por",
    de: "Bereitgestellt von",
    it: "Realizzato con",
    pt: "Criado com",
    zh: "技术支持",
  },
  tradPartielle: {
    fr: "🇫🇷 Traduction en cours · quelques éléments restent en français.",
    en: "🇫🇷 Translation in progress · some items remain in French.",
    es: "🇫🇷 Traducción en curso · algunos elementos siguen en francés.",
    de: "🇫🇷 Übersetzung im Gange · einige Elemente sind noch auf Französisch.",
    it: "🇫🇷 Traduzione in corso · alcuni elementi sono ancora in francese.",
    pt: "🇫🇷 Tradução em curso · alguns elementos permanecem em francês.",
    zh: "🇫🇷 翻译进行中 · 部分内容仍为法语。",
  },
} satisfies Dict<string>;

export type UIKey = keyof typeof UI;

export function t(key: UIKey, lang: SupportedLang): string {
  return UI[key][lang] ?? UI[key].fr;
}

// ---------------------------------------------------------------------------
// Vignettes (codes du seed)
// ---------------------------------------------------------------------------

export const VIGNETTE_LABELS: Record<string, Partial<Record<SupportedLang, string>>> = {
  vegetarien: {
    fr: "Végétarien",
    en: "Vegetarian",
    es: "Vegetariano",
    de: "Vegetarisch",
    it: "Vegetariano",
    pt: "Vegetariano",
    zh: "素食",
  },
  vegan: {
    fr: "Vegan",
    en: "Vegan",
    es: "Vegano",
    de: "Vegan",
    it: "Vegano",
    pt: "Vegan",
    zh: "纯素",
  },
  sans_gluten: {
    fr: "Sans gluten",
    en: "Gluten-free",
    es: "Sin gluten",
    de: "Glutenfrei",
    it: "Senza glutine",
    pt: "Sem glúten",
    zh: "无麸质",
  },
  fait_maison: {
    fr: "Fait maison",
    en: "Homemade",
    es: "Casero",
    de: "Hausgemacht",
    it: "Fatto in casa",
    pt: "Caseiro",
    zh: "自制",
  },
  epice: {
    fr: "Épicé",
    en: "Spicy",
    es: "Picante",
    de: "Scharf",
    it: "Piccante",
    pt: "Picante",
    zh: "辣味",
  },
  bio: {
    fr: "Bio",
    en: "Organic",
    es: "Ecológico",
    de: "Bio",
    it: "Biologico",
    pt: "Biológico",
    zh: "有机",
  },
  local: {
    fr: "Producteur local",
    en: "Local producer",
    es: "Productor local",
    de: "Lokaler Erzeuger",
    it: "Produttore locale",
    pt: "Produtor local",
    zh: "本地生产",
  },
  signature: {
    fr: "Plat signature",
    en: "Signature dish",
    es: "Plato estrella",
    de: "Signature-Gericht",
    it: "Piatto signature",
    pt: "Prato assinatura",
    zh: "招牌菜",
  },
};

export function vignetteLabel(
  code: string,
  fallbackFr: string,
  lang: SupportedLang,
): string {
  return VIGNETTE_LABELS[code]?.[lang] ?? fallbackFr;
}

// ---------------------------------------------------------------------------
// Allergènes (codes du seed)
// ---------------------------------------------------------------------------

/**
 * Emoji par allergène · pour rendre la liste plus visuelle/sympa.
 */
export const ALLERGENE_EMOJI: Record<string, string> = {
  gluten: "🌾",
  crustaces: "🦐",
  oeufs: "🥚",
  poissons: "🐟",
  arachides: "🥜",
  soja: "🫘",
  lait: "🥛",
  fruits_a_coque: "🌰",
  celeri: "🥬",
  moutarde: "🌭",
  sesame: "🫓",
  sulfites: "🍷",
  lupin: "🌱",
  mollusques: "🦪",
};

/**
 * Emoji par vignette · pour les pills colorées.
 */
export const VIGNETTE_EMOJI: Record<string, string> = {
  vegetarien: "🥗",
  vegan: "🌱",
  sans_gluten: "🚫🌾",
  fait_maison: "🏠",
  epice: "🌶️",
  bio: "🍃",
  local: "📍",
  signature: "⭐",
};

export const ALLERGENE_LABELS: Record<string, Partial<Record<SupportedLang, string>>> = {
  gluten: {
    fr: "Gluten",
    en: "Gluten",
    es: "Gluten",
    de: "Gluten",
    it: "Glutine",
    pt: "Glúten",
    zh: "麸质",
  },
  crustaces: {
    fr: "Crustacés",
    en: "Crustaceans",
    es: "Crustáceos",
    de: "Krebstiere",
    it: "Crostacei",
    pt: "Crustáceos",
    zh: "甲壳类",
  },
  oeufs: {
    fr: "Œufs",
    en: "Eggs",
    es: "Huevos",
    de: "Eier",
    it: "Uova",
    pt: "Ovos",
    zh: "蛋类",
  },
  poissons: {
    fr: "Poissons",
    en: "Fish",
    es: "Pescado",
    de: "Fisch",
    it: "Pesce",
    pt: "Peixe",
    zh: "鱼类",
  },
  arachides: {
    fr: "Arachides",
    en: "Peanuts",
    es: "Cacahuetes",
    de: "Erdnüsse",
    it: "Arachidi",
    pt: "Amendoins",
    zh: "花生",
  },
  soja: {
    fr: "Soja",
    en: "Soy",
    es: "Soja",
    de: "Soja",
    it: "Soia",
    pt: "Soja",
    zh: "大豆",
  },
  lait: {
    fr: "Lait",
    en: "Milk",
    es: "Leche",
    de: "Milch",
    it: "Latte",
    pt: "Leite",
    zh: "牛奶",
  },
  fruits_a_coque: {
    fr: "Fruits à coque",
    en: "Tree nuts",
    es: "Frutos secos",
    de: "Schalenfrüchte",
    it: "Frutta a guscio",
    pt: "Frutos de casca rija",
    zh: "坚果",
  },
  celeri: {
    fr: "Céleri",
    en: "Celery",
    es: "Apio",
    de: "Sellerie",
    it: "Sedano",
    pt: "Aipo",
    zh: "芹菜",
  },
  moutarde: {
    fr: "Moutarde",
    en: "Mustard",
    es: "Mostaza",
    de: "Senf",
    it: "Senape",
    pt: "Mostarda",
    zh: "芥末",
  },
  sesame: {
    fr: "Sésame",
    en: "Sesame",
    es: "Sésamo",
    de: "Sesam",
    it: "Sesamo",
    pt: "Sésamo",
    zh: "芝麻",
  },
  sulfites: {
    fr: "Sulfites",
    en: "Sulfites",
    es: "Sulfitos",
    de: "Sulfite",
    it: "Solfiti",
    pt: "Sulfitos",
    zh: "亚硫酸盐",
  },
  lupin: {
    fr: "Lupin",
    en: "Lupin",
    es: "Altramuces",
    de: "Lupinen",
    it: "Lupini",
    pt: "Tremoço",
    zh: "羽扇豆",
  },
  mollusques: {
    fr: "Mollusques",
    en: "Molluscs",
    es: "Moluscos",
    de: "Weichtiere",
    it: "Molluschi",
    pt: "Moluscos",
    zh: "软体动物",
  },
};

export function allergeneLabel(
  code: string,
  fallbackFr: string,
  lang: SupportedLang,
): string {
  return ALLERGENE_LABELS[code]?.[lang] ?? fallbackFr;
}
