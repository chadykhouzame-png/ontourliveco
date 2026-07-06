import { Link } from "react-router-dom";

import lockupHorizontalIvory from "@/assets/lockup-horizontal-ivory.png.asset.json";
import monogramIvory from "@/assets/monogram-ivory.png.asset.json";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

// Height ramp per breakpoint. Kept small so the monogram reads as a mark
// (never taller than the horizontal lockup would sit at the same breakpoint).
const HEIGHTS: Record<Size, string> = {
  sm: "h-8 sm:h-9 md:h-10",
  md: "h-9 sm:h-10 md:h-12",
  lg: "h-10 sm:h-12 md:h-14 lg:h-16",
};

interface BrandLockupProps {
  /** Height ramp. Header uses `md`, splash/legal pages use `lg`. */
  size?: Size;
  /** Wrap the lockup in a Link to `/`. Defaults to true. */
  asLink?: boolean;
  /** Extra classes on the outer element. */
  className?: string;
  /** Image element classes (e.g. to override the height ramp). */
  imgClassName?: string;
  /** For above-the-fold placements (header) — set false to eager-load. */
  lazy?: boolean;
}

/**
 * Responsive brand lockup.
 *
 * Uses <picture> so only ONE image ever downloads per viewport:
 *   - <640px: square monogram (crisp at small sizes, avoids letterform mush)
 *   - ≥640px: horizontal ivory lockup
 *
 * `width`/`height` intrinsic attributes ship the natural aspect ratio to
 * the browser so there's no CLS while the image resolves.
 */
export const BrandLockup = ({
  size = "md",
  asLink = true,
  className,
  imgClassName,
  lazy = true,
}: BrandLockupProps) => {
  const heightClasses = HEIGHTS[size];

  const picture = (
    <picture>
      {/* Wordmark on tablet+ */}
      <source
        media="(min-width: 640px)"
        srcSet={lockupHorizontalIvory.url}
        width={480}
        height={120}
      />
      {/* Monogram fallback = the mobile image */}
      <img
        src={monogramIvory.url}
        alt="On Tour Live"
        width={120}
        height={120}
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        className={cn("w-auto max-w-full select-none", heightClasses, imgClassName)}
        draggable={false}
      />
    </picture>
  );

  if (!asLink) {
    return <span className={cn("inline-flex items-center", className)}>{picture}</span>;
  }

  return (
    <Link
      to="/"
      aria-label="On Tour Live — home"
      className={cn("inline-flex items-center", className)}
    >
      {picture}
    </Link>
  );
};

export default BrandLockup;
