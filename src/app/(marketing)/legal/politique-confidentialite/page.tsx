import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialité · Ruliz",
  description:
    "Conditions d'utilisation, collecte et protection des données personnelles, licence, commentaires, liens et clause de non-responsabilité de Ruliz.",
  robots: { index: true, follow: true },
};

/**
 * Politique de confidentialité — page dédiée séparée des mentions légales /
 * CGV. Même chartre graphique que /legal/mentions-legales (TOC sticky à
 * gauche sur desktop, prose lisible au centre). Contenu fourni par Tristan.
 */

type TocItem = { id: string; label: string };

const TOC: TocItem[] = [
  { id: "intro", label: "Préambule" },
  { id: "terminologie", label: "1. Terminologie" },
  { id: "collecte", label: "2. Collecte des données" },
  { id: "licence", label: "3. Licence" },
  { id: "commentaires", label: "4. Commentaires" },
  { id: "hyperliens", label: "5. Hyperliens vers nos contenus" },
  { id: "iframes", label: "6. iFrames" },
  { id: "responsabilite", label: "7. Responsabilité du contenu" },
  { id: "reserve", label: "8. Réserve de droits" },
  { id: "suppression", label: "9. Suppression des liens" },
  { id: "non-responsabilite", label: "10. Clause de non-responsabilité" },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-20">
      {/* === Hero === */}
      <header className="mb-12 space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-glass)] bg-[var(--bg-glass)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          <ShieldCheck className="size-3" strokeWidth={1.75} />
          Données personnelles
        </span>
        <h1 className="text-balance text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
          Politique de confidentialité
        </h1>
        <p className="max-w-2xl text-pretty text-base text-[var(--text-secondary)]">
          Les règles qui encadrent l&apos;utilisation de{" "}
          <strong>ruliz.fr</strong>, la collecte et la protection de tes
          données personnelles. Mis à jour le 12 mai 2026.
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          Voir aussi :{" "}
          <Link
            href="/legal/mentions-legales"
            className="text-[var(--accent)] underline hover:opacity-80"
          >
            Mentions légales &amp; CGV
          </Link>
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
          {/* === Préambule === */}
          <section id="intro" className="space-y-4 scroll-mt-24">
            <p>
              Ces termes et conditions décrivent les règles et réglementations
              relatives à l&apos;utilisation du site Web de Ruliz, situé à
              l&apos;adresse <strong>https://ruliz.fr</strong>. En accédant à
              ce site, nous supposons que vous acceptez ces termes et
              conditions. Ne continuez pas à utiliser ruliz.fr si vous
              n&apos;acceptez pas tous les termes et conditions énoncés sur
              cette page.
            </p>
          </section>

          {/* === 1. Terminologie === */}
          <SubSection id="terminologie" num="1" title="Terminologie">
            <p>
              La terminologie suivante s&apos;applique aux présentes Conditions
              générales, à la Déclaration de confidentialité et à l&apos;Avis
              de non-responsabilité ainsi qu&apos;à tous les accords : «
              Client », « Vous » et « Votre » font référence à vous, la
              personne qui se connecte sur ce site Web et qui se conforme aux
              conditions générales de la Société. « La Société », « Nous-mêmes
              », « Nous », « Notre » et « Nos » font référence à notre
              Société. « Partie », « Parties » ou « Nous » font référence à la
              fois au Client et à nous-mêmes.
            </p>
            <p>
              Tous les termes font référence à l&apos;offre, à l&apos;acceptation
              et à la prise en compte du paiement nécessaire pour entreprendre
              le processus de notre assistance au Client de la manière la plus
              appropriée dans le but exprès de répondre aux besoins du Client
              en ce qui concerne la fourniture des services indiqués par la
              Société, conformément et sous réserve de la loi en vigueur dans
              notre pays. Toute utilisation de la terminologie ci-dessus ou
              d&apos;autres mots au singulier, au pluriel, en majuscules et/ou
              il/elle ou ils, sont considérés comme interchangeables et donc
              comme faisant référence à la même chose.
            </p>
          </SubSection>

          {/* === 2. Collecte des données === */}
          <SubSection
            id="collecte"
            num="2"
            title="Collecte des données personnelles"
          >
            <p>
              Nous collectons les données personnelles suivantes lorsque vous
              utilisez notre site web et nos services : adresses e-mail, nom,
              prénom, adresse postale, numéro de téléphone et adresse IP. Nous
              collectons votre adresse e-mail pour la gestion de votre compte,
              l&apos;envoi de communications relatives à nos services, et
              toute demande de support. Nous collectons votre nom, prénom,
              adresse postale et numéro de téléphone dans le cadre de la
              gestion de votre compte et pour la fourniture de nos services.
            </p>

            <H3>2.1. Utilisation des données personnelles</H3>
            <p>
              Les données personnelles collectées sont utilisées pour gérer et
              optimiser l&apos;accès aux services et fonctionnalités de notre
              site, vous envoyer des informations et mises à jour relatives à
              votre compte ou nos services, assurer la sécurité et la
              protection de nos systèmes, et analyser l&apos;utilisation du
              site pour améliorer la qualité de nos services.
            </p>

            <H3>2.2. Partage des données personnelles</H3>
            <p>
              Nous ne vendons ni ne louons vos données personnelles à des
              tiers. Toutefois, nous pouvons partager certaines données
              personnelles avec des prestataires de services tiers qui nous
              aident à fournir nos services, à condition que ceux-ci respectent
              des standards de confidentialité et de sécurité similaires à
              ceux décrits dans cette politique.
            </p>

            <H3>2.3. Sécurité des données personnelles</H3>
            <p>
              Nous mettons en œuvre des mesures de sécurité techniques et
              organisationnelles pour protéger vos données personnelles contre
              toute perte, utilisation abusive, accès non autorisé ou
              divulgation. Cependant, il est important de noter qu&apos;aucune
              méthode de transmission ou de stockage de données n&apos;est
              totalement sûre.
            </p>

            <H3>2.4. Vos droits</H3>
            <p>
              Conformément à la réglementation applicable, vous disposez des
              droits suivants concernant vos données personnelles :
            </p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>
                <strong>Accès</strong> — vous pouvez demander une copie des
                données personnelles que nous détenons à votre sujet.
              </Li>
              <Li>
                <strong>Modification</strong> — vous pouvez demander la
                correction ou la mise à jour de vos données personnelles.
              </Li>
              <Li>
                <strong>Suppression</strong> — vous pouvez demander la
                suppression de vos données personnelles, sous réserve des
                obligations légales de conservation.
              </Li>
              <Li>
                <strong>Opposition</strong> — vous pouvez vous opposer à tout
                moment à l&apos;utilisation de vos données personnelles à des
                fins de communication commerciale.
              </Li>
            </ul>
            <p>
              Pour exercer ces droits, veuillez nous contacter à
              l&apos;adresse{" "}
              <a href="mailto:contact@ruliz.fr">contact@ruliz.fr</a> ou au
              numéro <a href="tel:+33651117951">06 51 11 79 51</a>.
            </p>
          </SubSection>

          {/* === 3. Licence === */}
          <SubSection id="licence" num="3" title="Licence">
            <p>
              Sauf mention contraire, Ruliz et/ou ses concédants de licence
              détiennent les droits de propriété intellectuelle sur tout le
              contenu de ruliz.fr. Tous les droits de propriété intellectuelle
              sont réservés. Vous pouvez y accéder à partir de ruliz.fr pour
              votre usage personnel sous réserve des restrictions définies
              dans les présentes conditions générales.
            </p>
            <p>Vous ne devez pas :</p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>Rééditer le contenu de ruliz.fr.</Li>
              <Li>Vendre, louer ou sous-licencier du matériel provenant de ruliz.fr.</Li>
              <Li>Reproduire, dupliquer ou copier du matériel provenant de ruliz.fr.</Li>
              <Li>Redistribuer le contenu de ruliz.fr.</Li>
            </ul>
            <p>Le présent accord entrera en vigueur à la date des présentes.</p>
          </SubSection>

          {/* === 4. Commentaires === */}
          <SubSection id="commentaires" num="4" title="Utilisation des commentaires">
            <p>
              Certaines parties de ce site Web offrent aux utilisateurs la
              possibilité de publier et d&apos;échanger des opinions et des
              informations dans certaines zones du site Web. Ruliz ne filtre
              pas, n&apos;édite pas, ne publie pas et ne révise pas les
              commentaires avant leur présence sur le site Web. Les
              commentaires ne reflètent pas les points de vue et les opinions
              de Ruliz, de ses agents et/ou de ses affiliés. Les commentaires
              reflètent les points de vue et les opinions de la personne qui
              publie ses points de vue et ses opinions. Dans la mesure permise
              par les lois applicables, Ruliz ne sera pas responsable des
              commentaires ou de toute responsabilité, dommages ou dépenses
              causés et/ou subis à la suite de toute utilisation et/ou
              publication et/ou apparition des commentaires sur ce site Web.
            </p>
            <p>
              Ruliz se réserve le droit de surveiller tous les commentaires et
              de supprimer tout commentaire qui peut être considéré comme
              inapproprié, offensant ou entraînant une violation des présentes
              conditions générales.
            </p>
            <p>Vous garantissez et déclarez que :</p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>
                Vous avez le droit de publier des commentaires sur notre site
                Web et disposez de toutes les licences et consentements
                nécessaires pour le faire.
              </Li>
              <Li>
                Les commentaires n&apos;enfreignent aucun droit de propriété
                intellectuelle, y compris, sans limitation, le droit
                d&apos;auteur, le brevet ou la marque déposée de tout tiers.
              </Li>
              <Li>
                Les commentaires ne contiennent aucun contenu diffamatoire,
                calomnieux, offensant, indécent ou autrement illégal qui
                constitue une atteinte à la vie privée.
              </Li>
              <Li>
                Les commentaires ne seront pas utilisés pour solliciter ou
                promouvoir des affaires ou des coutumes, ni pour présenter des
                activités commerciales ou des activités illégales.
              </Li>
            </ul>
            <p>
              Vous accordez par la présente à Ruliz une licence non exclusive
              pour utiliser, reproduire, éditer et autoriser des tiers à
              utiliser, reproduire et éditer n&apos;importe lequel de vos
              commentaires sous toutes les formes, formats ou supports.
            </p>
          </SubSection>

          {/* === 5. Hyperliens === */}
          <SubSection
            id="hyperliens"
            num="5"
            title="Hyperliens vers notre contenu"
          >
            <p>
              Les organisations suivantes peuvent créer un lien vers notre
              site Web sans autorisation écrite préalable :
            </p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>Organismes gouvernementaux.</Li>
              <Li>Moteurs de recherche.</Li>
              <Li>Organismes de presse.</Li>
              <Li>
                Les distributeurs d&apos;annuaires en ligne peuvent créer un
                lien vers notre site Web de la même manière qu&apos;ils créent
                un lien hypertexte vers les sites Web d&apos;autres entreprises
                répertoriées.
              </Li>
              <Li>
                Entreprises accréditées à l&apos;échelle du système, à
                l&apos;exception des organisations à but non lucratif, des
                centres commerciaux caritatifs et des groupes de collecte de
                fonds caritatifs qui ne peuvent pas créer de lien hypertexte
                vers notre site Web.
              </Li>
            </ul>
            <p>
              Ces organisations peuvent créer des liens vers notre page
              d&apos;accueil, vers des publications ou vers d&apos;autres
              informations du site Web à condition que le lien :
            </p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>(a) ne soit en aucun cas trompeur.</Li>
              <Li>
                (b) n&apos;implique pas faussement un parrainage, une
                approbation ou une approbation de la partie qui établit le lien
                et de ses produits et/ou services.
              </Li>
              <Li>
                (c) s&apos;inscrive dans le contexte du site de la partie qui
                établit le lien.
              </Li>
            </ul>
            <p>
              Nous pouvons considérer et approuver d&apos;autres demandes de
              liens provenant des types d&apos;organisations suivants :
            </p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>
                Sources d&apos;informations sur les consommateurs et/ou les
                entreprises communément connues.
              </Li>
              <Li>Sites communautaires dot.news.</Li>
              <Li>Associations ou autres groupes représentant des œuvres caritatives.</Li>
              <Li>Distributeurs d&apos;annuaires en ligne.</Li>
              <Li>Portails Internet.</Li>
              <Li>Cabinets d&apos;expertise comptable, d&apos;avocats et de conseil.</Li>
              <Li>Établissements d&apos;enseignement et associations professionnelles.</Li>
            </ul>
            <p>
              Nous approuverons les demandes de liens de ces organisations si
              nous décidons que :
            </p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>
                (a) le lien ne nous ferait pas paraître défavorable à
                nous-mêmes ou à nos entreprises accréditées.
              </Li>
              <Li>(b) l&apos;organisation n&apos;a aucun dossier négatif avec nous.</Li>
              <Li>
                (c) l&apos;avantage pour nous de la visibilité du lien
                hypertexte compense l&apos;absence de Ruliz.
              </Li>
              <Li>
                (d) le lien s&apos;inscrit dans le contexte d&apos;informations
                générales sur les ressources.
              </Li>
            </ul>
          </SubSection>

          {/* === 6. iFrames === */}
          <SubSection id="iframes" num="6" title="iFrames">
            <p>
              Sans autorisation préalable et permission écrite, vous ne pouvez
              pas créer de cadres autour de nos pages Web qui modifient de
              quelque manière que ce soit la présentation visuelle ou
              l&apos;apparence de notre site Web.
            </p>
          </SubSection>

          {/* === 7. Responsabilité du contenu === */}
          <SubSection
            id="responsabilite"
            num="7"
            title="Responsabilité du contenu"
          >
            <p>
              Nous ne pouvons être tenus responsables du contenu qui apparaît
              sur votre site Web. Vous acceptez de nous protéger et de nous
              défendre contre toutes les réclamations qui pourraient survenir
              sur votre site Web. Aucun lien ne doit apparaître sur un site
              Web qui pourrait être interprété comme diffamatoire, obscène ou
              criminel, ou qui enfreint, viole ou préconise la violation ou
              toute autre violation des droits d&apos;un tiers.
            </p>
          </SubSection>

          {/* === 8. Réserve de droits === */}
          <SubSection id="reserve" num="8" title="Réserve de droits">
            <p>
              Nous nous réservons le droit de vous demander de supprimer tous
              les liens ou tout lien particulier vers notre site Web. Vous
              acceptez de supprimer immédiatement tous les liens vers notre
              site Web sur demande. Nous nous réservons également le droit de
              modifier ces termes et conditions et sa politique de liens à
              tout moment. En créant en permanence un lien vers notre site
              Web, vous acceptez d&apos;être lié et de suivre ces termes et
              conditions de liens.
            </p>
          </SubSection>

          {/* === 9. Suppression des liens === */}
          <SubSection
            id="suppression"
            num="9"
            title="Suppression des liens de notre site Web"
          >
            <p>
              Si vous trouvez sur notre site Internet un lien offensant pour
              une raison quelconque, vous êtes libre de nous contacter et de
              nous en informer à tout moment. Nous étudierons les demandes de
              suppression de liens, mais nous ne sommes pas obligés de le
              faire ou de vous répondre directement.
            </p>
          </SubSection>

          {/* === 10. Clause de non-responsabilité === */}
          <SubSection
            id="non-responsabilite"
            num="10"
            title="Clause de non-responsabilité"
          >
            <p>
              Dans la mesure maximale permise par la loi applicable, nous
              excluons toutes les représentations, garanties et conditions
              relatives à notre site Web et à l&apos;utilisation de ce site
              Web. Rien dans cette clause de non-responsabilité ne :
            </p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>
                Limite ou exclut notre ou votre responsabilité en cas de décès
                ou de blessure corporelle.
              </Li>
              <Li>
                Limite ou exclut notre ou votre responsabilité en cas de
                fraude ou de fausse déclaration frauduleuse.
              </Li>
              <Li>
                Limite l&apos;une de nos ou vos responsabilités d&apos;une
                manière qui n&apos;est pas autorisée par la loi applicable.
              </Li>
              <Li>
                Exclut l&apos;une quelconque de nos responsabilités ou des
                vôtres qui ne peuvent être exclues en vertu de la loi
                applicable.
              </Li>
            </ul>
            <p>
              Les limitations et interdictions de responsabilité énoncées dans
              la présente section et ailleurs dans la présente clause de
              non-responsabilité :
            </p>
            <ul className="ml-1 space-y-1 text-sm">
              <Li>
                (a) sont soumises au paragraphe précédent et régissent toutes
                les responsabilités découlant de la clause de non-responsabilité,
                y compris celles découlant d&apos;un contrat, d&apos;un délit
                ou d&apos;une violation d&apos;une obligation légale.
              </Li>
            </ul>
            <p>
              Tant que le site Web, les informations et les services présents
              sur le site Web sont fournis gratuitement, nous ne serons
              responsables d&apos;aucune perte ou dommage de quelque nature
              que ce soit.
            </p>
          </SubSection>

          {/* === Footer mini === */}
          <section className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-6 text-sm">
            <p className="font-semibold text-[var(--text-primary)]">
              Une question sur vos données ?
            </p>
            <p className="mt-1 text-[var(--text-secondary)]">
              Écris-nous à{" "}
              <a href="mailto:contact@ruliz.fr">contact@ruliz.fr</a> en
              indiquant « RGPD » en objet — on te répond sous 48h.
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-[var(--accent)] hover:opacity-80"
              >
                ← Retour à l&apos;accueil
              </Link>
              <Link
                href="/legal/mentions-legales"
                className="text-sm font-medium text-[var(--accent)] hover:opacity-80"
              >
                Mentions légales &amp; CGV →
              </Link>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}

/* === Sub-components === */

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
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="border-b border-[var(--border-glass)] pb-3 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
        <span className="font-mono text-base text-[var(--text-tertiary)]">
          {num}.
        </span>{" "}
        {title}
      </h2>
      <div className="space-y-3 text-sm text-[var(--text-secondary)]">
        {children}
      </div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative pl-5 before:absolute before:left-0 before:top-[0.55em] before:size-1.5 before:rounded-full before:bg-[var(--accent)]">
      {children}
    </li>
  );
}
