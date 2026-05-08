"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dices, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { createClient } from "@/server/admin/actions";

const schema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  prenom: z.string().min(1, "Requis").max(100),
  nom: z.string().min(1, "Requis").max(100),
  telephone: z.string().max(20),
  ville: z.string().max(100),
  pays: z.string().min(1, "Requis").max(100),
  demoActive: z.boolean(),
});

type Values = z.infer<typeof schema>;

function generatePassword() {
  const charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  const rand = new Uint32Array(16);
  crypto.getRandomValues(rand);
  for (let i = 0; i < 16; i++) {
    const idx = rand[i];
    out += charset[(idx ?? 0) % charset.length];
  }
  return out;
}

export function CreateClientForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: generatePassword(),
      prenom: "",
      nom: "",
      telephone: "",
      ville: "",
      pays: "France",
      demoActive: false,
    },
  });

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await createClient(values);
      if (res.ok && res.data) {
        toast.success("Client créé.");
        router.push(`/admin/clients/${res.data.id}`);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-2">
        <FormField
          control={form.control}
          name="prenom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prénom</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <div className="flex items-center justify-between">
                <FormLabel>Mot de passe initial</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => field.onChange(generatePassword())}
                >
                  <Dices className="size-3" />
                  Re-générer
                </Button>
              </div>
              <FormControl>
                <Input className="font-mono" {...field} />
              </FormControl>
              <FormDescription>
                Auto-généré (16 caractères). Tu copies-colles ce mot de passe pour le client,
                il pourra le changer dès sa première connexion.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telephone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Téléphone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="06 12 34 56 78" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ville"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ville</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="demoActive"
          render={({ field }) => (
            <FormItem className="md:col-span-2 flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-4">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} id="demo" />
              </FormControl>
              <div className="flex-1">
                <Label htmlFor="demo" className="cursor-pointer">
                  Activer la démo immédiatement
                </Label>
                <FormDescription>
                  Le compte aura accès à toutes les fonctionnalités sans paiement.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <div className="md:col-span-2 flex items-center justify-end gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Créer le compte
          </Button>
        </div>
      </form>
    </Form>
  );
}
