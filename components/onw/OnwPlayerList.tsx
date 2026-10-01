"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { OnwPlayer } from "@/types/game";
import { Crown, Skull, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function OnwPlayerList({
  players,
  selectable = false,
  selectedId,
  selectedIds,
  onSelect,
  disabledIds = [],
}: {
  players: OnwPlayer[];
  selectable?: boolean;
  selectedId?: string | null;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  disabledIds?: string[];
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {players.map((p) => {
        const isDisabled = disabledIds.includes(p.id);
        const isSelected = selectedId === p.id || selectedIds?.includes(p.id);
        return (
          <button
            key={p.id}
            disabled={!selectable || isDisabled}
            onClick={() => onSelect?.(p.id)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
              "border-wolf-purple/20 bg-night-900/60",
              p.dead && "opacity-40",
              selectable && !isDisabled && "hover:border-crimson-500 hover:bg-night-700 cursor-pointer",
              isSelected && "border-crimson-500 bg-crimson-600/20 ring-1 ring-crimson-500",
              (!selectable || isDisabled) && "cursor-default"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="truncate text-sm font-medium text-moon-200 flex items-center gap-1">
                {p.nickname}
                {p.isSelf && <span className="text-moon-400 text-xs">({t("common.you")})</span>}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {p.isHost && <Crown className="w-3 h-3 text-yellow-400" />}
                {p.dead && <Skull className="w-3 h-3 text-crimson-500" />}
                {p.connected ? (
                  <Wifi className="w-3 h-3 text-emerald-500/70" />
                ) : (
                  <WifiOff className="w-3 h-3 text-moon-400/70" />
                )}
              </span>
            </div>
            {p.role && (
              <Badge variant={p.role === "WEREWOLF" ? "werewolf" : "villager"}>{t(`onw.roles.${p.role}.label`)}</Badge>
            )}
            {p.role && p.startingRole && p.startingRole !== p.role && (
              <span className="text-[10px] text-moon-400/70">
                {t("onw.gameOver.startedAs", { role: t(`onw.roles.${p.startingRole}.label`) })}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
