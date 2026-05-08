import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  /** Inverted color (light mark for dark backgrounds where the blue mark is too saturated). */
  inverted?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function Logo({
  variant = "full",
  className,
  inverted = false,
  width,
  height,
  priority = false,
}: LogoProps) {
  if (variant === "mark") {
    return (
      <Image
        src={inverted ? "/brand/logo-mark-light.png" : "/brand/logo-mark.png"}
        alt="Ruliz"
        width={width ?? 36}
        height={height ?? 36}
        className={cn("size-9", className)}
        priority={priority}
      />
    );
  }
  return (
    <Image
      src="/brand/logo-full.png"
      alt="Ruliz"
      width={width ?? 120}
      height={height ?? 38}
      className={cn("h-8 w-auto", className)}
      priority={priority}
    />
  );
}
