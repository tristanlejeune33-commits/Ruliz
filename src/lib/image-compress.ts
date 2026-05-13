"use client";

/**
 * Compression d'image client-side via Canvas API, adaptative selon le type
 * d'usage (logo / bannière / photo produit). Réduit typiquement 70-85% le
 * poids du fichier sans perte visible à l'œil sur un écran web.
 *
 * Pourquoi côté client ? Pour économiser le coût upload réseau ET le CPU
 * serveur. Le browser fait le boulot localement avant d'envoyer le fichier.
 *
 * Fallback : si la compression échoue (browser exotique, fichier corrompu),
 * on renvoie le fichier original l'upload procède normalement.
 */

export type ImageKind = "logo" | "banniere" | "produit" | "boutique" | "qrcode";

interface CompressRule {
  /** Dimension max (px) l'image est resize pour rentrer dans un carré
   *  de cette taille, en conservant l'aspect ratio. */
  maxSize: number;
  /** Quality JPEG (0-1). Ignoré pour PNG. */
  quality: number;
  /** Format de sortie. "auto" garde PNG si transparence, sinon JPEG. */
  format: "auto" | "jpeg" | "png";
}

const RULES: Record<ImageKind, CompressRule> = {
  // Logo : on garde PNG (transparence cruciale) + resize 512px max
  logo: { maxSize: 512, quality: 1, format: "png" },
  // Bannière : hero plein-écran sur desktop, on garde une bonne résolution
  banniere: { maxSize: 2400, quality: 0.9, format: "jpeg" },
  // Photo produit : modal slide-up affichée à 600-800px, 1600 est large
  produit: { maxSize: 1600, quality: 0.88, format: "jpeg" },
  // Boutique : même rationale que produit
  boutique: { maxSize: 1600, quality: 0.88, format: "jpeg" },
  // QR code : déjà petit + besoin de précision pixel-perfect, on touche pas
  qrcode: { maxSize: 1024, quality: 1, format: "png" },
};

/**
 * Détecte si une image contient des pixels transparents (alpha < 255).
 * Si oui, on force le format PNG pour conserver la transparence.
 */
function hasTransparency(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): boolean {
  try {
    // Échantillonne pour pas exploser sur les grandes images : on regarde
    // 1 pixel sur 10 lignes/colonnes assez pour détecter une bordure
    // transparente de logo.
    const step = Math.max(1, Math.floor(Math.min(w, h) / 50));
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4 + 3; // canal alpha
        if (data[idx] !== undefined && data[idx]! < 255) return true;
      }
    }
    return false;
  } catch {
    // Si CORS ou autre erreur, on assume opaque (JPEG safe par défaut)
    return false;
  }
}

/**
 * Compresse un File image selon les règles du `kind`. Retourne un nouveau
 * File (ou le File original si la compression échoue ou n'est pas applicable).
 */
export async function compressImage(
  file: File,
  kind: ImageKind,
): Promise<File> {
  // QR code : pas de compression
  if (kind === "qrcode") return file;

  // Si le fichier est déjà petit (< 200 KB), pas la peine de recompresser
  if (file.size < 200 * 1024) return file;

  // GIF animé : on ne touche pas (canvas perdrait l'anim)
  if (file.type === "image/gif") return file;

  const rule = RULES[kind];

  try {
    // 1. Charge le fichier dans une image HTMLImage
    const img = await loadImage(file);

    // 2. Calcule les nouvelles dimensions (aspect ratio conservé)
    const { width, height } = scaleToFit(img.width, img.height, rule.maxSize);

    // 3. Dessine dans un canvas hors-DOM
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return file;

    // Smoothing pour la qualité du downscale
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    // 4. Décide du format de sortie
    let outputFormat: "image/jpeg" | "image/png";
    if (rule.format === "png") {
      outputFormat = "image/png";
    } else if (rule.format === "jpeg") {
      outputFormat = "image/jpeg";
    } else {
      // "auto" : PNG si transparence détectée, sinon JPEG
      outputFormat = hasTransparency(ctx, width, height)
        ? "image/png"
        : "image/jpeg";
    }

    // 5. Encode dans le format choisi
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        resolve,
        outputFormat,
        outputFormat === "image/jpeg" ? rule.quality : undefined,
      ),
    );
    if (!blob) return file;

    // Si le résultat est plus gros que l'original (peut arriver sur petites
    // images déjà optimisées), on garde l'original.
    if (blob.size >= file.size) return file;

    // 6. Reconstruit un File avec le bon nom
    const newName = changeExtension(
      file.name,
      outputFormat === "image/jpeg" ? "jpg" : "png",
    );
    return new File([blob], newName, { type: outputFormat });
  } catch (err) {
    console.warn("[image-compress] failed, using original:", err);
    return file;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function scaleToFit(
  w: number,
  h: number,
  maxSize: number,
): { width: number; height: number } {
  if (w <= maxSize && h <= maxSize) {
    return { width: w, height: h };
  }
  const ratio = Math.min(maxSize / w, maxSize / h);
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

function changeExtension(filename: string, newExt: string): string {
  const lastDot = filename.lastIndexOf(".");
  const base = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  return `${base}.${newExt}`;
}

/** Helper d'affichage : taille formatée en KB/MB pour le toast UX. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
