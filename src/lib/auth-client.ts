import { createAuthClient } from "better-auth/react";
import { getAppUrl } from "@/lib/url";

export const authClient = createAuthClient({
  baseURL: getAppUrl(),
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
