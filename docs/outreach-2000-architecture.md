# Architecture technique — Campagne outreach 2 000 restaurants

> Document de référence pour la campagne pilote Ruliz.
> Objectif : prospecter 2 000 restaurants, générer leur carte pré-remplie automatiquement,
> les convertir en clients payants via cold email + dashboard de réservation magique.

---

## 1. Vue d'ensemble du pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       PHASE 0 — DATA SOURCING                            │
│  CSV 2000 restos (nom, email, ville, site_web?, google_place_id?)        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  PHASE 1 — ENRICHMENT (workers Inngest)                   │
│  Google Places API → adresse, téléphone, horaires, photos, site web      │
│  Scrape site web → logo (favicon + og:image), couleur dominante          │
│  Scrape menu (PDF/image/HTML) → OCR Anthropic Vision                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PHASE 2 — CARD GENERATION (Anthropic Haiku)                  │
│  Parse menu OCR → catégories + produits structurés                       │
│  Génère description appétissante FR                                      │
│  Traduit en 6 langues (en/es/de/it/pt/zh)                                │
│  Extrait couleur primaire du logo (node-vibrant)                         │
│  Stocke tout en DB (statut = "prospect")                                 │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                PHASE 3 — OUTREACH (Smartlead.ai)                          │
│  URL perso : https://ruliz-panel.fr/preview/{token}                      │
│  Email 1 : "Votre carte digitale est prête, regardez"                    │
│  Follow-ups J+3, J+7, J+14 (variants AI)                                 │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                PHASE 4 — CONVERSION & TRACKING                            │
│  Resto clique → /preview/{token} → voit SA carte → CTA "Activer"         │
│  Signup → reprend la carte prospect → /dashboard                         │
│  Stripe Checkout → plan Pro/Premium                                       │
│  AI marketer (Haiku) → réponses + A/B testing variants                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack technique additionnelle

| Brique | Choix | Coût mensuel | Rôle |
|---|---|---|---|
| Queue de jobs | **Inngest** | Free tier suffit | Orchestration scraping + génération |
| Google Places | **Places API New** | ~$50 one-shot pour 2k | Enrichissement données restos |
| Logo scraper | `node-html-parser` + favicon-finder | $0 | Récupère favicon + og:image |
| Couleur dominante | `node-vibrant` | $0 | Palette extraite du logo |
| OCR menu | **Anthropic Vision (Haiku)** | ~$30 pour 2k | Parse PDF/image menu |
| Cold email | **Smartlead.ai** | $39/mois | Envoi avec warmup auto |
| Domaines warmup | 3 domaines secondaires | $30/mois | Évite ban du domaine principal |
| AI marketer | **Anthropic Haiku** | ~$10/mois | Variants + réponses auto |
| **TOTAL pilote** | | **~$190 setup + $80/mois** | |

---

## 3. Modèle de données (additions Prisma)

### Nouvelles tables

```prisma
model ProspectRestaurant {
  id            BigInt   @id @default(autoincrement())
  source        String   // "csv-2k-batch-1"
  email         String   @unique
  nom           String
  ville         String?
  codePostal    String?
  adresse       String?
  telephone     String?
  siteWeb       String?
  googlePlaceId String?

  // Enrichissement
  logoUrl       String?
  couleurDominante String?
  menuSourceUrl String?
  menuSourceType String? // "pdf" | "html" | "image"

  // Carte générée (lazy: restaurant créé seulement à activation)
  cardJson      Json?    // arbre catégories + produits avant insertion
  cardToken     String   @unique // pour URL preview /preview/{token}

  // Workflow
  status        String   @default("queued") // queued → enriched → generated → sent → opened → clicked → converted → failed
  enrichedAt    DateTime?
  generatedAt   DateTime?
  sentAt        DateTime?
  openedAt      DateTime?
  clickedAt     DateTime?
  convertedAt   DateTime?
  errorMessage  String?

  // Tracking
  emailVariant  String?  // "A" | "B" | "C" pour A/B test
  followupCount Int      @default(0)

  // Si converti
  restaurantId  BigInt?  // FK vers restaurants après signup

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status])
  @@index([cardToken])
  @@index([email])
  @@map("prospect_restaurants")
}

model OutreachEvent {
  id          BigInt   @id @default(autoincrement())
  prospectId  BigInt
  type        String   // "sent" | "open" | "click" | "reply" | "bounce" | "unsubscribe"
  metadata    Json?    // ip, userAgent, link, etc.
  createdAt   DateTime @default(now())

  @@index([prospectId, type])
  @@index([createdAt])
  @@map("outreach_events")
}

model EmailVariant {
  id          BigInt   @id @default(autoincrement())
  campaign    String   // "pilote-2k"
  step        Int      // 1, 2, 3, 4 (J, J+3, J+7, J+14)
  variant     String   // "A", "B", "C"
  subject     String
  bodyHtml    String   @db.Text
  generatedBy String   @default("ai") // "ai" | "human"

  // Stats live
  sent        Int      @default(0)
  opened      Int      @default(0)
  clicked     Int      @default(0)
  replied     Int      @default(0)
  converted   Int      @default(0)

  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@unique([campaign, step, variant])
  @@map("email_variants")
}
```

---

## 4. Pipeline d'enrichissement (Inngest)

### Worker 1 : `enrich-prospect`

```ts
// src/inngest/functions/enrich-prospect.ts
inngest.createFunction(
  { id: "enrich-prospect", concurrency: 10, retries: 3 },
  { event: "prospect/enrich.requested" },
  async ({ event, step }) => {
    const { prospectId } = event.data;

    // 1. Google Places lookup (5s)
    const place = await step.run("google-places", async () => {
      return await searchGooglePlaces(prospect.nom, prospect.ville);
    });

    // 2. Scrape logo + couleur (3s)
    const branding = await step.run("scrape-branding", async () => {
      return await extractLogoAndColor(place.website ?? prospect.siteWeb);
    });

    // 3. Trouve menu (5s)
    const menuSource = await step.run("find-menu", async () => {
      return await findMenuSource(place.website);
      // → cherche /menu, /carte, /la-carte, PDF dans /uploads/, images dans og
    });

    // 4. Update DB
    await step.run("save-enrichment", async () => {
      await prisma.prospectRestaurant.update({
        where: { id: prospectId },
        data: {
          ...place, ...branding, menuSourceUrl: menuSource.url,
          menuSourceType: menuSource.type, status: "enriched",
          enrichedAt: new Date()
        }
      });
    });

    // 5. Trigger génération
    await step.sendEvent("trigger-generation", {
      name: "prospect/generate.requested",
      data: { prospectId }
    });
  }
);
```

**Temps moyen : 15-20s par resto. Avec concurrency=10 → 2000 restos en ~1h.**

### Worker 2 : `generate-card`

```ts
inngest.createFunction(
  { id: "generate-card", concurrency: 5, retries: 2 },
  { event: "prospect/generate.requested" },
  async ({ event, step }) => {
    const { prospectId } = event.data;
    const p = await prisma.prospectRestaurant.findUnique({ where: { id: prospectId } });

    // 1. OCR menu via Anthropic Vision (10s)
    const rawMenu = await step.run("ocr-menu", async () => {
      return await anthropicVision.parseMenu(p.menuSourceUrl, p.menuSourceType);
      // Retourne: [{ category: "Entrées", items: [{ name, description, price }] }]
    });

    // 2. Structure + descriptions appétissantes FR (5s)
    const structured = await step.run("structure-fr", async () => {
      return await anthropicHaiku.improveDescriptions(rawMenu, p.nom);
    });

    // 3. Génère cardToken
    const token = crypto.randomBytes(16).toString("hex");

    // 4. Stocke JSON en DB (PAS encore de Restaurant créé)
    await prisma.prospectRestaurant.update({
      where: { id: prospectId },
      data: {
        cardJson: structured,
        cardToken: token,
        status: "generated",
        generatedAt: new Date()
      }
    });

    // 5. Trigger envoi email
    await step.sendEvent("trigger-outreach", {
      name: "prospect/outreach.requested",
      data: { prospectId }
    });
  }
);
```

**Temps moyen : 15s par resto. Avec concurrency=5 → 2000 restos en ~1h40.**

**Pourquoi concurrency limitée à 5 sur génération :** rate limit Anthropic tier 2 = 50 req/min. Avec 5 workers × ~2 req/sec = 10 req/sec = 600 req/min. On reste large.

---

## 5. Route preview `/preview/[token]`

C'est LA killer feature. Le resto reçoit un mail avec un lien personnalisé, clique, voit **sa propre carte déjà faite** sur mobile. Conversion massive.

```tsx
// src/app/preview/[token]/page.tsx
export default async function PreviewPage({ params }) {
  const prospect = await prisma.prospectRestaurant.findUnique({
    where: { cardToken: params.token }
  });

  if (!prospect) notFound();

  // Track click
  waitUntil(trackEvent(prospect.id, "click"));

  return (
    <div>
      {/* Banner top : "Bonjour, voici votre carte Ruliz. Activez en 2 min." */}
      <ProspectBanner prospect={prospect} />

      {/* La vraie carte mobile rendered avec cardJson */}
      <CartePublique data={prospect.cardJson} branding={{
        logo: prospect.logoUrl,
        couleurPrimaire: prospect.couleurDominante
      }} />

      {/* CTA fixe bas : "Activer ma carte (29.90€/mois)" */}
      <ActivationCTA prospectId={prospect.id} />
    </div>
  );
}
```

### Flow d'activation

1. Click CTA → `/signup?prospect={token}`
2. Signup classique Better-Auth (email/password)
3. Server action `activateProspect()` :
   - Crée le `Restaurant` avec branding pré-rempli
   - Crée les `Categorie` et `Produit` depuis `cardJson`
   - Lance traductions Anthropic (Inngest)
   - Update `prospect.status = "converted"`, lie `restaurantId`
4. Redirect `/dashboard` → resto voit sa carte éditable
5. Trigger Stripe Checkout sur premier "Sauvegarder"

---

## 6. Outreach Smartlead

### Configuration domaines

```
Domaine principal : ruliz-panel.fr (À PROTÉGER, jamais utilisé pour cold)
Domaines secondaires warmup :
  - ruliz-menus.fr
  - carte-resto.fr
  - menu-digital.fr

Sur chaque secondaire :
  - SPF + DKIM + DMARC configurés
  - Warmup Smartlead 4 semaines (10→40 mails/jour progressif)
  - Reply-to : contact@ruliz-panel.fr (principal, safe)
```

### Variants email (générés par AI marketer)

```
Variant A — "Découverte personnalisée"
Subject: {Nom_resto}, votre carte digitale est prête
Body: J'ai créé une démo de votre menu en version digitale...

Variant B — "Provocation positive"
Subject: J'ai refait votre carte (en 5 langues)
Body: Bonjour {Prenom}, j'ai vu votre menu sur {Site}...

Variant C — "Bénéfice direct"
Subject: +18% de tickets moyens avec une carte traduite
Body: Vos clients touristes commandent 18% de plus...
```

AI marketer roule un bandit Thompson Sampling sur les variants pour converger vers la meilleure.

### Cadence

| Step | Délai | Action |
|---|---|---|
| 1 | J+0 | Email initial (variant A/B/C random) |
| 2 | J+3 | Follow-up "Vous avez vu ?" (relance soft) |
| 3 | J+7 | Témoignage client + offre 1er mois gratuit |
| 4 | J+14 | "Dernière relance" + CTA différent |
| Stop | J+21 | Sortie automatique de la séquence |

---

## 7. AI Marketer (remplace expert freelance €700/mois)

```ts
// src/inngest/functions/ai-marketer.ts

// Tâche 1 : Génère 3 variants par step toutes les semaines
inngest.createFunction(
  { id: "ai-marketer-variants" },
  { cron: "0 9 * * MON" }, // Lundi 9h
  async ({ step }) => {
    // 1. Récupère stats des 7 derniers jours
    const stats = await getCampaignStats("pilote-2k");

    // 2. Anthropic Haiku analyse + propose 3 nouveaux variants
    const newVariants = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      system: AI_MARKETER_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Voici les stats de la semaine: ${JSON.stringify(stats)}.
                  Propose 3 nouveaux subject + body améliorés.
                  Format: JSON array.`
      }]
    });

    // 3. Insert dans EmailVariant
    await prisma.emailVariant.createMany({ data: newVariants });
  }
);

// Tâche 2 : Répond aux replies entrantes
inngest.createFunction(
  { id: "ai-marketer-replies" },
  { event: "smartlead/reply.received" },
  async ({ event }) => {
    const { replyText, prospectId } = event.data;

    // 1. Classify intent
    const intent = await classifyReply(replyText);
    // → "interested" | "not_now" | "negative" | "question" | "unsubscribe"

    if (intent === "unsubscribe") {
      await unsubscribe(prospectId);
      return;
    }

    if (intent === "negative") {
      // Stop sequence, ne répond pas
      await stopSequence(prospectId);
      return;
    }

    // 2. Génère réponse contextuelle
    const reply = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      system: AI_REPLY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: replyText }]
    });

    // 3. Envoie via Smartlead API (avec délai humain 2-30 min)
    await scheduleReply(prospectId, reply, randomDelay(120, 1800));
  }
);
```

**Coût AI marketer : ~$10/mois pour 2k prospects.**

---

## 8. Admin dashboard `/admin/outreach`

Page de pilotage de la campagne :

```
┌─────────────────────────────────────────────────────────┐
│  Campagne pilote 2 000 restos                            │
│                                                          │
│  ▰▰▰▰▰▰▰▰▱▱  78% enriched (1564/2000)                   │
│  ▰▰▰▰▰▱▱▱▱▱  52% generated (1042/2000)                  │
│  ▰▰▰▱▱▱▱▱▱▱  31% sent (621/2000)                        │
│                                                          │
│  KPIs live                                               │
│  ├─ Open rate     38.2%   (objectif >35%)               │
│  ├─ Click rate    12.4%   (objectif >8%)                │
│  ├─ Reply rate     3.8%   (objectif >3%)                │
│  ├─ Conversion     1.9%   (objectif >1.5%)              │
│  └─ Revenue       1 240€  MRR créé                       │
│                                                          │
│  Variants performance                                    │
│  ├─ A — "Découverte"        OR 41% CTR 14%              │
│  ├─ B — "Provocation"       OR 35% CTR 11%              │
│  └─ C — "Bénéfice direct"   OR 38% CTR 12%              │
│                                                          │
│  [Bouton] Pause campagne                                 │
│  [Bouton] Export CSV résultats                           │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Coûts détaillés pilote 2 000 restos

### Setup one-shot
| Poste | Coût |
|---|---|
| Google Places API (2k lookups) | $50 |
| Anthropic Vision OCR (2k menus × ~5k tokens) | $30 |
| Anthropic Haiku génération (2k × 7 langues × 3k tokens) | $120 |
| Domaines secondaires (3 × $12) | $36 |
| **Setup total** | **~$240** |

### Mensuel récurrent
| Poste | Coût |
|---|---|
| Smartlead.ai | $39 |
| Domaines warmup (déjà payés) | $0 |
| AI marketer (Anthropic) | $10 |
| Railway (déjà en place) | $0 |
| **Récurrent** | **~$50/mois** |

### Projection ROI pilote

```
Si conversion 1.5% (conservateur) :
  2000 × 1.5% = 30 restos × 29.90€ = 897€/mois MRR
  Payback setup : 7 jours

Si conversion 2.5% (optimiste) :
  2000 × 2.5% = 50 restos × 29.90€ = 1 495€/mois MRR

Si conversion 3.5% (référence SaaS hyper-personnalisé) :
  2000 × 3.5% = 70 restos × 29.90€ = 2 093€/mois MRR
```

**Le pilote est rentable même à 1% de conversion.**

---

## 10. Planning d'implémentation (estimation)

| Jour | Tâche | Durée |
|---|---|---|
| J1 matin | Migration Prisma (prospect_restaurants + outreach_events + email_variants) | 1h |
| J1 après-midi | Page `/admin/outreach` upload CSV + dashboard live | 3h |
| J2 matin | Worker Inngest `enrich-prospect` (Google Places + scraping logo) | 4h |
| J2 après-midi | Worker Inngest `generate-card` (Anthropic Vision + Haiku) | 4h |
| J3 matin | Route `/preview/[token]` (rendering carte prospect) | 3h |
| J3 après-midi | Flow activation `/signup?prospect=X` + reprise carte | 3h |
| J4 matin | Smartlead.ai setup (3 domaines + DNS + warmup) | 2h |
| J4 après-midi | AI marketer (variants + replies handler) | 4h |
| J5 matin | Tests end-to-end sur 10 restos pilotes | 3h |
| J5 après-midi | Lancement 2k progressif (200/jour pour pas griller domaines) | — |

**Total dev : ~27h (3-4 jours en focus).**

---

## 11. Risques et mitigation

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Sites restos sans menu en ligne | 40% | Moyen | Fallback : génération générique par type cuisine |
| RGPD email cold B2B | Faible | Élevé | Mentions légales + unsubscribe + base "lÉmail Pro" (legal en B2B FR) |
| Ban domaine principal | Faible | Très élevé | Domaines secondaires uniquement, warmup strict |
| Anthropic rate limit | Moyenne | Moyen | Concurrency limitée + retry exponentiel |
| Logo/couleur extraite moche | 30% | Faible | UI laisse override par le resto post-activation |
| OCR menu rate (PDF scanné mal) | 20% | Faible | Fallback humain : prospect signale "Menu pas bon" |

---

## 12. Métriques de succès du pilote

✅ **Critères de validation pour passer à 40k :**
- [ ] Pipeline tient 2000 restos sans crash
- [ ] >80% des cartes générées sont "présentables" (audit manuel sur 50)
- [ ] Open rate >30%
- [ ] Conversion globale >1.2%
- [ ] Coût par acquisition <30€
- [ ] Zéro plainte spam grave (<0.1% complain rate)

Si tous validés → on industrialise vers 40k.

---

## 13. Décisions de conception clés

1. **Pourquoi ProspectRestaurant séparé de Restaurant ?**
   On veut pouvoir générer 2000 cartes sans polluer la table Restaurant avec 2000 entrées
   inactives. Restaurant n'est créé qu'à l'activation réelle (conversion).

2. **Pourquoi cardJson en JSON Postgres et pas en tables relationnelles ?**
   - Flexibilité : on itère vite sur le schéma sans migration
   - Performance : 1 SELECT pour preview au lieu de 5 joins
   - À l'activation, on dénormalise en tables relationnelles (categorie/produit)

3. **Pourquoi Inngest et pas BullMQ ?**
   - Free tier généreux (50k steps/mois suffit pour 2k restos)
   - Retry + observabilité out-of-the-box
   - Pas de Redis à gérer (vs BullMQ qui exige Redis sticky)

4. **Pourquoi Smartlead et pas un envoi maison ?**
   - Warmup automatique
   - Rotation IP/domaines
   - Reply tracking
   - Compliance RGPD intégrée
   - Construire ça soi-même = 2 mois de dev

---

## 14. Prochaines étapes immédiates

1. ✅ Tu valides ce doc (modifications/ajouts ?)
2. → Je migre Prisma + crée page `/admin/outreach`
3. → Tu fournis le CSV 2000 restos (format : email, nom, ville)
4. → On enrichit 10 restos pilotes en test
5. → On valide la qualité, on industrialise les 2000
6. → Lancement Smartlead en drip (200/jour sur 10 jours)
7. → On lit les premiers résultats à J+14

---

*Document généré pour la session de pilotage Ruliz outreach 2k.*
*Maintenu par Claude — dernière révision : 2026-05-15.*
