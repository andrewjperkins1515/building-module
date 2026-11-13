import type { ReactNode } from "react";
import { Cake, Link2, Lock, Mail, MapPin, Phone, Smartphone } from "lucide-react";
import type { Contact } from "@/types";
import { Badge } from "@/components/ui/primitives";
import { fmtDate } from "@/lib/format";
import { ContactPhoto } from "./components";
import { ContactTypeBadge, SectorBadges } from "./contactBadges";

/** The CRM contact card: identity, classification, work and personal details, tags and notes. */
export function ContactCard({ contact: c, hideIdentity }: { contact: Contact; hideIdentity?: boolean }) {
  const addr = c.mailingAddress;
  return (
    <div>
      {!hideIdentity && (
      <div className="flex items-start gap-3.5">
        <ContactPhoto name={c.name} dataUrl={c.photoDataUrl} size={64} />
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-ink">{c.name}</div>
          <div className="text-[13px] text-ink-3">{c.title || "—"}</div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {c.contactType && <ContactTypeBadge type={c.contactType} />}
            {c.rosterRole && <Badge tone={c.rosterRole === "Decision maker" ? "accent" : "neutral"}>{c.rosterRole}</Badge>}
          </div>
          {c.sectors?.length > 0 && <SectorBadges sectors={c.sectors} className="mt-1.5" />}
        </div>
      </div>
      )}
      <div className={hideIdentity ? "grid gap-5 sm:grid-cols-2" : "mt-4 grid gap-5 sm:grid-cols-2"}>
        <div>
          <div className="mb-2 text-[11.5px] font-medium text-ink-4">Contact information</div>
          <ul className="space-y-2 text-[13px]">
            <ContactLine icon={Mail} label="Work email">
              {c.email ? (
                <a className="text-accent hover:underline" href={`mailto:${c.email}`}>
                  {c.email}
                </a>
              ) : null}
            </ContactLine>
            <ContactLine icon={Smartphone} label="Mobile phone">
              {c.mobilePhone}
            </ContactLine>
            <ContactLine icon={Phone} label="Office phone">
              {c.phone}
            </ContactLine>
            <ContactLine icon={Link2} label="LinkedIn">
              {c.linkedIn ? <span className="text-accent">{c.linkedIn}</span> : null}
            </ContactLine>
          </ul>
        </div>
        <div>
          <div className="mb-2 flex items-center gap-1 text-[11.5px] font-medium text-ink-4">
            Personal <Lock className="size-3" />
          </div>
          <ul className="space-y-2 text-[13px]">
            <ContactLine icon={Cake} label="Date of birth">
              {c.dob ? fmtDate(c.dob) : null}
            </ContactLine>
            <ContactLine icon={Mail} label="Personal email">
              {c.personalEmail}
            </ContactLine>
            <ContactLine icon={MapPin} label="Mail address">
              {addr?.street ? (
                <span>
                  {addr.street}
                  {addr.street2 ? `, ${addr.street2}` : ""}
                  <br />
                  {addr.city}, {addr.state} {addr.zip}
                </span>
              ) : null}
            </ContactLine>
          </ul>
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <div className="mb-1.5 text-[11.5px] font-medium text-ink-4">Tags</div>
        <ChipList items={c.tags} tone="accent" empty="No tags" />
      </div>
      {c.notes && <div className="mt-3 rounded-md bg-canvas px-3 py-2 text-[12.5px] text-ink-2">{c.notes}</div>}
    </div>
  );
}

export function ContactLine({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-ink-4" />
      <div className="min-w-0">
        <div className="text-[11px] text-ink-4">{label}</div>
        <div className="break-words text-ink">{children || <span className="text-ink-4">—</span>}</div>
      </div>
    </li>
  );
}

export function ChipList({ items, tone = "neutral", title, empty = "—" }: { items?: string[]; tone?: "neutral" | "accent"; title?: (s: string) => string; empty?: string }) {
  if (!items?.length) return <span className="text-ink-4">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((i) => (
        <Badge key={i} tone={tone} title={title?.(i)}>
          {i}
        </Badge>
      ))}
    </div>
  );
}
