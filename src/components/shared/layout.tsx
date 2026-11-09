/** Reusable content layout pieces: sections, field grids, metric tiles, empty states. */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function Section({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  icon: Icon,
  flush,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  icon?: LucideIcon;
  flush?: boolean;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-background shadow-card", className)}>
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="size-4 shrink-0 text-ink-4" />}
          <div className="min-w-0">
            <h3 className="truncate text-[13.5px] font-semibold tracking-[-0.005em] text-ink">{title}</h3>
            {description && <p className="truncate text-xs text-ink-3">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </header>
      <div className={cn(!flush && "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function FieldGrid({ children, cols = 2, className }: { children: ReactNode; cols?: 1 | 2 | 3 | 4; className?: string }) {
  const c = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3.5", c, className)}>{children}</dl>;
}

export function Field({ label, children, className, aside }: { label: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11.5px] font-medium text-ink-4">{label}</dt>
      <dd className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] text-ink">
        <span className="min-w-0 break-words">{children}</span>
        {aside}
      </dd>
    </div>
  );
}

export function MetricTile({
  label,
  value,
  sub,
  aside,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-lg border border-border bg-background px-3.5 py-3 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[11.5px] font-medium text-ink-3">{label}</div>
        {aside}
      </div>
      <div className="tabular mt-1 text-[20px] font-semibold leading-7 tracking-[-0.02em] text-ink">{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11.5px] text-ink-3">{sub}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-6" : "px-6 py-12", className)}>
      <div className={cn("flex items-center justify-center rounded-full border border-dashed border-border-strong bg-canvas text-ink-4", compact ? "size-9" : "size-11")}>
        <Icon className={compact ? "size-4" : "size-5"} />
      </div>
      <div className={cn("font-medium text-ink", compact ? "mt-2.5 text-[13px]" : "mt-3.5 text-sm")}>{title}</div>
      {description && <div className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-3">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({ name, size = "sm", className }: { name: string; size?: "xs" | "sm" | "md"; className?: string }) {
  const hues = ["#e4e9f5", "#e6efe9", "#f3ebe1", "#ece8f4", "#e3eef2", "#f2e6e6"];
  const fg = ["#2c4c9c", "#2f7a55", "#8a5a1d", "#5b4a9e", "#2e6a9e", "#9c3c3c"];
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length;
  const s = { xs: "size-5 text-[9px]", sm: "size-6 text-[10px]", md: "size-8 text-xs" }[size];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", s, className)} style={{ background: hues[i], color: fg[i] }} title={name}>
      {initials(name)}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-ink-3">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KeyValueRow({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1.5 text-[13px]", className)}>
      <span className="text-ink-3">{label}</span>
      <span className="tabular text-right font-medium text-ink">{value}</span>
    </div>
  );
}
