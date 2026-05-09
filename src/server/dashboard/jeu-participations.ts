import "server-only";
import { prisma } from "@/lib/db";

export interface ParticipationRow {
  id: string;
  prenom: string | null;
  nom: string | null;
  naissance: string | null;
  email: string | null;
  telephone: string | null;
  actionSociale: string | null;
  lotGagne: string | null;
  participatedAt: Date;
}

/**
 * Récupère toutes les participations d'un jeu (limité à 1000 pour éviter
 * de bourrer le navigateur). Pour l'export CSV qui doit tout sortir, voir
 * exportParticipationsCsv().
 */
export async function listParticipations(opts: {
  jeuId: bigint;
  limit?: number;
}): Promise<ParticipationRow[]> {
  const rows = await prisma.jeuParticipation.findMany({
    where: { jeuId: opts.jeuId },
    orderBy: { participatedAt: "desc" },
    take: opts.limit ?? 1000,
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    prenom: r.prenom,
    nom: r.nom,
    naissance: r.naissance,
    email: r.email,
    telephone: r.telephone,
    actionSociale: r.actionSociale,
    lotGagne: r.lotGagne,
    participatedAt: r.participatedAt,
  }));
}

/**
 * Génère un CSV (RFC 4180) de toutes les participations.
 * Utilisé par la route GET /dashboard/jeu/participations/export.
 */
export async function exportParticipationsCsv(jeuId: bigint): Promise<string> {
  const rows = await prisma.jeuParticipation.findMany({
    where: { jeuId },
    orderBy: { participatedAt: "desc" },
  });

  const headers = [
    "Date",
    "Prénom",
    "Nom",
    "Date de naissance",
    "Email",
    "Téléphone",
    "Action sociale",
    "Lot gagné",
  ];

  const escapeCsv = (val: string | null | undefined) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.participatedAt.toISOString(),
        escapeCsv(r.prenom),
        escapeCsv(r.nom),
        escapeCsv(r.naissance),
        escapeCsv(r.email),
        escapeCsv(r.telephone),
        escapeCsv(r.actionSociale),
        escapeCsv(r.lotGagne),
      ].join(","),
    ),
  ];

  // BOM UTF-8 pour qu'Excel ouvre proprement les accents
  return "﻿" + lines.join("\r\n");
}
