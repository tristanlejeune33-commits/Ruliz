"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteTeamMember } from "@/server/dashboard/team-actions";

const schema = z.object({
  email: z.email("Email invalide"),
  role: z.enum(["editor", "viewer"]),
});
type Values = z.infer<typeof schema>;

export function TeamInviteForm({ canAdd }: { canAdd: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", role: "editor" },
  });

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await inviteTeamMember(values);
      if (res.ok) {
        toast.success("Invitation envoyée");
        form.reset();
        router.refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_auto]"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@exemple.fr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Rôle</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="editor">Éditeur</SelectItem>
                  <SelectItem value="viewer">Visiteur (lecture seule)</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending || !canAdd}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          Inviter
        </Button>
      </form>
      {!canAdd && (
        <p className="mt-3 text-xs text-[var(--color-destructive)]">
          Limite atteinte pour ton plan actuel. Passe Premium pour des places illimitées.
        </p>
      )}
    </Form>
  );
}
