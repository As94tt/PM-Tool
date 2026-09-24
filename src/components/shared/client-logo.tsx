import { hashColor } from "@/lib/color-hash";
import { cn } from "@/lib/utils";

function clientInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const SIZE_CLASS = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-28 text-3xl",
};

export function ClientLogo({
  name,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeClass = SIZE_CLASS[size];

  if (logoUrl) {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary", sizeClass, className)}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user-provided logo (data URL or external URL), not an optimizable static asset */}
        <img src={logoUrl} alt="" className="size-full object-cover" />
      </div>
    );
  }

  const { bg, fg } = hashColor(name);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl font-heading font-semibold",
        sizeClass,
        className
      )}
      style={{ backgroundColor: bg, color: fg }}
      aria-hidden="true"
    >
      {clientInitials(name)}
    </div>
  );
}
