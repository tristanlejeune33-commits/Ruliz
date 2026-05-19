import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureRuntimeSchema } from "@/lib/ensure-runtime-schema";
import { classifyReply } from "@/server/outreach/ai-marketer";
import {
  humanDelayMs,
  pickReplyTemplate,
  renderTemplate,
} from "@/server/outreach/reply-auto-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Smartlead.ai → reçoit les événements (open / click / reply / bounce / unsubscribe).
 *
 * Configuration côté Smartlead :
 *   URL : https://ruliz-panel.fr/api/outreach/event
 *   Header : X-Outreach-Token: <SMARTLEAD_WEBHOOK_SECRET>
 *   Events : email_sent, email_open, email_click, email_reply, email_bounce, lead_unsubscribed
 *
 * Format payload Smartlead (simplifié) :
 *   {
 *     "event_type": "email_open" | "email_click" | "email_reply" | ...,
 *     "lead_email": "marie@bistro.fr",
 *     "campaign_id": "...",
 *     "sequence_step": 1,
 *     "metadata": { ... }
 *   }
 *
 * On retrouve le prospect par email (qui est unique en DB), on enregistre
 * l'événement et on update le statut + les timestamps idempotents.
 */

type SmartleadEvent = {
  event_type: string;
  lead_email?: string;
  email?: string;
  campaign_id?: string;
  sequence_step?: number;
  reply_text?: string;
  metadata?: Record<string, unknown>;
};

const EVENT_MAP: Record<string, "sent" | "open" | "click" | "reply" | "bounce" | "unsubscribe" | "spam" | null> = {
  email_sent: "sent",
  email_open: "open",
  email_opened: "open",
  email_click: "click",
  email_clicked: "click",
  email_reply: "reply",
  email_replied: "reply",
  email_bounce: "bounce",
  email_bounced: "bounce",
  lead_unsubscribed: "unsubscribe",
  unsubscribed: "unsubscribe",
  spam_report: "spam",
};

export async function POST(req: Request) {
  await ensureRuntimeSchema();

  // ─── Vérifier le token webhook ────────────────────────────────────────
  const token = req.headers.get("x-outreach-token");
  const expected = process.env.SMARTLEAD_WEBHOOK_SECRET;
  if (expected && token !== expected) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let payload: SmartleadEvent;
  try {
    payload = (await req.json()) as SmartleadEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const type = EVENT_MAP[payload.event_type ?? ""];
  if (!type) {
    // On accepte mais on ignore les events inconnus
    return NextResponse.json({ ok: true, ignored: true });
  }

  const email = (payload.lead_email ?? payload.email ?? "").toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
  }

  const prospect = await prisma.prospectRestaurant.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      status: true,
      nom: true,
      ville: true,
      cardToken: true,
    },
  });

  if (!prospect) {
    // Email pas dans notre base → soit déjà supprimé, soit erreur
    return NextResponse.json({ ok: true, unknownProspect: true });
  }

  // ─── Si reply : classifie via AI marketer + déclenche reply auto ──────
  let aiClassification:
    | {
        category?: string;
        confidence?: number;
        shouldReply?: boolean;
        replyText?: string | null;
        reasoning?: string;
      }
    | null = null;
  let autoReplyScheduled: { delayMs: number; subject: string } | null = null;

  if (type === "reply" && payload.reply_text) {
    try {
      const classification = await classifyReply({
        replyText: payload.reply_text,
        prospectNom: prospect.nom,
        prospectVille: prospect.ville,
        previewUrl: prospect.cardToken
          ? `https://ruliz-panel.fr/preview/${prospect.cardToken}`
          : undefined,
      });
      if (classification.ok) {
        aiClassification = classification.data;

        // Déclenche la réponse auto humanisée selon la catégorie classifiée.
        // Pour negative/unsubscribe/spam_complaint/out_of_office → on ne
        // répond pas (les templates ont shouldReply:false).
        const category = classification.data.category;
        if (category) {
          const template = pickReplyTemplate(
            category as Parameters<typeof pickReplyTemplate>[0],
          );
          if (template?.shouldReply) {
            const firstName = (prospect.email.split("@")[0] ?? "").split(
              ".",
            )[0];
            const previewUrl = prospect.cardToken
              ? `https://ruliz-panel.fr/preview/${prospect.cardToken}`
              : "https://ruliz-panel.fr";

            const renderedSubject = renderTemplate(template.subject, {
              first_name: firstName ?? "bonjour",
              nom: prospect.nom,
              preview_url: previewUrl,
            });
            const renderedBody = renderTemplate(template.body, {
              first_name: firstName ?? "bonjour",
              nom: prospect.nom,
              preview_url: previewUrl,
            });

            const delayMs = humanDelayMs();
            autoReplyScheduled = {
              delayMs,
              subject: renderedSubject,
            };

            // Log pour suivi (l'envoi réel passera par Smartlead API ou
            // un worker Inngest avec délai humain — TODO).
            console.log(
              `[outreach-reply] AUTO-REPLY scheduled for ${prospect.email} (cat=${category}, delay=${Math.round(delayMs / 60000)}min)`,
            );
            console.log(`[outreach-reply] Subject: ${renderedSubject}`);
            console.log(`[outreach-reply] Body preview: ${renderedBody.slice(0, 200)}...`);
          }
        }

        // Stop la séquence si refus/désinscription explicite
        if (
          category === "negative" ||
          category === "unsubscribe" ||
          category === "spam_complaint"
        ) {
          await prisma.prospectRestaurant.update({
            where: { id: prospect.id },
            data: { status: "failed", errorMessage: `reply_${category}` },
          });
        }
      }
    } catch (err) {
      console.warn("[outreach-event] classifyReply failed:", err);
    }
  }

  // ─── Insère l'événement (history complet) ─────────────────────────────
  await prisma.outreachEvent.create({
    data: {
      prospectId: prospect.id,
      type,
      metadata: {
        ...(payload.metadata ?? {}),
        ...(payload.reply_text ? { replyText: payload.reply_text } : {}),
        ...(aiClassification ? { aiClassification } : {}),
        ...(autoReplyScheduled ? { autoReplyScheduled } : {}),
      } as object,
    },
  });

  // ─── Update du statut workflow (transition monotone) ──────────────────
  const now = new Date();
  const STATUS_ORDER = [
    "queued",
    "enriched",
    "generated",
    "sent",
    "opened",
    "clicked",
    "converted",
  ];
  const currentIdx = STATUS_ORDER.indexOf(prospect.status);

  const update: {
    sentAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
    status?: string;
  } = {};

  if (type === "sent") {
    update.sentAt = now;
    if (currentIdx < STATUS_ORDER.indexOf("sent")) update.status = "sent";
  } else if (type === "open") {
    update.openedAt = now;
    if (currentIdx < STATUS_ORDER.indexOf("opened")) update.status = "opened";
  } else if (type === "click") {
    update.clickedAt = now;
    if (currentIdx < STATUS_ORDER.indexOf("clicked")) update.status = "clicked";
  } else if (type === "bounce" || type === "spam") {
    update.status = "failed";
  }
  // reply / unsubscribe : on enregistre l'event mais on ne déclasse pas le statut.

  if (Object.keys(update).length > 0) {
    await prisma.prospectRestaurant.update({
      where: { id: prospect.id },
      data: update,
    });
  }

  return NextResponse.json({ ok: true, prospectId: prospect.id.toString(), type });
}

/** Smartlead peut ping en GET pour health check. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "ruliz-outreach-webhook" });
}
