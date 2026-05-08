"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { z } from "zod";
import { assertRestaurantOwner } from "@/lib/active-restaurant";
import { prisma } from "@/lib/db";
import { buildR2Key, isR2Configured, uploadBuffer } from "@/lib/r2";
import { getAppUrl } from "@/lib/url";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function generateUniqueCode() {
  // 8 chars uppercase alphanumeric, ex "K4D9P2NX"
  const bytes = randomBytes(6);
  return bytes.toString("base64").replace(/[+/=]/g, "").toUpperCase().slice(0, 8);
}

function carteUrl(code: string) {
  return `${getAppUrl()}/c/${code}`;
}

const createSchema = z.object({
  restaurantId: z.string(),
});

export async function createQrcode(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  let restoBigId: bigint;
  try {
    restoBigId = BigInt(parsed.data.restaurantId);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }
  const restaurant = await assertRestaurantOwner(restoBigId);
  if (!restaurant) return { ok: false, error: "Accès refusé" };

  // Code unique avec retries (collisions ultra rares mais on protège)
  let codeUnique = generateUniqueCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.qrcode.findUnique({ where: { codeUnique } });
    if (!exists) break;
    codeUnique = generateUniqueCode();
  }

  // Génération du PNG QR
  const url = carteUrl(codeUnique);
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  let pngUrl: string | null = null;
  if (isR2Configured()) {
    const key = buildR2Key({
      restaurantId: restoBigId,
      kind: "qrcode",
      filename: `${codeUnique}.png`,
    });
    pngUrl = await uploadBuffer({
      key,
      body: buffer,
      contentType: "image/png",
    });
  } else {
    // Fallback : encode en data URL pour l'instant (pas idéal mais fonctionne sans R2)
    pngUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  }

  const created = await prisma.qrcode.create({
    data: {
      restaurantId: restoBigId,
      codeUnique,
      pngUrl,
      assignedAt: new Date(),
      statut: "actif",
    },
  });

  revalidatePath("/dashboard/qrcodes");
  return { ok: true, data: { id: created.id.toString() } };
}

const updateStatutSchema = z.object({
  id: z.string(),
  statut: z.enum(["actif", "inactif", "perdu"]),
});

export async function setQrcodeStatut(input: unknown): Promise<ActionResult> {
  const parsed = updateStatutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  let bigId: bigint;
  try {
    bigId = BigInt(parsed.data.id);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }

  const qr = await prisma.qrcode.findUnique({
    where: { id: bigId },
    select: { restaurantId: true },
  });
  if (!qr) return { ok: false, error: "QR introuvable" };

  const owned = await assertRestaurantOwner(qr.restaurantId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  await prisma.qrcode.update({
    where: { id: bigId },
    data: { statut: parsed.data.statut },
  });

  revalidatePath("/dashboard/qrcodes");
  return { ok: true };
}

export async function deleteQrcode(id: string): Promise<ActionResult> {
  let bigId: bigint;
  try {
    bigId = BigInt(id);
  } catch {
    return { ok: false, error: "Identifiant invalide" };
  }

  const qr = await prisma.qrcode.findUnique({
    where: { id: bigId },
    select: { restaurantId: true },
  });
  if (!qr) return { ok: false, error: "QR introuvable" };

  const owned = await assertRestaurantOwner(qr.restaurantId);
  if (!owned) return { ok: false, error: "Accès refusé" };

  await prisma.qrcode.delete({ where: { id: bigId } });
  revalidatePath("/dashboard/qrcodes");
  return { ok: true };
}
