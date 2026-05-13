import { FlaskConical, LogOut } from "lucide-react";
import { getAdminDemoFlag } from "@/lib/admin-demo";

/**
 * Bandeau affiché en haut du /dashboard quand un admin est entré en
 * "mode démo". Permet de voir d'un coup d'œil qu'on n'est pas dans un
 * vrai compte client + un bouton 1-click pour revenir à /admin.
 *
 * Server Component, donc rendu côté serveur en lisant le cookie. Pas de
 * flash visuel au mount.
 */
export async function AdminDemoBanner() {
  const isDemo = await getAdminDemoFlag();
  if (!isDemo) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300">
        <FlaskConical className="size-4 shrink-0" strokeWidth={2} />
        <div>
          <p className="font-medium">Mode démo admin</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
            Tu navigues dans le panel client avec ton restaurant fictif. Aucun
            client réel ne voit cet espace.
          </p>
        </div>
      </div>
      {/* <a> natif (pas <Link>) car /api/admin/demo/exit est un Route Handler :
          on a besoin d'un full page reload pour que les cookies de la response
          soient bien commités au browser, sinon Next.js fait un fetch RSC qui
          ignore la response. */}
      <a
        href="/api/admin/demo/exit"
        className="inline-flex shrink-0 items-center gap-2 rounded-md border border-amber-500/40 bg-white/40 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-white/70 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
      >
        <LogOut className="size-3.5" strokeWidth={2} />
        Retour à l&apos;admin
      </a>
    </div>
  );
}
