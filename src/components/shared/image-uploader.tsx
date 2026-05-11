"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ClipboardPaste, ImagePlus, Link2, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
      // Stratégie : on uploade côté serveur (proxy Next.js) pour éviter
      // tout problème CORS avec R2.
      const fd = new FormData();
      fd.append("file", file);
      if (restaurantId) fd.append("restaurantId", restaurantId);
      fd.append("kind", kind);

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

  // Paste image support : on écoute le paste sur le container (focus-within)
  // OU globalement quand l'utilisateur a la souris hover sur la dropzone.
  // Coût : 1 listener léger, ne déclenche le upload QUE si clipboard contient image.
  useEffect(() => {
    if (!enablePaste) return;
    if (value) return; // déjà une image, ne pas écraser sans intention

    const node = containerRef.current;
    if (!node) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
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

    // Listener global, mais on filtre : actif uniquement si focus dans la zone
    // OU si la dropzone est focusée. Léger et ne lague pas.
    const onGlobalPaste = (e: ClipboardEvent) => {
      // Si l'utilisateur tape dans un input ailleurs, on ignore
      const active = document.activeElement;
      if (active && node.contains(active)) {
        onPaste(e);
      }
    };

    node.addEventListener("paste", onPaste);
    window.addEventListener("paste", onGlobalPaste);
    return () => {
      node.removeEventListener("paste", onPaste);
      window.removeEventListener("paste", onGlobalPaste);
    };
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
