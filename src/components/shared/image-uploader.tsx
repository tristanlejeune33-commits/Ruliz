"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ClipboardPaste, ImagePlus, Link2, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { compressImage, formatBytes } from "@/lib/image-compress";

interface ImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  /** Si omis (ex: boutique admin), l'upload est routé sans scoping restaurant */
  restaurantId?: string;
  kind: "logo" | "banniere" | "produit" | "boutique";
  /** aspect ratio for the preview area, e.g. "16/9", "4/3", "1/1" */
  aspect?: string;
  className?: string;
  label?: string;
  /** Désactive l'écoute du paste (utile si plusieurs uploaders sur la même page) */
  enablePaste?: boolean;
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
  enablePaste = true,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pending, setPending] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("L'image dépasse 5 MB.");
      return;
    }

    setPending(true);
    try {
      // === Compression client-side adaptative ===
      // Resize + ré-encodage avant upload selon le kind (logo PNG préservé,
      // bannière 2400px JPEG q90, produit/boutique 1600px JPEG q88).
      // L'œil ne fait pas la différence avec l'original mais on gagne 70-85%
      // de poids → carte publique 5-10× plus rapide à charger sur mobile.
      const originalSize = file.size;
      const compressed = await compressImage(file, kind);
      const compressedSize = compressed.size;
      const savings = Math.round(
        (1 - compressedSize / originalSize) * 100,
      );
      if (savings >= 10) {
        toast.message(
          `Image optimisée : ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (-${savings}%)`,
          { duration: 2500 },
        );
      }

      // Stratégie : on uploade côté serveur (proxy Next.js) pour éviter
      // tout problème CORS avec R2.
      const fd = new FormData();
      fd.append("file", compressed);
      if (restaurantId) fd.append("restaurantId", restaurantId);
      fd.append("kind", kind);
      // Si une image existe déjà, on demande au serveur de la supprimer
      // après l'upload de la nouvelle (delete on replace).
      if (value) fd.append("previousUrl", value);

      const res = await fetch("/api/upload-direct", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          typeof json?.error === "string"
            ? json.error
            : "Upload impossible. Colle une URL à la place.";
        toast.error(msg);
        setShowUrlInput(true);
        setPending(false);
        return;
      }

      if (!json?.publicUrl) {
        toast.error("Réponse serveur invalide. Colle une URL à la place.");
        setShowUrlInput(true);
        setPending(false);
        return;
      }

      onChange(json.publicUrl);
      toast.success("Image uploadée.");
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau. Colle une URL à la place.");
      setShowUrlInput(true);
    } finally {
      setPending(false);
    }
  }

  // Paste image support : listener GLOBAL sur window.
  // Stratégie : on intercepte le paste seulement si :
  //  1. La clipboard contient bel et bien une image (sinon on ignore, le user
  //     est en train de coller du texte ailleurs)
  //  2. Aucun input texte / textarea n'a le focus (sinon le user veut taper)
  // Ainsi pas besoin de cliquer sur la dropzone d'abord : ouvre le drawer,
  // Ctrl+V → l'image se charge. UX qui matche ce que les gens attendent.
  useEffect(() => {
    if (!enablePaste) return;
    if (value) return; // déjà une image, ne pas écraser sans intention

    const onGlobalPaste = (e: ClipboardEvent) => {
      // Ne pas intercepter si l'user est en train de taper dans un champ
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        const isTextField =
          (tag === "INPUT" &&
            (active as HTMLInputElement).type !== "file" &&
            (active as HTMLInputElement).type !== "image" &&
            (active as HTMLInputElement).type !== "button" &&
            (active as HTMLInputElement).type !== "submit") ||
          tag === "TEXTAREA" ||
          active.isContentEditable;
        if (isTextField) return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      // Cherche une image dans la clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleFile(file);
            return;
          }
        }
      }
    };

    window.addEventListener("paste", onGlobalPaste);
    return () => window.removeEventListener("paste", onGlobalPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enablePaste, value, restaurantId, kind]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      void handleFile(file);
    }
  };

  const submitUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      onChange(null);
      setShowUrlInput(false);
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error("L'URL doit commencer par https://");
      return;
    }
    onChange(trimmed);
    setShowUrlInput(false);
    toast.success("URL enregistrée.");
  };

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
        ref={containerRef}
        tabIndex={value ? -1 : 0}
        onDragOver={(e) => {
          if (value) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onFocus={() => setPasteHint(true)}
        onBlur={() => setPasteHint(false)}
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 outline-none transition-colors",
          isDragging && "border-[var(--accent)] bg-[var(--accent)]/5",
          pasteHint && !value && "ring-1 ring-[var(--accent)]/40",
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
              onClick={() => {
                onChange(null);
                setUrlDraft("");
              }}
              className="absolute right-2 top-2 rounded-md bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Retirer l'image"
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : showUrlInput ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-4">
            <Link2 className="size-5 text-[var(--text-muted)]" />
            <p className="text-xs text-[var(--text-muted)]">
              Colle une URL d&apos;image (https://…)
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="flex size-full flex-col items-center justify-center gap-1.5 px-3 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            {pending ? (
              <Loader2 className="size-6 animate-spin" />
            ) : isDragging ? (
              <Upload className="size-6 text-[var(--accent)]" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            <span className="font-medium">
              {pending
                ? "Upload en cours…"
                : isDragging
                  ? "Déposer l'image"
                  : label}
            </span>
            {!pending && !isDragging && enablePaste && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]/70">
                <ClipboardPaste className="size-3" /> Glisser, coller ou cliquer
              </span>
            )}
          </button>
        )}
      </div>

      {showUrlInput && !value && (
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://exemple.com/image.jpg"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitUrl();
              }
            }}
          />
          <Button type="button" size="sm" onClick={submitUrl}>
            OK
          </Button>
        </div>
      )}

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

      {!value && !showUrlInput && (
        <div className="flex justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Upload className="size-3" /> Depuis mon ordi
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Link2 className="size-3" /> Coller une URL
          </button>
        </div>
      )}
    </div>
  );
}
