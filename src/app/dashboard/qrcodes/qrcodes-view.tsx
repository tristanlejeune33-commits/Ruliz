"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  createQrcode,
  deleteQrcode,
  setQrcodeStatut,
} from "@/server/dashboard/qrcode-actions";

interface QrcodeRow {
  id: string;
  codeUnique: string;
  pngUrl: string | null;
  statut: string;
  scanTotal: number;
  scanMois: number;
  createdAt: string;
}

interface QrcodesViewProps {
  restaurantId: string;
  qrcodes: QrcodeRow[];
}

export function QrcodesView({ restaurantId, qrcodes }: QrcodesViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleCreate = () => {
    startTransition(async () => {
      const res = await createQrcode({ restaurantId });
      if (res.ok) {
        toast.success("QR code généré.");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const handleStatut = (id: string, statut: "actif" | "inactif" | "perdu") => {
    startTransition(async () => {
      const res = await setQrcodeStatut({ id, statut });
      if (res.ok) {
        toast.success("Statut mis à jour");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteQrcode(id);
      if (res.ok) {
        toast.success("QR code supprimé");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const handleDownload = (qr: QrcodeRow) => {
    if (!qr.pngUrl) return;
    const a = document.createElement("a");
    a.href = qr.pngUrl;
    a.download = `ruliz-${qr.codeUnique}.png`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={handleCreate} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Générer un QR code
        </Button>
      </div>

      {qrcodes.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Aucun QR code. Génère le premier pour ton restaurant.
          </p>
          <Button onClick={handleCreate} disabled={pending}>
            <Plus className="size-4" />
            Générer mon premier QR code
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {qrcodes.map((qr) => (
            <Card key={qr.id} className="overflow-hidden p-0">
              <div className="flex aspect-square items-center justify-center border-b border-[var(--border-subtle)] bg-white p-6">
                {qr.pngUrl ? (
                  <Image
                    src={qr.pngUrl}
                    alt={`QR code ${qr.codeUnique}`}
                    width={240}
                    height={240}
                    unoptimized
                    className="size-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-neutral-500">QR indisponible</span>
                )}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm font-medium">{qr.codeUnique}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={pending}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(qr)}>
                        <Download /> Télécharger PNG
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {qr.statut !== "actif" && (
                        <DropdownMenuItem onClick={() => handleStatut(qr.id, "actif")}>
                          Activer
                        </DropdownMenuItem>
                      )}
                      {qr.statut !== "inactif" && (
                        <DropdownMenuItem onClick={() => handleStatut(qr.id, "inactif")}>
                          Désactiver
                        </DropdownMenuItem>
                      )}
                      {qr.statut !== "perdu" && (
                        <DropdownMenuItem onClick={() => handleStatut(qr.id, "perdu")}>
                          Marquer perdu
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-[var(--color-destructive)] data-[highlighted]:text-[var(--color-destructive)]"
                          >
                            <Trash2 /> Supprimer
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce QR code ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tous les scans déjà comptabilisés seront conservés mais ne
                              pourront plus être attribués. Action irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(qr.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{format(new Date(qr.createdAt), "d MMM yyyy", { locale: fr })}</span>
                  <span className="capitalize">{qr.statut}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Stat label="Scans mois" value={qr.scanMois} />
                  <Stat label="Total" value={qr.scanTotal} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(qr)}
                  className="mt-2 w-full"
                  disabled={!qr.pngUrl}
                >
                  <Download className="size-3.5" />
                  Télécharger
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums">
        {value.toLocaleString("fr-FR")}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
