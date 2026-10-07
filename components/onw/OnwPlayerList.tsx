"use client";

import { Eye } from "lucide-react";
import type { OnwCenterCard, OnwPlayer } from "@/types/game";
import { CampfireCircle } from "@/components/table/CampfireCircle";
import { ONW_ROLE_META } from "@/components/onw/roleInfo";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

const TEAM_HEX = { WEREWOLF: "#dc2645", MINION: "#b91c4b", TANNER: "#b45309" } as Record<string, string>;

/** Everyone around the campfire, with the three center cards lying face-down by the fire. */
export function OnwPlayerList({
  players,
  selectable = false,
  selectedId,
  selectedIds,
  onSelect,
  disabledIds = [],
  time = "night",
  tally,
  center,
  centerSelectable = false,
  selectedCenter = [],
  onSelectCenter,
}: {
  players: OnwPlayer[];
  selectable?: boolean;
  selectedId?: string | null;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  disabledIds?: string[];
  time?: "night" | "day";
  tally?: Record<string, number>;
  center?: OnwCenterCard[];
  centerSelectable?: boolean;
  selectedCenter?: number[];
  onSelectCenter?: (index: number) => void;
}) {
  const { t, tp } = useTranslation();
  return (
    <CampfireCircle
      time={time}
      onSeatClick={onSelect}
      center={
        center?.length ? (
          <CenterCards cards={center} selectable={centerSelectable} selected={selectedCenter} onSelect={onSelectCenter} />
        ) : undefined
      }
      seats={players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        isSelf: p.isSelf,
        isHost: p.isHost,
        connected: p.connected,
        dead: p.dead,
        selectable: selectable && !disabledIds.includes(p.id),
        selected: selectedId === p.id || Boolean(selectedIds?.includes(p.id)),
        badge: p.role ? { label: t(`onw.roles.${p.role}.label`), hex: TEAM_HEX[p.role] ?? "#047857" } : null,
        note: tally?.[p.id]
          ? tp("onw.voting.vote", tally[p.id])
          : p.role && p.startingRole && p.startingRole !== p.role
          ? t("onw.gameOver.startedAs", { role: t(`onw.roles.${p.startingRole}.label`) })
          : null,
      }))}
    />
  );
}

function CenterCards({
  cards,
  selectable,
  selected,
  onSelect,
}: {
  cards: OnwCenterCard[];
  selectable: boolean;
  selected: number[];
  onSelect?: (index: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1.5">
      {cards.map((c) => {
        const meta = c.role ? ONW_ROLE_META[c.role] : null;
        const Icon = meta?.icon;
        const isSelected = selected.includes(c.index);
        return (
          <button
            key={c.index}
            type="button"
            disabled={!selectable}
            onClick={() => onSelect?.(c.index)}
            title={t("onw.night.card", { n: c.index + 1 })}
            className={cn(
              "flex h-12 w-9 sm:h-16 sm:w-11 flex-col items-center justify-center rounded-md border-2 shadow-md shadow-black/60 transition-transform",
              c.role ? "border-[#8a6d3b] bg-[#efe2c2]" : "border-[#c9a86a] bg-[#2a1f3d]",
              selectable && "cursor-pointer hover:-translate-y-1 ring-2 ring-[#ffd166]/50",
              isSelected && "-translate-y-1 ring-4 ring-crimson-500"
            )}
          >
            {Icon ? (
              <>
                <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", meta?.color)} />
                <span className="mt-0.5 px-0.5 text-center text-[7px] sm:text-[8px] font-bold leading-tight text-[#2b1d12]">
                  {t(`onw.roles.${c.role}.label`)}
                </span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-[#c9a86a]/70" />
                <span className="text-[9px] font-bold text-[#c9a86a]">{c.index + 1}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
