import { Anchor, Grid3x3, Moon, Zap } from "lucide-react";
import { WEREWOLF_ROLE_META } from "@/components/game/roleMeta";
import { ONW_ROLE_META, ONW_ROLE_ORDER } from "@/components/onw/roleInfo";
import { KR_ACTION_ICON, KR_EFFECT_ICON, KRAKEN_ROLE_META } from "@/components/kraken/krakenMeta";
import type { GameType } from "@/types/game";

export interface GuideItem {
  id: string;
  icon: React.ElementType;
  color: string;
  labelKey: string;
  descKey: string;
}

export interface GuideSection {
  titleKey: string;
  items: GuideItem[];
}

export interface GameGuide {
  id: GameType;
  icon: React.ElementType;
  // Translation keys (resolved with t()) — the catalog only wires structure
  // together; every visible string lives in lib/i18n/translations.ts.
  ruleKeys: string[];
  sections: GuideSection[];
}

const WEREWOLF_ROLES = ["WEREWOLF", "SEER", "DOCTOR", "VILLAGER"];
const KRAKEN_ROLES = ["SAILOR", "PIRATE", "CULT_LEADER", "CULTIST"] as const;
const KRAKEN_EFFECTS = ["DRUNK", "MERMAID", "TELESCOPE", "ARMED", "DISARMED", "CULT_UPRISING"] as const;
const KRAKEN_ACTIONS = ["CABIN_SEARCH", "FLOGGING", "OFF_WITH_TONGUE", "FEED_THE_KRAKEN"] as const;

export const GAME_GUIDES: GameGuide[] = [
  {
    id: "WEREWOLF",
    icon: Moon,
    ruleKeys: ["guide.games.WEREWOLF.rule1", "guide.games.WEREWOLF.rule2", "guide.games.WEREWOLF.rule3", "guide.games.WEREWOLF.rule4", "guide.games.WEREWOLF.rule5"],
    sections: [
      {
        titleKey: "guide.roles",
        items: WEREWOLF_ROLES.map((r) => ({
          id: r,
          icon: WEREWOLF_ROLE_META[r].icon,
          color: WEREWOLF_ROLE_META[r].color,
          labelKey: `werewolf.roleReveal.roles.${r}.title`,
          descKey: `werewolf.roleReveal.roles.${r}.desc`,
        })),
      },
    ],
  },
  {
    id: "TICTACTOE",
    icon: Grid3x3,
    ruleKeys: ["guide.games.TICTACTOE.rule1", "guide.games.TICTACTOE.rule2", "guide.games.TICTACTOE.rule3"],
    sections: [],
  },
  {
    id: "ONE_NIGHT_WEREWOLF",
    icon: Zap,
    ruleKeys: [
      "guide.games.ONE_NIGHT_WEREWOLF.rule1",
      "guide.games.ONE_NIGHT_WEREWOLF.rule2",
      "guide.games.ONE_NIGHT_WEREWOLF.rule3",
      "guide.games.ONE_NIGHT_WEREWOLF.rule4",
      "guide.games.ONE_NIGHT_WEREWOLF.rule5",
    ],
    sections: [
      {
        titleKey: "guide.roles",
        items: ONW_ROLE_ORDER.map((r) => ({
          id: r,
          icon: ONW_ROLE_META[r].icon,
          color: ONW_ROLE_META[r].color,
          labelKey: `onw.roles.${r}.label`,
          descKey: `onw.roles.${r}.desc`,
        })),
      },
    ],
  },
  {
    id: "FEED_THE_KRAKEN",
    icon: Anchor,
    // The lobby already carries the canonical rules text — reuse it.
    ruleKeys: [1, 2, 3, 4, 5, 6, 7].map((n) => `kraken.lobby.rule${n}`),
    sections: [
      {
        titleKey: "guide.roles",
        items: KRAKEN_ROLES.map((r) => ({
          id: r,
          icon: KRAKEN_ROLE_META[r].icon,
          color: r === "SAILOR" ? "text-sky-500" : r === "PIRATE" ? "text-crimson-500" : "text-amber-400",
          labelKey: `kraken.roles.${r}.label`,
          descKey: `kraken.roles.${r}.desc`,
        })),
      },
      {
        titleKey: "guide.cards",
        items: KRAKEN_EFFECTS.map((e) => ({
          id: e,
          icon: KR_EFFECT_ICON[e],
          color: "text-moon-200",
          labelKey: `kraken.effects.${e}.label`,
          descKey: `kraken.effects.${e}.desc`,
        })),
      },
      {
        titleKey: "guide.mapActions",
        items: KRAKEN_ACTIONS.map((a) => ({
          id: a,
          icon: KR_ACTION_ICON[a],
          color: "text-amber-300",
          labelKey: `kraken.actions.${a}.label`,
          descKey: `kraken.actions.${a}.desc`,
        })),
      },
    ],
  },
];
