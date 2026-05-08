import * as React from "react";
import { cn } from "@/lib/utils";

const Kbd = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <kbd
      ref={ref}
      className={cn(
        "inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-1.5 font-mono text-[10px] font-medium text-[var(--text-secondary)]",
        className,
      )}
      {...props}
    />
  ),
);
Kbd.displayName = "Kbd";

export { Kbd };
