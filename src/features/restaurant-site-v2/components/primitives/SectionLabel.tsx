interface SectionLabelProps {
  /** Numéro de section affiché formatté en `01..09`. */
  num: number;
  /** Nom de la section en uppercase. */
  name: string;
}

/**
 * Label de section éditorial — filet 1px en haut + numérotation mono
 * `01 / À PROPOS`. Présent entre chaque section pour structurer la page
 * comme un article de magazine.
 */
export function SectionLabel({ num, name }: SectionLabelProps) {
  const formatted = String(num).padStart(2, "0");
  return (
    <div className="rs2-section-label">
      <span className="num">{formatted}</span>
      <span className="slash">/</span>
      <span className="name">{name}</span>
    </div>
  );
}
