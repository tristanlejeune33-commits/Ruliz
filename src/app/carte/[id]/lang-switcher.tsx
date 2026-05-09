"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Globe2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FlagIcon } from "@/components/shared/flag-icon";
import {
  LANG_META,
  SUPPORTED_LANGS,
  langLabel,
  type SupportedLang,
} from "@/lib/langs";

export { langLabel };

interface LangSwitcherProps {
  current: SupportedLang;
  restaurantId: string;
}

export function LangSwitcher({ current }: LangSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const select = (lang: SupportedLang) => {
    setOpen(false);
    if (lang === current) return;
    const params = new URLSearchParams(searchParams);
    params.set("lang", lang);
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
      router.refresh();
    });
  };

  const meta = LANG_META[current];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="flex h-9 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 text-xs font-medium hover:border-neutral-400"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <FlagIcon lang={current} width={18} rounded />
        )}
        <span className="hidden md:inline">{meta.name}</span>
        <Globe2 className="size-3 text-neutral-400 md:hidden" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-30 min-w-[180px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
          >
            {SUPPORTED_LANGS.map((lang) => {
              const m = LANG_META[lang];
              const isActive = lang === current;
              return (
                <li key={lang}>
                  <button
                    type="button"
                    onClick={() => select(lang)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  >
                    <FlagIcon lang={lang} width={18} rounded />
                    <span className="flex-1">{m.name}</span>
                    {isActive && <Check className="size-3.5 text-neutral-900" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
