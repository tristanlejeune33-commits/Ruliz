"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// ---------------- Schemas ----------------

const STATUTS = ["actif", "suspendu", "archive", "demo_terminee"] as const;
const PLANS = ["freemium", "pro", "premium"] as const;

const createClientSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  prenom: z.string().min(1).max(100),
  nom: z.string().min(1).max(100),
  telephone: z.string().max(20).optional().or(z.literal("")),
  adresse: z.string().max(500).optional().or(z.literal("")),
  codePostal: z.string().max(10).optional().or(z.literal("")),
  ville: z.string().max(100).optional().or(z.literal("")),
  pays: z.string().max(100).default("France"),
  demoActive: z.boolean().default(false),
});

const updateClientSchema = z.object({
  id: z.coerce.number().int().positive(),
  prenom: z.string().min(1).max(100),
  nom: z.string().min(1).max(100),
  telephone: z.string().max(20).optional().or(z.literal("")),
  adresse: z.string().max(500).optional().or(z.literal("")),
  codePostal: z.string().max(10).optional().or(z.literal("")),
  ville: z.string().max(100).optional().or(z.literal("")),
  pays: z.string().max(100),
});

// ---------------- Helpers ----------------

function emptyToNull<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = typeof v === "string" && v.trim() === "" ? null : v;
  }
  return out as T;
}

async function logAdminAction(action: string, details: Record<string, unknown>) {
  try {
    await prisma.log.create({
      data: {
        action: action.slice(0, 50),
        details: details as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    console.error("[admin.log] failed to write log", e);
  }
}

// ---------------- Actions ----------------

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createClient(input: unknown): Promise<ActionResult<{ id: number }>> {
  await requireAdmin();
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = emptyToNull(parsed.data);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec cet email." };
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      prenom: data.prenom,
      nom: data.nom,
      telephone: data.telephone ?? undefined,
      adresse: data.adresse ?? undefined,
      codePostal: data.codePostal ?? undefined,
      ville: data.ville ?? undefined,
      pays: data.pays,
      role: "client",
      statut: "actif",
      demoActive: data.demoActive,
    },
  });

  // Better-Auth signUp pour créer le compte d'auth + hash password.
  const { user: authUser } = await auth.api.signUpEmail({
    body: {
      email: data.email,
      password: data.password,
      name: `${data.prenom} ${data.nom}`,
    },
  });

  await prisma.authUser.update({
    where: { id: authUser.id },
    data: { role: "client", userId: user.id },
  });

  await logAdminAction("client.create", { id: user.id, email: user.email });
  revalidatePath("/admin/clients");
  return { ok: true, data: { id: user.id } };
}

export async function updateClient(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = emptyToNull(parsed.data);

  await prisma.user.update({
    where: { id: data.id },
    data: {
      prenom: data.prenom,
      nom: data.nom,
      telephone: data.telephone ?? null,
      adresse: data.adresse ?? null,
      codePostal: data.codePostal ?? null,
      ville: data.ville ?? null,
      pays: data.pays,
    },
  });

  await logAdminAction("client.update", { id: data.id });
  revalidatePath(`/admin/clients/${data.id}`);
  return { ok: true };
}

export async function setClientStatut(
  id: number,
  statut: (typeof STATUTS)[number],
): Promise<ActionResult> {
  await requireAdmin();
  if (!STATUTS.includes(statut)) return { ok: false, error: "Statut invalide" };

  await prisma.user.update({ where: { id }, data: { statut } });
  await logAdminAction("client.set_statut", { id, statut });
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}

export async function toggleClientDemo(id: number): Promise<ActionResult> {
  await requireAdmin();
  const current = await prisma.user.findUnique({ where: { id }, select: { demoActive: true } });
  if (!current) return { ok: false, error: "Client introuvable" };

  await prisma.user.update({
    where: { id },
    data: { demoActive: !current.demoActive },
  });
  await logAdminAction("client.toggle_demo", { id, value: !current.demoActive });
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}

export async function setRestaurantPlan(
  restaurantId: bigint,
  plan: (typeof PLANS)[number],
): Promise<ActionResult> {
  await requireAdmin();
  if (!PLANS.includes(plan)) return { ok: false, error: "Plan invalide" };
  await prisma.restaurant.update({ where: { id: restaurantId }, data: { plan } });
  await logAdminAction("restaurant.set_plan", { restaurantId: restaurantId.toString(), plan });
  revalidatePath("/admin/clients");
  revalidatePath("/admin/restaurants");
  return { ok: true };
}

export async function sendResetPasswordEmail(email: string): Promise<ActionResult> {
  await requireAdmin();
  const valid = z.email().safeParse(email);
  if (!valid.success) return { ok: false, error: "Email invalide" };

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: "/reset-password",
      },
    });
    await logAdminAction("client.reset_password", { email });
    return { ok: true };
  } catch (err) {
    console.error("[admin.resetPassword]", err);
    return { ok: false, error: "Impossible d'envoyer l'email de réinitialisation" };
  }
}
