import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRightLeft, CircleSlash, LayoutDashboard, ListChecks, Pencil, RotateCcw, Trophy } from "lucide-react";
import type { DealStage } from "@/types";
import { useBreadcrumbs } from "@/components/layout/breadcrumbs";
import { useData } from "@/store/DataProvider";
import { Button } from "@/components/ui/button";
import { Badge, Label, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealStageBadge, DealStatusBadge } from "@/components/shared/badges";
import { useToast } from "@/components/ui/toast";
import { NotFound } from "@/pages/NotFound";
import { ASSET_CLASS_LABEL, DEAL_KIND_LABEL, DEAL_STAGES, DEAL_STAGE_LABEL } from "@/lib/labels";
import { todayIso } from "@/lib/utils";
import { DealOverview } from "./DealOverview";
import { ProgressTab } from "./ProgressTab";
import { EditDealSheet } from "./EditDealSheet";
import { progressPct } from "./DealProgress";

export function DealRecord() {
  const { dealId, tab } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { state, updateDeal } = useData();
  const deal = state.deals.find((d) => d.id === dealId);
  const activeTab = tab === "progress" ? "progress" : "overview";
  const [editOpen, setEditOpen] = useState(false);
  const [deadOpen, setDeadOpen] = useState<null | "dead" | "abandoned">(null);
  const [reason, setReason] = useState("");

  useBreadcrumbs(
    deal ? [{ label: "Deals", to: "/deals" }, { label: deal.name, to: `/deals/${deal.id}` }, ...(activeTab === "progress" ? [{ label: "Progress" }] : [])] : [{ label: "Deals", to: "/deals" }, { label: "Not found" }],
  );
  if (!deal) return <NotFound title="Deal not found" description="This deal may have been removed, or the link is incorrect." />;

  const inactive = deal.status === "dead" || deal.status === "abandoned";
  const goTab = (t: string) => navigate(`/deals/${deal.id}${t === "overview" ? "" : `/${t}`}`);
  const moveTo = (stage: DealStage) => {
    if (stage === "closed") {
      updateDeal(deal.id, { stage, status: "closed", actualCloseDate: todayIso() }, `${deal.name} closed`);
      toast({ title: "Deal marked closed", description: "Moves to asset management." });
    } else {
      updateDeal(deal.id, { stage, status: "active", skippedLoi: stage === "psa_signed" && DEAL_STAGES.indexOf(deal.stage) < 1 ? true : deal.skippedLoi }, `${deal.name} moved to ${DEAL_STAGE_LABEL[stage]}`);
      toast({ title: `Moved to ${DEAL_STAGE_LABEL[stage]}` });
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 lg:px-8">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5 shadow-card md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-4">
            <span className="font-mono">{deal.code}</span>
            <span>·</span>
            <span>{deal.type === "portfolio" ? "Portfolio" : "Single asset"}</span>
            <span>·</span>
            <span>Lead {deal.leadName}</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">{deal.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <DealStatusBadge status={deal.status} />
            <DealStageBadge stage={deal.stage} status={deal.status} />
            {deal.dealKind && <Badge tone="outline">{DEAL_KIND_LABEL[deal.dealKind]}</Badge>}
            {deal.assetClass && <Badge tone="outline">{ASSET_CLASS_LABEL[deal.assetClass]}</Badge>}
            {deal.skippedLoi && <Badge tone="outline">Skipped LOI</Badge>}
          </div>
          {deal.summary && <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-3">{deal.summary}</p>}
          {inactive && deal.deadReason && <div className="mt-2 max-w-3xl rounded-md border border-danger-line bg-danger-soft/60 px-3 py-2 text-[12.5px] text-ink-2">{deal.deadReason}</div>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Edit deal
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <ArrowRightLeft /> Change stage
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
              {DEAL_STAGES.map((s) => (
                <DropdownMenuItem key={s} disabled={s === deal.stage && deal.status !== "dead" && deal.status !== "abandoned"} onSelect={() => moveTo(s)}>
                  {s === "closed" ? <Trophy /> : <span className="size-4" />}
                  {DEAL_STAGE_LABEL[s]}
                  {s === deal.stage && <span className="ml-auto text-[11px] text-ink-4">Current</span>}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {inactive || deal.status === "closed" ? (
                <DropdownMenuItem
                  onSelect={() => {
                    updateDeal(deal.id, { status: "active", deadReason: undefined, actualCloseDate: undefined, stage: deal.stage === "closed" ? "psa_signed" : deal.stage }, `${deal.name} reopened`);
                    toast({ title: "Deal reopened" });
                  }}
                >
                  <RotateCcw /> Reopen deal
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem className="text-danger data-[highlighted]:text-danger" onSelect={() => { setReason(""); setDeadOpen("dead"); }}>
                    <CircleSlash /> Mark dead
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { setReason(""); setDeadOpen("abandoned"); }}>
                    <CircleSlash /> Mark abandoned
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={goTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="size-3.5 opacity-70" /> Overview
          </TabsTrigger>
          <TabsTrigger value="progress">
            <ListChecks className="size-3.5 opacity-70" /> Progress
            {(deal.progress?.length ?? 0) > 0 && <span className="tabular ml-0.5 rounded-full bg-subtle px-1.5 text-[10.5px] font-medium text-ink-3">{progressPct(deal)}%</span>}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-5">{activeTab === "progress" ? <ProgressTab deal={deal} /> : <DealOverview deal={deal} onEdit={() => setEditOpen(true)} onProgress={() => goTab("progress")} />}</div>

      <EditDealSheet deal={deal} open={editOpen} onOpenChange={setEditOpen} />
      <Dialog open={!!deadOpen} onOpenChange={(o) => !o && setDeadOpen(null)}>
        <DialogContent>
          <DialogHeader icon={<CircleSlash />} title={`Mark deal ${deadOpen}`} description="The deal keeps its stage and history; you can reopen it later." />
          <DialogBody>
            <Label>Reason</Label>
            <Textarea autoFocus className="mt-1" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Seller would not address roof capex; pricing gap too wide." />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeadOpen(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!reason.trim()}
              onClick={() => {
                updateDeal(deal.id, { status: deadOpen!, deadReason: reason.trim() }, `${deal.name} marked ${deadOpen}`);
                toast({ title: `Deal marked ${deadOpen}`, tone: "info" });
                setDeadOpen(null);
              }}
            >
              Mark {deadOpen}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
