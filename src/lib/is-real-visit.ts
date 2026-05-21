/**
 * Détecte si une requête HTTP correspond à un VRAI visiteur humain qui
 * regarde la page, par opposition à :
 *   - une requête prefetch Next.js (header `next-router-prefetch`)
 *   - une requête RSC (header `RSC` ou `Next-Router-State-Tree`)
 *   - un prefetch navigateur classique (header `Purpose: prefetch` ou
 *     `Sec-Purpose: prefetch`)
 *   - un crawler/bot connu (User-Agent matching la regex bot)
 *   - un health check (User-Agent UptimeRobot, Pingdom, Better Uptime, etc.)
 *
 * Utilisé pour ne PAS enregistrer ces requêtes comme des scans dans la
 * table `scans` — sinon chaque navigation interne du dashboard (qui
 * prefetch les liens vers /carte/[id]) gonflerait le compteur.
 *
 * Référence : la suite de headers est documentée par Next.js
 *   https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
 *   https://nextjs.org/docs/app/building-your-application/caching#prefetching
 */

/**
 * Regex agressive sur les User-Agents bots/crawlers.
 * On ratisse large parce qu'un faux négatif (=on enregistre un bot)
 * coûte 1 scan parasite ; un faux positif (=on ignore un humain) coûte
 * juste 1 scan manquant — moins grave.
 *
 * Listes consolidées : SEO crawlers + IA bots + monitoring + previews
 * sociaux + outils dev/test + headless browsers + archivers.
 */
const BOT_UA_REGEX = new RegExp(
  [
    // Génériques
    "bot\\b",
    "crawl",
    "spider",
    "slurp",
    "prerender",
    "headless",
    "fetch\\b",
    "scrapy",
    "scraper",
    "node-fetch",
    "axios",
    "go-http-client",
    "python-requests",
    "okhttp",
    "java/",
    "libwww",
    "curl/",
    "wget",
    // Search engines
    "googlebot",
    "bingbot",
    "duckduckbot",
    "baiduspider",
    "yandex",
    "sogou",
    "yeti",
    "naver",
    "applebot",
    "google-?inspectiontool",
    "adsbot-google",
    "mediapartners-google",
    "google-extended",
    // SEO / scraping tools
    "ahrefs",
    "semrush",
    "mj12bot",
    "dotbot",
    "rogerbot",
    "blexbot",
    "barkrowler",
    "seekport",
    "seznam",
    "petalbot",
    "amazonbot",
    "bytespider",
    "ccbot",
    "dataforseo",
    "internet-?archive",
    "ia_archiver",
    "archive\\.org",
    // IA / LLM crawlers
    "chatgpt-user",
    "gptbot",
    "oai-searchbot",
    "claude-?web",
    "claudebot",
    "anthropic",
    "perplexity",
    "youbot",
    "youbot",
    "cohere",
    "diffbot",
    "facebookbot",
    "meta-externalagent",
    "meta-externalfetcher",
    // Social previews / link unfurlers
    "facebookexternalhit",
    "facebookcatalog",
    "whatsapp",
    "twitterbot",
    "linkedinbot",
    "slackbot",
    "discordbot",
    "skypeuripreview",
    "telegrambot",
    "embedly",
    "vkshare",
    "outbrain",
    // Monitoring / uptime
    "monitor",
    "uptime",
    "pingdom",
    "datadog",
    "newrelic",
    "betteruptime",
    "statuscake",
    "site24x7",
    "checkly",
    "freshping",
    // Headless / dev tools
    "chrome-?lighthouse",
    "speedcurve",
    "gtmetrix",
    "pagespeed",
    "cypress",
    "playwright",
    "selenium",
    "puppeteer",
    "phantomjs",
  ].join("|"),
  "i",
);

/**
 * Headers que Next.js + browsers utilisent pour signaler une requête non-
 * interactive (prefetch / data fetch / RSC streaming). Aucune de ces
 * requêtes ne doit compter comme un scan.
 */
export interface VisitHeaders {
  get: (name: string) => string | null;
}

export function isRealHumanVisit(headers: VisitHeaders): boolean {
  // Next.js Prefetch — quand un <Link prefetch> est visible/hovered, Next
  // fait un GET avec ce header. C'est INVISIBLE pour l'utilisateur.
  if (headers.get("next-router-prefetch") === "1") return false;
  if (headers.get("Next-Router-Prefetch") === "1") return false;

  // RSC payload fetch — quand Next navigate côté client il pull les RSC
  // depuis le serveur. Même page mais data layer only, pas un "view".
  if (headers.get("rsc") === "1") return false;
  if (headers.get("RSC") === "1") return false;
  if (headers.get("Next-Router-State-Tree")) return false;
  if (headers.get("next-router-state-tree")) return false;
  if (headers.get("next-action")) return false; // server action call

  // Prefetch standard navigateur (Quicklink, Speculation Rules, etc.)
  const purpose = headers.get("purpose") ?? headers.get("Purpose");
  const secPurpose =
    headers.get("sec-purpose") ?? headers.get("Sec-Purpose");
  if (purpose && /prefetch/i.test(purpose)) return false;
  if (secPurpose && /(prefetch|prerender)/i.test(secPurpose)) return false;

  // Bots / crawlers
  const ua = headers.get("user-agent") ?? headers.get("User-Agent") ?? "";
  if (!ua) return false; // pas de UA = probablement un script automatisé
  if (BOT_UA_REGEX.test(ua)) return false;

  return true;
}
