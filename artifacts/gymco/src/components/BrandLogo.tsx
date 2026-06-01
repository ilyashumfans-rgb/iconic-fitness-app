import { Link } from "wouter";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Show the "The Fitness Company" tagline beneath the wordmark. */
  tagline?: boolean;
  /** Link target. Pass null to render a non-interactive mark. */
  href?: string | null;
  /** Tailwind text size class for the wordmark (default text-2xl). */
  size?: string;
};

/**
 * Iconic Fitness text wordmark — "iconic" in the foreground colour and
 * "FITNESS" in the brand green. Theme-aware, so it works on any light
 * surface (sidebars, headers, footer). On dark panels use the logo image
 * (public/media/iconic-fitness-logo-transparent.png) instead.
 */
export function BrandLogo({
  className,
  tagline = false,
  href = "/",
  size = "text-2xl",
}: BrandLogoProps) {
  const mark = (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            size,
            "font-black lowercase tracking-tight text-foreground transition-transform group-hover:scale-[1.02] origin-left",
          )}
        >
          iconic
        </span>
        <span className={cn(size, "font-black uppercase tracking-[0.18em] text-primary")}>
          fitness
        </span>
      </span>
      {tagline && (
        <span className="text-[9px] uppercase tracking-[0.22em] font-bold text-muted-foreground mt-1">
          The Fitness Company
        </span>
      )}
    </span>
  );

  if (href === null) return mark;
  return (
    <Link href={href} className="group inline-flex">
      {mark}
    </Link>
  );
}
