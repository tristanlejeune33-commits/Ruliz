"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--bg-card)] group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border-[var(--border-subtle)] group-[.toaster]:shadow-xl group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-[var(--text-secondary)]",
          actionButton:
            "group-[.toast]:bg-[var(--accent)] group-[.toast]:text-[var(--accent-foreground)]",
          cancelButton:
            "group-[.toast]:bg-[var(--bg-elevated)] group-[.toast]:text-[var(--text-secondary)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
