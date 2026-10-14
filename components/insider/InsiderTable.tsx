"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SeatToken, type CampSeat } from "@/components/table/CampfireCircle";

// Insider is played around a table: a round green-felt table with everyone
// seated on the rim and the sand timer in the middle. Same seat tokens and
// "you sit at the bottom" layout as the campfire, different room.

export function InsiderTable({
  seats,
  onSeatClick,
  center,
}: {
  seats: CampSeat[];
  onSeatClick?: (id: string) => void;
  center?: ReactNode;
}) {
  const selfIdx = Math.max(0, seats.findIndex((s) => s.isSelf));
  const ordered = [...seats.slice(selfIdx), ...seats.slice(0, selfIdx)];
  const n = ordered.length;
  const small = n > 9; // shrink tokens so 10–12 seats don't overlap on a phone

  return (
    <div className="relative mb-12 w-full aspect-square sm:aspect-[16/10]">
      {/* Room: dark wood floor with a lamp pool of light over the table */}
      <div
        className="absolute inset-0 overflow-hidden rounded-2xl border-4 border-[#2b1d12] shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(255,214,140,0.18) 0%, transparent 60%), repeating-linear-gradient(90deg, #2a1c12 0px, #2a1c12 46px, #24170f 46px, #24170f 48px), #24170f",
        }}
      >
        {/* Table: wooden rim around green felt */}
        <div
          className="absolute left-1/2 top-1/2 h-[64%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
          style={{ background: "linear-gradient(160deg, #8a5a33, #5a3820 60%, #3f2715)" }}
        >
          <div
            className="absolute inset-[5%] rounded-[50%] shadow-[inset_0_6px_24px_rgba(0,0,0,0.55)]"
            style={{ background: "radial-gradient(ellipse at 50% 40%, #2f7a55 0%, #1f5a3d 60%, #163f2b 100%)" }}
          />
        </div>
      </div>

      {center && <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">{center}</div>}

      {ordered.map((s, i) => {
        const angle = Math.PI / 2 + (i * 2 * Math.PI) / n; // start at the bottom, go clockwise
        const x = 50 + 41 * Math.cos(angle);
        const y = 50 + 36 * Math.sin(angle);
        return (
          <div key={s.id} className="absolute z-20 -translate-x-1/2" style={{ left: `${x}%`, top: `${y}%`, marginTop: small ? -24 : -28 }}>
            <SeatToken seat={s} small={small} onClick={onSeatClick ? () => onSeatClick(s.id) : undefined} />
          </div>
        );
      })}
    </div>
  );
}

/** Sand timer that drains with the server deadline. Shows the time left underneath. */
export function Hourglass({ endsAt, total }: { endsAt: number | null; total: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [endsAt]);

  const left = endsAt ? Math.max(0, endsAt - now) : 0;
  const frac = endsAt && total > 0 ? Math.min(1, left / (total * 1000)) : 0;
  const secs = Math.ceil(left / 1000);
  const urgent = endsAt !== null && secs <= 10;

  // Top bulb holds `frac` of the sand, bottom holds the rest.
  const topH = 34 * frac;
  const botH = 34 * (1 - frac);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 60 90" className="h-20 w-14 sm:h-24 sm:w-16 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" aria-hidden>
        <defs>
          <clipPath id="ins-top">
            <path d="M12 8 H48 C48 26 34 36 31 44 H29 C26 36 12 26 12 8 Z" />
          </clipPath>
          <clipPath id="ins-bot">
            <path d="M29 46 H31 C34 54 48 64 48 82 H12 C12 64 26 54 29 46 Z" />
          </clipPath>
        </defs>
        <rect x="6" y="2" width="48" height="6" rx="2" fill="#6b4426" />
        <rect x="6" y="82" width="48" height="6" rx="2" fill="#6b4426" />
        <path d="M12 8 H48 C48 26 34 36 31 45 C34 54 48 64 48 82 H12 C12 64 26 54 29 45 C26 36 12 26 12 8 Z" fill="rgba(220,235,255,0.18)" stroke="rgba(220,235,255,0.55)" strokeWidth="1.5" />
        <rect x="10" y={44 - topH} width="40" height={topH} fill="#e8c46a" clipPath="url(#ins-top)" />
        <rect x="10" y={82 - botH} width="40" height={botH} fill="#e8c46a" clipPath="url(#ins-bot)" />
        {frac > 0 && frac < 1 && <rect x="29.4" y="44" width="1.2" height={38 - botH} fill="#e8c46a" />}
      </svg>
      {endsAt && (
        <span className={`mt-1 rounded-full bg-black/60 px-2 py-0.5 font-display text-sm tabular-nums ${urgent ? "text-crimson-400 animate-pulse" : "text-[#f3e7c9]"}`}>
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}
