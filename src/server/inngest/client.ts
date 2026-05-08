import "server-only";
import { Inngest } from "inngest";

/** Single Inngest client. Functions register against it. */
export const inngest = new Inngest({
  id: "ruliz",
  // INNGEST_EVENT_KEY is auto-read by the SDK in prod ; absent in dev → uses CLI.
});

/** Strongly-typed event names. */
export type RulizEvent =
  | {
      name: "produit/updated";
      data: { produitId: string; restaurantId: string };
    }
  | {
      name: "categorie/updated";
      data: { categorieId: string; restaurantId: string };
    }
  | {
      name: "restaurant/menu.translate";
      data: { restaurantId: string };
    }
  | {
      name: "carte/cache.invalidate";
      data: { restaurantId: string };
    };
