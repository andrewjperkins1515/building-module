import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, Database, FileText, Hash, PencilLine, Search, SearchX } from "lucide-react";
import type { FacilityType } from "@/types";
import { cmsRegistry, type CmsRegistryRecord } from "@/data/cmsRegistry";
import { BASELINE_DOCUMENTS } from "@/data/templates";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Badge, Input, Label } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MockDataTag, StarRating } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/layout";
import { useData } from "@/store/DataProvider";
import type { ManualBuildingFields, NewBuildingInput } from "@/store/createBuilding";
import { FACILITY_TYPES, FACILITY_TYPE_LABEL, US_STATES } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Method = "cms_search" | "provider_number" | "manual";

const METHODS: { id: Method; label: string; description: string; icon: typeof Search }[] = [
  { id: "cms_search", label: "Search CMS records", description: "Find by facility name, city or state", icon: Search },
  { id: "provider_number", label: "Enter provider number", description: "Look up a 6-digit CMS CCN", icon: Hash },
  { id: "manual", label: "Create manually", description: "For ALFs or facilities not in CMS", icon: PencilLine },
];

const EMPTY_MANUAL: ManualBuildingFields = {
  name: "",
  facilityType: "assisted_living",
  street: "",
  city: "",
  state: "",
  zip: "",
  county: "",
  certifiedBeds: 0,
  licensedBeds: 0,
  averageDailyCensus: 0,
  yearBuilt: null,
  squareFeet: null,
  providerNumber: "",
  operatorName: "",
};

export function AddBuildingDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const { state, addBuilding } = useData();
  const toast = useToast();
  const [method, setMethod] = useState<Method>("cms_search");
  const [step, setStep] = useState<"find" | "review">("find");
  const [query, setQuery] = useState("");
  const [ccnInput, setCcnInput] = useState("");
  const [ccnResult, setCcnResult] = useState<CmsRegistryRecord | null | "not_found">(null);
  const [selected, setSelected] = useState<CmsRegistryRecord | null>(null);
  const [manual, setManual] = useState<ManualBuildingFields>(EMPTY_MANUAL);
  const [touched, setTouched] = useState(false);

  const existingByCcn = useMemo(() => {
    const m = new Map<string, string>();
    state.buildings.forEach((b) => b.identifiers.filter((i) => i.type === "cms_ccn").forEach((i) => m.set(i.value, b.id)));
    return m;
  }, [state.buildings]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cmsRegistry.slice(0, 5);
    return cmsRegistry.filter((r) => [r.name, r.city, r.state, r.county, r.ccn, r.operatorName].join(" ").toLowerCase().includes(q));
  }, [query]);

  const reset = () => {
    setMethod("cms_search");
    setStep("find");
    setQuery("");
    setCcnInput("");
    setCcnResult(null);
    setSelected(null);
    setManual(EMPTY_MANUAL);
    setTouched(false);
  };

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(reset, 200);
  };

  const lookupCcn = () => {
    const v = ccnInput.trim();
    const existingId = existingByCcn.get(v);
    if (existingId) {
      setCcnResult(null);
      return;
    }
    // Existing seed buildings are also "in the registry" conceptually; for the prototype we look up the mock registry.
    setCcnResult(cmsRegistry.find((r) => r.ccn === v) ?? "not_found");
  };

  const manualErrors = {
    name: !manual.name.trim(),
    city: !manual.city.trim(),
    state: !manual.state,
    beds: !(manual.certifiedBeds > 0),
  };
  const manualValid = !Object.values(manualErrors).some(Boolean);

  const canContinue = method === "manual" ? manualValid : !!selected;

  const confirm = () => {
    const input: NewBuildingInput = method === "manual" ? { method: "manual", fields: { ...manual, licensedBeds: manual.licensedBeds || manual.certifiedBeds } } : { method, record: selected! };
    const id = addBuilding(input);
    toast({ title: "Building created", description: `${method === "manual" ? manual.name : selected!.name} was added to the repository.` });
    close(false);
    onCreated(id);
  };

  const ccnExistingId = existingByCcn.get(ccnInput.trim());
  const existing = (ccn: string) => {
    const id = existingByCcn.get(ccn);
    return id ? state.buildings.find((b) => b.id === id) : undefined;
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl">
        <DialogHeader
          icon={<Building2 />}
          title={step === "find" ? "Add building" : "Review & confirm"}
          description={step === "find" ? "Create a permanent facility record. Buildings can later be linked to any number of deals." : "Confirm the details below. Fields can be edited and verified after creation."}
        />
        {step === "find" ? (
          <DialogBody className="p-0">
            <div className="grid min-h-[420px] md:grid-cols-[220px_1fr]">
              <div className="flex gap-1 border-b border-border bg-canvas/70 p-2 md:flex-col md:border-b-0 md:border-r">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMethod(m.id);
                      setSelected(null);
                    }}
                    className={cn(
                      "flex flex-1 items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors md:flex-none",
                      method === m.id ? "bg-background shadow-xs ring-1 ring-border" : "hover:bg-subtle",
                    )}
                  >
                    <m.icon className={cn("mt-0.5 size-4 shrink-0", method === m.id ? "text-accent" : "text-ink-4")} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ink">{m.label}</span>
                      <span className="hidden text-[11.5px] text-ink-3 md:block">{m.description}</span>
                    </span>
                  </button>
                ))}
                <div className="mt-auto hidden rounded-md border border-warning-line bg-warning-soft/60 p-2.5 text-[11.5px] leading-snug text-ink-2 md:block">
                  <Database className="mb-1 size-3.5 text-warning" />
                  CMS lookups use a <strong>mock registry</strong> of fictional facilities. No live CMS connection.
                </div>
              </div>

              <div className="min-w-0 p-4">
                {method === "cms_search" && (
                  <div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
                      <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. “Fort Wayne”, “Gulf Breeze”, “TN”" className="pl-8" />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-4">
                      <span>{query ? `${searchResults.length} results` : "Suggested facilities"}</span>
                      <MockDataTag label="Mock CMS registry" />
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {searchResults.length === 0 && <EmptyState compact icon={SearchX} title="No CMS records found" description="Try a different name or city, or create the building manually." />}
                      {searchResults.map((r) => {
                        const ex = existing(r.ccn);
                        return (
                          <RegistryResult key={r.ccn} record={r} selected={selected?.ccn === r.ccn} existingName={ex?.name} existingId={ex?.id} onSelect={() => setSelected(r)} onNavigate={() => close(false)} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {method === "provider_number" && (
                  <div>
                    <Label htmlFor="ccn">CMS Certification Number (CCN)</Label>
                    <div className="mt-1.5 flex gap-2">
                      <Input
                        id="ccn"
                        autoFocus
                        value={ccnInput}
                        onChange={(e) => {
                          setCcnInput(e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 6));
                          setCcnResult(null);
                          setSelected(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && ccnInput.length === 6 && lookupCcn()}
                        placeholder="6 characters, e.g. 155921"
                        className="font-mono"
                      />
                      <Button onClick={lookupCcn} disabled={ccnInput.length !== 6}>
                        Look up
                      </Button>
                    </div>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-ink-4">
                      Provider numbers can change after a change of ownership. Owner Docket stores each CCN as a dated identifier on a stable building record. Try{" "}
                      {["155921", "686455", "445612"].map((c, i) => (
                        <button key={c} className="font-mono text-accent hover:underline" onClick={() => { setCcnInput(c); setCcnResult(null); }}>
                          {c}
                          {i < 2 ? ", " : ""}
                        </button>
                      ))}
                      .
                    </p>
                    <div className="mt-4">
                      {ccnExistingId && ccnInput.length === 6 && (
                        <div className="rounded-md border border-info-line bg-info-soft p-3 text-[13px]">
                          This provider number is already linked to{" "}
                          <Link to={`/buildings/${ccnExistingId}`} onClick={() => close(false)} className="font-medium text-accent hover:underline">
                            {state.buildings.find((b) => b.id === ccnExistingId)?.name}
                          </Link>
                          .
                        </div>
                      )}
                      {ccnResult === "not_found" && (
                        <EmptyState
                          compact
                          icon={SearchX}
                          title="No CMS record for this number"
                          description="Check the number, or create the building manually."
                          action={
                            <Button variant="outline" size="sm" onClick={() => { setMethod("manual"); setManual((m) => ({ ...m, providerNumber: ccnInput, facilityType: "skilled_nursing" })); }}>
                              Create manually
                            </Button>
                          }
                        />
                      )}
                      {ccnResult && ccnResult !== "not_found" && (
                        <RegistryResult record={ccnResult} selected={selected?.ccn === ccnResult.ccn} onSelect={() => setSelected(ccnResult)} />
                      )}
                    </div>
                  </div>
                )}

                {method === "manual" && <ManualForm value={manual} onChange={setManual} errors={touched ? manualErrors : undefined} />}
              </div>
            </div>
          </DialogBody>
        ) : (
          <DialogBody>
            <ReviewPanel method={method} record={selected} manual={manual} />
          </DialogBody>
        )}
        <DialogFooter className="justify-between">
          {step === "review" ? (
            <Button variant="ghost" onClick={() => setStep("find")}>
              <ArrowLeft /> Back
            </Button>
          ) : (
            <span className="text-xs text-ink-4">{method !== "manual" && (selected ? `Selected: ${selected.name}` : "Select a facility to continue")}</span>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            {step === "find" ? (
              <Button
                variant="accent"
                onClick={() => {
                  if (method === "manual" && !manualValid) {
                    setTouched(true);
                    return;
                  }
                  setStep("review");
                }}
                disabled={method !== "manual" && !canContinue}
              >
                Review details
              </Button>
            ) : (
              <Button variant="accent" onClick={confirm}>
                <CheckCircle2 /> Create building
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RegistryResult({
  record: r,
  selected,
  onSelect,
  existingName,
  existingId,
  onNavigate,
}: {
  record: CmsRegistryRecord;
  selected: boolean;
  onSelect: () => void;
  existingName?: string;
  existingId?: string;
  onNavigate?: () => void;
}) {
  if (existingId) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2.5 opacity-80">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-ink-2">{r.name}</div>
          <div className="text-[11.5px] text-ink-4">Already in repository as {existingName}</div>
        </div>
        <Link to={`/buildings/${existingId}`} onClick={onNavigate} className="text-xs font-medium text-accent hover:underline">
          Open
        </Link>
      </div>
    );
  }
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
        selected ? "border-accent bg-accent-soft/60 ring-1 ring-accent" : "border-border hover:border-border-strong hover:bg-canvas",
      )}
    >
      <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", selected ? "border-accent bg-accent" : "border-border-strong")}>
        {selected && <span className="size-1.5 rounded-full bg-white" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{r.name}</span>
          <StarRating value={r.ratings.overall} size="xs" />
        </span>
        <span className="mt-0.5 block text-[11.5px] text-ink-3">
          {r.street}, {r.city}, {r.state} {r.zip}
        </span>
        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-ink-4">
          <span className="font-mono">CCN {r.ccn}</span>
          <span>{r.certifiedBeds} beds</span>
          <span>{r.operatorName}</span>
        </span>
      </span>
    </button>
  );
}

function ManualForm({ value: v, onChange, errors }: { value: ManualBuildingFields; onChange: (v: ManualBuildingFields) => void; errors?: Record<string, boolean> }) {
  const set = <K extends keyof ManualBuildingFields>(k: K, val: ManualBuildingFields[K]) => onChange({ ...v, [k]: val });
  const num = (s: string) => (s === "" ? 0 : Math.max(0, Number(s)));
  const err = (k: string) => errors?.[k] && "border-danger/60 focus-visible:border-danger";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      <div className="sm:col-span-4">
        <Label>Facility name *</Label>
        <Input autoFocus className={cn("mt-1", err("name"))} value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Oak Hollow Assisted Living" />
      </div>
      <div className="sm:col-span-2">
        <Label>Facility type</Label>
        <Select value={v.facilityType} onValueChange={(t) => set("facilityType", t as FacilityType)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FACILITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {FACILITY_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-6">
        <Label>Street address</Label>
        <Input className="mt-1" value={v.street} onChange={(e) => set("street", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label>City *</Label>
        <Input className={cn("mt-1", err("city"))} value={v.city} onChange={(e) => set("city", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label>State *</Label>
        <Select value={v.state} onValueChange={(s) => set("state", s)}>
          <SelectTrigger className={cn("mt-1", err("state"))}>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(US_STATES).map(([k, n]) => (
              <SelectItem key={k} value={k}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-1">
        <Label>ZIP</Label>
        <Input className="mt-1" value={v.zip} onChange={(e) => set("zip", e.target.value.slice(0, 10))} />
      </div>
      <div className="sm:col-span-1">
        <Label>County</Label>
        <Input className="mt-1" value={v.county} onChange={(e) => set("county", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label>{v.facilityType === "skilled_nursing" ? "Certified beds *" : "Units / beds *"}</Label>
        <Input type="number" min={0} className={cn("mt-1", err("beds"))} value={v.certifiedBeds || ""} onChange={(e) => set("certifiedBeds", num(e.target.value))} />
      </div>
      <div className="sm:col-span-2">
        <Label>Licensed beds</Label>
        <Input type="number" min={0} className="mt-1" value={v.licensedBeds || ""} onChange={(e) => set("licensedBeds", num(e.target.value))} placeholder="Same as certified" />
      </div>
      <div className="sm:col-span-2">
        <Label>Average daily census</Label>
        <Input type="number" min={0} className="mt-1" value={v.averageDailyCensus || ""} onChange={(e) => set("averageDailyCensus", num(e.target.value))} />
      </div>
      <div className="sm:col-span-2">
        <Label>Year built</Label>
        <Input type="number" className="mt-1" value={v.yearBuilt ?? ""} onChange={(e) => set("yearBuilt", e.target.value ? Number(e.target.value) : null)} />
      </div>
      <div className="sm:col-span-2">
        <Label>Square feet</Label>
        <Input type="number" className="mt-1" value={v.squareFeet ?? ""} onChange={(e) => set("squareFeet", e.target.value ? Number(e.target.value) : null)} />
      </div>
      <div className="sm:col-span-2">
        <Label>CMS provider # (optional)</Label>
        <Input className="mt-1 font-mono" value={v.providerNumber} onChange={(e) => set("providerNumber", e.target.value.slice(0, 6))} />
      </div>
      <div className="sm:col-span-6">
        <Label>Current operator (optional)</Label>
        <Input className="mt-1" value={v.operatorName} onChange={(e) => set("operatorName", e.target.value)} placeholder="Organization name" />
      </div>
      {errors && Object.values(errors).some(Boolean) && <p className="text-xs text-danger sm:col-span-6">Please complete the required fields marked *.</p>}
    </div>
  );
}

function ReviewPanel({ method, record, manual }: { method: Method; record: CmsRegistryRecord | null; manual: ManualBuildingFields }) {
  const fromCms = method !== "manual" && record;
  const rows: [string, string][] = fromCms
    ? [
        ["Facility name", record.name],
        ["Facility type", FACILITY_TYPE_LABEL[record.type]],
        ["Address", `${record.street}, ${record.city}, ${record.state} ${record.zip}`],
        ["County", record.county],
        ["CMS provider # (CCN)", record.ccn],
        ["Certified beds", String(record.certifiedBeds)],
        ["Average daily census", String(record.adc)],
        ["Operator (per CMS)", record.operatorName],
        ["Ownership type", record.ownershipType],
        ["Medicare certification date", fmtDate(record.certificationDate)],
      ]
    : [
        ["Facility name", manual.name],
        ["Facility type", FACILITY_TYPE_LABEL[manual.facilityType]],
        ["Address", [manual.street, manual.city, `${manual.state} ${manual.zip}`].filter((x) => x.trim()).join(", ")],
        ["County", manual.county || "—"],
        ["CMS provider #", manual.providerNumber || "—"],
        ["Certified / licensed beds", `${manual.certifiedBeds} / ${manual.licensedBeds || manual.certifiedBeds}`],
        ["Average daily census", String(manual.averageDailyCensus || "—")],
        ["Year built", manual.yearBuilt ? String(manual.yearBuilt) : "—"],
        ["Square feet", manual.squareFeet ? manual.squareFeet.toLocaleString() : "—"],
        ["Operator", manual.operatorName || "—"],
      ];
  return (
    <div className="grid gap-5 md:grid-cols-[1fr_260px]">
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <span className="text-[13px] font-semibold">Facility details</span>
          {fromCms ? <Badge tone="success">Matched to CMS record (mock)</Badge> : <Badge>Manual entry · unverified</Badge>}
        </div>
        <dl className="divide-y divide-border/70">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[180px_1fr] gap-3 px-3.5 py-2 text-[13px]">
              <dt className="text-ink-3">{k}</dt>
              <dd className="min-w-0 break-words text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="space-y-3">
        {fromCms && (
          <div className="rounded-lg border border-border p-3.5">
            <div className="text-[11.5px] font-medium text-ink-3">CMS ratings (mock)</div>
            <div className="mt-2 space-y-1.5 text-[13px]">
              {[
                ["Overall", record.ratings.overall],
                ["Health inspection", record.ratings.health],
                ["Staffing", record.ratings.staffing],
                ["Quality measures", record.ratings.qm],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-ink-2">{k}</span>
                  <StarRating value={v as number} size="xs" />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-lg border border-border bg-canvas p-3.5">
          <div className="text-[11.5px] font-medium text-ink-3">On creation</div>
          <ul className="mt-2 space-y-2 text-[12.5px] text-ink-2">
            {BASELINE_DOCUMENTS.map((d) => (
              <li key={d.key} className="flex gap-2">
                <FileText className="mt-0.5 size-3.5 shrink-0 text-ink-4" />
                “{d.name}” placeholder added
              </li>
            ))}
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ink-4" />
              Verification set to {fromCms ? "Partially verified" : "Unverified"}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

