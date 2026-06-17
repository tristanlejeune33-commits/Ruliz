import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { sendMail } from "./resend";
import { emailLayout, lead, p, infoBox } from "./email-template";
import { getAuthUrl } from "./url";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: getAuthUrl(),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      const firstName = user.name?.split(" ")[0] ?? "";
      await sendMail({
        to: user.email,
        subject: "Réinitialise ton mot de passe Ruliz",
        html: emailLayout({
          title: "Réinitialise ton mot de passe",
          eyebrow: "Récupération de compte",
          preheader:
            "Lien valable 1h pour choisir un nouveau mot de passe Ruliz.",
          body: `
            ${lead(`Salut${firstName ? ` ${firstName}` : ""},`)}
            ${p("Tu as demandé à réinitialiser ton mot de passe sur Ruliz. Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.")}
            ${infoBox("⏱️ Ce lien est valable <strong>1 heure</strong>. Au-delà, il faudra refaire une demande.")}
          `,
          cta: { label: "Choisir un nouveau mot de passe", url },
          footnote:
            "Tu n'es pas à l'origine de cette demande ? Ignore cet email ton compte reste sûr, aucun changement n'a été fait.",
        }),
      });
    },
  },
  // Google OAuth — actif seulement si les credentials sont configurés
  // (Google Cloud Console → OAuth 2.0 Client ID, redirect URI :
  //  {BETTER_AUTH_URL}/api/auth/callback/google)
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  databaseHooks: {
    user: {
      create: {
        // Un signup email/password crée le User métier AVANT l'AuthUser
        // (signupClient) — ici on le retrouve par email et on le lie.
        // Un signup OAuth (Google) n'a PAS de User métier → on le crée
        // avec role=client, comme le flow self-service classique.
        after: async (authUser) => {
          try {
            const existing = await prisma.user.findUnique({
              where: { email: authUser.email },
              select: { id: true },
            });
            if (existing) {
              await prisma.authUser.update({
                where: { id: authUser.id },
                data: { userId: existing.id },
              });
              return;
            }
            const name = (authUser.name ?? "").trim();
            const [prenom, ...rest] = name.split(/\s+/);
            // Langue native depuis l'Accept-Language du navigateur (au lieu de
            // "fr" brut) : un restaurateur DE/EN qui s'inscrit via Google a sa
            // carte pré-réglée dans sa langue. Fallback "fr" si en-tête absent.
            let langueNative = "fr";
            try {
              const { headers } = await import("next/headers");
              const h = await headers();
              const browserLang = h
                .get("accept-language")
                ?.split(",")[0]
                ?.split("-")[0]
                ?.toLowerCase();
              const { isSupportedLang } = await import("@/lib/langs");
              if (isSupportedLang(browserLang)) langueNative = browserLang;
            } catch {
              // Hors contexte requête → garde "fr"
            }
            const user = await prisma.user.create({
              data: {
                email: authUser.email,
                prenom: prenom || null,
                nom: rest.length > 0 ? rest.join(" ") : null,
                role: "client",
                statut: "actif",
                langueNative,
              },
            });
            await prisma.authUser.update({
              where: { id: authUser.id },
              data: { userId: user.id },
            });
          } catch (e) {
            // Ne jamais bloquer le signup auth — le link est rattrapable
            console.error("[auth] user.create.after hook failed:", e);
          }
        },
      },
    },
  },
  user: {
    // Notre Prisma `User` est la table métier ; Better-Auth utilise `AuthUser`.
    modelName: "AuthUser",
    // Le rôle (admin/client/team) est stocké dans la table métier `users`,
    // pas dans `auth_user`. On garde juste un lien `userId` vers le User métier.
    additionalFields: {
      userId: {
        type: "number",
        required: false,
        input: false,
      },
    },
  },
  session: {
    modelName: "Session",
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min
    },
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
  advanced: {
    cookies: {
      session_token: {
        attributes: {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
