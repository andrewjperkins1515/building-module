import { useEffect, useState } from "react";
import { BedDouble, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Dumbbell, DoorOpen, ImagePlus, Images, Sofa, Star, Trash2, TreePine, UtensilsCrossed } from "lucide-react";
import type { Building, BuildingPhoto } from "@/types";
import { useData } from "@/store/DataProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/overlays";
import { EmptyState, Section } from "@/components/shared/layout";
import { FacilityImage } from "@/components/shared/FacilityImage";
import { useToast } from "@/components/ui/toast";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ImagePicker } from "./components";

const SUBJECT_ICON = { entrance: DoorOpen, lobby: Sofa, dining: UtensilsCrossed, therapy: Dumbbell, resident_room: BedDouble, courtyard: TreePine };
const TINTS = ["#e6ebf2", "#e9ece6", "#efe9e2", "#e8e6ef", "#e3ecef", "#ece8e4"];

/** Renders an uploaded photo or a labeled placeholder for seeded photos. */
export function PhotoView({ photo, building, className, large }: { photo: BuildingPhoto; building: Building; className?: string; large?: boolean }) {
  if (photo.dataUrl) return <img src={photo.dataUrl} alt={photo.caption} className={cn("h-full w-full object-cover", className)} />;
  if (!photo.subject || photo.subject === "exterior") return <FacilityImage seed={building.photoSeed} type={building.facilityType} label={large} className={cn("h-full w-full", className)} />;
  const Icon = SUBJECT_ICON[photo.subject];
  const tint = TINTS[(building.photoSeed + photo.caption.length) % TINTS.length];
  return (
    <div className={cn("relative flex h-full w-full flex-col items-center justify-center", className)} style={{ background: tint }}>
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden>
        <path d="M0 60 L25 38 L45 52 L70 28 L100 50 L100 75 L0 75Z" fill="#ffffff" />
      </svg>
      <Icon className={cn("relative text-ink-4", large ? "size-10" : "size-5")} strokeWidth={1.5} />
      {large && <span className="relative mt-2 rounded bg-white/80 px-1.5 py-px text-[10px] font-medium text-ink-3">Placeholder — photo pending</span>}
    </div>
  );
}

/** Building photo gallery: shows 5, expandable, with lightbox, upload, cover and remove. */
export function PhotoCarousel({ building }: { building: Building }) {
  const { addBuildingPhotos, removeBuildingPhoto, setCoverPhoto } = useData();
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const photos = building.photos;
  const shown = expanded ? photos : photos.slice(0, 5);
  const current = index !== null ? photos[index] : undefined;

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length]);

  const upload = (
    <ImagePicker
      multiple
      onPick={(imgs) => {
        addBuildingPhotos(building.id, imgs.map((i) => ({ caption: i.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), dataUrl: i.dataUrl })));
        toast({ title: `${imgs.length} photo${imgs.length === 1 ? "" : "s"} added`, description: "Stored in this browser (downscaled for the prototype)." });
      }}
    >
      {(open) => (
        <Button variant="ghost" size="sm" onClick={open}>
          <ImagePlus /> Add photos
        </Button>
      )}
    </ImagePicker>
  );

  return (
    <Section title="Photos" icon={Images} description={photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"}` : undefined} actions={upload}>
      {photos.length === 0 ? (
        <EmptyState compact icon={Images} title="No photos yet" description="Upload exterior, common area and resident room photos. The first photo becomes the cover image." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {shown.map((p, i) => (
              <button key={p.id} onClick={() => setIndex(i)} className="group relative aspect-[4/3] overflow-hidden rounded-md border border-border text-left">
                <PhotoView photo={p} building={building} className="transition-transform duration-300 group-hover:scale-[1.03]" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-4 text-[11px] font-medium text-white">{p.caption}</span>
                {i === 0 && (
                  <Badge tone="dark" className="absolute left-1.5 top-1.5 text-[10px]">
                    Cover
                  </Badge>
                )}
              </button>
            ))}
          </div>
          {photos.length > 5 && (
            <button onClick={() => setExpanded((e) => !e)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-accent hover:bg-canvas">
              {expanded ? (
                <>
                  <ChevronUp className="size-3.5" /> Show fewer
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" /> Show all {photos.length} photos
                </>
              )}
            </button>
          )}
        </>
      )}

      <Dialog open={!!current} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent className="max-w-4xl">
          {current && index !== null && (
            <>
              <DialogHeader title={current.caption} description={`${index + 1} of ${photos.length} · added by ${current.uploadedBy} ${fmtRelative(current.uploadedAt)}`} />
              <div className="relative aspect-[16/9] bg-subtle">
                <PhotoView photo={current} building={building} large className={current.dataUrl ? "object-contain" : undefined} />
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setIndex((index - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-pop hover:bg-white" aria-label="Previous photo">
                      <ChevronLeft className="size-5" />
                    </button>
                    <button onClick={() => setIndex((index + 1) % photos.length)} className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-pop hover:bg-white" aria-label="Next photo">
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
                <div className="scrollbar-thin flex gap-1.5 overflow-x-auto">
                  {photos.map((p, i) => (
                    <button key={p.id} onClick={() => setIndex(i)} className={cn("h-10 w-14 shrink-0 overflow-hidden rounded border", i === index ? "border-accent ring-1 ring-accent" : "border-border opacity-70 hover:opacity-100")}>
                      <PhotoView photo={p} building={building} />
                    </button>
                  ))}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => {
                      setCoverPhoto(building.id, current.id);
                      setIndex(0);
                      toast({ title: "Cover photo updated" });
                    }}
                  >
                    <Star /> Set as cover
                  </Button>
                  <Button
                    variant="danger-outline"
                    size="sm"
                    onClick={() => {
                      removeBuildingPhoto(building.id, current.id);
                      setIndex(photos.length > 1 ? Math.min(index, photos.length - 2) : null);
                      toast({ title: "Photo removed", tone: "info" });
                    }}
                  >
                    <Trash2 /> Remove
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Section>
  );
}
