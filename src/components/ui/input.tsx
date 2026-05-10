import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input — glass DS Ruliz.
 * - bg glass + border glass
 * - hover : border glass-hover
 * - focus : border néon-cyan + ring néon-cyan/30
 * - aria-invalid : border néon-danger + ring danger/30
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        // Mobile-first : h-12 (48px touch + 16px font hérité de globals → no zoom iOS).
        // Desktop dense : h-10. Le 16px reste appliqué globalement par globals.css mais
        // text-sm (14px) override la taille visuelle du label / placeholder.
        "flex h-12 w-full rounded-xl border border-[var(--border-glass)] bg-[var(--bg-glass)] backdrop-blur-md px-3 py-2 text-base text-[var(--text-primary)] lg:h-10 lg:text-sm",
        "placeholder:text-[var(--text-tertiary)]",
        "transition-all duration-200",
        "hover:border-[var(--border-glass-hover)]",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:outline-none focus-visible:border-[var(--neon-cyan)] focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)]/30 focus-visible:bg-[var(--bg-glass-hover)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--neon-danger)] aria-invalid:ring-2 aria-invalid:ring-[var(--neon-danger)]/30",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
