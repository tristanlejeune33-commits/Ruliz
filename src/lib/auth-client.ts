import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { getAppUrl } from "@/lib/url";

export const authClient = createAuthClient({
  baseURL: getAppUrl(),
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
