"use client";

import { useState } from "react";
import { Logo } from "@/components/shared/logo";

const LS_KEY = "ruliz_demo_carte_url";

// Lecture lazy : ne tourne qu'au premier render côté client. En SSR on
// renvoie "" → le mockup statique s'affiche, puis le client hydrate avec
// la valeur du localStorage. Acceptable car la zone est hors fold critique
// et hydration n'a aucun impact perçu.
function readStoredUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LS_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Pane droit de l'écran d'auth (login/signup).
 *
 * Affiche un téléphone iPhone-like avec :
 *   - Soit la vraie carte publique du restaurateur si une URL est branchée
 *     (persistée en localStorage, clé `ruliz_demo_carte_url`)
 *   - Soit un mockup statique fidèle au composant carte-public.tsx
 *
 * Le bouton "Brancher ma carte" en haut à droite ouvre un popover pour coller
 * une URL — utile en démo / onboarding. Si la prod renvoie `X-Frame-Options:
 * DENY`, l'iframe affichera blanc → fallback mockup automatique.
 */
export function CartePreviewPane() {
  const [carteUrl, setCarteUrl] = useState(readStoredUrl);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState(readStoredUrl);
  const [iframeErr, setIframeErr] = useState(false);

  function applyUrl(url: string) {
    const cleaned = (url ?? "").trim();
    setCarteUrl(cleaned);
    setIframeErr(false);
    try {
      if (cleaned) localStorage.setItem(LS_KEY, cleaned);
      else localStorage.removeItem(LS_KEY);
    } catch {
      /* noop */
    }
  }

  return (
    <div
      className="relative h-full overflow-hidden text-white"
      style={{ background: "#26438A" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-36 size-[500px] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-24 size-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(61,107,214,0.45), transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      <div className="relative flex h-full flex-col p-10 lg:p-14">
        <div className="flex items-center justify-between">
          <div
            className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10"
            aria-hidden
          >
            <Logo variant="mark" inverted className="size-6" />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDraftUrl(carteUrl);
                setEditorOpen((v) => !v);
              }}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.10em] text-white backdrop-blur transition"
              style={{
                background: carteUrl
                  ? "rgba(123,255,184,0.16)"
                  : "rgba(255,255,255,0.12)",
                borderColor: carteUrl
                  ? "rgba(123,255,184,0.32)"
                  : "rgba(255,255,255,0.18)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: carteUrl
                    ? "#7BFFB8"
                    : "rgba(255,255,255,0.4)",
                  boxShadow: carteUrl
                    ? "0 0 8px rgba(123,255,184,0.6)"
                    : "none",
                }}
              />
              {carteUrl ? "Carte branchée · éditer" : "Brancher ma carte"}
            </button>

            {editorOpen && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] z-30 w-[340px] rounded-2xl border p-4 text-white shadow-2xl backdrop-blur-xl"
                style={{
                  background: "rgba(11,21,48,0.92)",
                  borderColor: "rgba(255,255,255,0.14)",
                }}
              >
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.10em] text-white/60"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  URL de votre carte publique Ruliz
                </div>
                <input
                  type="url"
                  placeholder="https://ruliz.fr/carte/..."
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  autoFocus
                  className="mt-2 h-9 w-full rounded-lg border px-3 text-sm font-medium text-white outline-none transition"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderColor: "rgba(255,255,255,0.16)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#7BFFB8";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(123,255,184,0.18)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.16)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyUrl(draftUrl);
                      setEditorOpen(false);
                    }
                  }}
                />
                <div className="mt-2 text-[11px] leading-snug text-white/60">
                  Collez l&apos;URL — ex&nbsp;:{" "}
                  <code
                    className="text-[10.5px] text-white/85"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    ruliz.fr/carte/le-tire-bouchon
                  </code>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      applyUrl(draftUrl);
                      setEditorOpen(false);
                    }}
                    disabled={!draftUrl.trim()}
                    className="h-9 flex-1 rounded-lg px-3 text-sm font-semibold transition disabled:cursor-not-allowed"
                    style={{
                      background: draftUrl.trim()
                        ? "#7BFFB8"
                        : "rgba(255,255,255,0.08)",
                      color: draftUrl.trim()
                        ? "#0B1530"
                        : "rgba(255,255,255,0.4)",
                    }}
                  >
                    Charger
                  </button>
                  {carteUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        applyUrl("");
                        setDraftUrl("");
                        setEditorOpen(false);
                      }}
                      className="h-9 rounded-lg border bg-transparent px-3 text-sm font-medium text-white/70"
                      style={{ borderColor: "rgba(255,255,255,0.18)" }}
                    >
                      Revenir au mockup
                    </button>
                  )}
                </div>
                {iframeErr && (
                  <div
                    className="mt-3 rounded-lg border p-2 text-[11.5px] leading-snug"
                    style={{
                      background: "rgba(255,107,107,0.10)",
                      borderColor: "rgba(255,107,107,0.24)",
                      color: "#FFB4B4",
                    }}
                  >
                    L&apos;URL ne peut pas s&apos;afficher dans une iframe
                    (sécurité du site). Essayez une URL Ruliz ou désactivez
                    X-Frame-Options côté serveur.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 max-w-md">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white lg:text-4xl">
            Une carte qui parle 14 langues.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Prix, allergènes, photos, traduction automatique — sur le téléphone
            de chaque client, en un scan.
          </p>
        </div>

        <div
          className="pointer-events-none absolute -bottom-8 right-12 hidden xl:block"
          style={{
            transform: "rotate(-4deg)",
            filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.35))",
          }}
        >
          <PhonePreview
            carteUrl={carteUrl}
            onIframeError={() => setIframeErr(true)}
          />
        </div>
      </div>
    </div>
  );
}

function PhonePreview({
  carteUrl,
  onIframeError,
}: {
  carteUrl: string;
  onIframeError: () => void;
}) {
  const theme = {
    bgBody: "#F8F5EE",
    title: "#1A1F2E",
    textBody: "#2F3540",
    cardBody: "#FFFFFF",
  };
  const phoneW = 290;
  const innerW = phoneW - 14;
  const innerH = innerW * (19.5 / 9);
  const iframeVW = 390;
  const iframeScale = innerW / iframeVW;
  const iframeVH = innerH / iframeScale;

  return (
    <div
      className="rounded-[40px] p-[7px]"
      style={{
        width: phoneW,
        background: "#0B0F1A",
        boxShadow:
          "0 0 0 2px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="relative overflow-hidden rounded-[33px]"
        style={{
          background: theme.bgBody,
          width: innerW,
          height: innerH,
        }}
      >
        {carteUrl ? (
          <>
            <iframe
              src={carteUrl}
              title="Carte Ruliz"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              onError={() => onIframeError()}
              style={{
                width: iframeVW,
                height: iframeVH,
                border: 0,
                transform: `scale(${iframeScale})`,
                transformOrigin: "top left",
                background: theme.bgBody,
                display: "block",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[9px] z-[4] h-7 w-24 -translate-x-1/2 rounded-[14px] bg-black"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-1.5 left-1/2 z-[4] h-1 w-[110px] -translate-x-1/2 rounded-sm opacity-50"
              style={{ background: theme.title }}
            />
          </>
        ) : (
          <StaticCarteMockup theme={theme} />
        )}
      </div>
    </div>
  );
}

interface MockupTheme {
  bgBody: string;
  title: string;
  textBody: string;
  cardBody: string;
}

function StaticCarteMockup({ theme }: { theme: MockupTheme }) {
  return (
    <>
      <div
        className="relative z-[3] flex h-[38px] items-center justify-between px-5.5 text-[12px] font-semibold text-white"
        style={{ mixBlendMode: "difference" }}
      >
        <span style={{ fontFeatureSettings: '"tnum"' }}>12:42</span>
        <span className="inline-flex items-center gap-1">
          <svg width="14" height="9" viewBox="0 0 14 9" fill="currentColor">
            <rect x="0" y="6" width="2" height="3" rx="0.5" />
            <rect x="3.5" y="4" width="2" height="5" rx="0.5" />
            <rect x="7" y="2" width="2" height="7" rx="0.5" />
            <rect x="10.5" y="0" width="2" height="9" rx="0.5" />
          </svg>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
            <path d="M7 9.5a1 1 0 100-2 1 1 0 000 2zm4-3.2a5.7 5.7 0 00-8 0l-1-1a7.1 7.1 0 0110 0l-1 1zM12.7 4.6a8 8 0 00-11.4 0l-1-1a9.4 9.4 0 0113.4 0l-1 1z" />
          </svg>
          <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
            <rect
              x="0.5"
              y="0.5"
              width="18"
              height="9"
              rx="2"
              stroke="currentColor"
              strokeOpacity="0.4"
            />
            <rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor" />
            <rect
              x="19.5"
              y="3.5"
              width="1.5"
              height="3"
              rx="0.5"
              fill="currentColor"
              fillOpacity="0.4"
            />
          </svg>
        </span>
      </div>
      <div
        aria-hidden
        className="absolute left-1/2 top-[9px] z-[4] h-7 w-24 -translate-x-1/2 rounded-[14px] bg-black"
      />

      <div className="absolute left-0 right-0 top-[38px] z-[2] flex items-center justify-between px-4 py-3 text-white">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span
          className="text-[14px] font-bold tracking-tight text-white"
          style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          Notre carte
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-md border border-white/22 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur"
          style={{ background: "rgba(255,255,255,0.18)" }}
        >
          FR
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="m2 3 2 2 2-2" />
          </svg>
        </span>
      </div>

      <div
        className="absolute left-0 right-0 top-0 h-[200px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 25%, rgba(0,0,0,0) 60%)," +
            "repeating-linear-gradient(135deg, #6B4F2E 0 8px, #7A5A36 8px 16px, #5A3F22 16px 24px)",
          backgroundBlendMode: "multiply",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80px 60px at 30% 70%, rgba(255,200,120,0.35), transparent 60%)," +
              "radial-gradient(ellipse 100px 70px at 75% 55%, rgba(220,140,80,0.3), transparent 60%)",
          }}
        />
        <svg
          className="absolute -bottom-px left-0 w-full"
          viewBox="0 0 320 24"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M13.3333 19.9209L0 21.922V24H320V9.9532L306.667 13.9365C293.333 17.9947 266.667 25.8493 240 22.9132C226.012 21.3142 212.024 16.7462 198.036 12.1782C185.358 8.03774 172.679 3.89723 160 1.96773C135.745 -1.65532 111.49 2.96779 87.2354 7.59096C84.8236 8.05068 82.4118 8.51039 80 8.96199C53.3333 13.8804 26.6667 17.9947 13.3333 19.9209Z"
            fill={theme.bgBody}
          />
        </svg>
      </div>

      <div
        className="absolute left-1/2 top-[165px] z-[2] flex size-[76px] -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-white"
        style={{ boxShadow: "0 8px 20px rgba(0,0,0,0.18)" }}
      >
        <div
          className="flex size-full items-center justify-center rounded-full text-[26px] font-bold tracking-tight text-white"
          style={{
            background: "linear-gradient(135deg, #1A2A4D 0%, #2C4470 100%)",
            fontFamily: '"Playfair Display", Georgia, serif',
          }}
        >
          TB
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 top-[252px] overflow-hidden px-4">
        <div className="text-center">
          <h1
            className="text-[22px] font-bold leading-[1.1] tracking-tight"
            style={{
              color: theme.title,
              fontFamily: '"Playfair Display", Georgia, serif',
            }}
          >
            Le Tire-Bouchon
          </h1>
          <p
            className="mt-1.5 text-[11px] italic leading-snug"
            style={{ color: theme.textBody, opacity: 0.7 }}
          >
            Bistrot bordelais · depuis 1987
          </p>
        </div>

        <div
          className="mt-4 flex items-center gap-2 border-b pb-2"
          style={{ borderColor: "rgba(26,42,77,0.12)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme.title}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 3v6a2 2 0 0 0 2 2v10" />
            <path d="M9 3v18" />
            <path d="M19 3c-2 0-3 3-3 6s1 4 3 4v8" />
          </svg>
          <span
            className="flex-1 text-[13px] font-bold tracking-tight"
            style={{
              color: theme.title,
              fontFamily: '"Playfair Display", Georgia, serif',
            }}
          >
            Entrées
          </span>
          <span
            className="text-[10px] font-medium"
            style={{
              color: theme.textBody,
              opacity: 0.5,
              fontFamily: "var(--font-mono)",
            }}
          >
            6 plats
          </span>
        </div>

        {[
          {
            title: "Tartare de bœuf",
            desc: "Couteau, jaune d'œuf, frites maison",
            price: "18,00€",
            nouveau: true,
            hue: "linear-gradient(135deg, #8B5A3C, #B07A4E)",
          },
          {
            title: "Burrata de Pouilles",
            desc: "Tomates anciennes, pesto basilic",
            price: "14,00€",
            nouveau: false,
            hue: "linear-gradient(135deg, #E8DCC4, #C8B889)",
          },
        ].map((p) => (
          <div
            key={p.title}
            className="mt-2.5 flex items-center gap-2.5 rounded-[10px] p-2.5"
            style={{
              background: theme.cardBody,
              boxShadow:
                "0 2px 6px rgba(26,42,77,0.06), 0 1px 2px rgba(26,42,77,0.04)",
            }}
          >
            <div
              className="relative size-[52px] shrink-0 overflow-hidden rounded-lg"
              style={{ background: p.hue }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 30px 24px at 50% 50%, rgba(255,255,255,0.25), transparent 70%)",
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span
                  className="text-[12px] font-bold leading-tight tracking-tight"
                  style={{
                    color: theme.title,
                    fontFamily: '"Playfair Display", Georgia, serif',
                  }}
                >
                  {p.title}
                </span>
                {p.nouveau && (
                  <span
                    className="rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white"
                    style={{ background: "#1A2A4D" }}
                  >
                    NEW
                  </span>
                )}
                <span className="text-[9px] opacity-70">🇫🇷</span>
              </div>
              <div
                className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-light leading-snug"
                style={{ color: theme.textBody, opacity: 0.7 }}
              >
                {p.desc}
              </div>
              <div
                className="mt-0.5 text-[9.5px] font-semibold italic"
                style={{ color: theme.title }}
              >
                Voir la photo
              </div>
            </div>
            <div
              className="text-[13px] font-bold tracking-tight"
              style={{
                color: theme.title,
                fontFamily: '"Playfair Display", Georgia, serif',
                fontFeatureSettings: '"tnum"',
              }}
            >
              {p.price}
            </div>
          </div>
        ))}

        <div
          className="mt-3 text-center text-[9px] font-medium uppercase tracking-[0.14em]"
          style={{
            color: theme.textBody,
            opacity: 0.4,
            fontFamily: "var(--font-mono)",
          }}
        >
          Propulsé par Ruliz
        </div>
      </div>

      <div
        aria-hidden
        className="absolute bottom-1.5 left-1/2 h-1 w-[110px] -translate-x-1/2 rounded-sm opacity-50"
        style={{ background: theme.title }}
      />
    </>
  );
}
