/**
 * Config des 12 étapes du tour onboarding.
 *
 * Structure :
 *  - Slides 1-10 = tour de base (mise en place de la carte)
 *  - Slides 11-12 = plus-value (features avancées qui font vendre)
 *
 * Ton : tutoiement, vocabulaire simple, zéro jargon technique. On vise
 * une compréhension par un restaurateur 50 ans pas calé en informatique.
 * Mots BANNIS : SEO, IA, CDN, API, INCO, slug, payload, async, lead, KPI,
 * CTR, etc. → on dit "remonter dans Google", "traduction automatique",
 * "adresse de la carte", "récupérer les contacts" etc.
 *
 * Chaque étape :
 *  - path  : route où la bulle doit emmener l'utilisateur via router.push()
 *  - anchorSelector : sélecteur CSS de l'élément à pointer (data-onboarding-anchor)
 *                     ou null pour la position par défaut (bottom-right)
 *  - title : 1 ligne, max 40 caractères
 *  - body  : 2 lignes max, simple
 *  - details : texte long expliqué pas-à-pas, lisible par un enfant de 12 ans
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
  details?: string;
  cta: string;
  allowSkip: boolean;
  placement?: "top" | "bottom" | "left" | "right";
  kind: StepKind;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // =========================================================================
  // TOUR DE BASE · slides 1 à 10
  // =========================================================================
  {
    id: 1,
    path: "/dashboard",
    anchorSelector: null,
    title: "Salut 👋 Bienvenue dans Ruliz.",
    body: "Je te montre tout en 12 étapes · 3 minutes chrono. C'est parti ?",
    details: `On va voir ensemble :
• Comment configurer ton restaurant (logo, couleurs, infos)
• Créer tes premières catégories et plats
• Ajouter des photos en 1 clic
• Indiquer les allergènes et les pictos végé / épicé / fait maison
• Voir ta carte comme tes clients la verront
• Imprimer ton QR code à poser sur les tables
• 2 fonctions bonus : la roulette à avis Google et tes statistiques

À chaque étape, clique sur "Plus de détails" pour avoir le mode
d'emploi complet. Tu peux quitter le tour quand tu veux, et le
relancer plus tard depuis Paramètres › Profil.`,
    cta: "C'est parti →",
    allowSkip: true,
    kind: "base",
  },
  {
    id: 2,
    path: "/dashboard/restaurant",
    anchorSelector: "[data-onboarding-anchor='restaurant-branding']",
    title: "Ton identité visuelle 🎨",
    body: "Logo et couleur de ta carte. Glisse une image ou colle-la (Ctrl+V).",
    details: `Onglet "Médias" :
• Logo : une image carrée (idéal 500×500 pixels, PNG ou JPG)
• Bannière : une grande image qui s'affiche tout en haut de ta carte
• Tu peux glisser l'image avec ta souris, OU faire Ctrl+V après l'avoir copiée

Onglet "Couleurs" :
• Choisis ta couleur principale → toute la carte s'adapte
  (boutons, titres, accents)
• Tu peux aussi changer la couleur de fond et celle du texte
• Bouton "Reset" pour revenir aux couleurs de départ

Onglet "Thème" :
• 3 styles prêts à l'emploi : Clair, Sombre, Bois (style bistrot)
• Choisis-en un, tu peux ajuster les couleurs après si tu veux

À droite, tu vois ta carte se mettre à jour en direct à chaque
modification · c'est exactement ce que tes clients verront.`,
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
    body: "Adresse, téléphone, horaires. C'est ce qui rassure tes clients.",
    details: `Onglet "Infos" · remplis les champs de ton restaurant :

• Nom du restaurant (s'affiche en haut de ta carte)
• Adresse complète : numéro, rue, code postal, ville
  → les clients peuvent cliquer dessus pour ouvrir Google Maps
• Téléphone : si un client clique dessus depuis son mobile,
  ça appelle directement le resto
• Email : on s'en sert pour t'envoyer les notifications importantes
• Devise : € pour la France, $ pour les USA, etc.
• Langue principale : celle dans laquelle TU écris ta carte
  (les autres langues seront traduites toutes seules)

Attention : tout ce que tu mets ici est PUBLIC sur ta carte.
Évite ton numéro personnel · mets celui du resto.`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
    kind: "base",
  },
  {
    id: 4,
    path: "/dashboard/restaurant",
    anchorSelector: "[data-onboarding-anchor='restaurant-social']",
    title: "Réseaux & avis Google 🌐",
    body: "Facebook, Insta, lien Google · pour remonter dans les recherches.",
    details: `Onglet "Réseaux" · tout est optionnel, mets ce que tu veux :

• Facebook : copie l'adresse de ta page (ex: facebook.com/tonresto)
• Instagram : pareil
• TikTok : pareil
• Site web : si tu en as un autre

• LIEN POUR AVIS GOOGLE (le plus important) :
  Va sur ta fiche Google Business → clic "Demander un avis"
  → copie l'adresse qui s'affiche (elle ressemble à g.page/r/...)

Pourquoi c'est si important ?
• Tes clients voient un bouton "Avis Google" en haut de ta carte
• Plus tu as d'avis, plus tu remontes dans les recherches Google
  (les gens qui cherchent "restaurant + ta ville" te trouvent en premier)
• En moyenne, les restos qui ajoutent ce lien ont 35% d'avis en plus
  dans les 2 mois qui suivent

Tu n'as pas encore de fiche Google ? Crée-la AVANT · c'est gratuit
et c'est ce qui te rapporte le plus de visibilité dans ton quartier.`,
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
    body: "Entrées, Plats, Vins, Desserts… autant que tu veux, dans l'ordre que tu veux.",
    details: `Les catégories, ce sont les grandes sections de ta carte
(Entrées, Plats, Boissons, Desserts…).

Pour créer une catégorie :
1. Clic sur "+ Catégorie" en haut à gauche
2. Donne-lui un nom (ex: "Entrées")
3. Choisis un emoji (optionnel) · clique sur le bouton 🍽️
4. Clic "Créer"

Options supplémentaires :
• Affichage : liste (défaut), grille (avec photos), carrousel
• Catégorie parente : pour faire des sous-catégories
  (exemple : Vins ↳ Rouges / Blancs / Rosés)
• Couleur custom : pour qu'une catégorie ressorte
  (exemple : rouge vif pour "Épicés")
• Horaire d'affichage : visible seulement le midi /
  le soir / happy hour
  → utile si tu as une carte qui change selon le moment de la journée

Pour réorganiser tes catégories :
glisse-les avec ta souris dans la liste de gauche.
Tu peux aussi les glisser SUR une autre pour en faire une sous-catégorie.

Une catégorie qui n'a aucun produit dedans n'apparaît pas
sur ta carte publique.`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "right",
    kind: "base",
  },
  {
    id: 6,
    path: "/dashboard/menu",
    anchorSelector: null,
    title: "Ton premier plat 🍕",
    body: "Clique sur une catégorie, puis sur « + Produit » pour ajouter un plat.",
    details: `Pour ajouter ton premier plat :
1. Clique sur une catégorie dans la liste de gauche
2. Bouton "+ Produit" en haut à droite
3. Le panneau d'ajout s'ouvre

Champs essentiels :
• Titre : le nom du plat
• Description : 2-3 lignes qui donnent envie
  (parfum, ingrédients, texture…)
• Photo : 1 image carrée (voir l'étape suivante)
• Prix : en euros, avec virgule (ex: 12,50)

Champs en option, mais bien utiles :
• Petite précision sous le prix
  (ex: "20cl", "la pièce", "à partir de")
• Variantes de prix : si plusieurs tailles
  (ex: Bière demi 4€ / pinte 7€)
• Sous-catégorie : pour ranger dans une cat parent
• Position : l'ordre dans la liste
• Statut : Publié (visible par les clients) ou Brouillon
  (caché tant que tu n'as pas fini)
• Pays d'origine : affiche un petit drapeau 🇫🇷 à côté

Conseil : commence simple. Juste nom + description + prix suffit
pour publier ton plat. Tu enrichiras (photos, allergènes…) plus tard.`,
    cta: "Suivant →",
    allowSkip: true,
    kind: "base",
  },
  {
    id: 7,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='produit-photo']",
    title: "Astuce photos 📸",
    body: "Glisse une image, ou colle-la avec Ctrl+V. Aucun besoin de l'enregistrer avant.",
    details: `3 façons d'ajouter une photo :

1. CLIQUER : clic sur la zone photo, choisis l'image sur ton ordi

2. GLISSER : prends une image avec ta souris depuis ton bureau,
   glisse-la dans la zone photo

3. COLLER (Ctrl+V) · le plus rapide :
   • Sur Windows : appuie sur Win+Maj+S pour faire une capture d'écran,
     puis Ctrl+V dans la zone photo
   • Sur Mac : appuie sur Cmd+Maj+4 pour la capture,
     puis Cmd+V dans la zone photo
   • Tu peux aussi copier une image depuis Instagram, Google, Pinterest
     (clic-droit → "Copier l'image") puis Ctrl+V

Formats acceptés : PNG, JPG, WebP, GIF
Poids max : 5 Mo
Format conseillé : carré (même hauteur que largeur)

Conseils pour de belles photos :
• Prends-les avec ton téléphone, près d'une fenêtre
  (la lumière naturelle est ton amie)
• Fond simple (assiette blanche, table en bois)
• Pas besoin d'un photographe pro :
  une photo simple bien éclairée vaut mieux qu'une photo "pro" floue`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "left",
    kind: "base",
  },
  {
    id: 8,
    path: "/dashboard/menu",
    anchorSelector: "[data-onboarding-anchor='produit-allergenes']",
    title: "Allergènes & pictos 🌿",
    body: "Coche fait maison, végé, sans gluten, épicé… affiché sur la fiche du plat.",
    details: `Petits pictos affichés sur la fiche de chaque plat.

PICTOS COLORÉS (en haut de la fiche) :
• 🌿 Fait maison
• 🌱 Végétarien
• 🥬 Vegan (aucun produit animal)
• 🌾 Sans gluten
• 🔥 Épicé
• ⭐ Spécialité du chef
• ❄️ À manger froid
• 🐟 Pêche locale
• 🍷 Accord avec un vin
… et plein d'autres

ALLERGÈNES (les 14 obligatoires en France) :
• Gluten, Crustacés, Œufs, Poissons, Arachides
• Soja, Lait, Fruits à coque, Céleri, Moutarde
• Sésame, Sulfites, Lupin, Mollusques

ATTENTION : la loi française t'oblige à afficher les allergènes
de chaque plat. Une carte digitale qui les liste te met en règle
automatiquement, sans paperasse.

Comment ça s'affiche pour tes clients :
• Les pictos colorés apparaissent en haut de la fiche du plat
• Les allergènes en bas, avec leur sigle officiel
• Tout est traduit dans les 7 langues

Conseil : ne triche pas avec le "fait maison" · les clients lisent
et apprécient quand c'est honnête.`,
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
    body: "À droite, ta carte comme tes clients la voient. Change la langue, on traduit tout seul.",
    details: `Ce que tu vois à droite, c'est ta vraie carte publique ·
exactement ce que tes clients verront.

Comportement :
• Ta carte se met à jour TOUTE SEULE à chaque modification
  (en moins d'1 seconde)
• Si besoin, bouton "Rafraîchir" en haut à droite de l'aperçu
• Clic sur "Ouvrir dans un onglet" pour la tester en grand format

Choix de la langue (en haut de l'aperçu) :
• FR : ta langue d'écriture (français)
• EN, ES, DE, IT, PT, ZH : Anglais, Espagnol, Allemand,
  Italien, Portugais, Chinois · traduites automatiquement

Comment marche la traduction automatique ?
• La première fois qu'un client consulte ta carte en anglais
  → traduction faite en quelques secondes
• Ensuite c'est enregistré POUR TOUJOURS · la prochaine fois c'est instantané
• Si tu modifies un texte en français, les traductions
  se mettent à jour toutes seules en arrière-plan
• Tu n'as RIEN à faire · c'est inclus

Bouton "Re-traduire" :
• Force une nouvelle traduction si tu veux changer le style
• Aucun coût supplémentaire · inclus dans tous les abonnements

Si tu vois un bandeau orange "Traduction partielle" :
ça veut juste dire que la traduction est encore en cours
(10 secondes max). Ça disparaît tout seul.`,
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
    body: "Télécharge-le, imprime-le, pose-le sur tes tables. Il pointe toujours vers ta carte à jour.",
    details: `Tu peux créer PLUSIEURS QR codes pour savoir lequel marche le mieux.

Pour créer un QR :
• Bouton "+ QR" en haut de la page
• Donne-lui un nom (ex: "table-12", "vitrine", "flyer-octobre")
• Statut : Actif ou Suspendu
  (pratique pour stopper une vieille campagne marketing)

Pour le télécharger :
• Format PNG haute résolution 1024×1024 pixels
  (parfait pour l'impression standard)
• Format SVG (pour imprimeur professionnel, gravure laser…)
• Lien direct pour partager par WhatsApp, mail, etc.

Statistiques par QR (page Analyse) :
• Quel QR scanne le plus
• À quelles heures
• Quels plats les clients de ce QR regardent le plus
  (exemple : "Les clients de la vitrine commandent surtout des desserts")

═══════════════════════════════════════════════════
🛒 BOUTIQUE RULIZ · commande tes supports pré-imprimés
═══════════════════════════════════════════════════

Pas envie de t'embêter avec l'impression ? On le fait pour toi.
Va dans Dashboard › Boutique QR pour commander :

• 📋 SETS DE TABLE PERSONNALISÉS
  Avec ton QR code + ton logo + ta couleur
  Format A4, papier épais, pelliculage mat
  100 pièces : commande livrée chez toi en 5 jours

• 🪧 STICKERS QR pour tables/vitrines
  Vinyle adhésif résistant, format carré 8×8 cm
  Lot de 30, parfait pour équiper toutes tes tables

• 🖼️ PANNEAUX VITRINE
  Plexiglas A4 ou A3 à poser ou accrocher
  Ton QR + "Notre carte du jour" en gros
  Idéal pour attirer les passants

• 🎨 CHEVALETS DE TABLE
  Bois ou carton plié, élégant, format L
  Plus durable que le sticker

Tous tes designs reprennent automatiquement TES couleurs et TON logo
(configurés à l'étape 2 du tour). Pas besoin de graphiste.

Paiement sécurisé en ligne, livraison France 3-5 jours
(+ DOM-TOM et UE possible).

═══════════════════════════════════════════════════

Si tu imprimes TOI-MÊME · conseils pratiques :
• Imprime sur sticker MAT (pas brillant · sinon ça fait des reflets
  et bloque le scan)
• Taille minimum : 4×4 cm pour un scan smartphone confortable
• Pose à hauteur des yeux sur les tables
• Évite les coins pliés ou les pochettes plastiques
• Ajoute "Scannez pour voir notre carte 📱" à côté du QR

ASTUCE GÉNIALE : si tu changes ta carte (été → hiver),
tu n'as PAS à ré-imprimer ton QR code. Le QR pointe toujours
vers ta carte à jour · tu modifies côté dashboard, c'est tout.
Donc tes sets de table commandés à la boutique restent valables
À VIE même si tu changes 50 fois ta carte.`,
    cta: "Voir les plus 🎁",
    allowSkip: true,
    placement: "left",
    kind: "base",
  },
  // =========================================================================
  // PLUS-VALUE · slides 11 et 12
  // =========================================================================
  {
    id: 11,
    path: "/dashboard/jeu",
    anchorSelector: "[data-onboarding-anchor='jeu-page']",
    title: "🎁 Roulette à avis Google",
    body: "Tes clients tournent la roue, gagnent un cadeau, laissent un avis Google. Magique.",
    details: `Le système qui fait passer ton resto de 4.2 ⭐ à 4.7 ⭐ en 3 mois.

Comment ça marche :

1. Tu choisis les lots à gagner et leurs chances :
   • Café offert : 25% de chances
   • Dessert maison offert : 15%
   • Apéritif offert : 10%
   • Rien : 50%
   (le total doit faire 100%)

2. Activation du pop-up automatique :
   • Apparaît 3 secondes après que le client scanne ton QR
   • Le client peut le fermer s'il préfère juste voir la carte
   • Mais c'est tentant · 60 à 70% des clients tournent la roue

3. Le client tourne la roue (jolie animation)

4. S'il GAGNE :
   • Pop-up "Bravo ! Pour récupérer ton lot, laisse-nous un avis
     Google 5 étoiles"
   • Le bouton ouvre directement la page Google reviews de ton resto
   • Le client laisse son avis → reçoit un code à montrer au resto
   • Tu vérifies le code dans ton dashboard → le client repart avec son cadeau

5. S'il PERD :
   • Message "Pas de chance, mais notre carte vaut le coup d'œil 😉"
   • Tu peux quand même demander un avis (optionnel)

Résultats observés chez nos 50+ restos clients :
• +35 à 60% d'avis Google en 2 mois
• Note moyenne qui passe de 4.2 à 4.6 étoiles en 3 mois
• Tu récupères le prénom + le numéro de chaque participant
  → tu peux les recontacter par SMS plus tard
  (avec l'abonnement Premium)

Coût : inclus dans l'abonnement Pro (29,90€/mois).
Les lots offerts sont à TA charge.

Mais 1 café offert à 1,50€ → 1 avis 5⭐ → 3 nouveaux clients sur 6 mois.
Très rentable.

Conseil : commence avec des petits lots qui ont beaucoup de chances
(café, dessert). Garde les gros lots (bouteille de vin, repas pour 2)
à 2-5% pour faire l'effet "wow" quand quelqu'un gagne.`,
    cta: "Suivant →",
    allowSkip: true,
    placement: "bottom",
    kind: "value",
  },
  {
    id: 12,
    // On reste sur /dashboard (page d'accueil) pour garantir que la slide
    // s'affiche, même si l'utilisateur n'a pas accès à /dashboard/stats
    // (paywall, plan gratuit, etc.). La bulle apparaît en bottom-right.
    path: "/dashboard",
    anchorSelector: null,
    title: "📊 Statistiques & Abonnements",
    body: "Suis tes scans en direct. Et compare les abonnements pour aller plus loin.",
    details: `STATISTIQUES (incluses dans TOUS les abonnements) :

Ce que tu peux voir dans la page "Analyse" :
• Nombre de scans par jour, par semaine, par mois
• Heures où tes clients scannent le plus
  (pour caler tes équipes en cuisine)
• Top des plats les plus regardés
• Quel QR code marche mieux
  (vitrine vs table vs flyer)
• Pays et langue des visiteurs (touristes ou locaux ?)
• Téléphone vs ordinateur, iPhone vs Android
• Liste en direct des derniers scans
• Comparaison entre 2 périodes (cette semaine vs semaine dernière)
• Export Excel pour ton comptable

═══════════════════════════════════════
LES 3 ABONNEMENTS RULIZ :
═══════════════════════════════════════

📦 GRATUIT (Freemium) · 0€/mois
• 1 restaurant
• Statistiques sur les 7 derniers jours
• Max 5 catégories, 30 plats
• Petite mention "Propulsé par Ruliz" en bas de ta carte
• Carte uniquement en français

⭐ PRO · 29,90€ / mois
• Tout ce qui est gratuit + en illimité
• Carte traduite en 7 langues automatiquement
• Roulette à avis Google (étape 11)
• Pop-ups événements (ex: "Soirée vins ce vendredi !")
• Statistiques sur 30 jours
• 1 restaurant

💎 PREMIUM · 44,90€ / mois
• Tout du Pro
• SANS mention Ruliz (ta carte 100% à toi)
• Plusieurs restaurants (jusqu'à 5) gérés depuis un seul compte
• Invite tes employés (gestion d'équipe)
• 📱 SMS MARKETING INTÉGRÉ · voir détail ci-dessous
• Statistiques sans limite dans le temps
• Support prioritaire (réponse en moins de 4h en semaine)

═══════════════════════════════════════════
📱 LE SMS MARKETING (exclu Premium) en détail
═══════════════════════════════════════════

Tu te demandes "à quoi ça sert" ? Voilà ce que tu peux faire :

1. RELANCE AUTOMATIQUE après la roulette
   Quand un client tourne la roue et laisse son téléphone,
   tu peux lui envoyer un SMS 24h plus tard :
   "Salut Marc 👋 Merci d'être passé hier ! Si tu n'as pas eu
    le temps de laisser un avis Google, c'est par ici : [lien]
    Encore merci, l'équipe du Tire-Bouchon"
   → Récupère les avis qui auraient été oubliés.

2. ANNONCE D'ÉVÉNEMENTS
   "Soirée vins du Beaujolais ce jeudi 19h ! Réservation par
    SMS à ce numéro 🍷"
   → Tu envoies en 1 clic à tous tes clients récents.

3. CARTE DU JOUR / OFFRE
   "Aujourd'hui, blanquette de veau maison à 18€ + verre de vin
    offert. Réserve avant 19h pour en profiter !"
   → Booste tes services creux (mardi-mercredi midi par ex).

4. RAPPEL D'ANNIVERSAIRE
   Si un client a renseigné sa date de naissance dans la roulette,
   un SMS automatique lui souhaite son anniversaire avec un cadeau
   à venir chercher au resto.

COMMENT ÇA MARCHE :
• Tu écris ton SMS (160 caractères, comme un SMS normal)
• Tu choisis tes destinataires (filtre : tous, derniers 30 jours,
  ceux de la roulette, etc.)
• Tu vois la preview, le coût estimé, et tu envoies
• Les SMS partent dans la minute via notre partenaire Brevo
  (numéro court "RULIZ" ou personnalisé)

PRIX :
• 200 SMS / mois INCLUS dans l'abonnement Premium (44,90€)
• Au-delà : 6 centimes par SMS (~6€ pour 100 SMS de plus)
• Ça coûte moins que 1 client qui revient = facile à rentabiliser

CONFORME RGPD :
• Lien de désinscription auto en bas de chaque SMS
• Consentement coché par le client à la roulette
• Tu peux exporter tes contacts à tout moment

═══════════════════════════════════════

Comment t'abonner ?
→ Paramètres › Facturation › "Gérer mon abonnement"
→ Paiement sécurisé par carte bancaire ou prélèvement
→ Résiliation possible en 1 clic à tout moment

🎁 Promo de lancement : -20% les 3 premiers mois
si tu t'abonnes dans les 7 jours qui suivent ton inscription.`,
    cta: "Terminer 🎉",
    allowSkip: false,
    kind: "value",
  },
];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;
