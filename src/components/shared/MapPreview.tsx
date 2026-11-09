import { MapPin } from "lucide-react";
import { cn, seeded } from "@/lib/utils";

/** Non-interactive, schematic location preview. No map API is used. */
export function MapPreview({ x, y, seed, className, label }: { x: number; y: number; seed: number; className?: string; label?: string }) {
  const r = seeded(seed * 17 + 3);
  const roads = Array.from({ length: 5 }, () => 20 + r() * 360);
  const hroads = Array.from({ length: 4 }, () => 15 + r() * 150);
  const blocks = Array.from({ length: 14 }, () => ({ x: r() * 380, y: r() * 170, w: 14 + r() * 30, h: 10 + r() * 22 }));
  const px = 40 + x * 320;
  const py = 30 + y * 120;
  return (
    <div className={cn("relative overflow-hidden rounded-md border border-border bg-[#eef1ed]", className)}>
      <svg viewBox="0 0 400 190" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        <rect width="400" height="190" fill="#eef1ec" />
        <path d={`M0 ${120 + r() * 30} C 90 ${100 + r() * 40}, 200 ${150 + r() * 30}, 400 ${110 + r() * 40} L400 190 L0 190Z`} fill="#dbe7ee" opacity="0.8" />
        <rect x={20 + r() * 200} y={20 + r() * 40} width="70" height="40" rx="6" fill="#dfe9d9" />
        {blocks.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="1.5" fill="#e3e5e8" />
        ))}
        {roads.map((rx, i) => (
          <line key={`v${i}`} x1={rx} y1="0" x2={rx + (r() - 0.5) * 60} y2="190" stroke="#ffffff" strokeWidth={i === 1 ? 6 : 3.5} />
        ))}
        {hroads.map((ry, i) => (
          <line key={`h${i}`} x1="0" y1={ry} x2="400" y2={ry + (r() - 0.5) * 40} stroke="#ffffff" strokeWidth={i === 0 ? 6 : 3.5} />
        ))}
        <circle cx={px} cy={py} r="22" fill="#2c4c9c" opacity="0.08" />
        <circle cx={px} cy={py} r="10" fill="#2c4c9c" opacity="0.12" />
      </svg>
      <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${(px / 400) * 100}%`, top: `${(py / 190) * 100}%` }}>
        <MapPin className="size-6 fill-accent text-white drop-shadow" strokeWidth={1.5} />
      </div>
      <span className="absolute left-2 top-2 rounded bg-white/85 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-ink-3">
        {label ?? "Schematic map — placeholder"}
      </span>
    </div>
  );
}
