import type { Serialized } from "@/lib/serialize";
import type {
  MenuRefData,
  MenuTree,
} from "@/server/dashboard/menu-queries";

export type SerializedMenu = Serialized<MenuTree>;
export type SerializedCategorie = SerializedMenu[number];
export type SerializedProduit = SerializedCategorie["produits"][number];
export type SerializedVignettes = Serialized<MenuRefData["vignettes"]>;
export type SerializedAllergenes = Serialized<MenuRefData["allergenes"]>;
