"use client";

import { useEffect, useMemo, useState } from "react";
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

// Couleurs FIXES de la roulette — indépendantes du thème restaurant.
// Le restaurateur configure couleurPrimaire pour la carte, mais la modal jeu
// reste toujours dans la palette navy/orange Ruliz pour cohérence d'image.
const WHEEL_BG = `repeating-conic-gradient(from 0deg at 50% 50%, #1849c9 0deg 18deg, #3b6ee8 18deg 36deg)`;
const FORM_BG = `linear-gradient(135deg, #1849c9 0%, #0a1450 50%, #1849c9 100%)`;
const MODAL_MIN_HEIGHT = "560px"; // gardé constant pour éviter le collapse en transition

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
    // Email validation : regex stricte (RFC 5322 simplifiée)
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRe.test(form.email.trim())) {
      toast.error("Email invalide. Format attendu : nom@domaine.fr");
      return;
    }
    // Téléphone : doit avoir entre 8 et 15 chiffres (E.164 max), peut
    // contenir espaces, tirets, parenthèses, +
    const phoneDigits = form.telephone.replace(/\D/g, "");
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      toast.error(
        "Numéro de téléphone invalide (8 à 15 chiffres attendus).",
      );
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
            className="relative flex max-h-[95vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-[10px] p-4 text-center sm:gap-4 sm:p-5"
            style={{
              // Couleurs FIXES indépendantes du thème resto
              background:
                step === "wheel" || step === "victory" ? WHEEL_BG : FORM_BG,
              color: "white",
              fontFamily: "var(--font-display)",
              // Hauteur min CONSTANTE pour wheel + victory + countdown afin
              // d'éviter que la modal "s'écrase" pendant la transition.
              minHeight:
                step === "wheel" || step === "victory" || step === "countdown"
                  ? MODAL_MIN_HEIGHT
                  : undefined,
            }}
          >
            <button
              type="button"
              onClick={() => {
                onClose();
                reset();
              }}
              className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-white text-black shadow-md hover:scale-105 sm:right-2.5 sm:top-2.5 sm:size-9"
              aria-label="Fermer"
            >
              <X className="size-4 sm:size-5" />
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
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Titre — pr-10 pour ne pas se faire chevaucher par le bouton X */}
      <h1 className="text-balance pr-10 text-[22px] font-bold leading-tight sm:pr-8 sm:text-[28px] md:text-[32px]">
        {ctaTitle}
      </h1>

      {/* Liste des lots avec emojis ou image custom */}
      {jeu.lots.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
          {jeu.lots.slice(0, 3).map((lot, i) => {
            const emoji = extractEmoji(lot.label) ?? "🎁";
            const text = removeEmoji(lot.label);
            const hasImage = !!lot.imageUrl;
            return (
              <li
                key={`${lot.label}-${i}`}
                className="flex flex-col items-center justify-center text-black"
              >
                {hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lot.imageUrl}
                    alt=""
                    className="z-10 -mb-1.5 size-8 rounded-full bg-white object-cover shadow-md sm:size-9"
                  />
                ) : (
                  <span className="z-10 -mb-1.5 text-[26px] sm:text-[30px]">
                    {emoji}
                  </span>
                )}
                <span className="rounded-[15px] bg-white px-2 py-0.5 text-[12px] font-medium sm:px-2.5 sm:py-1 sm:text-[13px]">
                  {text}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm sm:text-base">
        Et bien d&apos;autres cadeaux à gagner...
      </p>

      {/* Étape 1 */}
      <div className="flex justify-center">
        <span
          className="rounded-[15px] px-3 py-0.5 text-sm font-medium text-white sm:py-1 sm:text-base"
          style={{ backgroundColor: "#FF9B4A" }}
        >
          Étape 1
        </span>
      </div>

      {/* Form */}
      <form
        className="flex flex-col gap-2 sm:gap-2.5"
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
          placeholder="Téléphone (06 12 34 56 78)"
          value={form.telephone}
          onChange={(v) => setForm((f) => ({ ...f, telephone: formatPhoneFR(v) }))}
          maxLength={20}
        />
        <FormInput
          name="email"
          type="email"
          placeholder="Email (ex: marie@gmail.com)"
          value={form.email}
          onChange={(v) =>
            setForm((f) => ({ ...f, email: v.trim().toLowerCase() }))
          }
          inputMode="email"
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
        <div className="mt-1.5 flex justify-center sm:mt-2">
          <span
            className="rounded-[15px] px-3 py-0.5 text-sm font-medium text-white sm:py-1 sm:text-base"
            style={{ backgroundColor: "#FF9B4A" }}
          >
            Étape 2
          </span>
        </div>

        <button
          type="submit"
          className="mx-auto mt-1.5 rounded-full px-7 py-2.5 text-[15px] font-bold uppercase tracking-wide text-white transition-transform hover:scale-105 sm:mt-2 sm:px-8 sm:py-3 sm:text-base"
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
  maxLength,
  inputMode,
}: {
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  inputMode?: "text" | "tel" | "email" | "numeric";
}) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      inputMode={inputMode}
      autoComplete={
        type === "email" ? "email" : type === "tel" ? "tel" : undefined
      }
      className="rounded-[15px] border-0 bg-white px-3 py-2 text-[15px] text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF9B4A] sm:py-2.5 sm:text-base"
      style={{ fontFamily: "var(--font-body)", colorScheme: "light" }}
      required
    />
  );
}

/**
 * Format un numéro de téléphone français en groupes de 2 chiffres.
 * Accepte 0-prefixed (06 XX XX XX XX) ou international (+33 6 XX XX XX XX).
 * Strip tout sauf chiffres et '+', puis groupe par 2.
 */
function formatPhoneFR(input: string): string {
  // Garde uniquement chiffres et le + initial
  let cleaned = input.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    // International : +33 6 XX XX XX XX → garde le + + pays + groupes de 2
    const plus = "+";
    const rest = cleaned.slice(1).replace(/\D/g, "");
    if (rest.length <= 2) return plus + rest;
    if (rest.length <= 3) return plus + rest.slice(0, 2) + " " + rest.slice(2);
    // +33 6 12 34 56 78
    const country = rest.slice(0, 2);
    const num = rest.slice(2);
    const groups: string[] = [];
    for (let i = 0; i < num.length; i += 2) {
      groups.push(num.slice(i, i + 2));
    }
    return plus + country + " " + groups.join(" ");
  }
  cleaned = cleaned.replace(/\D/g, "");
  // Format français standard : 06 12 34 56 78 (groupes de 2)
  const groups: string[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    groups.push(cleaned.slice(i, i + 2));
  }
  return groups.join(" ").trim();
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

      {/* Rappel règles du jeu — lien permanent en bas */}
      <p className="text-center text-[10px] text-neutral-400">
        ✓ En participant, vous acceptez les{" "}
        <a
          href="https://ruliz.fr/dp"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-neutral-700"
        >
          règles du jeu
        </a>
        .
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

      {/* Rappel règles du jeu — lien permanent en bas */}
      <p className="text-center text-[10px] text-neutral-400">
        ✓ En participant, vous acceptez les{" "}
        <a
          href="https://ruliz.fr/dp"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-neutral-700"
        >
          règles du jeu
        </a>
        .
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ÉTAPE 4 : Roue (carrousel des lots avec arrows + bouton "Lancer")
// ---------------------------------------------------------------------------

/**
 * Slot machine vertical : le reel défile vers le haut très vite, ralentit
 * progressivement (cubic-out) et s'arrête sur un lot final qui pulse.
 *
 * On utilise une astuce : on duplique la liste des lots N fois pour avoir
 * une longue piste, puis on translate-Y avec ease-out smooth via Framer
 * Motion. Le rendu est convaincant et CPU-friendly (pas de setInterval).
 */
function WheelStep({
  lots,
  onSpin,
  submitting,
}: {
  lots: Array<{ label: string; probabilite: number; imageUrl?: string }>;
  onSpin: () => void;
  submitting: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "stopped">("idle");
  const [finalIdx, setFinalIdx] = useState<number | null>(null);

  // Hauteur d'un slot — doit être en sync avec la hauteur réelle
  const SLOT_HEIGHT = 80; // px
  const VISIBLE_SLOTS = 3; // on en montre 3 (centre + haut/bas masqués par fade)
  const REPETITIONS = 8; // nb de tours complets avant l'arrêt

  // Piste : on duplique les lots REPETITIONS fois + un index final
  const reelItems = useMemo(() => {
    if (lots.length === 0) return [] as typeof lots;
    const copies: typeof lots = [];
    for (let i = 0; i < REPETITIONS; i++) {
      copies.push(...lots);
    }
    return copies;
  }, [lots]);

  const handleSpin = () => {
    if (phase !== "idle" || submitting) return;
    setPhase("spinning");
    // On choisit un index "final" arbitraire dans la dernière copie (la wheel
    // s'arrêtera dessus visuellement, mais le SERVEUR détermine le vrai lot
    // dans `onSpin`). Pour donner un bel effet, on va simuler un lot aléatoire.
    const randomLot = Math.floor(Math.random() * lots.length);
    const finalReelIdx = (REPETITIONS - 1) * lots.length + randomLot;
    setFinalIdx(finalReelIdx);

    // Au bout de 3.5s on déclenche le submit serveur
    setTimeout(() => {
      setPhase("stopped");
      onSpin();
    }, 3500);
  };

  if (lots.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-base">Aucun lot configuré pour ce jeu.</p>
      </div>
    );
  }

  // Calcul du translate-Y final pour centrer l'item finalIdx dans la fenêtre.
  // Le centre de la fenêtre est à (VISIBLE_SLOTS / 2) * SLOT_HEIGHT
  // On veut que finalIdx soit à ce centre → translateY = -finalIdx * SLOT
  //                                                + (VISIBLE_SLOTS-1)/2 * SLOT
  const reelHeight = SLOT_HEIGHT * VISIBLE_SLOTS;
  const targetY =
    finalIdx !== null
      ? -(finalIdx * SLOT_HEIGHT) +
        ((VISIBLE_SLOTS - 1) / 2) * SLOT_HEIGHT
      : 0;

  return (
    <div className="relative flex flex-col items-center gap-5 py-4">
      <h1 className="whitespace-pre-line text-center text-[35px] font-bold leading-tight">
        TENTE{`\n`}TA CHANCE !
      </h1>

      {/* Indicateur de sélection (flèches qui pointent vers le centre) */}
      <div className="relative w-full">
        <span
          className="absolute -left-1 top-1/2 z-20 -translate-y-1/2 text-2xl text-[#FF9B4A] drop-shadow-lg"
          aria-hidden
        >
          ▶
        </span>
        <span
          className="absolute -right-1 top-1/2 z-20 -translate-y-1/2 text-2xl text-[#FF9B4A] drop-shadow-lg"
          aria-hidden
        >
          ◀
        </span>

        {/* Fenêtre du slot — overflow hidden, force text-black pour les lots */}
        <div
          className="relative mx-auto w-[260px] overflow-hidden rounded-[16px] border-2 border-[#FF9B4A] bg-white/95 text-black shadow-2xl md:w-[300px]"
          style={{ height: `${reelHeight}px` }}
        >
          {/* Fade haut + bas pour effet 3D */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[80px] bg-gradient-to-b from-white/95 via-white/40 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[80px] bg-gradient-to-t from-white/95 via-white/40 to-transparent"
            aria-hidden
          />

          {/* Ligne centrale orange (indicateur de gain) */}
          <div
            className="pointer-events-none absolute inset-x-2 top-1/2 z-[5] h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#FF9B4A] to-transparent"
            aria-hidden
          />

          {/* Le reel qui scrolle */}
          <motion.div
            animate={{ y: phase === "idle" ? 0 : targetY }}
            transition={
              phase === "spinning"
                ? {
                    duration: 3.5,
                    ease: [0.16, 0.85, 0.32, 1], // cubic ease-out (decelerate)
                  }
                : { duration: 0 }
            }
            className="absolute inset-x-0 top-0 flex flex-col"
          >
            {reelItems.map((lot, i) => {
              const emoji = extractEmoji(lot.label) ?? "🎁";
              const text = removeEmoji(lot.label);
              const hasImage = !!lot.imageUrl;
              const isWinning = i === finalIdx && phase === "stopped";
              return (
                <div
                  key={i}
                  className="flex shrink-0 items-center justify-center gap-3 px-4 text-center text-black"
                  style={{ height: `${SLOT_HEIGHT}px` }}
                >
                  <motion.div
                    animate={
                      isWinning
                        ? {
                            scale: [1, 1.12, 1],
                            color: ["#000", "#FF9B4A", "#000"],
                          }
                        : {}
                    }
                    transition={{
                      duration: 0.6,
                      repeat: isWinning ? 3 : 0,
                    }}
                    className="flex items-center gap-3 text-black"
                  >
                    {hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lot.imageUrl}
                        alt=""
                        className="size-12 rounded-md object-cover md:size-14"
                      />
                    ) : (
                      <span className="text-3xl md:text-4xl">{emoji}</span>
                    )}
                    <span
                      className="text-balance text-base font-bold leading-tight text-black md:text-lg"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {text}
                    </span>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Sous-titre dynamique */}
      <p className="text-center text-sm font-medium opacity-90">
        {phase === "idle"
          ? "Appuie pour lancer la roue"
          : phase === "spinning"
            ? "🎲 Tirage en cours…"
            : submitting
              ? "Validation…"
              : "🎉"}
      </p>

      <button
        type="button"
        onClick={handleSpin}
        disabled={phase !== "idle" || submitting}
        className="rounded-full px-10 py-3 text-lg font-bold uppercase tracking-wide text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          backgroundColor: "#FF9B4A",
          boxShadow:
            phase === "idle"
              ? "0 0 0 0 rgba(255, 155, 74, 0.7)"
              : "0 0 30px rgba(255, 155, 74, 0.5)",
          animation:
            phase === "idle" ? "pulse-cta 2s ease-in-out infinite" : undefined,
        }}
      >
        {submitting ? (
          <Loader2 className="size-5 animate-spin" />
        ) : phase === "spinning" ? (
          "..."
        ) : (
          "Lancer la roue"
        )}
      </button>

      {/* Style inline pour l'animation pulse-cta */}
      <style jsx>{`
        @keyframes pulse-cta {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 155, 74, 0.7);
          }
          50% {
            box-shadow: 0 0 0 14px rgba(255, 155, 74, 0);
          }
        }
      `}</style>
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
