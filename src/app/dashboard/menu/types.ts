import type { Serialized } from "@/lib/serialize";
import type {
  MenuRefData,
  MenuTree,
} from "@/server/dashboard/menu-queries";

export type SerializedMenu = Serialized<MenuTree>;
export type SerializedCategorie = SerializedMenu[number];
export type SerializedSubCategorie = SerializedCategorie["children"][number];
/**
 * Forme commune top-level / sous-catégorie : tout ce qu'on manipule dans
 * l'éditeur sans avoir à se soucier du niveau hiérarchique.
 */
export type FlatCategorie = SerializedSubCategorie;
export type SerializedProduit = SerializedCategorie["produits"][number];
export type SerializedVignettes = Serialized<MenuRefData["vignettes"]>;
export type SerializedAllergenes = Serialized<MenuRefData["allergenes"]>;
