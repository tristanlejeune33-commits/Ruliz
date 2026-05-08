"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createFirstRestaurant } from "@/server/dashboard/actions";

const schema = z.object({
  nom: z.string().min(1, "Requis").max(255),
  ville: z.string().max(100),
  email: z.string().max(255),
  telephone: z.string().max(20),
});
type Values = z.infer<typeof schema>;

export function OnboardingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { nom: "", ville: "", email: "", telephone: "" },
  });

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await createFirstRestaurant(values);
      if (res.ok) {
        toast.success("Restaurant créé !");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="nom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du restaurant *</FormLabel>
              <FormControl>
                <Input
                  autoFocus
                  placeholder="Le Tire-Bouchon"
                  {...field}
                />
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
                <Input placeholder="Bordeaux" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email contact</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contact@…" {...field} />
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
                  <Input placeholder="05 56 …" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          Créer mon restaurant
        </Button>
      </form>
    </Form>
  );
}
