"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { PublicMenu } from "@/server/public/menu";

interface PopupBannerProps {
  popup: NonNullable<PublicMenu["popup"]>;
  accentColor: string;
}

export function PopupBanner({ popup, accentColor }: PopupBannerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Don't re-show if already dismissed in this session
    const key = `ruliz_popup_${popup.id}`;
    if (typeof window === "undefined") return;
    const dismissed = window.sessionStorage.getItem(key);
    if (dismissed) return;

    // Open after a small delay so the page settles
    const timer = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(timer);
  }, [popup.id]);

  const close = () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`ruliz_popup_${popup.id}`, "1");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur"
          />
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="fixed left-1/2 top-1/2 z-50 w-[min(380px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow-md backdrop-blur"
              aria-label="Fermer"
            >
              <X className="size-3.5" />
            </button>

            {popup.imageUrl && (
              <div className="relative h-44 w-full overflow-hidden">
                <Image
                  src={popup.imageUrl}
                  alt=""
                  fill
                  sizes="380px"
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}

            <div className="p-6 text-center">
              <h2 className="text-balance text-xl font-semibold tracking-tight">
                {popup.titre}
              </h2>
              {popup.description && (
                <p className="mt-2 text-sm text-neutral-600">{popup.description}</p>
              )}
              {popup.ctaLabel && popup.ctaUrl && (
                <a
                  href={popup.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={close}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl py-3 text-sm font-medium text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {popup.ctaLabel}
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
