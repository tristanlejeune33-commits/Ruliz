"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateClient } from "@/server/admin/actions";

const schema = z.object({
  prenom: z.string().min(1, "Requis").max(100),
  nom: z.string().min(1, "Requis").max(100),
  telephone: z.string().max(20).optional().or(z.literal("")),
  adresse: z.string().max(500).optional().or(z.literal("")),
  codePostal: z.string().max(10).optional().or(z.literal("")),
  ville: z.string().max(100).optional().or(z.literal("")),
  pays: z.string().min(1).max(100),
});

type Values = z.infer<typeof schema>;

interface ClientFormProps {
  client: { id: number } & Values;
}

export function ClientForm({ client }: ClientFormProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      prenom: client.prenom,
      nom: client.nom,
      telephone: client.telephone,
      adresse: client.adresse,
      codePostal: client.codePostal,
      ville: client.ville,
      pays: client.pays,
    },
  });

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await updateClient({ id: client.id, ...values });
      if (res.ok) {
        toast.success("Profil mis à jour");
        form.reset(values);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du compte</CardTitle>
        <CardDescription>Coordonnées du restaurateur. L&apos;email est immuable.</CardDescription>
      </CardHeader>
      <CardContent>
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
              name="adresse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codePostal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code postal</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
              name="pays"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Pays</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
              {form.formState.isDirty && (
                <p className="text-xs text-[var(--text-muted)]">
                  Modifications non enregistrées
                </p>
              )}
              <Button type="submit" disabled={!form.formState.isDirty || pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
