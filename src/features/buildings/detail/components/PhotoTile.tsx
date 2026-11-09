import { Camera } from "lucide-react";
import type { SitePhoto } from "@/types";
import { Tooltip } from "@/components/ui/overlays";
import { cn } from "@/lib/utils";

const TINTS = ["#e6ebf2", "#e9ece6", "#efe9e2", "#e8e6ef", "#e3ecef", "#ece8e4"];

/** Placeholder photo tile — real images are not stored in the prototype. */
export function PhotoTile({ photo, seed, className, compact }: { photo: SitePhoto; seed: number; className?: string; compact?: boolean }) {
  const tint = TINTS[Math.abs(seed) % TINTS.length];
  return (
    <Tooltip content={`${photo.caption}${photo.fileName ? ` · ${photo.fileName}` : ""} (placeholder)`}>
      <div className={cn("relative flex flex-col items-center justify-center overflow-hidden rounded-md border border-border", className)} style={{ background: tint }}>
        <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden>
          <path d="M0 60 L25 38 L45 52 L70 28 L100 50 L100 75 L0 75Z" fill="#ffffff" />
          <circle cx="78" cy="16" r="7" fill="#ffffff" />
        </svg>
        <Camera className={cn("relative text-ink-4", compact ? "size-3.5" : "size-5")} />
        {!compact && <div className="relative mt-1 max-w-full truncate px-2 text-[11px] text-ink-3">{photo.caption}</div>}
        {!compact && <div className="relative text-[10px] uppercase tracking-wide text-ink-4">{photo.area}</div>}
      </div>
    </Tooltip>
  );
}
