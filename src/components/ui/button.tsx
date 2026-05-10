import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — variants alignés sur le DS Ruliz (glass + néon).
 *
 * - `default` (primary) : fond néon-cyan-soft + ring néon + glow cyan, label primary
 * - `secondary` : glass + border glass + hover glass-hover
 * - `outline` : transparent + border + hover glass
 * - `ghost` : transparent + hover glass
 * - `destructive` : néon-danger-soft + ring + glow rouge
 * - `link` : transparent, underline cyan
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--neon-cyan-soft)] text-[var(--neon-cyan)] ring-1 ring-inset ring-[var(--neon-cyan)]/40 shadow-[0_0_20px_var(--neon-cyan-glow)] hover:bg-[var(--neon-cyan)]/25 hover:ring-[var(--neon-cyan)]/60 active:translate-y-px",
        primary:
          "bg-[var(--neon-cyan)] text-[var(--bg-primary)] font-semibold shadow-[0_0_24px_var(--neon-cyan-glow),inset_0_0_0_1px_rgba(0,229,255,0.6)] hover:brightness-110 active:translate-y-px",
        destructive:
          "bg-[var(--neon-danger-soft)] text-[var(--neon-danger)] ring-1 ring-inset ring-[var(--neon-danger)]/40 shadow-[0_0_20px_rgba(255,61,113,0.35)] hover:bg-[var(--neon-danger)]/25 hover:ring-[var(--neon-danger)]/60 active:translate-y-px",
        outline:
          "border border-[var(--border-glass)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] hover:border-[var(--border-glass-hover)]",
        secondary:
          "bg-[var(--bg-glass)] backdrop-blur-md text-[var(--text-primary)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:border-[var(--border-glass-hover)]",
        ghost:
          "text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]",
        link:
          "text-[var(--neon-cyan)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        // Defaults : mobile-first (h-11 = 44px touch, Apple HIG) → h-9 desktop (compact dense UI)
        default: "h-11 px-4 py-2 lg:h-9",
        sm: "h-9 rounded-lg px-3 text-xs lg:h-8",
        lg: "h-12 rounded-xl px-6 text-base lg:h-11",
        // CTA primaire mobile (bottom sheet, formulaires sticky)
        xl: "h-14 rounded-2xl px-7 text-base font-semibold",
        // Icon variants : mobile-first 44px, desktop 36/32
        icon: "size-11 rounded-xl lg:size-9 lg:rounded-lg",
        "icon-sm": "size-9 rounded-lg lg:size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
