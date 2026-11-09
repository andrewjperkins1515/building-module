import { CheckCircle2, CircleDashed, CircleAlert, CircleHelp, Star } from "lucide-react";
import type { ConditionRating, DealStage, DealStatus, DocumentStatus, SourceMeta, VerificationStatus } from "@/types";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/overlays";
import { CONDITION_LABEL, DEAL_STAGE_LABEL, DEAL_STATUS_LABEL, DOC_STATUS_LABEL, SOURCE_LABEL, VERIFICATION_LABEL } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const VERIFICATION_TONE: Record<VerificationStatus, BadgeTone> = {
  verified: "success",
  partially_verified: "info",
  needs_review: "warning",
  unverified: "neutral",
};
const VERIFICATION_ICON = {
  verified: CheckCircle2,
  partially_verified: CircleDashed,
  needs_review: CircleAlert,
  unverified: CircleHelp,
};

export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  const Icon = VERIFICATION_ICON[status];
  return (
    <Badge tone={VERIFICATION_TONE[status]} className={className}>
      <Icon />
      {VERIFICATION_LABEL[status]}
    </Badge>
  );
}

/** Compact dot-only verification indicator with tooltip, for inline field values. */
export function SourceIndicator({ meta, className }: { meta: SourceMeta; className?: string }) {
  const color =
    meta.verification === "verified"
      ? "bg-success"
      : meta.verification === "partially_verified"
        ? "bg-info"
        : meta.verification === "needs_review"
          ? "bg-warning"
          : "bg-border-strong";
  return (
    <Tooltip
      content={
        <div className="space-y-0.5">
          <div className="font-medium">{VERIFICATION_LABEL[meta.verification]}</div>
          <div className="text-white/75">
            Source: {SOURCE_LABEL[meta.source]} · as of {fmtDate(meta.asOf)}
          </div>
          {meta.verifiedBy && <div className="text-white/75">Verified by {meta.verifiedBy}</div>}
          {meta.note && <div className="text-white/75">{meta.note}</div>}
        </div>
      }
    >
      <span className={cn("inline-flex size-4 cursor-help items-center justify-center", className)}>
        <span className={cn("size-1.5 rounded-full", color)} />
      </span>
    </Tooltip>
  );
}

const DOC_TONE: Record<DocumentStatus, BadgeTone> = {
  not_requested: "outline",
  requested: "info",
  received: "violet",
  in_review: "warning",
  approved: "success",
  rejected: "danger",
  needs_revision: "danger",
};

export function DocStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  return (
    <Badge tone={DOC_TONE[status]} className={className}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          {
            not_requested: "bg-ink-4",
            requested: "bg-info",
            received: "bg-violet",
            in_review: "bg-warning",
            approved: "bg-success",
            rejected: "bg-danger",
            needs_revision: "bg-danger",
          }[status],
        )}
      />
      {DOC_STATUS_LABEL[status]}
    </Badge>
  );
}

export function DealStageBadge({ stage, status }: { stage: DealStage; status: DealStatus }) {
  if (status === "dead" || status === "abandoned") return <Badge tone="neutral" className="text-ink-3 line-through decoration-ink-4/60">{DEAL_STAGE_LABEL[stage]}</Badge>;
  const tone: Record<DealStage, BadgeTone> = { high_level_review: "neutral", loi_signed: "info", psa_signed: "accent", closed: "success" };
  return <Badge tone={tone[stage]}>{DEAL_STAGE_LABEL[stage]}</Badge>;
}

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const tone: Record<DealStatus, BadgeTone> = { active: "accent", closed: "success", dead: "danger", abandoned: "neutral" };
  return <Badge tone={tone[status]}>{DEAL_STATUS_LABEL[status]}</Badge>;
}

const CONDITION_TONE: Record<ConditionRating, BadgeTone> = { good: "success", fair: "info", poor: "warning", critical: "danger" };

export function ConditionBadge({ rating, className }: { rating: ConditionRating; className?: string }) {
  return (
    <Badge tone={CONDITION_TONE[rating]} className={className}>
      {CONDITION_LABEL[rating]}
    </Badge>
  );
}

/** Four-segment condition meter. */
export function ConditionMeter({ rating }: { rating: ConditionRating }) {
  const level = { good: 4, fair: 3, poor: 2, critical: 1 }[rating];
  const color = { good: "bg-success", fair: "bg-info", poor: "bg-warning", critical: "bg-danger" }[rating];
  return (
    <div className="flex items-center gap-0.5" aria-label={CONDITION_LABEL[rating]}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={cn("h-1.5 w-3.5 rounded-[2px]", i <= level ? color : "bg-muted")} />
      ))}
    </div>
  );
}

export function StarRating({ value, size = "sm", showNumber }: { value?: number | null; size?: "xs" | "sm" | "md"; showNumber?: boolean }) {
  if (!value) return <span className="text-ink-4">—</span>;
  const s = size === "xs" ? "size-3" : size === "sm" ? "size-3.5" : "size-4.5";
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${value} of 5 stars`}>
      <span className="inline-flex gap-px">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn(s, i <= value ? "fill-star text-star" : "fill-muted text-muted")} strokeWidth={1.5} />
        ))}
      </span>
      {showNumber && <span className="tabular text-xs font-medium text-ink-2">{value}</span>}
    </span>
  );
}

export function MockDataTag({ label = "Mock data", className }: { label?: string; className?: string }) {
  return (
    <Badge tone="warning" className={cn("uppercase tracking-wide text-[10px]", className)}>
      {label}
    </Badge>
  );
}
