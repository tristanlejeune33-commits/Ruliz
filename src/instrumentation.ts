// On ne charge Sentry QUE si une DSN est définie. Sans ce gate, l'import
// de `@sentry/nextjs` pull `@sentry/node` → `@prisma/instrumentation` →
// `@opentelemetry/instrumentation`, ce qui spam les warnings webpack en dev
// et ralentit le compile de plusieurs secondes par route.
const sentryDsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (!sentryDsn) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// onRequestError est lazy : on ne l'expose que si Sentry est activé.
// Next.js tolère un export undefined ici.
export const onRequestError = sentryDsn
  ? (await import("@sentry/nextjs")).captureRequestError
  : undefined;
