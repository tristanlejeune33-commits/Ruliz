import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Mentions légales & CGV · Ruliz",
  description:
    "Mentions légales, conditions générales de vente, politique de confidentialité et de cookies de Ruliz.",
  // Page légale : on autorise l'indexation pour la transparence, mais on
  // évite que les moteurs ne sur-pondèrent ce contenu à faible valeur d'usage.
  robots: { index: true, follow: true },
};

/**
 * Page légale consolidée — Mentions légales + CGV + Politique de
 * confidentialité + Cookies. Une seule page longue à TOC sticky parce que :
 *   - Le contenu est intrinsèquement lié (les CGV citent la confidentialité)
 *   - 1 URL = 1 source de vérité légale, facile à mettre à jour
 *   - Tous les liens du footer pointent ici via ancres (#editeur, #cgv,
 *     #confidentialite, #cookies).
 */

type TocItem = { id: string; label: string };
type Section = {
  id: string;
  number?: string;
  title: string;
  /** Si défini, démarre un nouveau chapitre dans la TOC */
  chapter?: string;
  body: React.ReactNode;
};

const TOC: TocItem[] = [
  { id: "editeur", label: "Éditeur du site" },
  { id: "hebergeur", label: "Hébergeur" },
  { id: "cgv", label: "Conditions générales de vente" },
  { id: "confidentialite", label: "Politique de confidentialité" },
  { id: "cookies", label: "Cookies" },
  { id: "rgpd", label: "Conformité RGPD" },
  { id: "contact", label: "Nous contacter" },
];

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-20">
      {/* === Hero === */}
      <header className="mb-12 space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-glass)] bg-[var(--bg-glass)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          <Scale className="size-3" strokeWidth={1.75} />
          Informations légales
        </span>
        <h1 className="text-balance text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
          Mentions légales &amp; conditions générales
        </h1>
        <p className="max-w-2xl text-pretty text-base text-[var(--text-secondary)]">
          Tout ce qui concerne l&apos;éditeur de Ruliz, les conditions de
          vente, la gestion de tes données personnelles et l&apos;usage des
          cookies. Mis à jour le 12 mai 2026.
        </p>
      </header>

      {/* === Grid TOC + contenu === */}
      <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
        {/* TOC sticky desktop */}
        <aside className="hidden lg:block">
          <nav
            aria-label="Table des matières"
            className="sticky top-24 space-y-1 text-sm"
          >
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              Sommaire
            </p>
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block rounded-md px-3 py-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-glass)] hover:text-[var(--text-primary)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Contenu */}
        <article className="space-y-12 leading-relaxed text-[var(--text-secondary)] [&_a]:text-[var(--accent)] [&_a]:underline [&_a:hover]:opacity-80 [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24">
          {/* === Éditeur === */}
          <section id="editeur" className="space-y-4">
            <H2>Éditeur du site</H2>
            <p>
              Le site <strong>ruliz.fr</strong> est édité par{" "}
              <strong>Ruliz</strong>, micro-entreprise immatriculée au Registre
              du Commerce et des Sociétés de Bordeaux sous le numéro{" "}
              <span className="font-mono">98451929800017</span>.
            </p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>
                <strong>Siège social :</strong> 15 chemin de la Pallue,
                16440 Nersac
              </Li>
              <Li>
                <strong>Directeur de la publication :</strong> Tom Rullier
              </Li>
              <Li>
                <strong>Email :</strong>{" "}
                <a href="mailto:tom.rullier@ruliz.fr">tom.rullier@ruliz.fr</a>
              </Li>
              <Li>
                <strong>Téléphone :</strong>{" "}
                <a href="tel:+33651117951">06 51 11 79 51</a>
              </Li>
            </ul>
          </section>

          {/* === Hébergeur === */}
          <section id="hebergeur" className="space-y-4">
            <H2>Hébergeur</H2>
            <p>
              Le site est hébergé par <strong>DyHost</strong>, situé au 14 rue
              de l&apos;Union, 16440 Nersac, France.
            </p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>
                <strong>Email :</strong>{" "}
                <a href="mailto:contact@dyhost.fr">contact@dyhost.fr</a>
              </Li>
              <Li>
                <strong>Téléphone :</strong>{" "}
                <a href="tel:+33183793292">01 83 79 32 92</a>
              </Li>
            </ul>
          </section>

          {/* === CGV === */}
          <section id="cgv" className="space-y-8">
            <H2>Conditions générales de vente (CGV)</H2>

            <SubSection num="1" title="Introduction">
              <p>
                Les présentes Conditions Générales de Vente (CGV) régissent
                toutes les transactions entre Ruliz, micro-entreprise (SIRET{" "}
                <span className="font-mono">98451929800017</span>), et toute
                personne physique ou morale utilisant les services sur
                ruliz.fr. En accédant aux services, le Client accepte ces CGV.
              </p>
            </SubSection>

            <SubSection num="2" title="Description des services">
              <p>
                Ruliz propose des solutions digitales pour la gestion de menus
                de restaurants via des QR codes interactifs. Les services
                incluent la création et gestion de QR codes, ainsi que
                l&apos;accès aux statistiques d&apos;utilisation.
              </p>
            </SubSection>

            <SubSection num="3" title="Inscription et création de compte">
              <p>
                Le Client doit créer un compte sur ruliz.fr, en fournissant des
                informations exactes et à jour. Il est responsable de la
                sécurité de ses identifiants et doit signaler toute utilisation
                non autorisée.
              </p>
            </SubSection>

            <SubSection num="4" title="Conditions de commande">
              <p>
                Les commandes sont effectuées sur ruliz.fr, avec paiement par
                virement bancaire ou carte bancaire. Une confirmation est
                envoyée par email après réception du paiement.
              </p>
            </SubSection>

            <SubSection num="5" title="Tarification et paiement">
              <p>
                Les prix sont indiqués hors taxes (HT) — TVA non applicable,
                art. 293 B du CGI (micro-entreprise). Le paiement
                s&apos;effectue par virement bancaire ou carte bancaire via
                Stripe. Les services sont activés après confirmation du
                paiement.
              </p>
            </SubSection>

            <SubSection
              num="6"
              title="Droit de rétractation et politique de retour"
            >
              <p>
                Selon l&apos;article L.221-28 du Code de la consommation, le
                droit de rétractation ne s&apos;applique pas aux services
                numériques déjà fournis. Ruliz peut offrir un remboursement
                partiel en cas de problème technique avéré.
              </p>
            </SubSection>

            <SubSection num="7" title="Utilisation des données personnelles">
              <p>
                Les données personnelles sont traitées conformément à la
                Politique de Confidentialité disponible sur ruliz.fr (voir{" "}
                <a href="#confidentialite">section dédiée</a> plus bas). Le
                Client peut accéder, modifier ou demander la suppression de
                ses données.
              </p>
            </SubSection>

            <SubSection num="8" title="Produits ou services">
              <p>
                Certains produits sont disponibles uniquement en ligne, en
                quantités limitées, et sont soumis à notre politique de retour.
                Nous nous réservons le droit de modifier les prix et
                descriptions à tout moment.
              </p>
            </SubSection>

            <SubSection num="9" title="Limitation de responsabilité">
              <p>
                Ruliz ne peut être tenu responsable des dommages indirects
                résultant de l&apos;utilisation des services. En cas de
                préjudice, la responsabilité de Ruliz est limitée au montant
                payé par le Client au cours des 12 mois précédant la
                réclamation.
              </p>
            </SubSection>

            <SubSection num="10" title="Liens et contenus tiers">
              <p>
                Ruliz n&apos;assume aucune responsabilité concernant les
                contenus des sites tiers liés à ruliz.fr.
              </p>
            </SubSection>

            <SubSection num="11" title="Modification des CGV">
              <p>
                Ruliz peut modifier les CGV à tout moment, avec notification
                aux Clients. Les nouvelles conditions entrent en vigueur à leur
                publication sur le site.
              </p>
            </SubSection>

            <SubSection num="12" title="Résiliation et suspension">
              <H3>12.1. Résiliation à l&apos;initiative du Client</H3>
              <p>
                Le Client peut résilier le présent contrat à tout moment, en
                respectant un préavis de trente (30) jours, par courrier
                électronique ou postal envoyé au Prestataire.
              </p>
              <H3>12.2. Résiliation à l&apos;initiative du Prestataire</H3>
              <p>
                Le Prestataire peut résilier le présent contrat en cas de
                non-respect par le Client de ses obligations contractuelles,
                après mise en demeure restée sans effet pendant quinze (15)
                jours.
              </p>
            </SubSection>

            <SubSection num="13" title="Politique de remboursement">
              <p>
                Ruliz met tout en œuvre pour offrir des solutions digitales
                fiables et performantes à ses clients. Cependant, conformément
                à nos conditions générales de vente, aucun remboursement ne
                sera effectué, que ce soit pour l&apos;abonnement à la solution
                ou pour la création de QR codes personnalisés.
              </p>
              <H3>1. Abonnement à la solution</H3>
              <p>
                En raison de la nature des services numériques fournis, une
                fois que l&apos;abonnement est activé et les services
                accessibles, aucune demande de remboursement ne sera acceptée,
                même en cas d&apos;insatisfaction du client. Cette clause est
                en accord avec les dispositions de l&apos;article L.221-28 du
                Code de la consommation, qui exclut le droit de rétractation
                pour les prestations numériques.
              </p>
              <H3>2. QR Codes personnalisés</H3>
              <p>
                Les QR codes étant créés sur mesure et adaptés aux besoins
                spécifiques du client, leur coût ne peut être remboursé une
                fois le processus de création lancé ou finalisé.
              </p>
              <H3>3. Garantie de qualité</H3>
              <p>
                Nous nous engageons à fournir un support technique et des
                solutions adaptées pour résoudre tout problème éventuel lié à
                nos services. Le client est invité à contacter notre équipe en
                cas de difficultés ou de dysfonctionnements techniques.
              </p>
              <H3>4. Acceptation des conditions</H3>
              <p>
                En souscrivant à nos services ou en passant commande sur notre
                site, le client accepte pleinement cette politique de
                non-remboursement.
              </p>
            </SubSection>

            <SubSection num="14" title="Licence / Marque blanche">
              <p>
                Les présentes Conditions Générales de Vente (CGV) régissent la
                vente de licences et de solutions en marque blanche proposées
                par Ruliz. Le Revendeur acquiert une licence d&apos;utilisation
                de la solution numérique développée par Ruliz, avec la
                possibilité de la revendre à ses propres clients.
              </p>
              <p>
                Ces CGV s&apos;appliquent exclusivement aux relations entre
                professionnels (B2B) et prévalent sur tout autre document, sauf
                dérogation écrite et acceptée par Ruliz.
              </p>

              <H3>14.1. Commandes et paiement</H3>
              <p>
                <strong>14.1.1 Passation de commande.</strong> Toute commande
                est considérée comme définitive après validation du paiement
                et/ou signature du contrat ou du devis, sous réserve du droit
                de rétractation légal de 14 jours applicable aux consommateurs
                conformément à l&apos;article L221-18 du Code de la
                consommation, sauf exceptions prévues par la loi.
              </p>
              <p>
                <strong>14.1.2 Tarification et modalités de paiement.</strong>{" "}
                Le prix des licences et solutions en marque blanche est défini
                lors de la commande. Le paiement peut être effectué par :
              </p>
              <ul className="ml-1 space-y-1 text-sm">
                <Li>Carte bancaire</Li>
                <Li>Virement bancaire</Li>
              </ul>
              <p>Deux options de facturation sont proposées :</p>
              <ul className="ml-1 space-y-1 text-sm">
                <Li>Paiement mensuel</Li>
                <Li>Paiement annuel (préférentiel)</Li>
              </ul>
              <p>
                Toute souscription est assortie d&apos;un engagement minimum de
                6 mois, sauf dispositions contraires spécifiées dans le
                contrat. En cas de non-paiement, Ruliz se réserve le droit de
                suspendre l&apos;accès à la solution et de récupérer
                directement la clientèle du Revendeur.
              </p>

              <H3>14.2. Livraison et accès aux services</H3>
              <p>
                Le service est fourni sous un délai maximal de 7 jours après
                validation du paiement. L&apos;accès à la solution est réalisé
                via une plateforme numérique, selon les modalités définies lors
                de la commande.
              </p>

              <H3>14.3. Absence de droit de rétractation et de remboursement</H3>
              <p>
                Étant donné la nature numérique des services fournis, aucun
                retour ou remboursement n&apos;est possible après validation de
                la commande.
              </p>

              <H3>14.4. Responsabilité et limitations</H3>
              <p>
                <strong>14.4.1 Responsabilité de Ruliz.</strong> Ruliz ne
                pourra être tenu responsable de l&apos;usage fait de la
                solution par le Revendeur ou ses propres clients finaux. Toute
                obligation légale ou réglementaire relative à l&apos;activité
                du Revendeur reste sous sa seule responsabilité.
              </p>
              <p>
                <strong>14.4.2 Relation avec les clients finaux.</strong> Ruliz
                agit en tant que fournisseur technologique et ne s&apos;engage
                aucunement vis-à-vis des clients finaux du Revendeur. En cas
                de problème avec la solution, le Revendeur est seul responsable
                de la gestion et du support auprès de ses clients.
              </p>

              <H3>14.5. Suspension et résiliation</H3>
              <p>
                <strong>14.5.1. Non-paiement.</strong> En cas de défaut de
                paiement, Ruliz pourra :
              </p>
              <ul className="ml-1 space-y-1 text-sm">
                <Li>Suspendre immédiatement l&apos;accès à la solution.</Li>
                <Li>
                  Récupérer directement les clients du Revendeur et leur
                  proposer un accès direct au service.
                </Li>
              </ul>
              <p>
                <strong>14.5.2. Non-respect des conditions.</strong> Toute
                utilisation abusive ou non conforme de la solution pourra
                entraîner une résiliation immédiate du contrat, sans
                remboursement.
              </p>

              <H3>14.6. Propriété intellectuelle</H3>
              <p>
                La solution fournie par Ruliz reste la propriété exclusive de
                l&apos;entreprise.
              </p>
              <ul className="ml-1 space-y-1 text-sm">
                <Li>
                  La licence accordée est non exclusive et non transférable.
                </Li>
                <Li>
                  Le Revendeur ne peut en aucun cas revendre, sous-licencier ou
                  modifier la solution sans l&apos;autorisation expresse de
                  Ruliz.
                </Li>
              </ul>

              <H3>14.7. Droit applicable et litiges</H3>
              <p>
                Les présentes CGV sont régies par le droit français. En cas de
                litige, les parties s&apos;engagent à rechercher une solution
                amiable avant toute action judiciaire. À défaut, le tribunal
                compétent sera celui du siège social de Ruliz.
              </p>
            </SubSection>

            <SubSection num="15" title="Règlement du jeu de hasard Ruliz">
              <H3>15.1. Organisation et objet</H3>
              <p>
                Ruliz organise un jeu de hasard de type roue de la fortune ou
                tirage au sort dans le cadre de son activité. Ces jeux,
                gratuits et sans obligation d&apos;achat, visent à dynamiser
                l&apos;expérience client des établissements partenaires,
                désignés comme les « Établissements Participants ». Les
                dotations offertes par les Établissements Participants sont
                présentées sur la page du jeu.
              </p>
              <H3>15.2. Modalités de participation</H3>
              <p>
                Le jeu est ouvert à toute personne physique majeure. Pour
                participer, les joueurs doivent scanner le QR code disponible
                dans l&apos;Établissement Participant et fournir les
                informations demandées, à savoir : prénom, adresse email,
                numéro de téléphone et date de naissance. Les informations
                requises peuvent varier et sont définies selon le bon vouloir
                des Établissements Participants. Une seule participation par
                personne et par QR code est permise. Les participants doivent
                accepter les présentes conditions générales de vente (CGV)
                ainsi que de recevoir des newsletters et des communications
                marketing de l&apos;établissement partenaire avant de valider
                leur participation.
              </p>
              <H3>15.3. Fonctionnement du jeu</H3>
              <p>
                La roue de la fortune offre un résultat immédiat après chaque
                participation, avec une fréquence de participation définie par
                l&apos;Établissement Participant. Pour le tirage au sort, les
                gagnants sont informés à la date de résultat indiquée par mail.
                Toute tentative de fraude ou de manipulation des systèmes
                entraînera l&apos;exclusion immédiate du participant.
              </p>
              <H3>15.4. Dotations et attribution des gains</H3>
              <p>
                Les dotations offertes par les Établissements Participants ne
                peuvent pas être converties en numéraire. Les gagnants
                reçoivent un mail qu&apos;ils doivent présenter pour réclamer
                leur gain. Les gains sont soumis à des dates d&apos;activation
                et de péremption clairement indiquées. En cas d&apos;inexactitude
                des coordonnées fournies par le joueur, le gain ne pourra être
                attribué.
              </p>
              <H3>15.5. Données personnelles</H3>
              <p>
                Les données personnelles des participants sont collectées pour
                la gestion des participations et la remise des gains. Ruliz
                s&apos;engage à respecter la réglementation relative à la
                protection des données personnelles, notamment le RGPD. Les
                participants peuvent exercer leurs droits en contactant{" "}
                <a href="mailto:contact@ruliz.fr">contact@ruliz.fr</a>.
              </p>
              <H3>15.6. Droit applicable et litiges</H3>
              <p>
                Le présent règlement est soumis au droit français. En cas de
                litige, seule la législation française sera applicable.
              </p>
            </SubSection>

            <SubSection num="16" title="Loi applicable et juridiction compétente">
              <p>
                Les CGV sont régies par la loi française. En cas de litige, les
                parties s&apos;engagent à rechercher une solution amiable avant
                toute action judiciaire, qui relèvera des tribunaux de Bordeaux.
              </p>
            </SubSection>

            <SubSection num="17" title="Acceptation des conditions">
              <p>
                En utilisant notre site, vous acceptez nos CGV et notre
                politique de confidentialité. Si vous ne les acceptez pas,
                veuillez ne pas utiliser ce site.
              </p>
            </SubSection>
          </section>

          {/* === Confidentialité === */}
          <section id="confidentialite" className="space-y-8">
            <H2>Politique de confidentialité</H2>

            <SubSection num="18" title="Nous contacter">
              <p id="contact">
                Si vous avez des questions concernant cette politique de
                confidentialité, vous pouvez nous contacter par email à{" "}
                <a href="mailto:tom.rullier@ruliz.fr">tom.rullier@ruliz.fr</a>{" "}
                ou par courrier à l&apos;adresse du siège social.
              </p>
            </SubSection>

            <SubSection id="rgpd" num="19" title="Conformité au RGPD">
              <p>
                Le Règlement Général sur la Protection des Données (RGPD) de
                l&apos;UE est en vigueur depuis le 25 mai 2018. Nous adhérons
                pleinement à ce règlement et soutenons toutes les lois qui
                protègent les utilisateurs d&apos;Internet. Notre objectif est
                d&apos;appliquer la confidentialité dès la conception et, dans
                la mesure du possible, de ne pas collecter ni stocker
                d&apos;informations personnelles identifiables. Nous ne
                recueillons que les informations nécessaires pour vous offrir
                un meilleur service et une meilleure expérience lorsque vous
                naviguez sur ce site, consultez notre contenu et interagissez
                avec nos produits.
              </p>
              <p>
                Vous êtes libre, à tout moment, de demander à être désabonné de
                notre newsletter ou de demander un export de vos informations
                pour les examiner. Répondez simplement à l&apos;e-mail concerné
                en indiquant « RGPD » dans l&apos;objet ainsi que les détails
                de votre demande. Nous sommes à votre disposition pour vous
                aider.
              </p>
            </SubSection>

            <SubSection num="20" title="Informations que nous collectons">
              <p>
                Nous recueillons les informations que vous nous fournissez lors
                de votre abonnement à notre newsletter, lorsque vous laissez un
                commentaire ou remplissez un formulaire de contact. Ces
                informations peuvent inclure votre nom, votre adresse e-mail et
                toute autre information personnelle que vous choisissez de
                partager.
              </p>
              <p>
                Nous collectons également des informations automatiquement
                lorsque vous visitez notre site Web, telles que votre adresse
                IP, le type de navigateur et le type d&apos;appareil. Ces
                informations sont recueillies à l&apos;aide de cookies et de
                technologies similaires.
              </p>
            </SubSection>

            <SubSection num="21" title="Utilisation des informations">
              <p>
                Les informations recueillies sont utilisées de plusieurs
                façons, notamment pour :
              </p>
              <ul className="ml-1 space-y-1 text-sm">
                <Li>
                  Personnaliser votre expérience et vous offrir des contenus et
                  offres adaptés à vos intérêts.
                </Li>
                <Li>Améliorer notre site Web pour mieux vous servir.</Li>
                <Li>Répondre à vos demandes de service client.</Li>
                <Li>
                  Gérer des concours, promotions, enquêtes ou d&apos;autres
                  fonctionnalités du site.
                </Li>
              </ul>
            </SubSection>

            <SubSection num="22" title="Protection des informations des visiteurs">
              <p>
                Notre site est régulièrement analysé pour détecter les failles
                de sécurité et rendre votre visite la plus sûre possible. Nous
                effectuons également des analyses anti-malware.
              </p>
            </SubSection>

            <SubSection id="cookies" num="23" title="Utilisation des cookies">
              <p>
                Oui, nous utilisons des cookies. Ces petits fichiers permettent
                à nos systèmes de reconnaître votre navigateur et
                d&apos;enregistrer certaines informations. Les cookies nous
                aident à comprendre vos préférences et à améliorer votre
                expérience de navigation. Vous pouvez configurer votre
                navigateur pour refuser les cookies, mais certaines
                fonctionnalités du site pourraient alors être désactivées.
              </p>
            </SubSection>

            <SubSection num="24" title="Divulgation à des tiers">
              <p>
                Nous ne vendons ni ne transférons vos informations personnelles
                à des tiers sans vous en informer au préalable, à
                l&apos;exception de partenaires de confiance qui nous aident à
                gérer notre site ou à mener nos activités. Ces parties doivent
                accepter de garder vos informations confidentielles.
              </p>
            </SubSection>

            <SubSection num="25" title="Liens vers des tiers">
              <p>
                Nous pouvons inclure ou proposer des produits ou services tiers
                sur notre site. Ces sites tiers disposent de politiques de
                confidentialité distinctes. Nous ne sommes donc pas
                responsables des activités de ces sites, mais nous nous
                efforçons de protéger l&apos;intégrité de notre propre site.
              </p>
            </SubSection>

            <SubSection num="26" title="Google AdSense">
              <p>
                Nous utilisons Google AdSense pour afficher des annonces
                publicitaires. Google utilise des cookies pour diffuser des
                annonces basées sur vos visites antérieures sur notre site et
                d&apos;autres sites. Vous pouvez refuser l&apos;utilisation des
                cookies de Google en consultant la politique de confidentialité
                de Google Ads.
              </p>
            </SubSection>

            <SubSection
              num="27"
              title="Loi californienne de protection de la vie privée"
            >
              <p>
                Conformément à la loi californienne sur la protection de la vie
                privée, les utilisateurs peuvent consulter notre site
                anonymement. Un lien vers notre politique de confidentialité
                est visible sur la page d&apos;accueil ou sur toute autre page
                importante du site.
              </p>
            </SubSection>

            <SubSection num="28" title="Conformité avec COPPA">
              <p>
                Nous ne collectons pas sciemment d&apos;informations
                personnelles auprès d&apos;enfants de moins de 13 ans,
                conformément à la loi COPPA.
              </p>
            </SubSection>

            <SubSection num="29" title="Pratiques d'information équitables">
              <p>
                En cas de violation de données, nous vous informerons par
                e-mail dans les 7 jours ouvrables.
              </p>
            </SubSection>

            <SubSection num="30" title="Loi CAN-SPAM">
              <p>
                Nous nous conformons à la loi CAN-SPAM en matière d&apos;e-mails
                commerciaux. Vous pouvez vous désabonner de nos e-mails à tout
                moment en suivant les instructions au bas de chaque e-mail.
              </p>
            </SubSection>
          </section>

          {/* === Footer mini === */}
          <section className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-6 text-sm">
            <p className="font-semibold text-[var(--text-primary)]">
              Une question sur ces conditions ?
            </p>
            <p className="mt-1 text-[var(--text-secondary)]">
              Écris-nous à{" "}
              <a href="mailto:tom.rullier@ruliz.fr">tom.rullier@ruliz.fr</a> —
              on te répond sous 48h.
            </p>
            <div className="mt-4">
              <Link
                href="/"
                className="text-sm font-medium text-[var(--accent)] hover:opacity-80"
              >
                ← Retour à l&apos;accueil
              </Link>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}

/* === Sub-components === */

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-[var(--border-glass)] pb-3 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
      {children}
    </h3>
  );
}

function SubSection({
  num,
  title,
  id,
  children,
}: {
  num: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="space-y-3 scroll-mt-24">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
        <span className="font-mono text-sm text-[var(--text-tertiary)]">
          {num}.
        </span>{" "}
        {title}
      </h3>
      <div className="space-y-3 text-sm text-[var(--text-secondary)]">
        {children}
      </div>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative pl-5 before:absolute before:left-0 before:top-[0.55em] before:size-1.5 before:rounded-full before:bg-[var(--accent)]">
      {children}
    </li>
  );
}
