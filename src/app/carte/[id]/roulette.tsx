"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import type { PublicMenu } from "@/server/public/menu";
import { submitParticipation } from "@/server/public/jeu-actions";

type Jeu = NonNullable<PublicMenu["jeu"]>;

interface RouletteProps {
  jeu: Jeu;
  open: boolean;
  onClose: () => void;
  accentColor: string;
  googleReviewUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
}

type Step =
  | "form" // Étape 1 : formulaire infos
  | "social" // Étape 2 : "Pour participer" + bouton réseau
  | "countdown" // Étape 3 : compte à rebours 10s avant la roue
  | "wheel" // Étape 4 : roue à lancer
  | "victory" // Étape 5 : "BRAVO ! Tu as remporté X" + confettis
  | "error";

type ActionSociale = "facebook" | "instagram" | "google_review";

const COUNTDOWN_SECONDS = 10;

// Brand icons inline
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const ACTION_META: Record<ActionSociale, { label: string; brand: string; color: string; Icon: React.FC<{ className?: string }> }> = {
  facebook: {
    label: "SUIS-NOUS SUR FACEBOOK",
    brand: "Facebook",
    color: "#1877f2",
    Icon: FacebookIcon,
  },
  instagram: {
    label: "SUIS-NOUS SUR INSTAGRAM",
    brand: "Instagram",
    color: "#E1306C",
    Icon: InstagramIcon,
  },
  google_review: {
    label: "LAISSE UN AVIS GOOGLE",
    brand: "Google",
    color: "#fbbc04",
    Icon: Star,
  },
};

export function Roulette({
  jeu,
  open,
  onClose,
  accentColor,
  googleReviewUrl,
  facebookUrl,
  instagramUrl,
}: RouletteProps) {
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [lotGagne, setLotGagne] = useState<string | null>(null);
  const [conditionsOK, setConditionsOK] = useState(false);
  const [chosenAction, setChosenAction] = useState<ActionSociale | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    naissance: "",
    telephone: "",
    email: "",
  });

  const reset = () => {
    setStep("form");
    setErrorMsg("");
    setLotGagne(null);
    setConditionsOK(false);
    setChosenAction(null);
    setCountdown(COUNTDOWN_SECONDS);
    setSubmitting(false);
    setForm({ prenom: "", nom: "", naissance: "", telephone: "", email: "" });
  };

  // Compte à rebours
  useEffect(() => {
    if (step !== "countdown") return;
    if (countdown <= 0) {
      setStep("wheel");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // Confetti à la victoire
  useEffect(() => {
    if (step !== "victory") return;
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ["#FF9B4A", "#FFD700", "#22c55e", "#3b82f6", "#ef4444", "#a855f7"];
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [step]);

  const handleSubmitForm = () => {
    if (!form.prenom || !form.nom || !form.telephone || !form.email) {
      toast.error("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (!conditionsOK) {
      toast.error("Tu dois accepter les règles du jeu.");
      return;
    }
    setStep("social");
  };

  const chooseAction = (action: ActionSociale) => {
    setChosenAction(action);
    // Ouvre le réseau social demandé
    const targetUrl =
      action === "facebook"
        ? facebookUrl
        : action === "instagram"
          ? instagramUrl
          : googleReviewUrl;
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
    setCountdown(COUNTDOWN_SECONDS);
    setStep("countdown");
  };

  const lancerLaRoue = async () => {
    if (!chosenAction) return;
    setSubmitting(true);
    const res = await submitParticipation({
      jeuId: jeu.id,
      prenom: form.prenom,
      nom: form.nom,
      naissance: form.naissance,
      telephone: form.telephone,
      email: form.email,
      actionSociale: chosenAction,
    });
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error);
      setStep("error");
      return;
    }
    setLotGagne(res.lotGagne);
    setStep("victory");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            onClose();
            reset();
          }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(5px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[95vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[10px] p-5 text-center"
            style={{
              background:
                step === "wheel" || step === "victory"
                  ? `repeating-conic-gradient(from 0deg at 50% 50%, ${accentColor} 0deg 18deg, #2350c8 18deg 36deg)`
                  : `linear-gradient(135deg, ${accentColor} 0%, #0a1450 50%, ${accentColor} 100%)`,
              color: "white",
              fontFamily: "var(--font-display)",
              minHeight: step === "wheel" ? "560px" : undefined,
            }}
          >
            <button
              type="button"
              onClick={() => {
                onClose();
                reset();
              }}
              className="absolute right-2.5 top-2.5 z-10 flex size-9 items-center justify-center rounded-full bg-white text-black shadow-md hover:scale-105"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>

            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <FormStep
                    jeu={jeu}
                    form={form}
                    setForm={setForm}
                    conditionsOK={conditionsOK}
                    setConditionsOK={setConditionsOK}
                    onSubmit={handleSubmitForm}
                    facebookUrl={facebookUrl}
                    instagramUrl={instagramUrl}
                    googleReviewUrl={googleReviewUrl}
                  />
                </motion.div>
              )}
              {step === "social" && (
                <motion.div
                  key="social"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <SocialStep
                    onBack={() => setStep("form")}
                    onChoose={chooseAction}
                    facebookUrl={facebookUrl}
                    instagramUrl={instagramUrl}
                    googleReviewUrl={googleReviewUrl}
                  />
                </motion.div>
              )}
              {step === "countdown" && (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <CountdownStep
                    countdown={countdown}
                    chosenAction={chosenAction}
                  />
                </motion.div>
              )}
              {step === "wheel" && (
                <motion.div
                  key="wheel"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <WheelStep
                    lots={jeu.lots}
                    onSpin={lancerLaRoue}
                    submitting={submitting}
                  />
                </motion.div>
              )}
              {step === "victory" && (
                <motion.div
                  key="victory"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <VictoryStep lotGagne={lotGagne} />
                </motion.div>
              )}
              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <ErrorStep
                    errorMsg={errorMsg}
                    onRetry={reset}
                    onClose={() => {
                      onClose();
                      reset();
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// ÉTAPE 1 : Formulaire (avec liste des lots)
// ---------------------------------------------------------------------------

function FormStep({
  jeu,
  form,
  setForm,
  conditionsOK,
  setConditionsOK,
  onSubmit,
}: {
  jeu: Jeu;
  form: {
    prenom: string;
    nom: string;
    naissance: string;
    telephone: string;
    email: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  conditionsOK: boolean;
  setConditionsOK: (v: boolean) => void;
  onSubmit: () => void;
  facebookUrl: string | null;
  instagramUrl: string | null;
  googleReviewUrl: string | null;
}) {
  const ctaTitle = jeu.cta || "Laisse-nous un avis Google et tente de gagner !";

  return (
    <div className="flex flex-col gap-4">
      {/* Titre */}
      <h1 className="text-balance text-[28px] font-bold leading-tight md:text-[32px]">
        {ctaTitle}
      </h1>

      {/* Liste des lots avec emojis */}
      {jeu.lots.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-2.5">
          {jeu.lots.slice(0, 3).map((lot, i) => {
            const emoji = extractEmoji(lot.label) ?? "🎁";
            const text = removeEmoji(lot.label);
            return (
              <li
                key={`${lot.label}-${i}`}
                className="flex flex-col items-center justify-center text-black"
              >
                <span className="z-10 -mb-1.5 text-[30px]">{emoji}</span>
                <span className="rounded-[15px] bg-white px-2.5 py-1 text-[13px] font-medium">
                  {text}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-base">Et bien d&apos;autres cadeaux à gagner...</p>

      {/* Étape 1 */}
      <div className="flex justify-center">
        <span
          className="rounded-[15px] px-3 py-1 text-base font-medium text-white"
          style={{ backgroundColor: "#FF9B4A" }}
        >
          Étape 1
        </span>
      </div>

      {/* Form */}
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <FormInput
          name="prenom"
          placeholder="Prénom"
          value={form.prenom}
          onChange={(v) => setForm((f) => ({ ...f, prenom: v }))}
        />
        <FormInput
          name="nom"
          placeholder="Nom"
          value={form.nom}
          onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
        />
        <FormInput
          name="naissance"
          placeholder="Date de naissance (jj/mm/aaaa)"
          value={form.naissance}
          onChange={(v) => setForm((f) => ({ ...f, naissance: v }))}
        />
        <FormInput
          name="telephone"
          type="tel"
          placeholder="Téléphone"
          value={form.telephone}
          onChange={(v) => setForm((f) => ({ ...f, telephone: v }))}
        />
        <FormInput
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
        />

        <label className="mx-2 mt-1 flex cursor-pointer items-start gap-2 text-left">
          <input
            type="checkbox"
            checked={conditionsOK}
            onChange={(e) => setConditionsOK(e.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-[#FF9B4A]"
            required
          />
          <span className="text-[11px] leading-tight text-white/95">
            *Je confirme avoir pris connaissance et accepté les{" "}
            <a
              href="https://ruliz.fr/dp"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              règles du jeu
            </a>
            .
          </span>
        </label>

        {/* Étape 2 (rappel) */}
        <div className="mt-2 flex justify-center">
          <span
            className="rounded-[15px] px-3 py-1 text-base font-medium text-white"
            style={{ backgroundColor: "#FF9B4A" }}
          >
            Étape 2
          </span>
        </div>

        <button
          type="submit"
          className="mx-auto mt-2 rounded-full px-8 py-3 text-base font-bold uppercase tracking-wide text-white transition-transform hover:scale-105"
          style={{ backgroundColor: "#FF9B4A" }}
        >
          Continuer
        </button>
      </form>
    </div>
  );
}

function FormInput({
  name,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-[15px] border-0 bg-white px-3 py-2.5 text-base text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF9B4A]"
      style={{ fontFamily: "var(--font-body)", colorScheme: "light" }}
      required
    />
  );
}

// ---------------------------------------------------------------------------
// ÉTAPE 2 : "Pour participer" (3 instructions + bouton réseau)
// ---------------------------------------------------------------------------

function SocialStep({
  onBack,
  onChoose,
  facebookUrl,
  instagramUrl,
  googleReviewUrl,
}: {
  onBack: () => void;
  onChoose: (action: ActionSociale) => void;
  facebookUrl: string | null;
  instagramUrl: string | null;
  googleReviewUrl: string | null;
}) {
  const [hovered, setHovered] = useState<ActionSociale | null>(null);

  // On affiche les actions disponibles dans cet ordre
  const actions: ActionSociale[] = [];
  if (instagramUrl) actions.push("instagram");
  if (facebookUrl) actions.push("facebook");
  if (googleReviewUrl) actions.push("google_review");

  // Modal blanche pour cette étape (différent du bg sombre)
  return (
    <div
      className="-mx-5 -mt-5 mb-[-20px] flex flex-col gap-5 rounded-t-[10px] bg-white px-6 py-8 text-black md:rounded-[10px] md:m-0"
      style={{ minHeight: "440px" }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-black"
      >
        <ArrowLeft className="size-4" />
        Retour
      </button>

      <h2
        className="mt-6 text-center text-2xl font-bold md:text-3xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Pour participer :
      </h2>

      <ol className="space-y-4 px-2">
        <Step number={1} text="Suis notre compte" />
        <Step number={2} text="Tape sur le bouton retour du téléphone" />
        <Step number={3} text="Reviens sur le jeu" />
      </ol>

      <div className="flex flex-col gap-2.5 px-2">
        {actions.map((action) => {
          const meta = ACTION_META[action];
          const { Icon } = meta;
          const isHovered = hovered === action;
          return (
            <button
              key={action}
              type="button"
              onMouseEnter={() => setHovered(action)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChoose(action)}
              className="flex items-center justify-center gap-3 rounded-md border-2 border-black px-4 py-3.5 text-sm font-bold tracking-wide text-black transition-all hover:bg-black hover:text-white"
              style={{
                fontFamily: "var(--font-body)",
                backgroundColor: isHovered ? "black" : "white",
              }}
            >
              <span style={{ color: isHovered ? "white" : meta.color }}>
                <Icon className="size-5" />
              </span>
              {meta.label}
            </button>
          );
        })}
      </div>

      <p className="mt-auto text-center text-xs italic text-neutral-500">
        Votre avis ou votre abonnement n&apos;influencera pas vos chances de gagner.
      </p>
    </div>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
        {number}
      </span>
      <span className="text-sm font-medium md:text-base">{text}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// ÉTAPE 3 : Compte à rebours
// ---------------------------------------------------------------------------

function CountdownStep({
  countdown,
  chosenAction,
}: {
  countdown: number;
  chosenAction: ActionSociale | null;
}) {
  return (
    <div
      className="-mx-5 -mt-5 mb-[-20px] flex flex-col gap-5 rounded-t-[10px] bg-white px-6 py-8 text-black md:m-0 md:rounded-[10px]"
      style={{ minHeight: "440px" }}
    >
      <h2
        className="mt-6 text-center text-2xl font-bold md:text-3xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Pour participer :
      </h2>

      <ol className="space-y-4 px-2">
        <Step number={1} text="Suis notre compte" />
        <Step number={2} text="Tape sur le bouton retour du téléphone" />
        <Step number={3} text="Reviens sur le jeu" />
      </ol>

      <div className="mt-4 rounded-md border-2 border-black px-4 py-5 text-center">
        <p
          className="text-base font-bold uppercase leading-tight tracking-wide"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Veuillez patienter {countdown} {countdown > 1 ? "secondes" : "seconde"}{" "}
          pour accéder à la roulette.
        </p>
      </div>

      <p className="mt-auto text-center text-xs italic text-neutral-500">
        {chosenAction === "google_review"
          ? "Merci pour ton avis ! "
          : "Merci de t'être abonné ! "}
        Votre avis ou votre abonnement n&apos;influencera pas vos chances de gagner.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ÉTAPE 4 : Roue (carrousel des lots avec arrows + bouton "Lancer")
// ---------------------------------------------------------------------------

function WheelStep({
  lots,
  onSpin,
  submitting,
}: {
  lots: Array<{ label: string; probabilite: number }>;
  onSpin: () => void;
  submitting: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSpin = () => {
    if (spinning || submitting) return;
    setSpinning(true);
    // Animation : on défile rapidement les lots avec ralentissement progressif
    let speed = 80;
    let elapsed = 0;
    const totalDuration = 3500;
    const tick = () => {
      setActiveIdx((i) => (i + 1) % lots.length);
      elapsed += speed;
      if (elapsed < totalDuration) {
        speed = Math.min(speed + 8, 350);
        intervalRef.current = setTimeout(tick, speed);
      } else {
        setSpinning(false);
        // On déclenche la submit qui détermine le vrai lot côté serveur
        onSpin();
      }
    };
    intervalRef.current = setTimeout(tick, speed);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, []);

  if (lots.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-base">Aucun lot configuré pour ce jeu.</p>
      </div>
    );
  }

  const prevIdx = (activeIdx - 1 + lots.length) % lots.length;
  const nextIdx = (activeIdx + 1) % lots.length;

  return (
    <div className="relative flex flex-col items-center gap-6 py-4">
      <h1 className="whitespace-pre-line text-center text-[35px] font-bold leading-tight">
        TENTE{`\n`}TA CHANCE !
      </h1>

      {/* Indicateur haut */}
      <div className="text-white/90">▼</div>

      {/* Carrousel : lot précédent, actuel, suivant */}
      <div className="relative flex w-full items-center justify-center gap-2">
        <SideCard label={lots[prevIdx]?.label ?? ""} side="left" />
        <CenterCard
          label={lots[activeIdx]?.label ?? ""}
          spinning={spinning}
        />
        <SideCard label={lots[nextIdx]?.label ?? ""} side="right" />
      </div>

      {/* Indicateur bas */}
      <div className="text-white/90">▲</div>

      <button
        type="button"
        onClick={handleSpin}
        disabled={spinning || submitting}
        className="rounded-full px-10 py-3 text-lg font-bold uppercase tracking-wide text-white transition-transform hover:scale-105 disabled:opacity-60"
        style={{ backgroundColor: "#FF9B4A" }}
      >
        {submitting ? (
          <Loader2 className="size-5 animate-spin" />
        ) : spinning ? (
          "..."
        ) : (
          "Lancer la roue"
        )}
      </button>
    </div>
  );
}

function CenterCard({ label, spinning }: { label: string; spinning: boolean }) {
  const emoji = extractEmoji(label) ?? "🎁";
  const text = removeEmoji(label);
  return (
    <motion.div
      animate={spinning ? { rotateX: [0, 360], scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.15, repeat: spinning ? Infinity : 0 }}
      className="relative z-10 flex h-44 w-40 flex-col items-center justify-center gap-2 rounded-md border-4 border-[#FF9B4A] bg-neutral-100 px-3 py-4 text-center text-black md:h-52 md:w-48"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,155,74,0.1) 4px, rgba(255,155,74,0.1) 6px)",
      }}
    >
      <div
        className="absolute inset-1.5 border-2 border-dashed border-[#FF9B4A]/40"
        aria-hidden
      />
      <p
        className="text-balance text-[15px] font-bold leading-tight md:text-base"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {text}
      </p>
      <span className="text-3xl">{emoji}</span>
    </motion.div>
  );
}

function SideCard({ label, side }: { label: string; side: "left" | "right" }) {
  const emoji = extractEmoji(label) ?? "🎁";
  const text = removeEmoji(label);
  return (
    <div
      className="flex h-32 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-md bg-white p-2 text-center text-black opacity-70"
      style={{
        marginLeft: side === "left" ? "-24px" : 0,
        marginRight: side === "right" ? "-24px" : 0,
        transform:
          side === "left" ? "rotate(-3deg) scale(0.85)" : "rotate(3deg) scale(0.85)",
      }}
    >
      <p className="line-clamp-3 text-[10px] font-bold leading-tight">{text}</p>
      <span className="text-xl">{emoji}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ÉTAPE 5 : Victoire (BRAVO + lot + confetti + "Retrouve ton gain dans tes mails")
// ---------------------------------------------------------------------------

function VictoryStep({ lotGagne }: { lotGagne: string | null }) {
  return (
    <div className="relative flex min-h-[440px] flex-col items-center justify-center gap-3 py-8">
      <h1 className="text-[42px] font-bold leading-tight">BRAVO !</h1>
      <p className="text-base">Tu as remporté</p>
      <p
        className="text-balance text-2xl font-bold leading-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {lotGagne ?? "un cadeau mystère"}
      </p>

      {/* Coupe trophée animée */}
      <motion.div
        initial={{ y: -20, rotate: -10 }}
        animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="my-4 text-7xl md:text-8xl"
      >
        🏆
      </motion.div>

      <p className="text-balance text-base font-semibold uppercase tracking-wide">
        Retrouve ton gain dans tes mails
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Étape erreur
// ---------------------------------------------------------------------------

function ErrorStep({
  errorMsg,
  onRetry,
  onClose,
}: {
  errorMsg: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">😕</div>
      <h2 className="text-2xl font-bold">Oups !</h2>
      <div
        className="rounded-[15px] px-4 py-2 text-sm"
        style={{
          backgroundColor: "#f8d7da",
          color: "#721c24",
          border: "1px solid #f5c6cb",
        }}
      >
        {errorMsg}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold uppercase hover:bg-white/30"
        >
          Réessayer
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-[#FF9B4A] px-4 py-2 text-sm font-semibold uppercase text-white"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractEmoji(text: string): string | null {
  const match = text.match(
    /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+/u,
  );
  return match ? match[0] : null;
}

function removeEmoji(text: string): string {
  return text
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, "")
    .trim();
}
