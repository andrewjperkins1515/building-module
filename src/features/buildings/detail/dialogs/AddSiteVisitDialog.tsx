import { useRef, useState } from "react";
import { Camera, ClipboardCheck, ImagePlus, Plus, Trash2, X } from "lucide-react";
import type { BuildingSystem, ConditionRating, FollowUpTask, SitePhoto, SiteVisit, SiteVisitObservation } from "@/types";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Input, Label, Separator, Textarea } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/store/DataProvider";
import { ALL_SYSTEMS, CONDITION_LABEL, CONDITION_RATINGS, CURRENT_USER, SITE_VISIT_TYPE_LABEL, SYSTEM_LABEL, TEAM_MEMBERS } from "@/lib/labels";
import { todayIso, uid, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useBuildingPage } from "../context";

const NONE = "__none";

export function AddSiteVisitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { bundle } = useBuildingPage();
  const { addSiteVisit } = useData();
  const toast = useToast();
  const activeDeal = bundle.deals.find((d) => d.deal.status === "active")?.deal;

  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<SiteVisit["type"]>("diligence_inspection");
  const [dealId, setDealId] = useState<string>(activeDeal?.id ?? NONE);
  const [participants, setParticipants] = useState<string[]>([CURRENT_USER.name]);
  const [participantInput, setParticipantInput] = useState("");
  const [summary, setSummary] = useState("");
  const [ratings, setRatings] = useState<Partial<Record<BuildingSystem, ConditionRating>>>({});
  const [observations, setObservations] = useState<SiteVisitObservation[]>([]);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setDate(todayIso());
    setType("diligence_inspection");
    setDealId(activeDeal?.id ?? NONE);
    setParticipants([CURRENT_USER.name]);
    setParticipantInput("");
    setSummary("");
    setRatings({});
    setObservations([]);
    setTasks([]);
    setPhotos([]);
    setError(false);
  };

  const addParticipant = (name: string) => {
    const n = name.trim();
    if (n && !participants.includes(n)) setParticipants([...participants, n]);
    setParticipantInput("");
  };

  const save = () => {
    if (!date || !summary.trim() || participants.length === 0) {
      setError(true);
      return;
    }
    addSiteVisit({
      buildingId: bundle.building.id,
      dealId: dealId === NONE ? undefined : dealId,
      date,
      type,
      participants,
      summary: summary.trim(),
      conditionRatings: ratings,
      observations: observations.filter((o) => o.text.trim()),
      followUps: tasks.filter((t) => t.title.trim()),
      photos,
    });
    toast({ title: "Site visit saved", description: `${observations.filter((o) => o.text.trim()).length} observations and ${tasks.filter((t) => t.title.trim()).length} follow-ups recorded.` });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader icon={<ClipboardCheck />} title="Add site visit" description={bundle.building.name} />
        <DialogBody className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Visit date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Visit type</Label>
              <Select value={type} onValueChange={(t) => setType(t as SiteVisit["type"])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SITE_VISIT_TYPE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Related deal</Label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No deal (building only)</SelectItem>
                  {bundle.deals.map((d) => (
                    <SelectItem key={d.deal.id} value={d.deal.id}>
                      {d.deal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Participants *</Label>
            <div className="mt-1 flex min-h-8 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-1.5 py-1 shadow-xs focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/15">
              {participants.map((p) => (
                <span key={p} className="inline-flex h-6 items-center gap-1 rounded bg-subtle pl-2 pr-1 text-xs text-ink-2">
                  {p}
                  <button onClick={() => setParticipants(participants.filter((x) => x !== p))} className="rounded p-0.5 text-ink-4 hover:text-ink" aria-label={`Remove ${p}`}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addParticipant(participantInput);
                  } else if (e.key === "Backspace" && !participantInput && participants.length) {
                    setParticipants(participants.slice(0, -1));
                  }
                }}
                onBlur={() => participantInput && addParticipant(participantInput)}
                placeholder="Type a name and press Enter"
                className="h-6 min-w-[160px] flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-ink-4"
              />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {TEAM_MEMBERS.filter((m) => !participants.includes(m)).map((m) => (
                <button key={m} onClick={() => addParticipant(m)} className="rounded border border-dashed border-border px-1.5 py-0.5 text-[11.5px] text-ink-3 hover:border-border-strong hover:text-ink">
                  + {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Summary *</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="mt-1" placeholder="Overall impressions, key findings, operator commentary…" />
          </div>

          <Separator />

          <div>
            <div className="text-[13px] font-semibold text-ink">Condition ratings</div>
            <p className="text-xs text-ink-3">Rate the systems you observed. Leave blank if not inspected.</p>
            <div className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {ALL_SYSTEMS.map((sys) => (
                <div key={sys} className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-ink-2">{SYSTEM_LABEL[sys]}</span>
                  <div className="flex gap-1">
                    {CONDITION_RATINGS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRatings((cur) => ({ ...cur, [sys]: cur[sys] === r ? undefined : r }))}
                        className={cn(
                          "h-6 rounded border px-1.5 text-[11px] font-medium transition-colors",
                          ratings[sys] === r
                            ? { good: "border-success bg-success text-white", fair: "border-info bg-info text-white", poor: "border-warning bg-warning text-white", critical: "border-danger bg-danger text-white" }[r]
                            : "border-border text-ink-3 hover:bg-subtle",
                        )}
                      >
                        {CONDITION_LABEL[r]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-ink">Observations</div>
              <Button variant="ghost" size="sm" onClick={() => setObservations([...observations, { id: uid("ob"), text: "", severity: "medium", status: "open" }])}>
                <Plus /> Add observation
              </Button>
            </div>
            {observations.length === 0 && <p className="text-xs text-ink-4">No observations added.</p>}
            <div className="mt-2 space-y-2">
              {observations.map((o, i) => (
                <div key={o.id} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_130px_130px_auto]">
                  <Input autoFocus={i === observations.length - 1} value={o.text} placeholder="What did you observe?" onChange={(e) => setObservations(observations.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)))} className="col-span-2 sm:col-span-1" />
                  <Select value={o.severity} onValueChange={(v) => setObservations(observations.map((x) => (x.id === o.id ? { ...x, severity: v as SiteVisitObservation["severity"] } : x)))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low severity</SelectItem>
                      <SelectItem value="medium">Medium severity</SelectItem>
                      <SelectItem value="high">High severity</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={o.system ?? NONE} onValueChange={(v) => setObservations(observations.map((x) => (x.id === o.id ? { ...x, system: v === NONE ? undefined : (v as BuildingSystem) } : x)))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>General</SelectItem>
                      {ALL_SYSTEMS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SYSTEM_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setObservations(observations.filter((x) => x.id !== o.id))} aria-label="Remove observation">
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-ink">Follow-up tasks</div>
              <Button variant="ghost" size="sm" onClick={() => setTasks([...tasks, { id: uid("fu"), title: "", assignee: CURRENT_USER.name, done: false }])}>
                <Plus /> Add task
              </Button>
            </div>
            {tasks.length === 0 && <p className="text-xs text-ink-4">No follow-up tasks added.</p>}
            <div className="mt-2 space-y-2">
              {tasks.map((t, i) => (
                <div key={t.id} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_160px_140px_auto]">
                  <Input autoFocus={i === tasks.length - 1} value={t.title} placeholder="Task" onChange={(e) => setTasks(tasks.map((x) => (x.id === t.id ? { ...x, title: e.target.value } : x)))} className="col-span-2 sm:col-span-1" />
                  <Select value={t.assignee} onValueChange={(v) => setTasks(tasks.map((x) => (x.id === t.id ? { ...x, assignee: v } : x)))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_MEMBERS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={t.dueDate ?? ""} onChange={(e) => setTasks(tasks.map((x) => (x.id === t.id ? { ...x, dueDate: e.target.value || undefined } : x)))} />
                  <Button variant="ghost" size="icon" onClick={() => setTasks(tasks.filter((x) => x.id !== t.id))} aria-label="Remove task">
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold text-ink">Photos</div>
                <p className="text-xs text-ink-3">File names are recorded; images are shown as placeholders in this prototype.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus /> Attach photos
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPhotos([...photos, ...files.map((f) => ({ id: uid("ph"), caption: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), area: "General", fileName: f.name }))]);
                  e.target.value = "";
                }}
              />
            </div>
            {photos.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {photos.map((p) => (
                  <div key={p.id} className="group relative rounded-md border border-border p-1.5">
                    <div className="flex aspect-[4/3] items-center justify-center rounded bg-subtle">
                      <Camera className="size-5 text-ink-4" />
                    </div>
                    <input
                      value={p.caption}
                      onChange={(e) => setPhotos(photos.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)))}
                      className="mt-1 w-full truncate bg-transparent text-[11.5px] text-ink-2 outline-none"
                    />
                    <button onClick={() => setPhotos(photos.filter((x) => x.id !== p.id))} className="absolute right-2 top-2 rounded bg-white/90 p-0.5 text-ink-3 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100" aria-label="Remove photo">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photos.length === 0 && (
              <button
                onClick={() => setPhotos([...photos, { id: uid("ph"), caption: "Placeholder photo", area: "General" }])}
                className="mt-2 text-xs font-medium text-accent hover:underline"
              >
                Add a placeholder photo without a file
              </button>
            )}
          </div>
        </DialogBody>
        <DialogFooter className="justify-between">
          <span className={cn("text-xs", error ? "text-danger" : "text-ink-4")}>{error ? "Date, at least one participant and a summary are required." : "Saved to this building and its activity timeline."}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={save}>
              Save site visit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
