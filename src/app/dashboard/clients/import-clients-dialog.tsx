"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importClients } from "@/server/dashboard/clients-actions";

interface ImportRow {
  prenom?: string;
  nom?: string;
  telephone: string;
  email?: string;
  anniversaire?: string;
  optInSms?: boolean;
}

/** Retire les accents + minuscule + trim (pour matcher les en-têtes). */
function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

const HEADER_ALIASES: Record<keyof ImportRow, string[]> = {
  prenom: ["prenom", "firstname", "first name"],
  nom: ["nom", "lastname", "last name", "name", "famille", "nom de famille"],
  telephone: [
    "telephone",
    "tel",
    "phone",
    "mobile",
    "portable",
    "numero",
    "gsm",
  ],
  email: ["email", "e-mail", "mail", "courriel"],
  anniversaire: [
    "anniversaire",
    "birthday",
    "naissance",
    "date de naissance",
    "dob",
  ],
  optInSms: ["opt_in_sms", "optinsms", "sms", "optin", "consentement", "marketing"],
};

/** Parse un CSV (délimiteur , ou ; auto-détecté) en respectant les guillemets. */
function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseBool(v: string | undefined): boolean | undefined {
  if (v === undefined) return undefined;
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (["oui", "yes", "true", "vrai", "1", "o", "y"].includes(s)) return true;
  if (["non", "no", "false", "faux", "0", "n"].includes(s)) return false;
  return undefined;
}

function parseCsv(text: string): ImportRow[] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim =
    (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const matrix = parseDelimited(text, delim).filter(
    (r) => r.some((c) => c.trim().length > 0), // skip lignes vides
  );
  if (matrix.length < 2) return [];

  const headers = (matrix[0] ?? []).map(normalizeHeader);
  // Index de chaque colonne connue
  const colIndex: Partial<Record<keyof ImportRow, number>> = {};
  (Object.keys(HEADER_ALIASES) as Array<keyof ImportRow>).forEach((key) => {
    const idx = headers.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (idx !== -1) colIndex[key] = idx;
  });

  const at = (cols: string[], key: keyof ImportRow): string | undefined => {
    const idx = colIndex[key];
    return idx === undefined ? undefined : (cols[idx] ?? "").trim();
  };

  const out: ImportRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const cols = matrix[i] ?? [];
    const telephone = at(cols, "telephone") ?? "";
    out.push({
      prenom: at(cols, "prenom"),
      nom: at(cols, "nom"),
      telephone,
      email: at(cols, "email"),
      anniversaire: at(cols, "anniversaire"),
      optInSms: parseBool(at(cols, "optInSms")),
    });
  }
  return out;
}

export function ImportClientsDialog({
  restaurantId,
  trigger,
}: {
  restaurantId: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setRows(null);
    setFileName("");
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error(
          "Aucune ligne détectée. Vérifie que le fichier suit le modèle (en-têtes + au moins une ligne).",
        );
        return;
      }
      setFileName(file.name);
      setRows(parsed);
    } catch {
      toast.error("Lecture du fichier impossible.");
    }
  };

  const handleImport = () => {
    if (!rows || rows.length === 0) return;
    startTransition(async () => {
      const res = await importClients({ restaurantId, rows });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { imported, skipped } = res.data ?? { imported: 0, skipped: 0 };
      toast.success(
        `${imported} client${imported > 1 ? "s" : ""} importé${imported > 1 ? "s" : ""}${
          skipped > 0 ? ` · ${skipped} ignoré${skipped > 1 ? "s" : ""}` : ""
        }.`,
      );
      setOpen(false);
      reset();
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer des clients</DialogTitle>
          <DialogDescription>
            Importe ta base existante depuis un fichier CSV. Télécharge le
            modèle, remplis-le, puis dépose-le ici.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Étape 1 : modèle */}
          <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-3">
            <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
              1. Télécharge le modèle
            </p>
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              Colonnes : <code>prenom</code>, <code>nom</code>,{" "}
              <code>telephone</code> (obligatoire), <code>email</code>,{" "}
              <code>anniversaire</code> (AAAA-MM-JJ), <code>opt_in_sms</code>{" "}
              (oui/non).
            </p>
            <Button asChild variant="outline" size="sm">
              <a href="/modeles/import-clients.csv" download>
                <Download className="size-3.5" />
                Télécharger le modèle CSV
              </a>
            </Button>
          </div>

          {/* Étape 2 : upload */}
          <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-3">
            <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
              2. Dépose ton fichier rempli
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <FileUp className="size-3.5" />
              Choisir un fichier CSV
            </Button>
            {fileName && (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                <span className="font-medium">{fileName}</span> —{" "}
                {rows?.length ?? 0} ligne{(rows?.length ?? 0) > 1 ? "s" : ""}{" "}
                détectée{(rows?.length ?? 0) > 1 ? "s" : ""}.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={pending || !rows || rows.length === 0}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Importer {rows ? `(${rows.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
