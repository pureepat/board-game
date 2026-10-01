"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { PublicPlayer } from "@/types/game";
import { Crown, Skull, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function PlayerList({
  players,
  selectable = false,
  selectedId,
  onSelect,
  disabledIds = [],
}: {
  players: PublicPlayer[];
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  disabledIds?: string[];
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {players.map((p) => {
        const isDisabled = !p.alive || disabledIds.includes(p.id);
        const isSelected = selectedId === p.id;
        return (
          <button
            key={p.id}
            disabled={!selectable || isDisabled}
            onClick={() => onSelect?.(p.id)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
              "border-wolf-purple/20 bg-night-900/60",
              !p.alive && "opacity-40",
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
                {!p.alive && <Skull className="w-3 h-3 text-crimson-500" />}
                {p.connected ? (
                  <Wifi className="w-3 h-3 text-emerald-500/70" />
                ) : (
                  <WifiOff className="w-3 h-3 text-moon-400/70" />
                )}
              </span>
            </div>
            {p.role && (
              <Badge variant={p.role === "WEREWOLF" ? "werewolf" : p.alive ? "villager" : "dead"}>
                {t(`werewolf.roleReveal.roles.${p.role}.title`)}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
