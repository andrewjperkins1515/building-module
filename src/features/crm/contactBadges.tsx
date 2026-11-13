import type { ContactType, Sector } from "@/types";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/overlays";
import { CONTACT_TYPE_LABEL, SECTOR_LABEL, SECTOR_SHORT } from "@/lib/labels";
import { cn } from "@/lib/utils";

const TYPE_TONE: Record<ContactType, BadgeTone> = {
  operator: "success",
  vendor_dd: "violet",
  vendor_operating: "violet",
  investor: "accent",
  broker: "warning",
  lawyer: "info",
};

export function ContactTypeBadge({ type, className }: { type: ContactType; className?: string }) {
  return (
    <Badge tone={TYPE_TONE[type]} className={className}>
      {CONTACT_TYPE_LABEL[type]}
    </Badge>
  );
}

/** Compact sector chips (SNF / ALF / ILF / MC) with full names on hover, or full labels when `full`. */
export function SectorBadges({ sectors, className, full }: { sectors: Sector[]; className?: string; full?: boolean }) {
  if (!sectors.length) return <span className="text-xs text-ink-4">—</span>;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {sectors.map((s) =>
        full ? (
          <Badge key={s} tone="outline">
            {SECTOR_LABEL[s]}
          </Badge>
        ) : (
          <Tooltip key={s} content={SECTOR_LABEL[s]}>
            <span>
              <Badge tone="outline" className="cursor-default">
                {SECTOR_SHORT[s]}
              </Badge>
            </span>
          </Tooltip>
        ),
      )}
    </span>
  );
}
