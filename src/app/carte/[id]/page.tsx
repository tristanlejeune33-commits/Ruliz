import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { getPublicMenu, isSupportedLang, listPublishableRestaurantIds } from "@/server/public/menu";
import { recordScan } from "@/server/public/scan";
import type { SupportedLang } from "@/server/translation/anthropic";
import { CartePublic } from "./carte-public";

export const revalidate = 60;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; qr?: string; preview?: string }>;
}

export async function generateStaticParams() {
  // Pre-build static pages for restaurants on Pro/Premium plans only.
  try {
    const ids = await listPublishableRestaurantIds();
    return ids.map((id) => ({ id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Carte · Ruliz`,
    other: {
      "x-restaurant-id": id,
    },
  };
}

const getCachedMenu = unstable_cache(
  async (id: string, lang: SupportedLang) => {
    let bigId: bigint;
    try {
      bigId = BigInt(id);
    } catch {
      return null;
    }
    return getPublicMenu(bigId, lang);
  },
  ["public-menu"],
  { revalidate: 60, tags: ["public-menu"] },
);

export default async function CartePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { lang: langRaw, qr, preview } = await searchParams;
  const lang: SupportedLang = isSupportedLang(langRaw) ? langRaw : "fr";

  const menu = await getCachedMenu(id, lang);
  if (!menu) notFound();

  // Track scan asynchronously — never block render
  if (!preview) {
    const headersList = await headers();
    const ua = headersList.get("user-agent");
    const country =
      headersList.get("cf-ipcountry") ??
      headersList.get("x-vercel-ip-country") ??
      null;

    after(async () => {
      try {
        const restoBigId = BigInt(menu.restaurant.id);
        const qrBigId = qr ? BigInt(qr) : null;
        await recordScan({
          restaurantId: restoBigId,
          qrcodeId: qrBigId,
          lang,
          userAgent: ua,
          pays: country,
        });
      } catch (e) {
        console.warn("[scan] tracking failed:", e);
      }
    });
  }

  return <CartePublic menu={menu} preview={!!preview} />;
}
