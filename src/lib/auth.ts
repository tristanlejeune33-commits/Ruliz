import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { prisma } from "./db";
import { sendMail } from "./resend";
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
      await sendMail({
        to: user.email,
        subject: "Réinitialise ton mot de passe Ruliz",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0f172a">
            <h1 style="font-size:20px;margin:0 0 16px">Réinitialisation de ton mot de passe</h1>
            <p style="margin:0 0 24px;line-height:1.5">
              Hello ${user.name ?? ""},<br>
              Tu as demandé à réinitialiser ton mot de passe Ruliz. Clique sur le bouton ci-dessous (lien valable 1h) :
            </p>
            <p style="margin:0 0 32px">
              <a href="${url}" style="background:#4870e0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600">
                Choisir un nouveau mot de passe
              </a>
            </p>
            <p style="font-size:12px;color:#64748b;margin:0">
              Si tu n'es pas à l'origine de cette demande, ignore cet email.
            </p>
          </div>
        `,
      });
    },
  },
  user: {
    // Notre Prisma `User` est la table métier ; Better-Auth utilise `AuthUser`.
    modelName: "AuthUser",
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "client",
        input: false,
      },
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
  plugins: [admin(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
