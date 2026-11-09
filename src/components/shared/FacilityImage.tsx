import { useMemo } from "react";
import type { FacilityType } from "@/types";
import { seeded, cn } from "@/lib/utils";

/**
 * Generated architectural illustration used in place of facility photography.
 * Deterministic per `seed` so each building has a consistent visual identity.
 */
export function FacilityImage({ seed, type, className, label = true }: { seed: number; type: FacilityType; className?: string; label?: boolean }) {
  const p = useMemo(() => {
    const r = seeded(seed * 9301 + 49297);
    const skies = [
      ["#dfe8f3", "#f4f7fb"],
      ["#e4e9f0", "#f6f7f9"],
      ["#e2ebef", "#f5f8f9"],
      ["#e8e6ef", "#f7f6fa"],
    ];
    const facades = ["#c9b8a3", "#d4cbbd", "#b9a48f", "#cfc6ba", "#bfb3a6", "#d9d2c6"];
    const roofs = ["#5b6472", "#4d5563", "#6b5e55", "#55606e"];
    return {
      sky: skies[Math.floor(r() * skies.length)],
      facade: facades[Math.floor(r() * facades.length)],
      roof: roofs[Math.floor(r() * roofs.length)],
      stories: type === "assisted_living" ? 3 : r() > 0.5 ? 2 : 1,
      wings: 2 + Math.floor(r() * 2),
      treeX: [60 + r() * 30, 330 + r() * 40, 210 + r() * 20],
      entryX: 150 + r() * 80,
    };
  }, [seed, type]);

  const baseY = 150;
  const floorH = 22;
  const h = p.stories * floorH;
  const winRows = Array.from({ length: p.stories }, (_, i) => baseY - h + 7 + i * floorH);

  return (
    <div className={cn("relative overflow-hidden bg-subtle", className)}>
      <svg viewBox="0 36 400 154" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`sky${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sky[0]} />
            <stop offset="1" stopColor={p.sky[1]} />
          </linearGradient>
        </defs>
        <rect width="400" height="190" fill={`url(#sky${seed})`} />
        {/* distant trees */}
        <path d="M0 150 Q 40 128 80 140 T 160 136 T 240 140 T 320 132 T 400 142 V150 H0Z" fill="#cfd8d0" opacity="0.7" />
        {/* lawn */}
        <rect y="150" width="400" height="40" fill="#dfe5dc" />
        <rect y="160" width="400" height="9" fill="#e9ebee" />
        {/* main building */}
        <rect x="40" y={baseY - h} width="320" height={h} fill={p.facade} />
        <rect x="40" y={baseY - h - 6} width="320" height="6" fill={p.roof} />
        {/* wings */}
        {p.wings > 2 && <rect x="150" y={baseY - h - 14} width="100" height={h + 14} fill={p.facade} stroke="#00000010" />}
        {p.wings > 2 && <polygon points={`145,${baseY - h - 14} 200,${baseY - h - 30} 255,${baseY - h - 14}`} fill={p.roof} />}
        {/* windows */}
        {winRows.map((y, ri) =>
          Array.from({ length: 16 }, (_, i) => {
            const x = 50 + i * 19.5;
            if (Math.abs(x + 5 - p.entryX) < 18 && ri === p.stories - 1) return null;
            return <rect key={`${ri}-${i}`} x={x} y={y} width="9" height="11" rx="1" fill="#eef3f8" stroke="#6b778a" strokeOpacity="0.35" />;
          }),
        )}
        {/* entry canopy */}
        <rect x={p.entryX - 22} y={baseY - 20} width="44" height="4" fill={p.roof} />
        <rect x={p.entryX - 10} y={baseY - 16} width="20" height="16" fill="#8d99a8" opacity="0.65" />
        <rect x={p.entryX - 20} y={baseY - 16} width="2" height="16" fill={p.roof} />
        <rect x={p.entryX + 18} y={baseY - 16} width="2" height="16" fill={p.roof} />
        {/* trees */}
        {p.treeX.map((x, i) => (
          <g key={i}>
            <rect x={x - 1.5} y={baseY - 4} width="3" height="14" fill="#7a6a58" />
            <circle cx={x} cy={baseY - 12} r={i === 2 ? 9 : 13} fill="#9db29a" />
            <circle cx={x + 6} cy={baseY - 8} r={i === 2 ? 6 : 9} fill="#8aa487" />
          </g>
        ))}
      </svg>
      {label && (
        <span className="absolute bottom-1.5 left-1.5 rounded bg-white/80 px-1.5 py-px text-[10px] font-medium text-ink-3 backdrop-blur-sm">
          Illustration — photo pending
        </span>
      )}
    </div>
  );
}
