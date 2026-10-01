import { Eye, Shield, Skull, User } from "lucide-react";

// Labels/descriptions are translated via t(`werewolf.roleReveal.roles.${role}.title` | `.desc`)
// — this map only holds the language-independent visual identity of each role.
export const WEREWOLF_ROLE_META: Record<string, { icon: React.ElementType; color: string }> = {
  WEREWOLF: { icon: Skull, color: "text-crimson-500" },
  SEER: { icon: Eye, color: "text-wolf-purple" },
  DOCTOR: { icon: Shield, color: "text-emerald-400" },
  VILLAGER: { icon: User, color: "text-moon-300" },
};
