import { useState } from "react";
import { Cloud, CloudOff, FileText, FolderOpen, Link2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Input, Label } from "@/components/ui/primitives";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/overlays";
import { useData } from "@/store/DataProvider";
import { fmtBytes, fmtDateTime, fmtRelative } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { useBuildingPage } from "../detail/context";
import { useSearchParams } from "react-router-dom";

/** Simulated SharePoint data room connection. No real integration. */
export function DataRoomPanel() {
  const { bundle } = useBuildingPage();
  const { state, syncDataRoom, connectDataRoom } = useData();
  const toast = useToast();
  const [, setParams] = useSearchParams();
  const [syncing, setSyncing] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const room = bundle.dataRoom;
  const activeDeal = bundle.deals.find((d) => d.deal.status === "active")?.deal;
  const [folder, setFolder] = useState("");
  const connected = room?.status === "connected";

  const sync = () => {
    setSyncing(true);
    setTimeout(() => {
      const { imported } = syncDataRoom(bundle.building.id);
      setSyncing(false);
      toast(imported ? { title: "1 new file imported", description: "Matched to a checklist item and marked Received." } : { title: "Data room is up to date", description: "No new files found.", tone: "info" });
    }, 1100);
  };

  return (
    <div className="rounded-lg border border-border bg-background shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-info-soft text-info">{connected ? <Cloud className="size-4" /> : <CloudOff className="size-4" />}</div>
          <div>
            <div className="text-[13px] font-semibold">Connected data room</div>
            <div className="text-[11px] text-ink-4">SharePoint · simulated</div>
          </div>
        </div>
        {connected ? (
          <Badge tone="success">
            <span className="size-1.5 rounded-full bg-success" /> {syncing ? "Syncing" : "Connected"}
          </Badge>
        ) : (
          <Badge>Not connected</Badge>
        )}
      </div>
      {connected && room ? (
        <div className="p-4">
          <div className="flex items-start gap-2 rounded-md bg-canvas px-3 py-2">
            <FolderOpen className="mt-0.5 size-4 shrink-0 text-ink-4" />
            <div className="min-w-0 text-[12px]">
              <div className="font-medium text-ink">{room.siteName}</div>
              <div className="break-words text-ink-3">{room.folderPath}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className="text-ink-3">Last sync</span>
            <span className="text-ink-2" title={fmtDateTime(room.lastSyncAt)}>
              {fmtRelative(room.lastSyncAt)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[12px]">
            <span className="text-ink-3">Sync status</span>
            <span className="text-ink-2">{syncing ? "Scanning folder…" : "Healthy · auto-sync hourly"}</span>
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} {syncing ? "Syncing…" : "Sync now"}
          </Button>
          <div className="mt-4">
            <div className="text-[11.5px] font-medium text-ink-4">Recently imported</div>
            {room.recentFiles.length === 0 ? (
              <div className="mt-1.5 text-xs text-ink-4">No files imported yet.</div>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {room.recentFiles.slice(0, 5).map((f) => {
                  const req = state.documentRequests.find((d) => d.id === f.matchedRequestId);
                  return (
                    <li key={f.id}>
                      <button className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left hover:bg-canvas" onClick={() => req && setParams({ doc: req.id })}>
                        <FileText className="mt-0.5 size-3.5 shrink-0 text-ink-4" />
                        <div className="min-w-0">
                          <div className="truncate text-[12px] text-ink-2">{f.name}</div>
                          <div className="text-[11px] text-ink-4">
                            {fmtBytes(f.size)} · {fmtRelative(f.importedAt)}
                            {req && <> · → {req.name}</>}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 text-center">
          <p className="text-[12.5px] leading-relaxed text-ink-3">Link a SharePoint folder to automatically import seller uploads and match them to checklist items.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setFolder(`Deals / ${activeDeal?.name ?? "Unassigned"} / ${bundle.building.name.split(" ").slice(0, 2).join(" ")}`);
              setConnectOpen(true);
            }}
          >
            <Link2 /> Connect folder
          </Button>
        </div>
      )}
      <div className="border-t border-border px-4 py-2 text-[11px] text-ink-4">Prototype simulation — no real SharePoint connection.</div>

      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent>
          <DialogHeader icon={<Cloud />} title="Connect SharePoint folder" description="Simulated connection for prototype review." />
          <DialogBody className="space-y-3">
            <div>
              <Label>Site</Label>
              <Input className="mt-1" value="OD Acquisitions" disabled />
            </div>
            <div>
              <Label>Folder path</Label>
              <Input className="mt-1" value={folder} onChange={(e) => setFolder(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!folder.trim()}
              onClick={() => {
                connectDataRoom(bundle.building.id, folder.trim());
                setConnectOpen(false);
                toast({ title: "Folder connected", description: "Simulated SharePoint connection established." });
              }}
            >
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
