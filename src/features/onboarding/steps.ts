/**
 * Config des 12 étapes du tour onboarding.
 *
 * Structure :
 *  - Slides 1-10 = tour de base (mise en place de la carte)
 *  - Slides 11-12 = plus-value (features avancées qui font vendre)
 *
 * Chaque étape :
 *  - path  : route où la bulle doit emmener l'utilisateur via router.push()
 *  - anchorSelector : sélecteur CSS de l'élément à pointer (data-onboarding-anchor)
 *                     ou null pour la position par défaut (bottom-right)
 *  - title : 1 ligne, max 40 caractères
 *  - body  : 2 lignes max, ton tutoiement, zéro jargon
 *  - details : texte long structuré déplié au clic sur "Plus de détails"
 *              utilise des \n pour séparer les paragraphes ; les lignes qui
 *              commencent par "• " ou "1. " sont rendues telles quelles
 *              (whitespace-pre-line)
 *  - cta   : texte du bouton principal
 *  - kind  : "base" ou "value" (visuel différent pour les 2 dernières)
 */

export type StepKind = "base" | "value";

export interface OnboardingStep {
  id: number;
  path: string;
  anchorSelector: string | null;
  title: string;
  body: string;
  /** Texte long structuré, optionnel — affiché au clic sur "Plus de détails" */
  details?: string;
  cta: string;
  allowSkip: boolean;
  /** Placement par défaut quand ancré */
  placement?: "top" | "bottom" | "left" | "right";
  /** "base" = parcours essentiel, "value" = features premium (slides 11-12) */
  kind: StepKind;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // =========================================================================
  // TOUR DE BASE — slides 1 à 10
  // =========================================================================
  {
    id: 1,
    path: "/dashboard",
    anchorSelector: null,
    title: "Salut 👋 Bienvenue dans Ruliz.",
    body: "Je te montre tout en 12 étapes — 3 minutes chrono. C'est parti ?",
    details: `Ce tour couvre :
• Comment configurer ton restaurant (logo, couleurs, infos)
• Créer ta première catégorie + ton premier produit
• Uploader des photos en 1 clic
• Gérer les allergènes et vignettes
• Voir ton aperçu live + tester les 7 langues
• Imprimer ton QR code
• 2 features bonus : la roulette d'avis Google et tes statistiques

À chaque étape, tu pourras cliquer "Plus de détails" pour avoir
le mode d'emploi complet. Tu peux passer à tout moment et reprendre
plus tard depuis Paramètres › Profil.`,
    cta: "C'est parti →",
    allowSkip: true,
    kind: "base",
  },
  {
    id: 2,
    path: "/dashboard/restaurant",
    anchorSelector: "[data-onboarding-anchor='restaurant-branding']",
    title: "Ton identité visuelle 🎨",
    body: "Logo (glisse ou Ctrl+V) et couleur principale — tout le reste s'adapte.",
    details: `Onglet Médias :
• Logo : PNG ou JPG, max 5 MB, idéalement carré 512×512 px
• Bannière (optionnelle) : 1920×640 px, affichée en hero de ta carte
• Glisser-déposer OU Ctrl+V depuis une capture/clipboard

Onglet Couleurs :
• Couleur principale = boutons, titres, accents de toute ta carte
• Couleur de fond + couleur du texte = adaptables si besoin spécifique
• Reset à tout moment pour revenir au thème par défaut

Onglet Thème :
• 3 presets prêts : Clair, Sombre, Bois (idéal bistrot)
• Choisis-en un, ajuste les couleurs après si tu veux

La preview à droite se met à jour en LIVE à chaque save.`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
    kind: "base",
  },
  {
    id: 3,
    path: "/dashboard/restaurant",
    anchorSelector: "[data-onboarding-anchor='restaurant-infos']",
    title: "Infos pratiques 📍",
    body: "Adresse, téléphone, horaires — affichés sur ta carte pour rassurer tes clients.",
    details: `Onglet Infos :

• Nom du restaurant (affiché en header)
• Slug : la partie unique de ton URL publique (ex: ruliz.fr/carte/le-tire-bouchon)
• Adresse complète : numéro, rue, code postal, ville — affichée en footer + clic = ouvre Google Maps
• Téléphone : cliquable depuis mobile = appel direct
• Email : utilisé pour les notifications (bientôt : réservations)
• Devise par défaut : €, $, £…
• Langue native : la langue dans laquelle TU rédiges ta carte (les autres sont traduites)

ASTUCE : tout est PUBLIC sur ta carte. Évite d'y mettre ton tel perso —
mets celui du resto, ou une ligne dédiée.`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
    kind: "base",
  },
  {
    id: 4,
    path: "/dashboard/restaurant",
    anchorSelector: "[data-onboarding-anchor='restaurant-social']",
    title: "Réseaux & Google reviews 🌐",
    body: "Facebook, Insta, lien Google — affichés en haut de ta carte pour booster ton SEO local.",
    details: `Onglet Réseaux — toutes les URLs sont optionnelles :

• Facebook : URL complète de ta page (https://facebook.com/tonresto)
• Instagram : idem
• TikTok : idem
• Site web : si tu en as un externe à Ruliz

• Google Reviews (LE PLUS IMPORTANT) :
  Va sur ta fiche Google Business → "Demander un avis" → copie l'URL
  Elle ressemble à : https://g.page/r/CXXXXXX/review

Pourquoi c'est critique :
• Boutons affichés en haut de ta carte (pills navy contour)
• Le bouton Google déclenche le compteur de la roulette d'avis (slide 11)
• Chaque clic vers Google = un avis potentiel = boost de ton ranking local
• En moyenne, les restos avec lien Google sur leur carte digitale captent
  +35% d'avis dans les 60 premiers jours

ASTUCE : si tu n'as pas de fiche Google encore, crée-la AVANT — c'est gratuit
et c'est ce qui te rapporte le plus de visibilité locale.`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
    kind: "base",
  },
  {
    id: 5,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='add-category']",
    title: "Crée tes catégories 🍽️",
    body: "Entrées, Plats, Vins, Desserts… glisse pour réorganiser, autant que tu veux.",
    details: `Catégories = sections de ta carte (Entrées, Plats, Vins…).

Pour créer :
1. Clic sur "+ Catégorie" en haut à gauche
2. Donne-lui un titre (ex: "Entrées")
3. Optionnel : choisis un emoji (clique sur le bouton 🍽️ → picker complet)
4. Sauvegarde

Options avancées :
• Mode d'affichage : Liste verticale (défaut) / Grille (avec photos) / Carrousel horizontal
• Catégorie parente : transforme en sous-catégorie (ex: Vins ↳ Rouges / Blancs / Rosés)
• Couleur custom : override la couleur globale (ex: rouge vif pour "Épicés", or pour "Spécialités du chef")
• Créneau d'affichage : visible uniquement midi / soir / happy hour / horaires custom
  - utile pour les cartes qui changent (carte du jour, brunch)

Drag & drop :
• Glisse une catégorie dans la sidebar pour changer son ordre
• Glisse-la SUR une autre pour en faire une sous-cat
• Maintiens Shift en glissant pour duplicate (à venir)

Catégories vides = pas affichées sur ta carte publique.`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "right",
    kind: "base",
  },
  {
    id: 6,
    path: "/dashboard/menu",
    anchorSelector: null,
    title: "Ton premier produit 🍕",
    body: "Sélectionne une catégorie, puis clique « + Produit » pour ajouter un plat.",
    details: `Pour ajouter un produit :
1. Clique sur une catégorie dans la sidebar gauche
2. Bouton "+ Produit" en haut à droite
3. Le drawer s'ouvre avec tous les champs

Champs essentiels :
• Titre : nom du plat (obligatoire)
• Description : 2-3 lignes appétissantes, c'est ça qui donne envie
• Photo : 1 image carrée recommandée (cf. slide suivante)
• Prix : en €, avec virgule

Champs optionnels mais utiles :
• Description prix : précision sous le prix (ex: "20cl", "la pièce", "à partir de")
• Variantes de prix : plusieurs tailles ou volumes (ex: Bière demi 4€ / pinte 7€)
• Sous-catégorie : ré-affecte dans la cat parent
• Position : ordre d'affichage (sinon glisse pour réorganiser)
• Statut : Publié / Brouillon (pour préparer sans afficher)
• Origine : pays d'origine (ex: France) → affiche drapeau 🇫🇷

ASTUCE : commence simple — titre + description + prix suffit pour publier.
Tu enrichis ensuite (photos, allergènes, variantes) au fur et à mesure.`,
    cta: "Suivant →",
    allowSkip: true,
    kind: "base",
  },
  {
    id: 7,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='produit-photo']",
    title: "Astuce photos 📸",
    body: "Glisse une image, ou Ctrl+V une capture — pas besoin de la sauver avant.",
    details: `3 manières d'uploader une photo :

1. CLIC : clique la zone, choisis depuis ton ordi (Finder/Explorer)

2. DRAG & DROP : glisse une image directement depuis ton bureau
   ou ton navigateur (clic-droit "Glisser-déposer")

3. PASTE (Ctrl+V) — la plus rapide :
   • Windows : Win+Shift+S pour capturer une zone, puis Ctrl+V ici
   • Mac : Cmd+Shift+4 pour capturer, puis Cmd+V ici
   • Copie depuis Insta, Google Images, Pinterest : clic-droit "Copier l'image", puis Ctrl+V
   • Photos depuis Finder/Explorer : clic-droit "Copier", puis Ctrl+V

Formats supportés : PNG, JPG, JPEG, WebP, AVIF, GIF
Taille max : 5 MB par image
Ratio recommandé : carré 1:1 ou 4:3

Stockage :
• Cloudflare R2 (CDN mondial, ultra rapide)
• Tes images sont compressées automatiquement
• Affichées en WebP optimisé sur la carte publique
• Mobile 4G : moins de 600 KB par page

ASTUCE : prends tes photos avec ton phone, en lumière naturelle (fenêtre),
fond neutre. Pas besoin de photographe pro — du simple bien éclairé > du flou pro.`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "left",
    kind: "base",
  },
  {
    id: 8,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='produit-allergenes']",
    title: "Allergènes & vignettes 🌿",
    body: "Coche fait maison, végé, sans gluten, épicé — affiché en pills sur la fiche produit.",
    details: `Tags visuels affichés sur la fiche produit publique.

VIGNETTES (pills colorées en haut de la fiche) :
• 🌿 Fait maison
• 🌱 Végétarien
• 🥬 Vegan
• 🌾 Sans gluten
• 🔥 Épicé
• ⭐ Spécialité du chef
• ❄️ À consommer froid
• 🐟 Pêche locale
• 🍷 Accord vins
… et 10+ autres options

ALLERGÈNES (sigles règlementaires 14 obligatoires) :
• Gluten, Crustacés, Œufs, Poissons, Arachides
• Soja, Lait, Fruits à coque, Céleri, Moutarde
• Sésame, Sulfites, Lupin, Mollusques

OBLIGATION LÉGALE (France/UE) :
Tu DOIS afficher les allergènes — c'est dans le règlement INCO 1169/2011.
Une carte digitale qui les liste te met en conformité instantanément.

Affichage public :
• Pills colorées en haut de la fiche
• Allergènes affichés en bas avec leur sigle officiel
• Visible dans toutes les langues (traduit automatiquement)

ASTUCE : coche tout ce qui s'applique vraiment, ne survends pas
le "fait maison" — les clients lisent et apprécient l'honnêteté.`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "left",
    kind: "base",
  },
  {
    id: 9,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='preview-iframe']",
    title: "Aperçu live + 7 langues 🌍",
    body: "À droite : ce que tes clients voient. Change la langue, l'IA traduit automatiquement.",
    details: `L'aperçu à droite est ta VRAIE carte publique chargée dans une iframe.

Comportement :
• Tu vois EXACTEMENT ce que tes clients verront
• Refresh auto en ~500 ms après chaque save
• Bouton refresh manuel en haut à droite si besoin
• Lien "Ouvrir dans un onglet" pour tester en grand

Sélecteur de langue (en haut de la preview) :
• FR (langue source) — ta langue de rédaction
• EN, ES, DE, IT, PT, ZH — traduites automatiquement

Traduction IA (Anthropic Claude Haiku) :
• 1ère consultation d'une langue = traduction live en ~3 secondes
• Ensuite c'est caché POUR TOUJOURS (pas de re-traduction inutile)
• Si tu modifies un texte FR, les trads sont régénérées en arrière-plan
• Prompt spécialisé "menu de restaurant" — respecte les noms propres,
  les vins, les fromages français en italique

Bouton "Re-traduire" :
• Force la regénération de toutes les trads d'une langue
• Utile si tu changes le ton de marque ou corriges des trads bizarres
• Coût : 0 (inclus dans tous les plans)

Bandeau "Traduction partielle" : apparaît automatiquement si certains
champs ne sont pas encore traduits (ex: un produit ajouté il y a 2 secondes).
Ça disparait dès que la trad de fond termine (~10s).`,
    cta: "Voir mon QR →",
    allowSkip: true,
    placement: "left",
    kind: "base",
  },
  {
    id: 10,
    path: "/dashboard/qrcodes",
    anchorSelector: "[data-onboarding-anchor='qr-display']",
    title: "Ton QR code 📱",
    body: "Télécharge le PNG, imprime-le, pose-le sur tes tables. Pointe toujours vers la dernière version.",
    details: `Tu peux générer PLUSIEURS QR codes pour tracker leur efficacité séparément.

Création :
• Bouton "+ QR" en haut
• Slug optionnel (ex: "table-12", "vitrine", "flyer-octobre")
• Statut : Actif / Suspendu (suspends-le si tu changes de campagne)

Téléchargement (par QR) :
• PNG haute résolution 1024×1024 (pour impression standard)
• SVG vectoriel (pour imprimeur pro, gravure laser, etc.)
• Lien direct vers /carte/{id}?qr={qrId} pour partage WhatsApp/Mail

Stats par QR (page Analyse) :
• Quel QR scanne le plus
• Quels horaires
• Conversion produit (top plats cliqués après ce QR)

Bonnes pratiques d'impression :
• Sticker MAT (pas brillant — les reflets gênent le scan)
• Taille minimum : 4×4 cm pour scan smartphone confortable
• Hauteur d'œil sur les tables (pas dessous, pas trop haut)
• Évite les coins pliés, les poches de set de table en plastique
• Ajoute "Scannez pour voir notre carte 📱" à côté
• Imprime sur la boutique Ruliz : sets de table tout-faits

ASTUCE : si tu changes ta carte (saison été → hiver), tu n'as PAS à ré-imprimer.
Le QR pointe vers la dernière version — modifie le contenu côté dashboard et c'est tout.`,
    cta: "Voir les plus 🎁",
    allowSkip: true,
    placement: "left",
    kind: "base",
  },
  // =========================================================================
  // PLUS-VALUE — slides 11 et 12 (features qui font vendre / fidéliser)
  // =========================================================================
  {
    id: 11,
    path: "/dashboard/jeu",
    anchorSelector: "[data-onboarding-anchor='jeu-page']",
    title: "🎁 Roulette d'avis Google",
    body: "Tes clients tournent la roue, gagnent un cadeau → laissent un avis Google. Boost SEO local immédiat.",
    details: `Le mécanisme qui fait passer ton resto de 4.2⭐ à 4.7⭐ en 90 jours.

Comment ça marche :

1. Tu configures un jeu avec des lots et leurs probabilités :
   • Café offert : 25%
   • Dessert maison offert : 15%
   • Apéro maison : 10%
   • Rien gagné : 50%
   (l'addition fait 100%)

2. Tu actives le pop-up automatique :
   • S'ouvre 3 secondes après le scan QR
   • Le client peut le fermer s'il veut juste voir la carte
   • Mais c'est ALLÉCHANT donc 60-70% tournent la roue

3. Le client tourne la roue (animation canvas fluide)

4. S'il GAGNE :
   • Pop-up "Bravo ! Pour récupérer ton lot, laisse-nous un avis Google 5⭐"
   • Bouton qui ouvre directement le lien Google reviews
   • Il laisse l'avis → reçoit un code à montrer en caisse
   • Tu valides le code dans ton dashboard → client repart avec son cadeau

5. Si NE GAGNE PAS :
   • Message "Pas de chance, mais notre carte vaut le coup d'œil 😉"
   • Tu peux quand même demander de laisser un avis (optionnel)

Résultats moyens (sur 50+ restos clients) :
• +35 à 60% d'avis Google dans les 60 jours
• Ranking local : 4.2⭐ (1000 avis) → 4.6⭐ après 3 mois
• Lead capture : prénom + tel + email des participants
  → tu les recontactes par SMS (cf. plan Premium)

Coût : inclus dans le plan Pro (29.90€/mois).
Lots offerts : à TA charge — mais 1 café à 1.50€ qui ramène un avis 5⭐
qui ramène 3 clients sur 6 mois = ROI x 10.

ASTUCE : commence avec des petits lots (café, dessert) plus probables.
Garde les gros lots (bouteille de vin, repas pour 2) à 2-5% pour le wow effect.`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
    kind: "value",
  },
  {
    id: 12,
    path: "/dashboard/stats",
    anchorSelector: "[data-onboarding-anchor='stats-page']",
    title: "📊 Stats & Plan Premium",
    body: "Suis tes scans en temps réel. Plan Premium : sans branding Ruliz, multi-restos, SMS marketing.",
    details: `STATISTIQUES (inclus TOUS plans) :

• Scans / jour / semaine / mois / personnalisé
• Heatmap horaire : quand tes clients scannent vraiment
  (utile pour caler le personnel)
• Top produits cliqués : ce qui intéresse vraiment
• Top QR codes : quel emplacement marche mieux
  (vitrine vs table vs flyer)
• Pays + langue des visiteurs (touristes ?)
• Devices : mobile vs desktop, iOS vs Android
• Live feed des scans en temps réel
• Tendances : comparaison période sur période
• Export CSV pour ton comptable / ton équipe

PLAN GRATUIT (Freemium) :
• 1 restaurant
• Stats 7 jours
• 5 catégories, 30 produits max
• Branding "Propulsé par Ruliz" en footer
• 1 langue (FR)

PLAN PRO (29.90€ / mois) :
• Tout du gratuit, sans limite
• 7 langues IA
• Roulette d'avis Google
• Pop-ups événements
• Stats 30 jours
• 1 restaurant

PLAN PREMIUM (44.90€ / mois) :
• Tout du Pro
• SANS branding Ruliz (carte 100% à toi)
• Multi-restaurants (gère 5 lieux depuis 1 compte)
• Équipe : invite tes employés en lecture/édition
• SMS marketing intégré (Brevo) :
  → relance les clients de la roulette qui n'ont pas laissé d'avis
  → annonce les évènements (soirée, brunch dominical…)
  → 200 SMS/mois inclus, puis 0.06€/SMS
• Stats ILLIMITÉES dans le temps
• Support prioritaire (réponse < 4h ouvrées)
• API access (à venir) pour intégrations custom

Comment souscrire :
Paramètres › Facturation › "Gérer mon abonnement"
→ Tu passes par Stripe Checkout (CB ou SEPA)
→ Annulation en 1 clic depuis le Customer Portal Stripe

Promo lancement : -20% les 3 premiers mois si tu actives en
moins de 7 jours après création de compte.`,
    cta: "Terminer 🎉",
    allowSkip: false,
    placement: "bottom",
    kind: "value",
  },
];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;
