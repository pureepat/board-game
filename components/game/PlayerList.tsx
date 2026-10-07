"use client";

import type { PublicPlayer, Role } from "@/types/game";
import { CampfireCircle } from "@/components/table/CampfireCircle";
import { useTranslation } from "@/lib/i18n/useTranslation";

const ROLE_HEX: Record<Role, string> = {
  WEREWOLF: "#dc2645",
  SEER: "#6d28d9",
  DOCTOR: "#059669",
  VILLAGER: "#6b6580",
};

/** The village, seated around the campfire. Each screen shows exactly one of these. */
export function PlayerList({
  players,
  selectable = false,
  selectedId,
  onSelect,
  disabledIds = [],
  time = "night",
  tally,
}: {
  players: PublicPlayer[];
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  disabledIds?: string[];
  time?: "night" | "day";
  tally?: Record<string, number>;
}) {
  const { t, tp } = useTranslation();
  return (
    <CampfireCircle
      time={time}
      onSeatClick={onSelect}
      seats={players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        isSelf: p.isSelf,
        isHost: p.isHost,
        connected: p.connected,
        dead: !p.alive,
        selectable: selectable && p.alive && !disabledIds.includes(p.id),
        selected: selectedId === p.id,
        badge: p.role ? { label: t(`werewolf.roleReveal.roles.${p.role}.title`), hex: ROLE_HEX[p.role] } : null,
        note: tally?.[p.id] ? tp("werewolf.voting.vote", tally[p.id]) : null,
      }))}
    />
  );
}
