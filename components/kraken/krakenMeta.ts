import {
  Anchor,
  Crosshair,
  Droplets,
  Eye,
  Fish,
  Flame,
  Gavel,
  MicOff,
  Package,
  Search,
  ShieldOff,
  Skull,
  Sparkles,
  Telescope,
  Waves,
  Wine,
} from "lucide-react";
import type { KrakenColor, KrakenEffect, KrakenMapAction, KrakenRitual, KrakenRole, KrakenTeam } from "@/types/game";

// Labels/descriptions are translated via t(`kraken.roles.${role}.label`), t(`kraken.effects.${effect}.label`)
// etc. — these maps only hold the visual identity. Colors match the board:
// red = west / Pirates, blue = east / Sailors, yellow = north / the Kraken and its Cult.
export const KR_HEX: Record<KrakenColor, string> = {
  RED: "#c0392b",
  BLUE: "#2e86de",
  YELLOW: "#d4a017",
};

export const KR_TEAM_HEX: Record<KrakenTeam, string> = {
  PIRATES: KR_HEX.RED,
  SAILORS: KR_HEX.BLUE,
  CULT: KR_HEX.YELLOW,
};

export const KRAKEN_ROLE_META: Record<KrakenRole, { icon: any; hex: string; team: KrakenTeam }> = {
  SAILOR: { icon: Anchor, hex: KR_HEX.BLUE, team: "SAILORS" },
  PIRATE: { icon: Skull, hex: KR_HEX.RED, team: "PIRATES" },
  CULT_LEADER: { icon: Waves, hex: KR_HEX.YELLOW, team: "CULT" },
  CULTIST: { icon: Waves, hex: KR_HEX.YELLOW, team: "CULT" },
};

export const KR_EFFECT_ICON: Record<KrakenEffect, any> = {
  DRUNK: Wine,
  MERMAID: Fish,
  TELESCOPE: Telescope,
  ARMED: Crosshair,
  DISARMED: ShieldOff,
  CULT_UPRISING: Flame,
};

export const KR_ACTION_ICON: Record<KrakenMapAction, any> = {
  CABIN_SEARCH: Search,
  FLOGGING: Gavel,
  OFF_WITH_TONGUE: MicOff,
  FEED_THE_KRAKEN: Droplets,
};

export const KR_RITUAL_ICON: Record<KrakenRitual, any> = {
  GUN_STASH: Package,
  CULT_SEARCH: Eye,
  CONVERSION: Sparkles,
};

export const KR_GUN_ICON = Crosshair;
