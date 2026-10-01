import { Eye, Ghost, Handshake, Moon, Repeat2, Shuffle, Skull, Target, User, Wine } from "lucide-react";
import type { OnwRole } from "@/types/game";

// Labels/descriptions are translated via t(`onw.roles.${role}.label` | `.desc`)
// — this map only holds the language-independent visual identity of each role.
export const ONW_ROLE_META: Record<OnwRole, { icon: any; color: string }> = {
  WEREWOLF: { icon: Skull, color: "text-crimson-500" },
  MINION: { icon: Ghost, color: "text-crimson-400" },
  MASON: { icon: Handshake, color: "text-emerald-400" },
  SEER: { icon: Eye, color: "text-wolf-purple" },
  ROBBER: { icon: Repeat2, color: "text-yellow-400" },
  TROUBLEMAKER: { icon: Shuffle, color: "text-orange-400" },
  DRUNK: { icon: Wine, color: "text-pink-400" },
  INSOMNIAC: { icon: Moon, color: "text-moon-300" },
  TANNER: { icon: Target, color: "text-amber-500" },
  HUNTER: { icon: Target, color: "text-red-400" },
  VILLAGER: { icon: User, color: "text-moon-300" },
};

export const ONW_ROLE_ORDER: OnwRole[] = [
  "WEREWOLF",
  "MINION",
  "MASON",
  "SEER",
  "ROBBER",
  "TROUBLEMAKER",
  "DRUNK",
  "INSOMNIAC",
  "TANNER",
  "HUNTER",
  "VILLAGER",
];
