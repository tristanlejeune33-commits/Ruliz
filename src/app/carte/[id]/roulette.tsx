"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Star, X } from "lucide-react";
import type { PublicMenu } from "@/server/public/menu";
import { spinRoulette } from "@/server/dashboard/jeu-actions";

type Jeu = NonNullable<PublicMenu["jeu"]>;

interface RouletteProps {
  jeu: Jeu;
  accentColor: string;
  googleReviewUrl: string | null;
}

export function Roulette({ jeu, accentColor, googleReviewUrl }: RouletteProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-12 items-center gap-2 rounded-full px-5 text-sm font-medium text-white shadow-2xl"
        style={{ backgroundColor: accentColor }}
      >
        <Sparkles className="size-4" />
        Tente ta chance
      </button>
      <RouletteModal
        open={open}
        onClose={() => setOpen(false)}
        jeu={jeu}
        accentColor={accentColor}
        googleReviewUrl={googleReviewUrl}
      />
    </>
  );
}

function RouletteModal({
  open,
  onClose,
  jeu,
  accentColor,
  googleReviewUrl,
}: {
  open: boolean;
  onClose: () => void;
  jeu: Jeu;
  accentColor: string;
  googleReviewUrl: string | null;
}) {
  type Step = "intro" | "form" | "spinning" | "result";
  const [step, setStep] = useState<Step>("intro");
  const [pending, setPending] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number>(0);
  const [winningLabel, setWinningLabel] = useState<string>("");
  const [form, setForm] = useState({ prenom: "", email: "", telephone: "" });
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("intro");
    setPending(false);
    setError(null);
    setWinningIndex(0);
    setWinningLabel("");
    setForm({ prenom: "", email: "", telephone: "" });
  };

  const handleSpin = async () => {
    if (!form.prenom.trim() || !form.email.trim()) {
      setError("Prénom et email requis.");
      return;
    }
    setError(null);
    setPending(true);

    const res = await spinRoulette({
      jeuId: jeu.id,
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim(),
    });

    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data) {
      setWinningIndex(res.data.lotIndex);
      setWinningLabel(res.data.lotLabel);
      setStep("spinning");
      // Spin animation duration : 4s, then go to result
      setTimeout(() => setStep("result"), 4200);
    }
  };

  const handleStart = () => {
    if (jeu.requireGoogleReview && googleReviewUrl) {
      window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
    }
    setStep("form");
  };

  return (
    <AnimatePresence onExitComplete={reset}>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={step !== "spinning" ? onClose : undefined}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {step !== "spinning" && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow-md backdrop-blur"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            )}

            <div className="px-6 pt-8 pb-6">
              {step === "intro" && (
                <div className="space-y-4 text-center">
                  <Wheel lots={jeu.lots} winningIndex={null} accentColor={accentColor} />
                  <h2 className="text-balance text-xl font-semibold tracking-tight">
                    {jeu.cta || "Tente ta chance !"}
                  </h2>
                  <button
                    type="button"
                    onClick={handleStart}
                    className="w-full rounded-xl py-3 text-sm font-medium text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {jeu.requireGoogleReview && googleReviewUrl
                      ? "Laisser un avis Google et jouer"
                      : "Jouer"}
                  </button>
                  {jeu.requireGoogleReview && googleReviewUrl && (
                    <p className="text-xs text-neutral-500">
                      Tu seras redirigé vers Google. Reviens ensuite ici pour spin.
                    </p>
                  )}
                </div>
              )}

              {step === "form" && (
                <div className="space-y-4">
                  <h2 className="text-balance text-xl font-semibold tracking-tight">
                    Tes coordonnées
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Le restaurant pourra te recontacter pour t&apos;offrir ton lot.
                  </p>
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone (optionnel)"
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  {error && (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSpin}
                    disabled={pending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: accentColor }}
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    Spin la roue
                  </button>
                </div>
              )}

              {step === "spinning" && (
                <div className="space-y-4 text-center">
                  <Wheel
                    lots={jeu.lots}
                    winningIndex={winningIndex}
                    accentColor={accentColor}
                  />
                  <p className="text-sm font-medium text-neutral-600">
                    La roue tourne…
                  </p>
                </div>
              )}

              {step === "result" && (
                <div className="space-y-4 text-center">
                  <Wheel
                    lots={jeu.lots}
                    winningIndex={winningIndex}
                    accentColor={accentColor}
                    settled
                  />
                  <h2 className="text-balance text-2xl font-semibold tracking-tight">
                    Bravo !
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Tu as gagné <strong>{winningLabel}</strong>. Présente cet email à
                    ton serveur, il s&apos;occupera du reste 🎁
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl py-3 text-sm font-medium text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    Super, merci !
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Wheel({
  lots,
  winningIndex,
  accentColor,
  settled,
}: {
  lots: Jeu["lots"];
  winningIndex: number | null;
  accentColor: string;
  settled?: boolean;
}) {
  const total = lots.reduce((acc, l) => acc + l.probabilite, 0);
  const colors = [
    accentColor,
    "oklch(0.7 0.2 25)",
    "oklch(0.7 0.2 145)",
    "oklch(0.65 0.2 280)",
    "oklch(0.7 0.2 60)",
    "oklch(0.7 0.2 200)",
    "oklch(0.65 0.2 320)",
    "oklch(0.65 0.2 100)",
  ];

  // Compute cumulative angles per lot (precomputed to avoid mutation during render)
  const segments: Array<{
    lot: Jeu["lots"][number];
    start: number;
    angle: number;
    color: string;
  }> = [];
  {
    let cumulative = 0;
    for (let i = 0; i < lots.length; i++) {
      const lot = lots[i]!;
      const angle = (lot.probabilite / total) * 360;
      segments.push({
        lot,
        start: cumulative,
        angle,
        color: colors[i % colors.length] ?? colors[0]!,
      });
      cumulative += angle;
    }
  }

  // Determine where the winning index lies (mid of its segment)
  const winningSeg = winningIndex !== null ? segments[winningIndex] : null;
  const winningAngle = winningSeg ? winningSeg.start + winningSeg.angle / 2 : 0;

  // Pointer is at the top (12 o'clock) → we need to rotate the wheel
  // by `-winningAngle` so the winning segment lands under the pointer.
  // Add full turns for spectacle.
  const targetRotation =
    winningIndex !== null ? 360 * 5 - winningAngle : 0;

  return (
    <div className="relative mx-auto size-56">
      {/* Pointer */}
      <div
        className="absolute left-1/2 top-0 z-10 size-0 -translate-x-1/2"
        style={{
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: `18px solid ${accentColor}`,
        }}
      />
      <motion.svg
        viewBox="0 0 200 200"
        className="size-full"
        initial={{ rotate: 0 }}
        animate={{ rotate: targetRotation }}
        transition={
          settled
            ? { duration: 0 }
            : winningIndex !== null
              ? { duration: 4, ease: [0.16, 1, 0.3, 1] }
              : { duration: 0 }
        }
      >
        {segments.map((seg, i) => {
          const startRad = ((seg.start - 90) * Math.PI) / 180;
          const endRad = ((seg.start + seg.angle - 90) * Math.PI) / 180;
          const x1 = 100 + 90 * Math.cos(startRad);
          const y1 = 100 + 90 * Math.sin(startRad);
          const x2 = 100 + 90 * Math.cos(endRad);
          const y2 = 100 + 90 * Math.sin(endRad);
          const largeArc = seg.angle > 180 ? 1 : 0;

          const midRad =
            ((seg.start + seg.angle / 2 - 90) * Math.PI) / 180;
          const labelX = 100 + 55 * Math.cos(midRad);
          const labelY = 100 + 55 * Math.sin(midRad);

          return (
            <g key={i}>
              <path
                d={`M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={seg.color}
                stroke="white"
                strokeWidth={2}
                opacity={0.9}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                alignmentBaseline="middle"
                className="fill-white text-[6px] font-medium"
                transform={`rotate(${
                  seg.start + seg.angle / 2
                } ${labelX} ${labelY})`}
              >
                {seg.lot.label.length > 16
                  ? seg.lot.label.slice(0, 14) + "…"
                  : seg.lot.label}
              </text>
            </g>
          );
        })}
        <circle
          cx={100}
          cy={100}
          r={14}
          fill="white"
          stroke={accentColor}
          strokeWidth={3}
        />
        <Star
          x={92}
          y={92}
          width={16}
          height={16}
          fill={accentColor}
          stroke={accentColor}
        />
      </motion.svg>
    </div>
  );
}
