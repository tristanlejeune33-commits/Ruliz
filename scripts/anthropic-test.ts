/**
 * Test rapide de la connexion à l'API Anthropic.
 *
 * Utilisation :
 *   pnpm test:anthropic
 *   (le pnpm script wrappe avec dotenv-cli pour charger .env.local)
 *
 * Le script :
 *   1. Vérifie que ANTHROPIC_API_KEY est défini (sans la révéler en clair)
 *   2. Envoie une requête de traduction simple ("Bonjour" → English)
 *   3. Affiche la réponse complète OU l'erreur brute
 *
 * Permet de distinguer :
 *   - Clé invalide → 401 Unauthorized
 *   - Crédits épuisés → 429 ou 402
 *   - Modèle inexistant → 404
 *   - Network → fetch error
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";

function check(name: string): string | null {
  const v = process.env[name]?.trim();
  if (!v) {
    console.log(`  ✗ ${name} : MANQUANT`);
    return null;
  }
  // On affiche juste le format général pour valider sans leak la clé
  const masked =
    v.length > 12
      ? `${v.slice(0, 7)}…${v.slice(-4)} (${v.length} chars)`
      : `••• (${v.length} chars)`;
  console.log(`  ✓ ${name} : ${masked}`);
  return v;
}

async function main() {
  console.log("\n=== ANTHROPIC ENV CHECK ===");
  const apiKey = check("ANTHROPIC_API_KEY");

  if (!apiKey) {
    console.error(
      "\n❌ ANTHROPIC_API_KEY manquante. Ajoute-la dans .env.local et réessaie.",
    );
    process.exit(1);
  }

  if (!apiKey.startsWith("sk-ant-")) {
    console.warn(
      `\n⚠ La clé ne commence pas par "sk-ant-", est-ce bien une clé Anthropic ?`,
    );
  }

  console.log("\n=== ANTHROPIC API TEST ===");
  console.log(`  Model    : ${MODEL}`);
  console.log(`  Test     : traduit "Bonjour, comment ça va ?" en anglais`);

  const client = new Anthropic({ apiKey });

  try {
    const start = Date.now();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 100,
      temperature: 0.2,
      system:
        "You are a professional translator. Output only the translated text.",
      messages: [
        {
          role: "user",
          content: 'Translate to English: "Bonjour, comment ça va ?"',
        },
      ],
    });
    const elapsed = Date.now() - start;

    const text = res.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");

    console.log("\n✅ API OK");
    console.log(`  Latence       : ${elapsed}ms`);
    console.log(`  Stop reason   : ${res.stop_reason}`);
    console.log(`  Input tokens  : ${res.usage.input_tokens}`);
    console.log(`  Output tokens : ${res.usage.output_tokens}`);
    console.log(`  Réponse       : "${text}"`);
    console.log(
      `\n💡 Coût approx. : ${(((res.usage.input_tokens * 0.8) + (res.usage.output_tokens * 4)) / 1_000_000).toFixed(6)}$ (Haiku 4.5 pricing)`,
    );
    console.log(
      `\nLa clé fonctionne. Si la traduction ne marche pas dans l'app, c'est un autre problème (logs serveur, DB, cache Redis).`,
    );
  } catch (err) {
    console.error("\n❌ API FAILED");
    if (err instanceof Anthropic.APIError) {
      console.error(`  HTTP status   : ${err.status}`);
      console.error(`  Type          : ${err.constructor.name}`);
      console.error(`  Message       : ${err.message}`);
      if (err.status === 401) {
        console.error(
          "\n💡 Status 401 = clé invalide ou révoquée. Régénère sur console.anthropic.com → Settings → API Keys.",
        );
      } else if (err.status === 429) {
        console.error(
          "\n💡 Status 429 = quota dépassé. Vérifie ton solde sur console.anthropic.com.",
        );
      } else if (err.status === 404) {
        console.error(
          `\n💡 Status 404 = modèle "${MODEL}" inexistant ou pas accessible avec cette clé.`,
        );
      }
    } else if (err instanceof Error) {
      console.error(`  ${err.name}: ${err.message}`);
    } else {
      console.error(err);
    }
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
