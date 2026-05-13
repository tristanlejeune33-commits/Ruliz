/**
 * Parser user-agent ultra-light, sans dépendance.
 * Couvre les 95% des cas pour un dashboard analytics restaurant.
 * Pas de précision niveau version mineure · on n'en a pas besoin.
 */

export type Device = "mobile" | "tablet" | "desktop" | "bot" | "other";
export type OS =
  | "ios"
  | "android"
  | "windows"
  | "macos"
  | "linux"
  | "chromeos"
  | "other";
export type Browser =
  | "chrome"
  | "safari"
  | "firefox"
  | "edge"
  | "opera"
  | "samsung"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "other";

export interface ParsedUA {
  device: Device;
  os: OS;
  browser: Browser;
}

const BOT_PATTERNS = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|duckduck/i;
const TABLET_PATTERNS = /ipad|tablet|kindle|silk|playbook/i;
const MOBILE_PATTERNS = /mobi|iphone|ipod|android.*mobile|blackberry|opera mini/i;

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { device: "other", os: "other", browser: "other" };

  const u = ua.toLowerCase();

  // Bot detection first
  if (BOT_PATTERNS.test(u)) {
    return { device: "bot", os: "other", browser: "other" };
  }

  // Device
  let device: Device = "desktop";
  if (TABLET_PATTERNS.test(u)) device = "tablet";
  else if (MOBILE_PATTERNS.test(u)) device = "mobile";
  // Android without "mobile" keyword is usually a tablet
  else if (u.includes("android") && !u.includes("mobile")) device = "tablet";

  // OS
  let os: OS = "other";
  if (u.includes("iphone") || u.includes("ipad") || u.includes("ipod")) os = "ios";
  else if (u.includes("android")) os = "android";
  else if (u.includes("mac os") || u.includes("macintosh")) os = "macos";
  else if (u.includes("windows")) os = "windows";
  else if (u.includes("cros")) os = "chromeos";
  else if (u.includes("linux")) os = "linux";

  // Browser · order matters (UAs often contain multiple keywords)
  let browser: Browser = "other";
  if (u.includes("fbav") || u.includes("fban") || u.includes("fbios")) browser = "facebook";
  else if (u.includes("instagram")) browser = "instagram";
  else if (u.includes("tiktok") || u.includes("musical_ly")) browser = "tiktok";
  else if (u.includes("samsungbrowser")) browser = "samsung";
  else if (u.includes("edg/") || u.includes("edge/")) browser = "edge";
  else if (u.includes("opr/") || u.includes("opera/")) browser = "opera";
  else if (u.includes("firefox/") || u.includes("fxios")) browser = "firefox";
  else if (u.includes("chrome/") || u.includes("crios")) browser = "chrome";
  else if (u.includes("safari/") && !u.includes("chrome/")) browser = "safari";

  return { device, os, browser };
}

export const DEVICE_LABEL: Record<Device, string> = {
  mobile: "Mobile",
  tablet: "Tablette",
  desktop: "Desktop",
  bot: "Bot",
  other: "Autre",
};

export const OS_LABEL: Record<OS, string> = {
  ios: "iOS",
  android: "Android",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  chromeos: "ChromeOS",
  other: "Autre",
};

export const BROWSER_LABEL: Record<Browser, string> = {
  chrome: "Chrome",
  safari: "Safari",
  firefox: "Firefox",
  edge: "Edge",
  opera: "Opera",
  samsung: "Samsung Internet",
  facebook: "Facebook (in-app)",
  instagram: "Instagram (in-app)",
  tiktok: "TikTok (in-app)",
  other: "Autre",
};
