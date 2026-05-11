import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
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
