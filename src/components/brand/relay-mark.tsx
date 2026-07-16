import { cn } from "@/lib/utils";

type RelayMarkProps = {
  className?: string;
  /** dual = brand two-tone on dark; mono-dark = on light; mono-light = on dark */
  variant?: "dual" | "mono-dark" | "mono-light";
  title?: string;
};

/**
 * Relay mark: four interlocking wave modules around a controlled center.
 * Approximate brand geometry for product UI (not final master artwork).
 */
export function RelayMark({
  className,
  variant = "dual",
  title = "Relay",
}: RelayMarkProps) {
  const a =
    variant === "dual"
      ? "#276152"
      : variant === "mono-dark"
        ? "#0D3A35"
        : "#B1B7AB";
  const b =
    variant === "dual"
      ? "#B1B7AB"
      : variant === "mono-dark"
        ? "#0D3A35"
        : "#FFFFFF";

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <title>{title}</title>
      {/* four thick curved bands — equal visual mass, gap at center */}
      <path
        d="M10 28 C18 10 34 8 42 18 C36 22 28 24 22 30 C18 34 14 34 10 28Z"
        fill={a}
      />
      <path
        d="M36 10 C54 14 58 30 50 42 C44 36 42 28 38 20 C36 16 36 12 36 10Z"
        fill={b}
      />
      <path
        d="M54 36 C46 54 30 56 22 46 C28 42 36 40 42 34 C46 30 50 30 54 36Z"
        fill={a}
      />
      <path
        d="M28 54 C10 50 6 34 14 22 C20 28 22 36 26 44 C28 48 28 52 28 54Z"
        fill={b}
      />
    </svg>
  );
}

export function RelayWordmark({
  className,
  markClassName,
  variant = "mono-dark",
  showDomain = false,
}: {
  className?: string;
  markClassName?: string;
  variant?: "dual" | "mono-dark" | "mono-light";
  showDomain?: boolean;
}) {
  const text =
    variant === "mono-light" || variant === "dual"
      ? "text-white"
      : "text-deep-current";
  const muted =
    variant === "mono-light" || variant === "dual"
      ? "text-mist"
      : "text-muted";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <RelayMark
        variant={variant}
        className={cn("h-9 w-9", markClassName)}
      />
      <div className="leading-tight">
        <p className={cn("text-lg font-semibold tracking-tight", text)}>
          Relay
        </p>
        {showDomain ? (
          <p className={cn("text-xs tracking-wide", muted)}>go.avgst.ru</p>
        ) : null}
      </div>
    </div>
  );
}
