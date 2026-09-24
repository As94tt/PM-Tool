import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  href,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "brand";
  className?: string;
}) {
  const content = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-elevation-1 transition-[transform,box-shadow] duration-200",
        href && "hover:-translate-y-0.5 hover:shadow-elevation-2",
        className
      )}
    >
      <div
        className={cn(
          "mb-4 flex size-9 items-center justify-center rounded-lg",
          tone === "brand" ? "bg-primary/12 text-primary" : "bg-secondary text-foreground/70"
        )}
      >
        <Icon className="size-4.5" />
      </div>
      <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {sublabel && <p className="mt-2 text-xs text-muted-foreground/80">{sublabel}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
        {content}
      </Link>
    );
  }
  return content;
}
