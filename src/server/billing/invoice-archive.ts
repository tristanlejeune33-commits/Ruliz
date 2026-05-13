import "server-only";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { getR2Client, isR2Configured } from "@/lib/r2";

const R2_BUCKET = process.env.R2_BUCKET_NAME;

/**
 * Archive locale des factures Ruliz obligation comptable 10 ans
 * (article L123-22 Code de commerce).
 *
 * Pour chaque facture émise (abonnement / SMS / boutique), on snapshot
 * les méta-données en DB + (optionnel) on télécharge le PDF Stripe et on
 * le stocke en R2 sous `invoices/{userId}/{stripeInvoiceId}.pdf`.
 *
 * Garantit :
 *  - Trace locale même si Stripe a un souci d'API
 *  - Audit comptable rapide (SQL sur la table)
 *  - Backup autonome du PDF (R2)
 *
 * Le webhook Stripe trigger archiveInvoice() en best-effort après chaque
 * paiement réussi. Si l'archivage échoue, on log mais on bloque pas le
 * webhook le paiement reste enregistré, on pourra reprocesser plus tard.
 */

export type InvoiceType = "subscription" | "sms" | "boutique";

export interface ArchiveInvoiceInput {
  userId: number;
  restaurantId?: bigint | null;
  type: InvoiceType;
  stripeInvoiceId?: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCustomerId?: string | null;
  invoiceNumber?: string | null;
  amountPaidCentimes: number;
  amountDueCentimes?: number;
  currency?: string;
  status?: "paid" | "open" | "void" | "uncollectible" | "draft";
  description?: string | null;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  issuedAt?: Date | null;
  paidAt?: Date | null;
  metadata?: Record<string, unknown>;
}

/**
 * Insert ou update (upsert sur stripe_invoice_id OU stripe_session_id) la
 * facture en DB. Lance ensuite le téléchargement R2 async best-effort si
 * un PDF URL est fourni.
 */
export async function archiveInvoice(
  input: ArchiveInvoiceInput,
): Promise<{ archived: boolean; id?: bigint }> {
  try {
    // Idempotence : on cherche d'abord par stripe_invoice_id puis session_id.
    // Si trouvé → update les champs qui peuvent changer (status, paid_at, PDF URL).
    // Sinon → insert.
    const existing = await findExistingArchive(
      input.stripeInvoiceId,
      input.stripeSessionId,
    );

    let archiveId: bigint;
    if (existing) {
      archiveId = existing.id;
      await prisma.$executeRawUnsafe(
        `UPDATE "invoices_archive" SET
           "amount_paid_centimes" = $2,
           "amount_due_centimes" = $3,
           "status" = $4,
           "hosted_invoice_url" = COALESCE($5, "hosted_invoice_url"),
           "invoice_pdf_url" = COALESCE($6, "invoice_pdf_url"),
           "paid_at" = COALESCE($7, "paid_at"),
           "invoice_number" = COALESCE($8, "invoice_number"),
           "stripe_payment_intent_id" = COALESCE($9, "stripe_payment_intent_id")
         WHERE "id" = $1`,
        archiveId,
        input.amountPaidCentimes,
        input.amountDueCentimes ?? 0,
        input.status ?? "paid",
        input.hostedInvoiceUrl ?? null,
        input.invoicePdfUrl ?? null,
        input.paidAt ?? null,
        input.invoiceNumber ?? null,
        input.stripePaymentIntentId ?? null,
      );
    } else {
      const inserted = (await prisma.$queryRawUnsafe(
        `INSERT INTO "invoices_archive" (
           "user_id", "restaurant_id", "type",
           "stripe_invoice_id", "stripe_session_id", "stripe_payment_intent_id", "stripe_customer_id",
           "invoice_number", "amount_paid_centimes", "amount_due_centimes",
           "currency", "status", "description",
           "hosted_invoice_url", "invoice_pdf_url",
           "issued_at", "paid_at", "metadata_json"
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id`,
        input.userId,
        input.restaurantId ?? null,
        input.type,
        input.stripeInvoiceId ?? null,
        input.stripeSessionId ?? null,
        input.stripePaymentIntentId ?? null,
        input.stripeCustomerId ?? null,
        input.invoiceNumber ?? null,
        input.amountPaidCentimes,
        input.amountDueCentimes ?? 0,
        (input.currency ?? "EUR").toUpperCase(),
        input.status ?? "paid",
        input.description ?? null,
        input.hostedInvoiceUrl ?? null,
        input.invoicePdfUrl ?? null,
        input.issuedAt ?? null,
        input.paidAt ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      )) as Array<{ id: bigint }>;
      archiveId = inserted[0]!.id;
    }

    // Best-effort : télécharge le PDF Stripe et stocke en R2. Si ça plante,
    // l'archive en DB est déjà OK, on peut retry plus tard via un script.
    if (input.invoicePdfUrl) {
      // Fire-and-forget n'attend pas la fin pour return.
      // (Le webhook Stripe a un timeout de 30s, on n'aggrave pas.)
      downloadAndStoreInvoicePdf({
        archiveId,
        userId: input.userId,
        pdfUrl: input.invoicePdfUrl,
        invoiceNumber: input.invoiceNumber ?? null,
        stripeInvoiceId: input.stripeInvoiceId ?? null,
      }).catch((err) =>
        console.warn("[invoice-archive] R2 PDF download failed (silent):", err),
      );
    }

    return { archived: true, id: archiveId };
  } catch (err) {
    console.error("[invoice-archive] archiveInvoice failed:", err);
    return { archived: false };
  }
}

async function findExistingArchive(
  stripeInvoiceId: string | null | undefined,
  stripeSessionId: string | null | undefined,
): Promise<{ id: bigint } | null> {
  if (!stripeInvoiceId && !stripeSessionId) return null;
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id FROM "invoices_archive"
     WHERE ($1::text IS NOT NULL AND stripe_invoice_id = $1)
        OR ($2::text IS NOT NULL AND stripe_session_id = $2)
     LIMIT 1`,
    stripeInvoiceId ?? null,
    stripeSessionId ?? null,
  )) as Array<{ id: bigint }>;
  return rows[0] ?? null;
}

/**
 * Télécharge le PDF depuis l'URL Stripe et l'upload en R2 sous une key
 * stable. Update la ligne archive avec la r2_pdf_key.
 *
 * Skip si R2 pas configuré ou si l'URL ne répond pas. Best-effort.
 */
async function downloadAndStoreInvoicePdf(opts: {
  archiveId: bigint;
  userId: number;
  pdfUrl: string;
  invoiceNumber: string | null;
  stripeInvoiceId: string | null;
}): Promise<void> {
  if (!isR2Configured() || !R2_BUCKET) return;
  const r2 = getR2Client();
  if (!r2) return;

  // Fetch le PDF depuis Stripe (URL temporaire signée mais valable longtemps)
  const res = await fetch(opts.pdfUrl);
  if (!res.ok) {
    console.warn(
      `[invoice-archive] PDF fetch ${res.status} for ${opts.pdfUrl}`,
    );
    return;
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  // Key stable : invoices/{userId}/{invoiceNumber || stripeInvoiceId}.pdf
  const slug =
    (opts.invoiceNumber ?? opts.stripeInvoiceId ?? `archive-${opts.archiveId}`)
      .replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = `invoices/${opts.userId}/${slug}.pdf`;

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
      // Métadata utile pour audit
      Metadata: {
        userId: opts.userId.toString(),
        archiveId: opts.archiveId.toString(),
        invoiceNumber: opts.invoiceNumber ?? "",
        stripeInvoiceId: opts.stripeInvoiceId ?? "",
      },
    }),
  );

  await prisma.$executeRawUnsafe(
    `UPDATE "invoices_archive" SET "r2_pdf_key" = $1 WHERE "id" = $2`,
    key,
    opts.archiveId,
  );
}

/**
 * Liste les factures archivées d'un user (utilisée par /dashboard/settings/factures).
 * Pas de filtrage type ici laisse le caller filtrer.
 */
export async function listArchivedInvoices(userId: number) {
  return (await prisma.$queryRawUnsafe(
    `SELECT id, type, stripe_invoice_id AS "stripeInvoiceId",
            stripe_session_id AS "stripeSessionId",
            invoice_number AS "invoiceNumber",
            amount_paid_centimes AS "amountPaidCentimes",
            amount_due_centimes AS "amountDueCentimes",
            currency, status, description,
            hosted_invoice_url AS "hostedInvoiceUrl",
            invoice_pdf_url AS "invoicePdfUrl",
            r2_pdf_key AS "r2PdfKey",
            issued_at AS "issuedAt",
            paid_at AS "paidAt",
            created_at AS "createdAt"
     FROM "invoices_archive"
     WHERE user_id = $1
     ORDER BY COALESCE(paid_at, issued_at, created_at) DESC
     LIMIT 200`,
    userId,
  )) as Array<{
    id: bigint;
    type: InvoiceType;
    stripeInvoiceId: string | null;
    stripeSessionId: string | null;
    invoiceNumber: string | null;
    amountPaidCentimes: number;
    amountDueCentimes: number;
    currency: string;
    status: string;
    description: string | null;
    hostedInvoiceUrl: string | null;
    invoicePdfUrl: string | null;
    r2PdfKey: string | null;
    issuedAt: Date | null;
    paidAt: Date | null;
    createdAt: Date;
  }>;
}
