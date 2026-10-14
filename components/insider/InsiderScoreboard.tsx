"use client";

import { Crown, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InsiderMatch } from "@/types/game";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

/** Public match standings. `gains` (this round's points) shows as +N next to each name once a round ends. */
export function InsiderScoreboard({
  match,
  gains,
  selfId,
  final = false,
}: {
  match: InsiderMatch;
  gains?: Record<string, number> | null;
  selfId?: string;
  final?: boolean;
}) {
  const { t } = useTranslation();
  const rows = [...match.scores].sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname));
  const top = rows[0]?.points ?? 0;

  return (
    <Card className={cn(final && "border-amber-300/60 shadow-[0_0_40px_-12px_rgba(252,211,77,0.6)]")}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-300" />
          {final ? t("insider.match.finalTitle") : t("insider.match.title")}
        </CardTitle>
        <span className="rounded-full bg-night-900/70 px-2.5 py-0.5 text-xs text-moon-300">
          {t("insider.match.roundOf", { round: match.round, total: match.totalRounds })}
        </span>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1.5">
          {rows.map((r, i) => {
            const rank = rows.findIndex((x) => x.points === r.points) + 1; // ties share a rank
            const gain = gains?.[r.id] ?? 0;
            const leader = r.points === top && top > 0;
            return (
              <li
                key={r.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2",
                  leader ? "bg-amber-300/10 border border-amber-300/40" : "bg-night-900/50",
                  r.id === selfId && "ring-1 ring-sky-400/60"
                )}
              >
                <span className="w-5 text-center font-display text-moon-400">{rank}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-moon-200">
                  {r.nickname}
                  {r.id === selfId && <span className="text-moon-400 text-xs"> ({t("common.you")})</span>}
                </span>
                {leader && <Crown className="h-4 w-4 text-amber-300" />}
                {gains && (
                  <span className={cn("w-8 text-right text-xs font-bold", gain > 0 ? "text-emerald-400" : "text-moon-400/40")}>
                    {gain > 0 ? `+${gain}` : "·"}
                  </span>
                )}
                <span className="w-16 text-right font-display text-moon-100 tabular-nums">{t("insider.match.pts", { count: r.points })}</span>
              </li>
            );
          })}
        </ol>
        {/* Round-by-round breakdown, so everyone can check the arithmetic. */}
        {match.history.length > 0 && (
          <details className="mt-3 text-xs text-moon-400">
            <summary className="cursor-pointer select-none">{t("insider.match.history")}</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr>
                    <th className="px-1 py-1 text-left font-normal" />
                    {match.history.map((h) => (
                      <th key={h.round} className="px-1 py-1 font-normal">
                        {h.round}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-wolf-purple/10">
                      <td className="max-w-[90px] truncate px-1 py-1 text-left text-moon-300">{r.nickname}</td>
                      {match.history.map((h) => (
                        <td key={h.round} className={cn("px-1 py-1", h.gains[r.id] ? "text-emerald-400" : "text-moon-400/40")}>
                          {h.gains[r.id] ? `+${h.gains[r.id]}` : "·"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

/** Names tied for the most points once the match is over. */
export function matchWinners(match: InsiderMatch) {
  const top = Math.max(0, ...match.scores.map((s) => s.points));
  return match.scores.filter((s) => s.points === top);
}
