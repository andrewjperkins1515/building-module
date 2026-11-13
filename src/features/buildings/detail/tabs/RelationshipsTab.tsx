import { Briefcase, Building2, Mail, Phone, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { Organization } from "@/types";
import { useData } from "@/store/DataProvider";
import { Badge } from "@/components/ui/primitives";
import { Avatar, EmptyState, Section } from "@/components/shared/layout";
import { DealStageBadge, DealStatusBadge } from "@/components/shared/badges";
import { DEAL_ROLE_LABEL, OWNERSHIP_ROLE_LABEL, RELATIONSHIP_ROLE_LABEL } from "@/lib/labels";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { useBuildingPage } from "../context";
import { CompanyTypeBadge } from "@/features/crm/components";

interface OrgEntry {
  org: Organization;
  roles: string[];
  detail?: string;
  current: boolean;
}

const GROUPS: { key: string; label: string; match: (role: string) => boolean }[] = [
  { key: "owners", label: "Owners", match: (r) => r === "Property owner" || r === "Parent organization" },
  { key: "operators", label: "Operators & management", match: (r) => r === "Operator" || r === "Management company" },
  { key: "brokers", label: "Brokers", match: (r) => r === "Broker" },
  { key: "lenders", label: "Lenders", match: (r) => r === "Lender" },
  { key: "attorneys", label: "Attorneys", match: (r) => r === "Attorney" },
  { key: "other", label: "Other organizations", match: (r) => r === "Consultant" || r === "Other" },
];

export function RelationshipsTab() {
  const { bundle, openDeal } = useBuildingPage();
  const { state } = useData();
  const orgMap = new Map<string, OrgEntry>();
  const add = (orgId: string | undefined, role: string, current: boolean, detail?: string) => {
    const org = state.organizations.find((o) => o.id === orgId);
    if (!org) return;
    const key = `${org.id}:${role}:${current}`;
    const e = orgMap.get(key);
    if (e) return;
    orgMap.set(key, { org, roles: [role], detail, current });
  };
  bundle.ownership.records.forEach((o) => add(o.organizationId, OWNERSHIP_ROLE_LABEL[o.role], o.isCurrent, o.isCurrent ? `Since ${fmtDate(o.startDate)}` : `${fmtDate(o.startDate)} – ${fmtDate(o.endDate)}`));
  bundle.relationships.filter((r) => !["key_contact", "administrator"].includes(r.role)).forEach((r) => add(r.organizationId, RELATIONSHIP_ROLE_LABEL[r.role], true, r.description));
  const entries = [...orgMap.values()];

  const contacts = bundle.relationships
    .filter((r) => r.contactId)
    .map((r) => ({ r, c: state.contacts.find((c) => c.id === r.contactId)! }))
    .filter((x) => x.c)
    .filter((x, i, arr) => arr.findIndex((y) => y.c.id === x.c.id) === i);

  const active = bundle.deals.filter((d) => d.deal.status === "active");
  const historical = bundle.deals.filter((d) => d.deal.status !== "active");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {GROUPS.map((g) => {
          const items = entries.filter((e) => e.roles.some(g.match));
          return (
            <Section key={g.key} title={g.label} description={`${items.length} linked`} icon={Building2} bodyClassName="p-0">
              {items.length === 0 ? (
                <div className="px-4 py-5 text-center text-xs text-ink-4">None linked</div>
              ) : (
                <ul className="divide-y divide-border/70">
                  {items.map((e) => (
                    <li key={`${e.org.id}${e.roles[0]}${e.current}`} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-canvas text-[11px] font-semibold text-ink-3">
                        {e.org.name
                          .split(/\s+/)
                          .filter((w) => /^[A-Z]/.test(w))
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-medium text-ink">{e.org.name}</span>
                          {!e.current && <Badge className="text-[10px]">Former</Badge>}
                          {g.key === "owners" && e.org.companyType && <CompanyTypeBadge type={e.org.companyType} className="text-[10px]" />}
                        </div>
                        <div className="truncate text-[11.5px] text-ink-3">
                          {e.roles.join(", ")} · {e.org.hqCity}, {e.org.hqState}
                        </div>
                        {e.detail && <div className="truncate text-[11.5px] text-ink-4">{e.detail}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          );
        })}
      </div>

      <Section title="Contacts" icon={Users} description={`${contacts.length} people connected to this building`} flush>
        {contacts.length === 0 ? (
          <EmptyState compact icon={Users} title="No contacts linked" />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11.5px] text-ink-3">
                  <th className="h-8 pl-4 font-medium">Name</th>
                  <th className="px-3 font-medium">Organization</th>
                  <th className="px-3 font-medium">Relationship</th>
                  <th className="pl-3 pr-4 font-medium">Contact</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(({ r, c }) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pl-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} />
                        <div>
                          <Link to={`/contacts/${c.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                            {c.name}
                          </Link>
                          <div className="text-[11.5px] text-ink-3">{c.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 text-ink-2">{state.organizations.find((o) => o.id === c.organizationId)?.name}</td>
                    <td className="px-3">
                      <Badge tone="outline">{RELATIONSHIP_ROLE_LABEL[r.role]}</Badge>
                    </td>
                    <td className="pl-3 pr-4">
                      <div className="flex flex-col gap-0.5 text-[12px]">
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-accent hover:underline">
                          <Mail className="size-3" /> {c.email}
                        </a>
                        <span className="flex items-center gap-1.5 text-ink-3">
                          <Phone className="size-3" /> {c.phone}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { title: "Active deals", list: active, empty: "No active deals" },
          { title: "Historical deals", list: historical, empty: "No historical deals" },
        ].map((grp) => (
          <Section key={grp.title} title={grp.title} icon={Briefcase} description={`${grp.list.length}`} flush>
            {grp.list.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-ink-4">{grp.empty}</div>
            ) : (
              <ul className="divide-y divide-border/70">
                {grp.list.map(({ deal, rel }) => (
                  <li key={rel.id}>
                    <button onClick={() => openDeal(deal.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-canvas">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-ink">{deal.name}</div>
                        <div className="text-[11.5px] text-ink-3">
                          {deal.code} · {DEAL_ROLE_LABEL[rel.role]}
                          {rel.priceAllocation ? ` · ${fmtCurrency(rel.priceAllocation, { compact: true })}` : ""}
                        </div>
                        {deal.deadReason && <div className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-4">{deal.deadReason}</div>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <DealStageBadge stage={deal.stage} status={deal.status} />
                        {deal.status !== "active" && <DealStatusBadge status={deal.status} />}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ))}
      </div>
    </div>
  );
}
