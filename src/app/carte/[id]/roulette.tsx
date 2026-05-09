"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";
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

// Brand icons inline (Lucide ne livre plus les marques)
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

/**
 * Modal "Tente ta chance" — réplique exacte du modal-spinning de l'ancien template Ruliz.
 *
 * 3 états :
 *  - "form"     : étape 1 (prénom, nom, naissance, tél, email, conditions) puis étape 2 (réseau)
 *  - "result"   : on affiche le lot gagné avec animation
 *  - "error"    : message d'erreur (déjà participé, etc.)
 *
 * Soumet via submitParticipation() qui :
 *  1. Valide les données
 *  2. Vérifie l'anti-spam (24h par email)
 *  3. Tire un lot selon les probabilités du jeu
 *  4. Insère dans `jeu_participations` + `base_clients`
 */
export function Roulette({
  jeu,
  open,
  onClose,
  accentColor,
  googleReviewUrl,
  facebookUrl,
  instagramUrl,
}: RouletteProps) {
  const [step, setStep] = useState<"form" | "submitting" | "result" | "error">(
    "form",
  );
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [lotGagne, setLotGagne] = useState<string | null>(null);
  const [conditionsOK, setConditionsOK] = useState(false);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    naissance: "",
    telephone: "",
    email: "",
  });

  const handleSocialSubmit = async (
    actionSociale: "facebook" | "instagram" | "google_review",
  ) => {
    if (!form.prenom || !form.nom || !form.telephone || !form.email) {
      toast.error("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (!conditionsOK) {
      toast.error("Tu dois accepter les règles du jeu.");
      return;
    }

    setStep("submitting");
    const res = await submitParticipation({
      jeuId: jeu.id,
      prenom: form.prenom,
      nom: form.nom,
      naissance: form.naissance,
      telephone: form.telephone,
      email: form.email,
      actionSociale,
    });

    if (!res.ok) {
      setErrorMsg(res.error);
      setStep("error");
      return;
    }

    setLotGagne(res.lotGagne);
    setStep("result");

    // Ouvre le réseau social demandé en nouvelle fenêtre
    const targetUrl =
      actionSociale === "facebook"
        ? facebookUrl
        : actionSociale === "instagram"
          ? instagramUrl
          : googleReviewUrl;
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const reset = () => {
    setStep("form");
    setErrorMsg("");
    setLotGagne(null);
    setConditionsOK(false);
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
            className="relative flex max-h-[92vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[10px] p-5 text-center text-white"
            style={{
              // Fond sombre en gradient navy → bleu nuit (réplique du bg.webp)
              background: `linear-gradient(135deg, ${accentColor} 0%, #0a1450 50%, ${accentColor} 100%)`,
              fontFamily: "var(--font-display)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                onClose();
                reset();
              }}
              className="absolute right-2.5 top-2.5 z-10 rounded-full p-1 text-white/80 hover:text-white"
              aria-label="Fermer"
            >
              <X className="size-6" />
            </button>

            {step === "form" || step === "submitting" ? (
              <FormStep
                jeu={jeu}
                form={form}
                setForm={setForm}
                conditionsOK={conditionsOK}
                setConditionsOK={setConditionsOK}
                onSocialSubmit={handleSocialSubmit}
                submitting={step === "submitting"}
                facebookUrl={facebookUrl}
                instagramUrl={instagramUrl}
                googleReviewUrl={googleReviewUrl}
              />
            ) : step === "result" ? (
              <ResultStep
                lotGagne={lotGagne}
                onClose={() => {
                  onClose();
                  reset();
                }}
              />
            ) : (
              <ErrorStep
                errorMsg={errorMsg}
                onRetry={reset}
                onClose={() => {
                  onClose();
                  reset();
                }}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Étape formulaire (1 + 2 sur le même écran, comme l'ancien template)
// ---------------------------------------------------------------------------

function FormStep({
  jeu,
  form,
  setForm,
  conditionsOK,
  setConditionsOK,
  onSocialSubmit,
  submitting,
  facebookUrl,
  instagramUrl,
  googleReviewUrl,
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
  onSocialSubmit: (
    actionSociale: "facebook" | "instagram" | "google_review",
  ) => void;
  submitting: boolean;
  facebookUrl: string | null;
  instagramUrl: string | null;
  googleReviewUrl: string | null;
}) {
  const ctaTitle = jeu.cta || "TENTE TA CHANCE !";

  return (
    <>
      {/* Titre principal */}
      <h1 className="whitespace-pre-line text-[35px] font-bold leading-tight">
        {ctaTitle.replace(/[\s]+/, "\n")}
      </h1>

      {/* Liste des lots — emoji + label sur fond blanc rounded */}
      {jeu.lots.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-2.5">
          {jeu.lots.slice(0, 3).map((lot, i) => (
            <li
              key={`${lot.label}-${i}`}
              className="flex flex-col items-center justify-center text-black"
            >
              <span className="z-10 -mb-1.5 text-[30px]">
                {extractEmoji(lot.label) ?? "🎁"}
              </span>
              <span className="rounded-[15px] bg-white px-2.5 py-1 text-[13px] font-medium">
                {removeEmoji(lot.label)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-base">Et bien d&apos;autres cadeaux à gagner...</p>

      {/* Étape 1 : badge */}
      <div className="flex justify-center">
        <span
          className="rounded-[15px] px-2.5 py-1 text-base text-white"
          style={{ backgroundColor: "#FF9B4A", minWidth: "60px" }}
        >
          Étape 1
        </span>
      </div>

      {/* Form */}
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => e.preventDefault()}
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

        <label className="mx-2 flex items-start gap-2 text-left">
          <input
            type="checkbox"
            checked={conditionsOK}
            onChange={(e) => setConditionsOK(e.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-[#FF9B4A]"
            required
          />
          <span className="text-[10px] leading-tight">
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

        {/* Étape 2 : badge */}
        <div className="mt-2 flex justify-center">
          <span
            className="rounded-[15px] px-2.5 py-1 text-base text-white"
            style={{ backgroundColor: "#FF9B4A", minWidth: "60px" }}
          >
            Étape 2
          </span>
        </div>

        <p className="text-sm uppercase tracking-wide">
          Suis-nous{" "}
          <span
            className="inline-block rounded-full bg-white px-1.5 py-1 text-[#3131ac]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            ou
          </span>{" "}
          laisse un avis
        </p>

        {/* Boutons sociaux : FB / IG / Google review */}
        <ul className="flex justify-center gap-2.5">
          {facebookUrl && (
            <SocialActionBtn
              onClick={() => onSocialSubmit("facebook")}
              disabled={submitting}
              ariaLabel="Participer via Facebook"
            >
              <FacebookIcon className="size-6" />
            </SocialActionBtn>
          )}
          {instagramUrl && (
            <SocialActionBtn
              onClick={() => onSocialSubmit("instagram")}
              disabled={submitting}
              ariaLabel="Participer via Instagram"
            >
              <InstagramIcon className="size-6" />
            </SocialActionBtn>
          )}
          {googleReviewUrl && (
            <SocialActionBtn
              onClick={() => onSocialSubmit("google_review")}
              disabled={submitting}
              ariaLabel="Participer via avis Google"
            >
              <Star className="size-6" />
            </SocialActionBtn>
          )}
        </ul>

        {submitting && (
          <p className="flex items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Validation en cours...
          </p>
        )}
      </form>
    </>
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
      className="rounded-[15px] border-0 px-2.5 py-2 text-base text-black"
      style={{ fontFamily: "var(--font-body)" }}
      required
    />
  );
}

function SocialActionBtn({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className="flex size-12 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 disabled:opacity-50"
      >
        {children}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Étape résultat
// ---------------------------------------------------------------------------

function ResultStep({
  lotGagne,
  onClose,
}: {
  lotGagne: string | null;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <motion.div
        initial={{ scale: 0.5, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-7xl"
      >
        🎉
      </motion.div>
      <h2 className="text-3xl font-bold leading-tight">
        Bravo !
      </h2>
      <p className="text-base">
        {lotGagne ? (
          <>
            Tu as gagné :<br />
            <span className="mt-2 inline-block rounded-[15px] bg-white px-4 py-2 text-lg font-semibold text-black">
              {lotGagne}
            </span>
          </>
        ) : (
          <>Merci pour ta participation !</>
        )}
      </p>
      <p className="text-sm opacity-80">
        Nous te recontacterons par email/SMS si tu fais partie des gagnants.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 rounded-full bg-[#FF9B4A] px-8 py-2.5 text-base font-bold uppercase text-white transition-transform hover:scale-105"
      >
        Fermer
      </button>
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
// Helpers : extraire un emoji du début d'un label de lot
// ---------------------------------------------------------------------------

function extractEmoji(text: string): string | null {
  // Regex grossier qui matche les premiers caractères pictographiques.
  // Couvre les emojis classiques (😍, 🎁, 💸, etc.) et les drapeaux.
  // eslint-disable-next-line no-misleading-character-class
  const match = text.match(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+/u);
  return match ? match[0] : null;
}

function removeEmoji(text: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return text
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, "")
    .trim();
}
