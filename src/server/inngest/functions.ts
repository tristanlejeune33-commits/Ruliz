import "server-only";
import { redis } from "@/lib/redis";
import {
  SUPPORTED_LANGS,
  type SupportedLang,
} from "@/server/translation/anthropic";
import {
  translateCategorieToLang,
  translateProduitToLang,
  translateRestaurantMenu,
} from "@/server/translation/service";
import { inngest } from "./client";
import {
  cronOutreachEnqueueQueued,
  onProspectEnrich,
  onProspectGenerate,
} from "./outreach-functions";

const TARGET_LANGS = SUPPORTED_LANGS.filter((l) => l !== "fr");

async function invalidateRedisForRestaurant(restaurantId: string) {
  if (!redis) return 0;
  const keys = await redis.keys(`carte:${restaurantId}:*`);
  if (keys.length > 0) await redis.del(...keys);
  return keys.length;
}

/**
 * When a produit is updated/created, translate it to all target langs.
 */
export const onProduitUpdated = inngest.createFunction(
  {
    id: "translate-produit",
    retries: 3,
    triggers: [{ event: "produit/updated" }],
  },
  async ({ event, step }) => {
    const produitIdStr = event.data.produitId as string;
    const restaurantIdStr = event.data.restaurantId as string;
    const produitId = BigInt(produitIdStr);

    for (const lang of TARGET_LANGS) {
      await step.run(`translate-${lang}`, async () => {
        return translateProduitToLang({
          produitId,
          targetLang: lang as SupportedLang,
        });
      });
    }

    await step.run("invalidate-redis", () =>
      invalidateRedisForRestaurant(restaurantIdStr),
    );

    return { produitId: produitIdStr, langsTranslated: TARGET_LANGS.length };
  },
);

/**
 * When a categorie is updated, retranslate it.
 */
export const onCategorieUpdated = inngest.createFunction(
  {
    id: "translate-categorie",
    retries: 3,
    triggers: [{ event: "categorie/updated" }],
  },
  async ({ event, step }) => {
    const categorieId = BigInt(event.data.categorieId as string);
    const restaurantIdStr = event.data.restaurantId as string;

    for (const lang of TARGET_LANGS) {
      await step.run(`translate-${lang}`, async () => {
        return translateCategorieToLang({
          categorieId,
          targetLang: lang as SupportedLang,
        });
      });
    }

    await step.run("invalidate-redis", () =>
      invalidateRedisForRestaurant(restaurantIdStr),
    );

    return { categorieId: event.data.categorieId };
  },
);

/**
 * Bulk translate the entire menu of a restaurant.
 */
export const onMenuTranslate = inngest.createFunction(
  {
    id: "translate-restaurant-menu",
    retries: 1,
    triggers: [{ event: "restaurant/menu.translate" }],
  },
  async ({ event, step }) => {
    const restaurantIdStr = event.data.restaurantId as string;
    const restaurantId = BigInt(restaurantIdStr);

    const result = await step.run("translate-menu", () =>
      translateRestaurantMenu({ restaurantId }),
    );

    await step.run("invalidate-redis", () =>
      invalidateRedisForRestaurant(restaurantIdStr),
    );

    return result;
  },
);

/**
 * Manual cache invalidation event.
 */
export const onCacheInvalidate = inngest.createFunction(
  {
    id: "invalidate-cache",
    retries: 1,
    triggers: [{ event: "carte/cache.invalidate" }],
  },
  async ({ event }) => {
    const invalidated = await invalidateRedisForRestaurant(
      event.data.restaurantId as string,
    );
    return { invalidated };
  },
);

/**
 * Cron quotidien : automatisations SMS d'anniversaire.
 *
 * Tourne tous les jours à 9h UTC (10h heure FR en hiver, 11h en été).
 * Pour chaque restaurant ayant une automatisation "birthday" active :
 *   1. Cherche les clients dont c'est l'anniversaire aujourd'hui
 *   2. Vérifie le solde SMS du resto
 *   3. Pour chaque client éligible : envoie le SMS personnalisé
 *      et décrémente le solde
 *
 * On utilise du SQL brut pour rester safe vis-à-vis du client Prisma stale.
 */
export const dailySmsBirthdayAutomation = inngest.createFunction(
  {
    id: "daily-sms-birthday",
    retries: 2,
    // Cron Inngest : tous les jours à 9h UTC (10h FR hiver / 11h FR été)
    triggers: [{ cron: "0 9 * * *" }],
  },
  async ({ step }: { step: { run: <T>(name: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const { prisma } = await import("@/lib/db");
    const { sendSms, normalizeFrenchPhone } = await import("@/lib/brevo");

    // 1. Liste tous les triggers "birthday" actifs
    const automations = (await prisma.$queryRawUnsafe(`
      SELECT id, restaurant_id AS "restaurantId", message_template AS "messageTemplate", send_hour AS "sendHour"
      FROM sms_automations
      WHERE trigger_type = 'birthday' AND active = TRUE
    `)) as Array<{
      id: bigint;
      restaurantId: bigint;
      messageTemplate: string;
      sendHour: number;
    }>;

    let totalSent = 0;
    let totalSkipped = 0;

    for (const auto of automations) {
      const sentForResto = await step.run(
        `process-resto-${auto.restaurantId}`,
        async () => {
          // 2. Liste des clients dont c'est l'anniversaire aujourd'hui
          const clients = (await prisma.$queryRawUnsafe(
            `SELECT id, prenom, nom, telephone
             FROM base_clients
             WHERE restaurant_id = $1
               AND telephone IS NOT NULL
               AND anniversaire IS NOT NULL
               AND EXTRACT(MONTH FROM anniversaire) = EXTRACT(MONTH FROM CURRENT_DATE)
               AND EXTRACT(DAY FROM anniversaire) = EXTRACT(DAY FROM CURRENT_DATE)
               AND COALESCE(opt_in_sms, TRUE) = TRUE`,
            auto.restaurantId,
          )) as Array<{
            id: bigint;
            prenom: string | null;
            nom: string | null;
            telephone: string | null;
          }>;

          if (clients.length === 0) return 0;

          // 3. Récupère nom du resto pour le tag {resto}
          const restoRows = (await prisma.$queryRawUnsafe(
            `SELECT nom FROM restaurants WHERE id = $1`,
            auto.restaurantId,
          )) as Array<{ nom: string }>;
          const restoNom = restoRows[0]?.nom ?? "Restaurant";

          // 4. Pour chaque client, vérifie solde puis envoie
          let sent = 0;
          for (const c of clients) {
            if (!c.telephone) continue;
            const normalized = normalizeFrenchPhone(c.telephone);
            if (!normalized) continue;

            // Solde restant ?
            const balanceRows = (await prisma.$queryRawUnsafe(
              `SELECT balance FROM sms_balance WHERE restaurant_id = $1`,
              auto.restaurantId,
            )) as Array<{ balance: number }>;
            const balance = balanceRows[0]?.balance ?? 0;
            if (balance < 1) {
              totalSkipped++;
              continue; // solde insuffisant, on skip
            }

            const personalized = auto.messageTemplate
              .replace(/\{prenom\}/gi, c.prenom?.trim() ?? "")
              .replace(/\{nom\}/gi, c.nom?.trim() ?? "")
              .replace(/\{resto\}/gi, restoNom)
              .replace(/\s+/g, " ")
              .trim();

            // Segments
            const hasUnicode = /[^\x00-\x7F]/.test(personalized);
            const limit = hasUnicode ? 70 : 160;
            const segments =
              personalized.length <= limit
                ? 1
                : Math.ceil(personalized.length / (hasUnicode ? 67 : 153));

            if (balance < segments) {
              totalSkipped++;
              continue;
            }

            const res = await sendSms({
              recipient: normalized,
              content: personalized,
            });

            if (res.ok) {
              sent++;
              // Décrément solde + log
              await prisma.$executeRawUnsafe(
                `UPDATE sms_balance
                 SET balance = balance - $2, total_spent = total_spent + $2, updated_at = NOW()
                 WHERE restaurant_id = $1`,
                auto.restaurantId,
                segments,
              );
              await prisma.$executeRawUnsafe(
                `INSERT INTO sms_messages
                   (restaurant_id, recipient, content, segments, status, brevo_ref, trigger_type)
                 VALUES ($1, $2, $3, $4, 'sent', $5, 'birthday')`,
                auto.restaurantId,
                normalized,
                personalized,
                segments,
                res.reference ?? null,
              );
            } else {
              await prisma.$executeRawUnsafe(
                `INSERT INTO sms_messages
                   (restaurant_id, recipient, content, segments, status, error_message, trigger_type)
                 VALUES ($1, $2, $3, $4, 'failed', $5, 'birthday')`,
                auto.restaurantId,
                normalized,
                personalized,
                segments,
                res.error.slice(0, 500),
              );
            }
          }
          return sent;
        },
      );
      totalSent += sentForResto;
    }

    return {
      automationsProcessed: automations.length,
      totalSent,
      totalSkipped,
    };
  },
);

/**
 * Cron toutes les minutes : dispatche les campagnes SMS programmées
 * dont l'heure d'envoi (scheduled_at) est arrivée.
 *
 * Logique :
 *   1. Liste les campagnes WHERE status='scheduled' AND scheduled_at <= NOW()
 *   2. Pour chaque : await dispatchScheduledCampaign(id) qui claim atomique
 *      le statut → envoie → update finaux
 *
 * Idempotent : si une campagne est claim par un autre run (race condition),
 * dispatchScheduledCampaign retourne sans rien faire (UPDATE WHERE status=
 * 'scheduled' renvoie 0 lignes affectées la 2e fois).
 */
export const processScheduledSmsCampaigns = inngest.createFunction(
  {
    id: "process-scheduled-sms-campaigns",
    retries: 1,
    // Toutes les minutes granularité fine pour les SMS programmés
    triggers: [{ cron: "* * * * *" }],
  },
  async ({ step }: { step: { run: <T>(name: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const { prisma } = await import("@/lib/db");
    const { dispatchScheduledCampaign } = await import(
      "@/server/dashboard/sms-actions"
    );

    const dueCampaigns = (await prisma.$queryRawUnsafe(`
      SELECT id FROM sms_campaigns
      WHERE status = 'scheduled' AND scheduled_at <= NOW()
      ORDER BY scheduled_at ASC
      LIMIT 50
    `)) as Array<{ id: bigint }>;

    if (dueCampaigns.length === 0) {
      return { processed: 0 };
    }

    let totalSent = 0;
    let totalFailed = 0;
    for (const c of dueCampaigns) {
      const result = await step.run(`dispatch-${c.id}`, async () => {
        return dispatchScheduledCampaign(c.id.toString());
      });
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    return {
      processed: dueCampaigns.length,
      totalSent,
      totalFailed,
    };
  },
);

export const allFunctions = [
  onProduitUpdated,
  onCategorieUpdated,
  onMenuTranslate,
  onCacheInvalidate,
  dailySmsBirthdayAutomation,
  processScheduledSmsCampaigns,
  // ─── Outreach campaign ──────────────────────────────────────────────
  onProspectEnrich,
  onProspectGenerate,
  cronOutreachEnqueueQueued,
];
