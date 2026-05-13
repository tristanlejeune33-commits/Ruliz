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
            "Tu n'es pas à l'origine de cette demande ? Ignore cet email — ton compte reste sûr, aucun changement n'a été fait.",
        }),
      });
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
