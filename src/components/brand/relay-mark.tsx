import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  title?: string;
};

export function RelayMark({ className, title = APP_NAME }: AppLogoProps) {
  return (
    <img
      src="/logo.svg"
      alt={title}
      width={64}
      height={64}
      className={cn("shrink-0", className)}
    />
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
      <RelayMark className={cn("h-9 w-9", markClassName)} />
      <div className="min-w-0 leading-tight">
        <p className={cn("text-sm font-semibold tracking-tight sm:text-base", text)}>
          {APP_NAME}
        </p>
        {showDomain ? (
          <p className={cn("text-xs tracking-wide", muted)}>go.avgst.ru</p>
        ) : null}
      </div>
    </div>
  );
}
