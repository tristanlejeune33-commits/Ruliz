import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { DebugHorairesForm } from "./debug-form";

export const dynamic = "force-dynamic";

export default async function DebugHorairesPage() {
  await requireAdmin();

  // Test direct sur la DB pour vérifier l'état réel des colonnes
  type ColumnInfo = { column_name: string; data_type: string };
  let columns: ColumnInfo[] = [];
  let columnsErr: string | null = null;
  try {
    columns = (await prisma.$queryRawUnsafe(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'restaurants'
         AND column_name IN (
           'lunch_start','lunch_end',
           'dinner_start','dinner_end',
           'happy_hour_start','happy_hour_end'
         )
       ORDER BY column_name`,
    )) as ColumnInfo[];
  } catch (err) {
    columnsErr = err instanceof Error ? err.message : String(err);
  }

  // Récupère le 1er resto pour proposer un test
  const firstResto = await prisma.restaurant.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nom: true,
      lunchStart: true,
      lunchEnd: true,
      dinnerStart: true,
      dinnerEnd: true,
      happyHourStart: true,
      happyHourEnd: true,
    },
  }).catch((err) => {
    console.error("[debug-horaires] findFirst failed:", err);
    return null;
  });

  const expectedColumns = [
    "dinner_end",
    "dinner_start",
    "happy_hour_end",
    "happy_hour_start",
    "lunch_end",
    "lunch_start",
  ];
  const presentColumns = columns.map((c) => c.column_name).sort();
  const missingColumns = expectedColumns.filter(
    (c) => !presentColumns.includes(c),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Debug horaires de service
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Diagnostic complet pour comprendre pourquoi les heures Happy Hour ne se sauvegardent pas.
        </p>
      </header>

      {/* ============ ÉTAT DES COLONNES EN DB ============ */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-3">1. Colonnes horaires en DB</h2>
        {columnsErr ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
            ❌ Erreur SELECT information_schema : {columnsErr}
          </div>
        ) : missingColumns.length > 0 ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            ⚠️ <strong>{missingColumns.length} colonnes manquantes</strong> :{" "}
            <code className="font-mono">{missingColumns.join(", ")}</code>
            <br />
            <span className="text-xs text-[var(--text-muted)]">
              C&apos;est la cause du bug. Click le bouton ci-dessous pour les
              créer.
            </span>
          </div>
        ) : (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
            ✓ Les 6 colonnes existent en DB
          </div>
        )}

        <div className="mt-3 grid gap-1 text-xs font-mono">
          {expectedColumns.map((col) => {
            const c = columns.find((x) => x.column_name === col);
            return (
              <div key={col} className="flex items-center gap-2">
                <span
                  className={c ? "text-green-700" : "text-red-700"}
                  style={{ fontFamily: "monospace" }}
                >
                  {c ? "✓" : "✗"}
                </span>
                <code>{col}</code>
                {c && (
                  <span className="text-[var(--text-muted)]">
                    ({c.data_type})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ============ VALEURS ACTUELLES ============ */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-3">
          2. Valeurs actuelles (lecture Prisma)
        </h2>
        {firstResto ? (
          <div className="text-xs font-mono space-y-1">
            <div>
              <strong>Restaurant :</strong> {firstResto.nom} (id={" "}
              {firstResto.id.toString()})
            </div>
            <div>lunchStart : {firstResto.lunchStart ?? "(null)"}</div>
            <div>lunchEnd : {firstResto.lunchEnd ?? "(null)"}</div>
            <div>dinnerStart : {firstResto.dinnerStart ?? "(null)"}</div>
            <div>dinnerEnd : {firstResto.dinnerEnd ?? "(null)"}</div>
            <div>
              <strong>happyHourStart : {firstResto.happyHourStart ?? "(null)"}</strong>
            </div>
            <div>
              <strong>happyHourEnd : {firstResto.happyHourEnd ?? "(null)"}</strong>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[var(--text-muted)]">
            Aucun restaurant en DB.
          </div>
        )}
      </Card>

      {/* ============ TEST FORM ============ */}
      {firstResto && (
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-3">
            3. Test de sauvegarde directe (raw SQL)
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Ce bouton fait un UPDATE raw SQL direct sur le restaurant{" "}
            <strong>{firstResto.nom}</strong> sans passer par le form. Si ça
            marche ici mais pas dans /dashboard/restaurant, le problème est
            côté form/auto-save.
          </p>
          <DebugHorairesForm
            restaurantId={firstResto.id.toString()}
            currentHappyStart={firstResto.happyHourStart ?? "18:00"}
            currentHappyEnd={firstResto.happyHourEnd ?? "19:00"}
          />
        </Card>
      )}
    </div>
  );
}
