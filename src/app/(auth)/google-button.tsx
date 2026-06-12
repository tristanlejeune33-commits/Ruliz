"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

/**
 * Bouton "Continuer avec Google" partagé login + signup.
 *
 * `signIn.social` déclenche une redirection plein écran vers Google puis
 * revient sur `callbackURL` — pas de gestion de session côté client ici.
 * Le User métier (role=client) est créé/lié par le databaseHook
 * `user.create.after` dans src/lib/auth.ts.
 *
 * Styles en HEX explicites, comme les formulaires auth (pas de var() pour
 * ne pas dépendre de la cascade de thème).
 */
export function GoogleButton({ redirectTo }: { redirectTo?: string }) {
  const [pending, setPending] = useState(false);

  const callbackURL =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";

  async function handleClick() {
    setPending(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL });
    } catch (err) {
      console.error("[auth] signIn.social google failed:", err);
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2.5 transition active:scale-[0.99] disabled:opacity-70"
      style={{
        height: 44,
        fontSize: 14,
        fontWeight: 600,
        color: "#0B1530",
        background: "#FFFFFF",
        border: "1px solid #D8E1F3",
        borderRadius: 12,
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.29A7.16 7.16 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
          />
        </svg>
      )}
      <span>Continuer avec Google</span>
    </button>
  );
}

/** Séparateur "ou" entre le bouton Google et le formulaire email. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div style={{ height: 1, flex: 1, background: "#D8E1F3" }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: "#5e6b85" }}>
        ou
      </span>
      <div style={{ height: 1, flex: 1, background: "#D8E1F3" }} />
    </div>
  );
}
