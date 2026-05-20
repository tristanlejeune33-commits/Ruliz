import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

interface BtnProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  variant?: "primary" | "secondary";
  children: ReactNode;
  /** Force la rendu en `<a>` natif (utile pour les liens externes tel: mailto:). */
  external?: boolean;
  arrow?: boolean;
}

/**
 * Bouton pill standardisé du template. 2 variants : primary (fond ink, ou
 * fond blanc en overlay hero banner) et secondary (border + transparent).
 *
 * Le hover bascule en accent — c'est le SEUL endroit où l'accent apparaît
 * en grand (sinon réservé aux dots, stars, marker).
 */
export function Btn({
  href,
  variant = "primary",
  arrow = false,
  external = false,
  children,
  className = "",
  ...rest
}: BtnProps) {
  const cls = `rs2-btn rs2-btn-${variant} ${className}`.trim();
  const content = (
    <>
      <span>{children}</span>
      {arrow && (
        <span className="arrow" aria-hidden>
          →
        </span>
      )}
    </>
  );

  // Lien externe ou href avec protocole → <a>
  const isExternal =
    external ||
    /^(https?:|mailto:|tel:|\/\/)/i.test(href) ||
    href.startsWith("#");

  if (isExternal) {
    return (
      <a
        href={href}
        className={cls}
        target={external && !href.startsWith("#") ? "_blank" : undefined}
        rel={external && !href.startsWith("#") ? "noopener noreferrer" : undefined}
        {...rest}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={cls} {...rest}>
      {content}
    </Link>
  );
}
