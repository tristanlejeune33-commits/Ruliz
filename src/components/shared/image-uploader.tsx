"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Link2, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value ?? "");

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
        // R2 pas configuré — on bascule en mode URL pour que ça reste utilisable
        toast.error(
          presign.error?.includes("R2")
            ? "Stockage R2 non configuré. Colle une URL d'image à la place."
            : presign.error ?? "Upload impossible.",
        );
        setShowUrlInput(true);
        setPending(false);
        return;
      }

      const uploadRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        toast.error("Échec de l'upload. Colle une URL à la place.");
        setShowUrlInput(true);
        setPending(false);
        return;
      }

      onChange(presign.publicUrl);
      toast.success("Image uploadée.");
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau. Colle une URL à la place.");
      setShowUrlInput(true);
    } finally {
      setPending(false);
    }
  }

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
