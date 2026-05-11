"use client";

import { useState, useTransition } from "react";
import { Cake, Plus, Star, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import {
  createSmsAutomation,
  deleteSmsAutomation,
  toggleSmsAutomation,
} from "@/server/dashboard/sms-actions";

interface Automation {
  id: string;
  triggerType: string;
  messageTemplate: string;
  daysOffset: number;
  sendHour: number;
  active: boolean;
}

interface SmsAutomationsListProps {
  restaurantId: string;
  automations: Automation[];
}

const TRIGGER_LABELS: Record<string, { icon: typeof Cake; label: string; desc: string }> = {
  birthday: {
    icon: Cake,
    label: "Anniversaire client",
    desc: "Envoyé le jour de l'anniversaire du client si renseigné",
  },
  post_roulette: {
    icon: Star,
    label: "Relance après roulette",
    desc: "24h après que le client ait joué à la roulette",
  },
  anniversary_signup: {
    icon: Star,
    label: "Anniversaire d'inscription",
    desc: "1 an après le 1er contact",
  },
};

export function SmsAutomationsList({
  restaurantId,
  automations,
}: SmsAutomationsListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleToggle = (id: string, active: boolean) => {
    startTransition(async () => {
      const res = await toggleSmsAutomation(id, active);
      if (res.ok) {
        toast.success(active ? "Automatisation activée" : "Désactivée");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteSmsAutomation(id);
      if (res.ok) {
        toast.success("Automatisation supprimée");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <div className="space-y-3">
      {automations.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 py-6 text-center text-sm text-[var(--text-muted)]">
          Aucune automatisation pour l&apos;instant. Crée la première
          ci-dessous : envoi automatique pour les anniversaires de tes
          clients, par exemple.
        </p>
      ) : (
        <ul className="space-y-2">
          {automations.map((auto) => {
            const config = TRIGGER_LABELS[auto.triggerType] ?? {
              icon: Cake,
              label: auto.triggerType,
              desc: "",
            };
            const Icon = config.icon;
            return (
              <li
                key={auto.id}
                className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent)]/15 text-[var(--accent)]">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{config.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {config.desc} · envoi à {auto.sendHour}h
                    {auto.daysOffset !== 0 &&
                      ` · décalage ${auto.daysOffset > 0 ? "+" : ""}${auto.daysOffset}j`}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs italic text-[var(--text-secondary)]">
                    « {auto.messageTemplate} »
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={auto.active}
                    onCheckedChange={(c) => handleToggle(auto.id, c)}
                    disabled={pending}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(auto.id)}
                    disabled={pending}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="size-3.5 text-[var(--neon-danger)]" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="size-3.5" />
            Créer une automatisation
          </Button>
        </DialogTrigger>
        <DialogContent>
          <NewAutomationForm
            restaurantId={restaurantId}
            onSuccess={() => {
              setDialogOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewAutomationForm({
  restaurantId,
  onSuccess,
}: {
  restaurantId: string;
  onSuccess: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [triggerType, setTriggerType] = useState<string>("birthday");
  const [messageTemplate, setMessageTemplate] = useState(
    "Joyeux anniversaire {prenom} 🎂 ! Pour l'occasion, un dessert offert sur ton prochain passage. À très vite, {resto}",
  );
  const [sendHour, setSendHour] = useState(10);

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await createSmsAutomation({
        restaurantId,
        triggerType,
        messageTemplate,
        daysOffset: 0,
        sendHour,
        active: true,
      });
      if (res.ok) {
        toast.success("Automatisation créée");
        onSuccess();
      } else toast.error(res.error);
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nouvelle automatisation</DialogTitle>
        <DialogDescription>
          Choisis quand le SMS part automatiquement.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div>
          <Label>Déclencheur</Label>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="birthday">
                🎂 Anniversaire du client
              </SelectItem>
              <SelectItem value="post_roulette">
                ⭐ Relance 24h après la roulette
              </SelectItem>
              <SelectItem value="anniversary_signup">
                🎉 1 an après le 1er contact
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Message</Label>
          <Textarea
            rows={4}
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            placeholder="Joyeux anniversaire {prenom} 🎂 ! Un dessert offert sur ton prochain passage."
            className="mt-1"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Tags : <code>{"{prenom}"}</code>, <code>{"{nom}"}</code>,{" "}
            <code>{"{resto}"}</code>
          </p>
        </div>

        <div>
          <Label>Heure d&apos;envoi</Label>
          <Select
            value={sendHour.toString()}
            onValueChange={(v) => setSendHour(parseInt(v, 10))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {i}h00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Évite trop tôt (avant 9h) et trop tard (après 20h).
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !messageTemplate.trim()}
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Créer l&apos;automatisation
        </Button>
      </DialogFooter>
    </>
  );
}
