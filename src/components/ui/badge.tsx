import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent)]/15 text-[var(--accent)] [&]:border-[var(--accent)]/30",
        secondary:
          "border-transparent bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
        destructive:
          "border-transparent bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]",
        outline:
          "border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)]",
        success:
          "border-transparent bg-[oklch(0.7_0.18_145)]/15 text-[oklch(0.75_0.18_145)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
