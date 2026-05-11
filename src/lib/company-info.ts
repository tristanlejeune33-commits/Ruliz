import "server-only";

/**
 * Infos émetteur Ruliz pour les bons de commande / factures.
 *
 * Surcharges possibles via env vars (utile pour adapter sans redéployer
 * de code quand le SIRET/TVA arrivent ou que l'adresse change) :
 *   RULIZ_COMPANY_NAME, RULIZ_COMPANY_ADDRESS, RULIZ_COMPANY_CITY,
 *   RULIZ_COMPANY_COUNTRY, RULIZ_COMPANY_EMAIL, RULIZ_COMPANY_PHONE,
 *   RULIZ_COMPANY_SIRET, RULIZ_COMPANY_TVA, RULIZ_COMPANY_RCS,
 *   RULIZ_COMPANY_CAPITAL, RULIZ_COMPANY_IBAN, RULIZ_COMPANY_BIC.
 *
 * Le taux de TVA (par défaut 20%) est aussi configurable via
 * RULIZ_VAT_RATE (string décimal, ex "0.20" — mettre "0" pour cacher).
 */

export type CompanyInfo = {
  name: string;
  /** Ligne 1 (rue) */
  address: string;
  /** "CP Ville" */
  city: string;
  country: string;
  email: string;
  phone: string | null;
  /** SIRET (14 chiffres) — null si pas encore communiqué */
  siret: string | null;
  /** Numéro de TVA intracom (FR + 11 chiffres) — null si non assujetti */
  tva: string | null;
  /** "RCS Bordeaux 123 456 789" */
  rcs: string | null;
  /** Capital social, ex "1 000 €" */
  capital: string | null;
  iban: string | null;
  bic: string | null;
  /** Taux de TVA appliqué (0 à 1). 0 = pas de TVA affichée. */
  vatRate: number;
};

function pickVatRate(): number {
  const raw = process.env.RULIZ_VAT_RATE;
  if (raw === undefined || raw === "") return 0.2;
  const n = parseFloat(raw);
  if (Number.isNaN(n) || n < 0 || n > 1) return 0.2;
  return n;
}

export function getCompanyInfo(): CompanyInfo {
  return {
    name: process.env.RULIZ_COMPANY_NAME || "Ruliz",
    address: process.env.RULIZ_COMPANY_ADDRESS || "—",
    city: process.env.RULIZ_COMPANY_CITY || "Bordeaux, France",
    country: process.env.RULIZ_COMPANY_COUNTRY || "France",
    email: process.env.RULIZ_COMPANY_EMAIL || "contact@ruliz.app",
    phone: process.env.RULIZ_COMPANY_PHONE || null,
    siret: process.env.RULIZ_COMPANY_SIRET || null,
    tva: process.env.RULIZ_COMPANY_TVA || null,
    rcs: process.env.RULIZ_COMPANY_RCS || null,
    capital: process.env.RULIZ_COMPANY_CAPITAL || null,
    iban: process.env.RULIZ_COMPANY_IBAN || null,
    bic: process.env.RULIZ_COMPANY_BIC || null,
    vatRate: pickVatRate(),
  };
}

/**
 * Décompose un total TTC en HT + TVA selon le taux configuré.
 *
 * Convention : les prix stockés en DB sont TTC (c'est ce que le client paie
 * et voit sur Stripe Checkout). On déduit le HT à l'affichage de la facture.
 * Si vatRate = 0, ht = ttc et vat = 0 (cas auto-entrepreneur / non assujetti).
 */
export function splitTtc(
  ttcCentimes: number,
  vatRate: number,
): { htCentimes: number; vatCentimes: number; ttcCentimes: number } {
  if (vatRate <= 0) {
    return { htCentimes: ttcCentimes, vatCentimes: 0, ttcCentimes };
  }
  // HT = TTC / (1 + taux), arrondi au centime
  const htCentimes = Math.round(ttcCentimes / (1 + vatRate));
  const vatCentimes = ttcCentimes - htCentimes;
  return { htCentimes, vatCentimes, ttcCentimes };
}
