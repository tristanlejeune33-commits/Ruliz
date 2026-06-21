import { redirect } from "next/navigation";

/**
 * La landing marketing a été retirée : la page de connexion est désormais la
 * première page du site. `/` redirige donc vers `/login` (qui sert aussi de
 * point d'entrée pour les restaurateurs déjà inscrits).
 *
 * Les pages /pricing et /legal/* restent accessibles directement.
 */
export default function HomePage() {
  redirect("/login");
}
