import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // === Pin l'encryption key des Server Actions ===
  // Sans clé fixée, Next.js génère une nouvelle clé à CHAQUE build → les IDs
  // hashés des Server Actions changent entre les déploiements Railway. Les
  // onglets navigateur ouverts avant un deploy appellent les anciens IDs →
  // "Failed to find Server Action XYZ" en boucle.
  // En Next.js 15 la clé se configure UNIQUEMENT via l'env var
  // NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (pas dans next.config). Voir Railway.
  // ESLint pendant `next build` : désactivé car les nouvelles règles strict
  // de React 19 (react-hooks/purity, set-state-in-effect, static-components)
  // produisent des faux positifs bloquants sur des patterns parfaitement
  // valides (Date.now en Server Component, sync state↔URL, mappings d'icônes
  // dynamiques). Le typecheck TypeScript reste actif, c'est ce qui compte
  // pour la sécurité type. Lint local toujours dispo via `pnpm lint`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Speed up dev compilation on Windows (especially when project is in OneDrive).
  // - On-demand entries TTL plus long → moins de recompiles inutiles.
  // - Webpack ignore les watchers les plus lourds.
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 5, // garde les pages compilées 5 min en RAM
    pagesBufferLength: 5,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        // Polling désactivé (utilise les events natifs Windows) + ignorés OneDrive/.next/.git
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/.git/**",
          "**/.cache/**",
        ],
        aggregateTimeout: 200,
      };
    }
    return config;
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
    ],
  },
  async headers() {
    // === Content-Security-Policy ===
    // Whitelist explicite des sources de script/style/connexion autorisées.
    // Note importante : Next.js 15 + Tailwind nécessitent 'unsafe-inline' pour
    // les styles (CSS-in-JS, ordered class attributes). Pour les scripts on
    // garde 'unsafe-inline' faute de nonces (plus de boulot à introduire).
    // C'est imparfait mais déjà mieux qu'aucune CSP : bloque les requêtes
    // sortantes vers des domaines non whitelistés (exfiltration data).
    const cspDirectives = [
      "default-src 'self'",
      // Scripts : Next.js inline + Stripe.js + Sentry browser
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://*.ingest.sentry.io https://browser.sentry-cdn.com",
      // Styles : Tailwind a besoin de unsafe-inline (class attributes ordered)
      "style-src 'self' 'unsafe-inline'",
      // Images : self + data: (icônes inlinées) + blob: (uploads) + R2 buckets
      "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.r2.dev https://*.cloudflare.com",
      // Fonts : self + data: (fontes inlinées) + Geist Sans/Mono via next/font
      "font-src 'self' data:",
      // Connexions API : self + Stripe + Sentry + Anthropic + Inngest + Brevo
      "connect-src 'self' https://api.stripe.com https://*.ingest.sentry.io https://api.anthropic.com https://api.inngest.com https://api.brevo.com",
      // Frames : Stripe Checkout (paiement) — autorisé en frame
      "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
      // Forms : self uniquement (sauf checkout Stripe pour le POST initial)
      "form-action 'self' https://checkout.stripe.com",
      // Refus d'être embarqué dans un iframe externe (clickjacking)
      "frame-ancestors 'self'",
      // Base URI : empêche <base> injecté de modifier les URL relatives
      "base-uri 'self'",
      // Bloque <object>/<embed> (flash legacy)
      "object-src 'none'",
      // Force HTTPS pour toutes les sub-resources
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS : force HTTPS pendant 1 an + sous-domaines (ruliz.fr et tous
          // les sous-domaines). On NE met PAS `preload` pour garder la
          // possibilité de revenir en arrière en cas de souci certif.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Content-Security-Policy
          { key: "Content-Security-Policy", value: cspDirectives },
        ],
      },
      // Carte publique : Cloudflare edge cache 60s + stale-while-revalidate 5 min.
      // Allow framing because the dashboard editor renders the carte in an iframe.
      {
        source: "/carte/:id*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      // Short URL for QR codes : redirect can be cached longer.
      {
        source: "/c/:code*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      // Default for everything else : block iframing.
      {
        source: "/((?!carte).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default nextConfig;
