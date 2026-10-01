"use client";

import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ONW_ROLE_META } from "@/components/onw/roleInfo";
import type { OnwRole } from "@/types/game";

/** Persistent reminder of the player's starting card — the only role info a player reliably "has" without a specific reveal, so it stays visible through Night, Day, and Voting. */
export function YourRoleCard({ role }: { role: OnwRole | null | undefined }) {
  const { t } = useTranslation();
  const meta = role ? ONW_ROLE_META[role] : null;
  const Icon = meta?.icon ?? HelpCircle;

  return (
    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-night-900/60 border border-wolf-purple/20">
      <div className={cn("rounded-full border-2 border-current p-2", meta?.color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-moon-400 text-xs">{t("onw.night.startingCard")}</p>
        <p className={cn("font-display text-lg", meta?.color)}>{role ? t(`onw.roles.${role}.label`) : "..."}</p>
      </div>
    </div>
  );
}
