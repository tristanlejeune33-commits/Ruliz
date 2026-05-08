"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  restaurantId: string;
  kind: "logo" | "banniere" | "produit";
  /** aspect ratio for the preview area, e.g. "16/9", "4/3", "1/1" */
  aspect?: string;
  className?: string;
  label?: string;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function ImageUploader({
  value,
  onChange,
  restaurantId,
  kind,
  aspect = "1/1",
  className,
  label = "Choisir une image",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("L'image dépasse 5 MB.");
      return;
    }

    setPending(true);
    try {
      const presignRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          filename: file.name,
          contentType: file.type,
          kind,
        }),
      });
      const presign = await presignRes.json();

      if (!presignRes.ok) {
        toast.error(presign.error ?? "Upload impossible. Colle une URL à la place.");
        setPending(false);
        return;
      }

      const uploadRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        toast.error("Échec de l'upload R2.");
        setPending(false);
        return;
      }

      onChange(presign.publicUrl);
      toast.success("Image uploadée.");
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau pendant l'upload.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <div
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50",
        )}
        style={{ aspectRatio: aspect }}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt=""
              width={400}
              height={400}
              unoptimized
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 rounded-md bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Retirer l'image"
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="flex size-full flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            {pending ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            <span>{pending ? "Upload en cours…" : label}</span>
          </button>
        )}
      </div>
      {value && !pending && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="w-full"
        >
          <ImagePlus className="size-3.5" /> Remplacer
        </Button>
      )}
    </div>
  );
}
