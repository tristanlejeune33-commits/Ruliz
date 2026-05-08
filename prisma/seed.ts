import { Prisma, PrismaClient } from "@prisma/client";
import { auth } from "../src/lib/auth";

const prisma = new PrismaClient();

// ---------------- Reference data ----------------

const VIGNETTES = [
  { code: "vegetarien", labelFr: "Végétarien", icone: "leaf" },
  { code: "vegan", labelFr: "Vegan", icone: "sprout" },
  { code: "sans_gluten", labelFr: "Sans gluten", icone: "wheat-off" },
  { code: "fait_maison", labelFr: "Fait maison", icone: "chef-hat" },
  { code: "epice", labelFr: "Épicé", icone: "flame" },
  { code: "bio", labelFr: "Bio", icone: "leaf" },
  { code: "local", labelFr: "Producteur local", icone: "map-pin" },
  { code: "signature", labelFr: "Plat signature", icone: "star" },
];

const ALLERGENES = [
  { code: "gluten", labelFr: "Gluten" },
  { code: "crustaces", labelFr: "Crustacés" },
  { code: "oeufs", labelFr: "Œufs" },
  { code: "poissons", labelFr: "Poissons" },
  { code: "arachides", labelFr: "Arachides" },
  { code: "soja", labelFr: "Soja" },
  { code: "lait", labelFr: "Lait" },
  { code: "fruits_a_coque", labelFr: "Fruits à coque" },
  { code: "celeri", labelFr: "Céleri" },
  { code: "moutarde", labelFr: "Moutarde" },
  { code: "sesame", labelFr: "Sésame" },
  { code: "sulfites", labelFr: "Sulfites" },
  { code: "lupin", labelFr: "Lupin" },
  { code: "mollusques", labelFr: "Mollusques" },
];

// ---------------- Helpers ----------------

async function createAuthUser(opts: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "client" | "team";
  domainUserId: number;
}) {
  // Better-Auth signUpEmail ; les additionalFields role/userId sont input:false → on les patch après.
  const { user } = await auth.api.signUpEmail({
    body: {
      email: opts.email,
      password: opts.password,
      name: opts.name,
    },
  });

  await prisma.authUser.update({
    where: { id: user.id },
    data: {
      role: opts.role,
      userId: opts.domainUserId,
    },
  });
}

// ---------------- Main ----------------

async function main() {
  console.log("🌱 Seed Ruliz — démarrage…");

  // 1. Vignettes & allergènes (idempotent)
  console.log("→ Vignettes & allergènes");
  await Promise.all([
    ...VIGNETTES.map((v) =>
      prisma.vignette.upsert({
        where: { code: v.code },
        update: {},
        create: v,
      }),
    ),
    ...ALLERGENES.map((a) =>
      prisma.allergene.upsert({
        where: { code: a.code },
        update: {},
        create: a,
      }),
    ),
  ]);

  // 2. Wipe demo data (clean reseeds)
  // On supprime AuthUser AVANT User : Better-Auth peut avoir créé un AuthUser
  // orphelin (userId null) qui ne serait pas cascade-supprimé sinon.
  console.log("→ Reset des comptes de démo");
  const demoEmails = [
    "tristan@ruliz.app",
    "marie.dubois@tirebouchon.fr",
    "pierre.martin@chezpierre.fr",
  ];
  await prisma.authUser.deleteMany({ where: { email: { in: demoEmails } } });
  await prisma.user.deleteMany({ where: { email: { in: demoEmails } } });

  // 3. Admin Tristan
  console.log("→ Admin");
  const adminUser = await prisma.user.create({
    data: {
      email: "tristan@ruliz.app",
      prenom: "Tristan",
      nom: "Lejeune",
      role: "admin",
      statut: "actif",
      pays: "France",
    },
  });
  await createAuthUser({
    email: adminUser.email,
    password: "RulizAdmin2026!",
    name: `${adminUser.prenom} ${adminUser.nom}`,
    role: "admin",
    domainUserId: adminUser.id,
  });

  // 4. Client #1 — Marie (le Tire-Bouchon)
  console.log("→ Client #1 — Marie Dubois");
  const marie = await prisma.user.create({
    data: {
      email: "marie.dubois@tirebouchon.fr",
      prenom: "Marie",
      nom: "Dubois",
      telephone: "0556778899",
      adresse: "12 rue Sainte-Catherine",
      codePostal: "33000",
      ville: "Bordeaux",
      role: "client",
      statut: "actif",
      demoActive: false,
    },
  });
  await createAuthUser({
    email: marie.email,
    password: "MarieDemo2026!",
    name: "Marie Dubois",
    role: "client",
    domainUserId: marie.id,
  });

  // 5. Client #2 — Pierre (Chez Pierre)
  console.log("→ Client #2 — Pierre Martin");
  const pierre = await prisma.user.create({
    data: {
      email: "pierre.martin@chezpierre.fr",
      prenom: "Pierre",
      nom: "Martin",
      telephone: "0612345678",
      adresse: "3 place du Marché",
      codePostal: "13001",
      ville: "Marseille",
      role: "client",
      statut: "actif",
      demoActive: true,
    },
  });
  await createAuthUser({
    email: pierre.email,
    password: "PierreDemo2026!",
    name: "Pierre Martin",
    role: "client",
    domainUserId: pierre.id,
  });

  // 6. Restaurant #1 — Le Tire-Bouchon (carte démo complète)
  console.log("→ Restaurant : Le Tire-Bouchon");
  const tireBouchon = await prisma.restaurant.create({
    data: {
      userId: marie.id,
      nom: "Le Tire-Bouchon",
      email: "contact@tirebouchon.fr",
      telephone: "0556778899",
      adresse: "12 rue Sainte-Catherine",
      codePostal: "33000",
      ville: "Bordeaux",
      pays: "France",
      plan: "pro",
      couleurPrimaire: "#7C2D12",
      couleurSecondaire: "#FED7AA",
      facebookUrl: "https://facebook.com/tirebouchon-bordeaux",
      instagramUrl: "https://instagram.com/letirebouchon.bdx",
      googleReviewUrl: "https://g.page/r/tirebouchon-bordeaux/review",
      siteWeb: "https://tirebouchon.fr",
    },
  });

  await prisma.qrcode.create({
    data: {
      restaurantId: tireBouchon.id,
      codeUnique: "TB-BDX-001",
      assignedAt: new Date(),
      statut: "actif",
    },
  });

  // 7. Restaurant #2 — Chez Pierre (vide, pour tester l'onboarding)
  console.log("→ Restaurant : Chez Pierre");
  await prisma.restaurant.create({
    data: {
      userId: pierre.id,
      nom: "Chez Pierre",
      email: "pierre@chezpierre.fr",
      telephone: "0612345678",
      adresse: "3 place du Marché",
      codePostal: "13001",
      ville: "Marseille",
      pays: "France",
      plan: "freemium",
    },
  });

  // 8. Carte démo « Le Tire-Bouchon »
  console.log("→ Carte démo Tire-Bouchon");

  const vignetteByCode = await prisma.vignette.findMany();
  const allergeneByCode = await prisma.allergene.findMany();
  const v = (code: string) => vignetteByCode.find((x) => x.code === code)!.id;
  const a = (code: string) => allergeneByCode.find((x) => x.code === code)!.id;

  // Catégories
  const catEntrees = await prisma.categorie.create({
    data: {
      restaurantId: tireBouchon.id,
      titre: "Entrées",
      icone: "salad",
      position: 1,
      modeAffichage: "liste",
    },
  });
  const catPlats = await prisma.categorie.create({
    data: {
      restaurantId: tireBouchon.id,
      titre: "Plats",
      icone: "utensils",
      position: 2,
      modeAffichage: "liste",
    },
  });
  const catDesserts = await prisma.categorie.create({
    data: {
      restaurantId: tireBouchon.id,
      titre: "Desserts",
      icone: "cake-slice",
      position: 3,
      modeAffichage: "grille",
    },
  });
  const catVins = await prisma.categorie.create({
    data: {
      restaurantId: tireBouchon.id,
      titre: "Vins",
      icone: "wine",
      position: 4,
      modeAffichage: "liste",
    },
  });

  // Produits (entrées)
  const foieGras = await prisma.produit.create({
    data: {
      categorieId: catEntrees.id,
      titre: "Foie gras maison, chutney de figues",
      description:
        "Foie gras de canard du Sud-Ouest mi-cuit, chutney de figues noires, brioche toastée.",
      prix: new Prisma.Decimal(18.5),
      position: 1,
      origine: "FR",
      vignettes: { create: [{ vignetteId: v("fait_maison") }, { vignetteId: v("signature") }] },
      allergenes: { create: [{ allergeneId: a("gluten") }, { allergeneId: a("sulfites") }] },
    },
  });

  const tartare = await prisma.produit.create({
    data: {
      categorieId: catEntrees.id,
      titre: "Tartare de bœuf au couteau",
      description:
        "Bœuf de race Bazas taillé minute, échalote, câpres, jaune d'œuf de poule bio.",
      prix: new Prisma.Decimal(16.0),
      position: 2,
      vignettes: { create: [{ vignetteId: v("local") }] },
      allergenes: { create: [{ allergeneId: a("oeufs") }, { allergeneId: a("moutarde") }] },
    },
  });

  // Produits (plats)
  const entrecote = await prisma.produit.create({
    data: {
      categorieId: catPlats.id,
      titre: "Entrecôte de Bazas, frites maison",
      description:
        "Pièce de 350g grillée à la cheminée, beurre maître d'hôtel, frites coupées et frites deux fois.",
      prix: new Prisma.Decimal(28.0),
      position: 1,
      estNouveau: false,
      origine: "FR",
      vignettes: { create: [{ vignetteId: v("signature") }, { vignetteId: v("local") }] },
      allergenes: { create: [{ allergeneId: a("lait") }] },
    },
  });

  const magret = await prisma.produit.create({
    data: {
      categorieId: catPlats.id,
      titre: "Magret de canard, sauce au miel et poivre de Sichuan",
      description:
        "Magret rosé, jus court au miel d'acacia, pommes grenailles écrasées à la peau.",
      prix: new Prisma.Decimal(24.5),
      position: 2,
      origine: "FR",
      vignettes: { create: [{ vignetteId: v("epice") }] },
      allergenes: { create: [{ allergeneId: a("sulfites") }] },
    },
  });

  const ravioles = await prisma.produit.create({
    data: {
      categorieId: catPlats.id,
      titre: "Ravioles de cèpes, crème de parmesan",
      description:
        "Pâte fraîche maison, cèpes du Périgord, copeaux de parmesan 24 mois, huile de truffe.",
      prix: new Prisma.Decimal(22.0),
      position: 3,
      vignettes: { create: [{ vignetteId: v("vegetarien") }, { vignetteId: v("fait_maison") }] },
      allergenes: { create: [{ allergeneId: a("gluten") }, { allergeneId: a("oeufs") }, { allergeneId: a("lait") }] },
    },
  });

  // Produits (desserts)
  const canele = await prisma.produit.create({
    data: {
      categorieId: catDesserts.id,
      titre: "Trio de canelés bordelais",
      description:
        "Trois canelés moulés au cuivre, croûte caramélisée et cœur moelleux à la vanille.",
      prix: new Prisma.Decimal(8.0),
      position: 1,
      titreRemarque: "Spécialité de la maison",
      descriptionRemarque: "Recette familiale depuis trois générations.",
      vignettes: { create: [{ vignetteId: v("signature") }, { vignetteId: v("fait_maison") }] },
      allergenes: { create: [{ allergeneId: a("gluten") }, { allergeneId: a("oeufs") }, { allergeneId: a("lait") }] },
    },
  });

  await prisma.produit.create({
    data: {
      categorieId: catDesserts.id,
      titre: "Tarte fine aux pommes du Médoc",
      description:
        "Pâte feuilletée au beurre AOP, pommes Reinette du Médoc, glace vanille bourbon.",
      prix: new Prisma.Decimal(9.5),
      position: 2,
      vignettes: { create: [{ vignetteId: v("local") }, { vignetteId: v("vegetarien") }] },
      allergenes: { create: [{ allergeneId: a("gluten") }, { allergeneId: a("lait") }, { allergeneId: a("oeufs") }] },
    },
  });

  // Produits (vins)
  await prisma.produit.create({
    data: {
      categorieId: catVins.id,
      titre: "Saint-Émilion Grand Cru, Château Bellefont-Belcier 2018",
      description: "Vin rouge, 75cl. Robe profonde, fruits noirs, notes de cèdre.",
      prix: new Prisma.Decimal(78.0),
      descriptionPrix: "Au verre 12cl : 14€",
      position: 1,
      origine: "FR",
      allergenes: { create: [{ allergeneId: a("sulfites") }] },
    },
  });

  await prisma.produit.create({
    data: {
      categorieId: catVins.id,
      titre: "Pessac-Léognan blanc, Château Carbonnieux 2020",
      description: "Vin blanc sec, 75cl. Sauvignon-sémillon, agrumes et fleurs blanches.",
      prix: new Prisma.Decimal(62.0),
      descriptionPrix: "Au verre 12cl : 11€",
      position: 2,
      origine: "FR",
      allergenes: { create: [{ allergeneId: a("sulfites") }] },
    },
  });

  // Suggestions croisées
  await prisma.produitSuggestion.createMany({
    data: [
      { produitId: entrecote.id, suggestionId: foieGras.id, position: 1 },
      { produitId: entrecote.id, suggestionId: canele.id, position: 2 },
      { produitId: magret.id, suggestionId: tartare.id, position: 1 },
      { produitId: ravioles.id, suggestionId: canele.id, position: 1 },
    ],
    skipDuplicates: true,
  });

  // Jeu roulette de démo
  await prisma.jeu.create({
    data: {
      restaurantId: tireBouchon.id,
      nom: "Roulette des avis",
      actif: true,
      configJson: {
        cta: "Laisse-nous un avis Google et tente de gagner !",
        lots: [
          { label: "Café offert", probabilite: 40 },
          { label: "Dessert offert", probabilite: 25 },
          { label: "Apéritif maison", probabilite: 20 },
          { label: "10% sur ta prochaine note", probabilite: 10 },
          { label: "Menu offert pour 2", probabilite: 5 },
        ],
        require_google_review: true,
      },
    },
  });

  console.log("✅ Seed terminé.");
  console.log("");
  console.log("Comptes de démo :");
  console.log("  admin    tristan@ruliz.app             / RulizAdmin2026!");
  console.log("  client   marie.dubois@tirebouchon.fr   / MarieDemo2026!");
  console.log("  client   pierre.martin@chezpierre.fr   / PierreDemo2026!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
