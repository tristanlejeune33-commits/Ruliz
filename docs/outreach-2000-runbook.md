# Runbook — Lancement du pilote outreach 2000 restos

Guide opérationnel pour passer du code en place → emails envoyés à 2000 prospects.

---

## ✅ Prérequis (à faire 1 fois)

### 1. Compte Smartlead.ai
- Souscris au plan Basic (39 $/mois) sur [smartlead.ai](https://smartlead.ai)
- Note ton API key (Settings → API)
- Crée un webhook qui pointe vers : `https://ruliz-panel.fr/api/outreach/event`
- Header custom : `X-Outreach-Token: <ton_secret>` (à mettre en env var `SMARTLEAD_WEBHOOK_SECRET`)

### 2. Domaines warmup (3 secondaires)
Acheter 3 noms de domaine "cousins" de `ruliz-panel.fr` (Hostinger 5 €/an × 3) :
- `ruliz-menus.fr`
- `carte-resto.fr`
- `menu-digital.fr`

Pour chaque domaine, configurer dans Hostinger :
- **SPF** : `v=spf1 include:spf.smartlead.ai ~all`
- **DKIM** : copier la clé fournie par Smartlead (Settings → DKIM)
- **DMARC** : `v=DMARC1; p=none; rua=mailto:tristan@ruliz-panel.fr`

Pour chaque domaine, créer dans Smartlead :
- 1 boîte mail (ex : `tristan@ruliz-menus.fr`)
- Lance le **warmup automatique** (4 semaines, 10 → 40 mails/jour)

> **Pendant le warmup, ne PAS envoyer de cold email réel.** Sinon ban du domaine.

### 3. Variables d'environnement Railway
Ajouter à Railway :
```
SMARTLEAD_WEBHOOK_SECRET=<choisir une chaîne random forte>
ANTHROPIC_API_KEY=<existant>
```

---

## 🚀 Workflow de lancement (jour J)

### Étape 1 — Importer les 2000 prospects (5 min)
```bash
# Le CSV est déjà filtré dans data/prospects-pilote-2000.csv
pnpm tsx scripts/import-prospects-pilote.ts
```
→ 2000 lignes en `prospect_restaurants`, toutes en statut `queued`.

### Étape 2 — Seeder les 12 variants d'emails (10 sec)
```bash
pnpm tsx scripts/seed-email-variants.ts
```
→ 12 lignes en `email_variants` (3 variants × 4 steps).

### Étape 3 — Lancer le pipeline d'enrichissement (1-3h en background)
Tu peux le déclencher en :
1. **Attendant le cron horaire** (auto-trigger toutes les heures)
2. **Manuellement** via curl :
   ```bash
   curl -X POST https://api.inngest.com/v1/events \
     -H "Authorization: Bearer $INNGEST_EVENT_KEY" \
     -d '[{"name":"outreach-cron-enqueue-queued"}]'
   ```

Suis la progression en temps réel sur :
**https://ruliz-panel.fr/admin/outreach**

Le funnel affiche : `queued → enriched → generated → ...`

> Attendre que ~80% des prospects soient en statut `generated` avant l'étape suivante.
> Pour 2000 restos, compter **1-3 heures** (concurrency 10 enrich + 5 generate).

### Étape 4 — Audit qualité (30 min, manuel)
Ouvrir 20 cartes prospects au hasard depuis `/admin/outreach` → clic "Preview".
- Si **>80% sont visuellement OK** → continuer
- Sinon → améliorer le prompt OCR / fallback (cf. `src/server/outreach/generate-card.ts`)

### Étape 5 — Exporter le CSV pour Smartlead (10 sec)
```bash
pnpm tsx scripts/export-prospects-for-smartlead.ts
```
→ `data/smartlead-pilote-2k.csv` avec colonnes :
- `email`, `nom`, `ville`, `first_name`, `preview_url`

### Étape 6 — Configurer la campagne Smartlead

1. **Upload CSV** dans Smartlead → "New Campaign"
2. **Map les custom fields** : nom, ville, first_name, preview_url
3. **Crée la séquence en 4 steps** :
   - Step 1 : J+0 (initial)
   - Step 2 : J+3
   - Step 3 : J+7
   - Step 4 : J+14
4. **Pour chaque step**, ajoute les 3 variants (A/B/C) — Smartlead fait l'A/B test automatique.
   - Récupère le HTML depuis `/admin/outreach/variants` (ou table `email_variants` en DB)
   - Sujet → champ "Subject", body → champ "Email body"
5. **Activate domain rotation** sur tes 3 domaines warmup.
6. **Set drip rate** : **200 emails/jour max** (pour pas griller la réputation).
7. **Launch !**

### Étape 7 — Monitoring quotidien
Tous les matins, check :
- `/admin/outreach` → KPIs live (open rate, click rate, conversions)
- Spam complaints rate dans Smartlead (doit rester < 0.1%)
- Bounce rate (doit rester < 5%)

> **Si bounce > 8%** : pause campagne, nettoie la liste, vérifie les variants.

---

## 📊 Objectifs de validation

Pour passer du pilote 2000 → industrialisation 20000 :

| Métrique | Objectif minimum | Excellent |
|---|---|---|
| Cartes générées "présentables" | >70% | >85% |
| Open rate (J+14 cumulé) | >25% | >35% |
| Click rate (J+14 cumulé) | >6% | >12% |
| Reply rate | >2% | >5% |
| Conversion (signup + paiement) | >1.0% | >2.0% |
| Spam complaint rate | <0.1% | <0.05% |

À J+21 : audit complet et décision go/no-go pour 20k.

---

## 🆘 Troubleshooting

### Beaucoup de prospects en `failed` après generate-card
- Trop de sites Facebook seulement → le filtre déjà appliqué (gardé que vrais sites)
- OCR Anthropic lent → vérifie les logs Inngest
- Fallback prompt à améliorer ?

### Bounce rate élevé (> 5%)
- Les emails TripAdvisor sont parfois vieux (3-5 ans)
- Pré-vérifie avec un service comme NeverBounce ($0.008/email = $16 pour 2000)
- Filtre les emails "no-reply@", "info@", etc. (servent rarement)

### Trop de "spam complaint"
- Sujet trop agressif → utiliser variant A (le plus soft)
- Pas assez d'unsubscribe visible → relire les templates
- Trop de mails/jour → baisser le drip rate à 100/jour

---

*Document maintenu par Claude — dernière révision : 2026-05-15.*
