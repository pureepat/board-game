"use client";

import type { ReactNode } from "react";
import { Crown, Skull, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// A clearing at night (or late afternoon) with everyone seated on log stumps
// around a campfire. Purely presentational: callers map their own player
// shape onto CampSeat and decide what's selectable. You are always seated
// at the bottom, nearest the screen, like sitting at a real circle.

export interface CampSeat {
  id: string;
  nickname: string;
  isSelf?: boolean;
  isHost?: boolean;
  connected?: boolean;
  dead?: boolean;
  badge?: { label: string; hex: string } | null;
  note?: string | null;
  selectable?: boolean;
  selected?: boolean;
}

const PORTRAIT_COLORS = ["#8e5c3a", "#4f6d7a", "#7a5c8e", "#5c7a4f", "#8e4f4f", "#4f5c8e", "#8e7a4f", "#3f7a72"];
function portraitColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PORTRAIT_COLORS[h % PORTRAIT_COLORS.length];
}

const SKY = {
  night: {
    background:
      "radial-gradient(1px 1px at 12% 18%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 28% 8%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 44% 14%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 63% 6%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 72% 20%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 88% 11%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 6% 30%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 94% 28%, #fff 50%, transparent 51%), linear-gradient(180deg, #050714 0%, #0d1530 45%, #121a2b 100%)",
  },
  day: {
    background: "linear-gradient(180deg, #f6c177 0%, #d98c5f 30%, #6b4a6e 70%, #2c2440 100%)",
  },
};

export function CampfireCircle({
  seats,
  time = "night",
  onSeatClick,
  center,
}: {
  seats: CampSeat[];
  time?: "night" | "day";
  onSeatClick?: (id: string) => void;
  center?: ReactNode;
}) {
  // Rotate so you sit at the bottom, then go clockwise around the fire.
  const selfIdx = Math.max(0, seats.findIndex((s) => s.isSelf));
  const ordered = [...seats.slice(selfIdx), ...seats.slice(0, selfIdx)];
  const n = ordered.length;
  const small = n > 9;

  // Two layers in one sized box: the scenery is clipped to the rounded frame,
  // the seats are not, so name tags and badges may hang over the bottom edge.
  return (
    <div className="relative mb-12 w-full aspect-square sm:aspect-[16/10]">
      <div
        className="absolute inset-0 overflow-hidden rounded-2xl border-4 border-[#2b1d12] shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]"
        style={SKY[time]}
      >
        {/* Moon or low sun */}
        {time === "night" ? (
          <div className="absolute right-[8%] top-[6%] h-10 w-10 rounded-full bg-[#f3eed8] shadow-[0_0_30px_8px_rgba(243,238,216,0.35)]" />
        ) : (
          <div className="absolute left-[10%] top-[10%] h-12 w-12 rounded-full bg-[#ffd27a] shadow-[0_0_40px_14px_rgba(255,190,90,0.45)]" />
        )}

        {/* Tree line */}
        <svg className="absolute inset-x-0 top-[22%] h-[18%] w-full" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 20 L0 12 L4 6 L8 12 L11 4 L15 12 L19 7 L23 13 L27 3 L31 12 L35 8 L39 13 L43 5 L47 12 L51 7 L55 13 L59 4 L63 12 L67 8 L71 13 L75 3 L79 12 L83 7 L87 13 L91 5 L95 12 L100 8 L100 20 Z"
            fill={time === "night" ? "#070b14" : "#2a2036"}
          />
        </svg>

        {/* The clearing */}
        <div
          className="absolute left-1/2 top-[60%] h-[80%] w-[108%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          style={{
            background:
              time === "night"
                ? "radial-gradient(ellipse at center, #3b2a1a 0%, #24301e 45%, #141c12 75%, transparent 100%)"
                : "radial-gradient(ellipse at center, #6b5233 0%, #4f5a32 45%, #36402a 75%, transparent 100%)",
          }}
        />
        {/* Firelight */}
        <div
          className="pointer-events-none absolute left-1/2 top-[56%] h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full animate-firelight"
          style={{ background: "radial-gradient(circle, rgba(255,150,50,0.35) 0%, rgba(255,120,40,0.12) 40%, transparent 70%)" }}
        />

        <Campfire />
      </div>

      {center && <div className="absolute left-1/2 top-[56%] mt-[8%] -translate-x-1/2 z-10">{center}</div>}

      {ordered.map((s, i) => {
        const angle = Math.PI / 2 + (i * 2 * Math.PI) / n; // start at the bottom, go clockwise
        const x = 50 + 40 * Math.cos(angle);
        const y = 57 + 33 * Math.sin(angle);
        // Anchor on the portrait's center, not the whole token, so labels hang below it.
        return (
          <div key={s.id} className="absolute z-20 -translate-x-1/2" style={{ left: `${x}%`, top: `${y}%`, marginTop: small ? -24 : -28 }}>
            <SeatToken seat={s} small={small} onClick={onSeatClick ? () => onSeatClick(s.id) : undefined} />
          </div>
        );
      })}
    </div>
  );
}

function SeatToken({ seat, small, onClick }: { seat: CampSeat; small: boolean; onClick?: () => void }) {
  const clickable = Boolean(seat.selectable && onClick);
  const size = small ? "h-10 w-10 sm:h-12 sm:w-12 text-base" : "h-12 w-12 sm:h-14 sm:w-14 text-lg";

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={cn("group flex flex-col items-center gap-0.5 transition-transform", clickable ? "cursor-pointer hover:-translate-y-1" : "cursor-default")}
    >
      <span className="relative">
        {/* log stump */}
        <span className="absolute inset-x-[-6px] bottom-[-6px] h-3 rounded-[50%] bg-[#4a2d18] shadow-[0_3px_6px_rgba(0,0,0,0.6)]" />
        <span
          className={cn(
            "relative flex items-center justify-center rounded-full border-[3px] font-display text-[#f3e7c9] shadow-[0_0_14px_rgba(255,140,40,0.25)]",
            size,
            seat.selected ? "border-crimson-500 ring-4 ring-crimson-500/50" : clickable ? "border-[#ffd166] ring-2 ring-[#ffd166]/40" : "border-[#8a6d3b]",
            seat.isSelf && !seat.selected && "border-sky-300",
            seat.dead && "grayscale opacity-60",
            seat.connected === false && "opacity-50"
          )}
          style={{ background: portraitColor(seat.nickname) }}
        >
          {seat.nickname.slice(0, 1).toUpperCase()}
          {seat.dead && <Skull className="absolute h-1/2 w-1/2 text-white/90" />}
        </span>
        {seat.isHost && <Crown className="absolute -top-2 -right-1 h-4 w-4 text-yellow-400 drop-shadow" />}
        {seat.connected === false && <WifiOff className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-moon-200" />}
      </span>
      <span
        className={cn(
          "mt-1 max-w-[84px] truncate rounded-full bg-black/60 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-[#f3e7c9]",
          seat.isSelf && "bg-sky-900/80",
          seat.dead && "line-through opacity-70"
        )}
      >
        {seat.nickname}
      </span>
      {seat.badge && (
        <span className="rounded px-1.5 py-px text-[9px] sm:text-[10px] font-bold text-white" style={{ background: seat.badge.hex }}>
          {seat.badge.label}
        </span>
      )}
      {seat.note && <span className="rounded bg-crimson-600 px-1.5 py-px text-[9px] sm:text-[10px] font-bold text-white">{seat.note}</span>}
    </button>
  );
}

function Campfire() {
  return (
    <svg
      className="absolute left-1/2 top-[56%] z-10 w-[16%] max-w-[110px] -translate-x-1/2 -translate-y-[62%]"
      viewBox="0 0 100 100"
      aria-hidden
    >
      {/* stones */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return <ellipse key={i} cx={50 + 34 * Math.cos(a)} cy={80 + 9 * Math.sin(a)} rx="7" ry="4.5" fill="#6d6a66" stroke="#3a3836" strokeWidth="1" />;
      })}
      {/* logs */}
      <rect x="22" y="72" width="56" height="9" rx="4.5" fill="#5a3a20" transform="rotate(-14 50 76)" />
      <rect x="22" y="72" width="56" height="9" rx="4.5" fill="#6b4426" transform="rotate(14 50 76)" />
      {/* flames */}
      <g className="origin-[50px_78px] animate-flicker">
        <path d="M50 18 C62 36 72 48 66 64 C62 76 38 76 34 64 C28 48 40 36 50 18 Z" fill="#ff7a1a" />
        <path d="M50 34 C58 46 63 54 59 66 C56 74 44 74 41 66 C37 54 43 46 50 34 Z" fill="#ffb02e" />
        <path d="M50 48 C55 56 57 61 54 68 C52 72 48 72 46 68 C43 61 46 56 50 48 Z" fill="#fff1a8" />
      </g>
    </svg>
  );
}
