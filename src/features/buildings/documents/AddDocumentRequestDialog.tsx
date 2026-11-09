import { useEffect, useState } from "react";
import { FilePlus2 } from "lucide-react";
import type { DocumentCategory, DocumentStatus } from "@/types";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Input, Label, Switch, Textarea } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/store/DataProvider";
import { DOC_CATEGORIES, DOC_CATEGORY_LABEL, TEAM_MEMBERS } from "@/lib/labels";
import { useToast } from "@/components/ui/toast";
import { offsetDate } from "@/lib/utils";
import { useBuildingPage } from "../detail/context";

const NONE = "__none";

export function AddDocumentRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { bundle } = useBuildingPage();
  const { state, addDocumentRequest } = useData();
  const toast = useToast();
  const activeDeal = bundle.deals.find((d) => d.deal.status === "active")?.deal;
  const operator = bundle.ownership.operator?.name ?? "";

  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("financial");
  const [dealId, setDealId] = useState(activeDeal?.id ?? NONE);
  const [requestedFrom, setRequestedFrom] = useState(operator);
  const [reviewer, setReviewer] = useState(TEAM_MEMBERS[1]);
  const [due, setDue] = useState(offsetDate(14));
  const [required, setRequired] = useState(true);
  const [sendNow, setSendNow] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setCategory("financial");
      setDealId(activeDeal?.id ?? NONE);
      setRequestedFrom(operator);
      setReviewer(TEAM_MEMBERS[1]);
      setDue(offsetDate(14));
      setRequired(true);
      setSendNow(true);
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const suggestions = [...new Set([operator, bundle.ownership.owner?.name, "Clearline Property Assessments", "Whitaker & Lowe LLP", ...state.organizations.filter((o) => o.type === "broker").map((o) => o.name)].filter(Boolean) as string[])];

  const submit = () => {
    const status: DocumentStatus = sendNow ? "requested" : "not_requested";
    addDocumentRequest({
      buildingId: bundle.building.id,
      dealId: dealId === NONE ? undefined : dealId,
      name: name.trim(),
      category,
      required,
      isBaseline: false,
      requestedFrom: requestedFrom.trim() || undefined,
      reviewer,
      dueDate: due || undefined,
      status,
      notes: notes.trim() || undefined,
    });
    toast({ title: sendNow ? "Document requested" : "Added to checklist", description: name.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader icon={<FilePlus2 />} title="Add document request" description={`Track a diligence item for ${bundle.building.name}.`} />
        <DialogBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Document name *</Label>
            <Input autoFocus className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Workers' compensation loss runs" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {DOC_CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Associated deal</Label>
            <Select value={dealId} onValueChange={setDealId}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Building record only</SelectItem>
                {bundle.deals.map((d) => (
                  <SelectItem key={d.deal.id} value={d.deal.id}>
                    {d.deal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Requested from</Label>
            <Input className="mt-1" list="req-from" value={requestedFrom} onChange={(e) => setRequestedFrom(e.target.value)} />
            <datalist id="req-from">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Assigned reviewer</Label>
            <Select value={reviewer} onValueChange={setReviewer}>
              <SelectTrigger className="mt-1">
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
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" className="mt-1" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center justify-between gap-2 text-[13px] text-ink-2">
              Required for completion <Switch checked={required} onCheckedChange={setRequired} />
            </label>
            <label className="flex items-center justify-between gap-2 text-[13px] text-ink-2">
              Mark as requested now <Switch checked={sendNow} onCheckedChange={setSendNow} />
            </label>
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Specific periods, format requirements…" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="accent" disabled={!name.trim()} onClick={submit}>
            {sendNow ? "Create request" : "Add to checklist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
