"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/** Countdown driven by the server's absolute deadline, not a locally-started clock — stays correct through reconnects/refreshes. */
export function PhaseTimer({ endsAt, className }: { endsAt: number | null | undefined; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const remainingMs = endsAt - now;
  const remaining = Math.max(0, Math.round(remainingMs / 1000));
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const urgent = remaining <= 10;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-display text-lg tabular-nums",
        urgent ? "text-crimson-500 animate-pulse" : "text-moon-200",
        className
      )}
    >
      <Clock className="w-4 h-4" />
      {mm}:{String(ss).padStart(2, "0")}
    </span>
  );
}
