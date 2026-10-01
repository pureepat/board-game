"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { WEREWOLF_ROLE_META } from "@/components/game/roleMeta";
import type { Role } from "@/types/game";

/** Persistent reminder of the player's own role — shown during Day/Voting since RoleReveal is only on screen briefly at the start of the game. */
export function YourRoleBadge({ role }: { role: Role | null | undefined }) {
  const { t } = useTranslation();
  if (!role) return null;
  const meta = WEREWOLF_ROLE_META[role];
  const Icon = meta?.icon ?? User;

  return (
    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-night-900/60 border border-wolf-purple/20">
      <div className={cn("rounded-full border-2 border-current p-2", meta?.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-moon-400 text-xs">{t("werewolf.roleReveal.yourRoleLabel")}</p>
        <p className={cn("font-display text-base", meta?.color)}>{t(`werewolf.roleReveal.roles.${role}.title`)}</p>
      </div>
    </div>
  );
}
