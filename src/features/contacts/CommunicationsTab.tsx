import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Briefcase, Building2, Calendar, Inbox, Loader2, Mail, MessageSquarePlus, Paperclip, Phone, RefreshCw, Reply, Search, Users } from "lucide-react";
import type { CommChannel, Communication, Contact } from "@/types";
import { useData } from "@/store/DataProvider";
import { Button } from "@/components/ui/button";
import { Badge, Input, Label, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, Tooltip } from "@/components/ui/overlays";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/layout";
import { MockDataTag } from "@/components/shared/badges";
import { useToast } from "@/components/ui/toast";
import { CURRENT_USER } from "@/lib/labels";
import { fmtBytes, fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import { cn, todayIso } from "@/lib/utils";
import { ContactPhoto } from "@/features/crm/components";

type ChannelFilter = "all" | CommChannel;

interface Thread {
  id: string;
  channel: CommChannel;
  subject: string;
  messages: Communication[];
  latest: Communication;
  hasAttachments: boolean;
  dealId?: string;
  buildingId?: string;
}

const CHANNEL_ICON = { email: Mail, call: Phone, meeting: Calendar };
const ALL = "__all";

export function CommunicationsTab({ contact }: { contact: Contact }) {
  const { state } = useData();
  const toast = useToast();
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [q, setQ] = useState("");
  const [dealFilter, setDealFilter] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileReading, setMobileReading] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(() => new Date(Date.now() - 23 * 60_000).toISOString());

  const comms = useMemo(() => state.communications.filter((m) => m.contactIds.includes(contact.id)), [state.communications, contact.id]);

  const threads = useMemo<Thread[]>(() => {
    const map = new Map<string, Communication[]>();
    comms.forEach((m) => map.set(m.threadId, [...(map.get(m.threadId) ?? []), m]));
    return [...map.entries()]
      .map(([id, msgs]) => {
        const sorted = [...msgs].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
        const latest = sorted[sorted.length - 1];
        return {
          id,
          channel: sorted[0].channel,
          subject: sorted[0].subject,
          messages: sorted,
          latest,
          hasAttachments: sorted.some((m) => m.attachments.length),
          dealId: sorted.find((m) => m.dealId)?.dealId,
          buildingId: sorted.find((m) => m.buildingId)?.buildingId,
        };
      })
      .sort((a, b) => b.latest.sentAt.localeCompare(a.latest.sentAt));
  }, [comms]);

  const dealsInComms = [...new Set(threads.map((t) => t.dealId).filter(Boolean) as string[])].map((id) => state.deals.find((d) => d.id === id)!).filter(Boolean);

  const filtered = threads.filter((t) => {
    if (channel !== "all" && t.channel !== channel) return false;
    if (dealFilter !== ALL && t.dealId !== dealFilter) return false;
    const s = q.trim().toLowerCase();
    if (s && !t.messages.some((m) => [m.subject, m.body, m.from.name, ...m.attachments.map((a) => a.name)].join(" ").toLowerCase().includes(s))) return false;
    return true;
  });

  useEffect(() => {
    if (!filtered.some((t) => t.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.map((t) => t.id).join("|")]);

  const selected = filtered.find((t) => t.id === selectedId);

  // Summary stats
  const emails = comms.filter((m) => m.channel === "email");
  const inbound = emails.filter((m) => m.direction === "inbound");
  const lastTouch = comms.reduce<string | undefined>((a, m) => (!a || m.sentAt > a ? m.sentAt : a), undefined);
  const lastReply = inbound.reduce<string | undefined>((a, m) => (!a || m.sentAt > a ? m.sentAt : a), undefined);
  const counts = { all: threads.length, email: threads.filter((t) => t.channel === "email").length, call: threads.filter((t) => t.channel === "call").length, meeting: threads.filter((t) => t.channel === "meeting").length };

  return (
    <div className="space-y-4">
      {/* Outlook sync (simulated) */}
      <div className="flex flex-col gap-3 rounded-lg border border-info-line bg-info-soft/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Inbox className="mt-0.5 size-4 shrink-0 text-info" />
          <div className="text-[13px]">
            <div className="flex flex-wrap items-center gap-2 font-medium text-ink">
              Microsoft Outlook <Badge tone="outline">Simulated sync</Badge> <MockDataTag label="Dummy data" />
            </div>
            <div className="text-ink-3">
              Mailbox {CURRENT_USER.email} · matching on {contact.email || "contact email"} · last synced {fmtRelative(lastSync)}. The real Outlook integration is planned; these messages are fictional.
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={() => {
              setSyncing(true);
              setTimeout(() => {
                setSyncing(false);
                setLastSync(new Date().toISOString());
                toast({ title: "Mailbox is up to date", description: "Simulated sync — no new messages.", tone: "info" });
              }, 900);
            }}
          >
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sync now
          </Button>
          <Button variant="accent" size="sm" onClick={() => setLogOpen(true)}>
            <MessageSquarePlus /> Log communication
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-card lg:grid-cols-4">
        {[
          { label: "Email threads", value: counts.email, sub: `${emails.length} message${emails.length === 1 ? "" : "s"} · ${inbound.length} received` },
          { label: "Calls & meetings", value: counts.call + counts.meeting, sub: `${counts.call} call${counts.call === 1 ? "" : "s"} · ${counts.meeting} meeting${counts.meeting === 1 ? "" : "s"}` },
          { label: "Last contact", value: lastTouch ? fmtRelative(lastTouch) : "—", sub: lastTouch ? fmtDate(lastTouch) : "No communication yet" },
          { label: `Last reply from ${contact.name.split(" ")[0]}`, value: lastReply ? fmtRelative(lastReply) : "—", sub: lastReply ? fmtDate(lastReply) : "No inbound email" },
        ].map((m) => (
          <div key={m.label} className="bg-background px-4 py-3">
            <div className="truncate text-[11.5px] font-medium text-ink-3">{m.label}</div>
            <div className="tabular mt-0.5 text-[19px] font-semibold tracking-[-0.02em]">{m.value}</div>
            <div className="truncate text-[11px] text-ink-4">{m.sub}</div>
          </div>
        ))}
      </div>

      {threads.length === 0 ? (
        <div className="rounded-lg border border-border bg-background shadow-card">
          <EmptyState
            icon={Mail}
            title="No communications yet"
            description={`Emails with ${contact.name} will appear here once Outlook is connected. You can log calls, meetings and notes manually in the meantime.`}
            action={
              <Button variant="accent" onClick={() => setLogOpen(true)}>
                <MessageSquarePlus /> Log communication
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid min-h-[560px] overflow-hidden rounded-lg border border-border bg-background shadow-card lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* List */}
          <div className={cn("flex min-w-0 flex-col border-border lg:border-r", mobileReading && "hidden lg:flex")}>
            <div className="space-y-2 border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject, body, attachments" className="pl-8" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex rounded-md border border-border bg-subtle p-0.5">
                  {(["all", "email", "call", "meeting"] as ChannelFilter[]).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={cn("h-6 rounded-[5px] px-2 text-[11.5px] font-medium capitalize transition-colors", channel === ch ? "bg-background text-ink shadow-xs" : "text-ink-3 hover:text-ink")}
                    >
                      {ch === "all" ? "All" : `${ch}s`} <span className="tabular text-ink-4">{counts[ch]}</span>
                    </button>
                  ))}
                </div>
                {dealsInComms.length > 0 && (
                  <Select value={dealFilter} onValueChange={setDealFilter}>
                    <SelectTrigger className="h-7 w-auto min-w-[120px] max-w-[180px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All deals</SelectItem>
                      {dealsInComms.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <ul className="scrollbar-thin max-h-[640px] flex-1 divide-y divide-border/70 overflow-y-auto">
              {filtered.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-ink-3">No communications match.</li>}
              {filtered.map((t) => {
                const Icon = CHANNEL_ICON[t.channel];
                const inb = t.latest.direction === "inbound";
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        setSelectedId(t.id);
                        setMobileReading(true);
                      }}
                      className={cn("flex w-full gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-canvas", selectedId === t.id && "bg-accent-soft/60 hover:bg-accent-soft/60")}
                    >
                      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", t.channel === "email" ? "bg-info-soft text-info" : t.channel === "call" ? "bg-success-soft text-success" : "bg-violet-soft text-violet")}>
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[12.5px] font-medium text-ink-2">
                            {t.channel === "email" ? (inb ? t.latest.from.name : `To: ${t.latest.to[0]?.name}`) : t.channel === "call" ? "Phone call" : "Meeting"}
                          </span>
                          <span className="shrink-0 text-[11px] text-ink-4">{fmtRelative(t.latest.sentAt)}</span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-semibold text-ink">{t.subject}</span>
                          {t.messages.length > 1 && <span className="tabular shrink-0 rounded bg-subtle px-1 text-[10.5px] text-ink-3">{t.messages.length}</span>}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-3">{t.latest.body.replace(/\s+/g, " ")}</span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-ink-4">
                          {t.channel === "email" &&
                            (inb ? (
                              <span className="inline-flex items-center gap-0.5">
                                <ArrowDownLeft className="size-3" /> Received
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5">
                                <ArrowUpRight className="size-3" /> Sent
                              </span>
                            ))}
                          {t.latest.durationMin && <span>{t.latest.durationMin} min</span>}
                          {t.hasAttachments && <Paperclip className="size-3" />}
                          {t.dealId && <span className="truncate">· {state.deals.find((d) => d.id === t.dealId)?.name}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Reading pane */}
          <div className={cn("min-w-0", !mobileReading && "hidden lg:block")}>
            {!selected ? (
              <EmptyState icon={Mail} title="Select a conversation" />
            ) : (
              <ThreadView thread={selected} contact={contact} onBack={() => setMobileReading(false)} />
            )}
          </div>
        </div>
      )}

      <LogCommunicationDialog contact={contact} open={logOpen} onOpenChange={setLogOpen} onLogged={(id) => setSelectedId(id)} />
    </div>
  );
}

function ThreadView({ thread: t, contact, onBack }: { thread: Thread; contact: Contact; onBack: () => void }) {
  const { state } = useData();
  const deal = state.deals.find((d) => d.id === t.dealId);
  const building = state.buildings.find((b) => b.id === t.buildingId);
  const Icon = CHANNEL_ICON[t.channel];
  const lastInbound = [...t.messages].reverse().find((m) => m.direction === "inbound");
  const replyTo = lastInbound?.from.email ?? contact.email;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <button onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink lg:hidden">
          <ArrowLeft className="size-3.5" /> All communications
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-wide text-ink-4">
              <Icon className="size-3.5" /> {t.channel === "email" ? `Email thread · ${t.messages.length} message${t.messages.length > 1 ? "s" : ""}` : t.channel === "call" ? "Logged call" : "Meeting"}
            </div>
            <h2 className="mt-1 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-ink">{t.subject}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {deal && (
                <Badge tone="accent">
                  <Briefcase /> {deal.name}
                </Badge>
              )}
              {building && (
                <Link to={`/buildings/${building.id}`}>
                  <Badge tone="outline" className="hover:bg-subtle">
                    <Building2 /> {building.name}
                  </Badge>
                </Link>
              )}
              <Badge tone="outline">{t.latest.source === "manual" ? `Logged by ${t.latest.loggedBy}` : "Synced from Outlook (simulated)"}</Badge>
            </div>
          </div>
          {t.channel === "email" && replyTo && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <a href={`mailto:${replyTo}?subject=${encodeURIComponent(t.subject.startsWith("RE:") ? t.subject : `RE: ${t.subject}`)}`}>
                <Reply /> Reply
              </a>
            </Button>
          )}
        </div>
      </div>
      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {t.messages.map((m) => (
          <article key={m.id} className={cn("rounded-lg border p-4", m.direction === "inbound" ? "border-border bg-background" : "border-accent-line/70 bg-accent-soft/30")}>
            <header className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <ContactPhoto name={m.from.name} dataUrl={m.from.email === contact.email ? contact.photoDataUrl : undefined} size={32} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-ink">
                    {m.from.name} <span className="font-normal text-ink-4">&lt;{m.from.email}&gt;</span>
                  </div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    {m.channel === "email" ? "To" : "With"}: {m.to.map((p) => p.name).join(", ")}
                    {m.cc.length > 0 && <> · Cc: {m.cc.map((p) => p.name).join(", ")}</>}
                  </div>
                </div>
              </div>
              <Tooltip content={fmtDateTime(m.sentAt)}>
                <span className="shrink-0 text-[11.5px] text-ink-4">{fmtDateTime(m.sentAt)}</span>
              </Tooltip>
            </header>
            {m.durationMin && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded bg-subtle px-2 py-0.5 text-[11.5px] text-ink-3">
                <Users className="size-3" /> {m.durationMin} minutes
              </div>
            )}
            <div className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{m.body}</div>
            {m.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.attachments.map((a) => (
                  <Tooltip key={a.name} content="Attachment preview not available in the prototype">
                    <span className="inline-flex cursor-default items-center gap-1.5 rounded-md border border-border bg-canvas px-2 py-1 text-[12px] text-ink-2">
                      <Paperclip className="size-3 text-ink-4" /> {a.name} <span className="text-ink-4">{fmtBytes(a.size)}</span>
                    </span>
                  </Tooltip>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function LogCommunicationDialog({ contact, open, onOpenChange, onLogged }: { contact: Contact; open: boolean; onOpenChange: (o: boolean) => void; onLogged: (id: string) => void }) {
  const { state, addCommunication } = useData();
  const toast = useToast();
  const [ch, setCh] = useState<CommChannel>("call");
  const [dir, setDir] = useState<"outbound" | "inbound">("outbound");
  const [date, setDate] = useState(todayIso());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [duration, setDuration] = useState("30");
  const [dealId, setDealId] = useState(ALL);
  const companyDeals = state.deals.filter((d) => [d.sellerOrgId, d.buyerOrgId, d.brokerOrgId, d.lenderOrgId].includes(contact.organizationId));

  useEffect(() => {
    if (open) {
      setCh("call");
      setDir("outbound");
      setDate(todayIso());
      setSubject("");
      setBody("");
      setDuration("30");
      setDealId(ALL);
    }
  }, [open]);

  const me = { name: CURRENT_USER.name, email: CURRENT_USER.email };
  const them = { name: contact.name, email: contact.email };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader icon={<MessageSquarePlus />} title="Log communication" description={`Record a call, meeting or email with ${contact.name}.`} />
        <DialogBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <Select value={ch} onValueChange={(v) => setCh(v as CommChannel)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Phone call</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="email">Email (manual)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Direction</Label>
            <Select value={dir} onValueChange={(v) => setDir(v as "outbound" | "inbound")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outbound">{ch === "email" ? "Sent to contact" : "We initiated"}</SelectItem>
                <SelectItem value="inbound">{ch === "email" ? "Received from contact" : "Contact initiated"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {ch !== "email" ? (
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" min={1} className="mt-1" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          ) : (
            <div />
          )}
          <div className="sm:col-span-2">
            <Label>Subject *</Label>
            <Input autoFocus className="mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={ch === "call" ? "e.g. Call — pricing follow-up" : ch === "meeting" ? "e.g. Lunch meeting in Chicago" : "Email subject"} />
          </div>
          <div className="sm:col-span-2">
            <Label>{ch === "email" ? "Message" : "Notes"}</Label>
            <Textarea className="mt-1" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {companyDeals.length > 0 && (
            <div className="sm:col-span-2">
              <Label>Related deal</Label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>None</SelectItem>
                  {companyDeals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="accent"
            disabled={!subject.trim() || !date}
            onClick={() => {
              const now = new Date();
              const sentAt = date === todayIso() ? now.toISOString() : new Date(`${date}T12:00:00`).toISOString();
              const inbound = dir === "inbound";
              addCommunication({
                channel: ch,
                direction: dir,
                subject: subject.trim(),
                from: inbound ? them : me,
                to: inbound ? [me] : [them],
                cc: [],
                sentAt,
                body: body.trim() || "(No notes)",
                attachments: [],
                contactIds: [contact.id],
                dealId: dealId === ALL ? undefined : dealId,
                durationMin: ch === "email" ? undefined : Math.max(1, Number(duration) || 0),
              });
              toast({ title: `${ch === "call" ? "Call" : ch === "meeting" ? "Meeting" : "Email"} logged`, description: subject.trim() });
              onOpenChange(false);
              // Newly logged items appear at the top; select it on next render.
              setTimeout(() => onLogged(""), 0);
            }}
          >
            Log {ch === "call" ? "call" : ch === "meeting" ? "meeting" : "email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
