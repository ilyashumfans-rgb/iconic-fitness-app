import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const STAR_YELLOW = "#FABB05";

/** Five stars with fractional fill, e.g. 4.3 -> four full stars + 30% of the fifth. */
export function RatingStars({ rating, className, starClassName }: { rating: number; className?: string; starClassName?: string }) {
  const value = Math.max(0, Math.min(5, Number.isFinite(rating) ? rating : 0));
  return (
    <span aria-hidden className={cn("inline-flex items-center gap-px", className)}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={cn("relative inline-block h-3.5 w-3.5", starClassName)}>
            <Star className="absolute inset-0 h-full w-full" style={{ color: STAR_YELLOW, opacity: 0.35 }} strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }}>
              <Star className="h-full w-full" style={{ color: STAR_YELLOW, fill: STAR_YELLOW, minWidth: "100%" }} strokeWidth={1.5} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * Google-style inline rating: "4.3 ★★★★☆ (308)".
 * Pass `count` only when a real review count exists; it is never invented.
 */
export function RatingDisplay({
  rating,
  count,
  className,
  starClassName,
  countClassName,
  size = "sm",
}: {
  rating: number;
  count?: number | null;
  className?: string;
  starClassName?: string;
  countClassName?: string;
  size?: "xs" | "sm" | "md";
}) {
  const star = size === "xs" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const hasCount = typeof count === "number" && Number.isFinite(count);
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}
      aria-label={`Rated ${rating.toFixed(1)} out of 5${hasCount ? `, ${count} reviews` : ""}`}
    >
      <span className="font-bold">{rating.toFixed(1)}</span>
      <RatingStars rating={rating} starClassName={cn(star, starClassName)} />
      {hasCount ? <span className={cn("opacity-75", countClassName)}>({count!.toLocaleString()})</span> : null}
    </span>
  );
}
