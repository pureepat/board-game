import { Anchor, Skull, Waves, Flame, Wind } from "lucide-react";
import type { KrakenCard, KrakenRole } from "@/types/game";

// Labels/descriptions are translated via t(`kraken.roles.${role}.label` | `.desc`)
// and t(`kraken.cards.${card}.label` | `.desc`) — this only holds the visual identity.
export const KRAKEN_ROLE_META: Record<KrakenRole, { icon: any; color: string; badge: "villager" | "werewolf" | "default" }> = {
  SAILOR: { icon: Anchor, color: "text-emerald-400", badge: "villager" },
  PIRATE: { icon: Skull, color: "text-crimson-500", badge: "werewolf" },
  CULTIST: { icon: Waves, color: "text-wolf-purple", badge: "default" },
};

export const KRAKEN_CARD_META: Record<KrakenCard, { icon: any; color: string }> = {
  CALM: { icon: Wind, color: "text-emerald-400" },
  SABOTAGE: { icon: Flame, color: "text-crimson-500" },
  OFFERING: { icon: Waves, color: "text-wolf-purple" },
};
