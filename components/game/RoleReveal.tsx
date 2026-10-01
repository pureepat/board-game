"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import { PlayerList } from "@/components/game/PlayerList";
import { WEREWOLF_ROLE_META } from "@/components/game/roleMeta";
import type { FilteredRoomState } from "@/types/game";
import { User } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function RoleReveal({ room }: { room: FilteredRoomState }) {
  const { t } = useTranslation();
  const role = room.you?.role;
  const meta = role ? WEREWOLF_ROLE_META[role] : null;
  const Icon = meta?.icon ?? User;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <Card className="max-w-md w-full animate-fade-in border-2 border-wolf-purple/50 shadow-[0_0_40px_-10px_rgba(109,40,217,0.6)]">
        <CardContent className="flex flex-col items-center text-center py-10">
          <p className="text-moon-400 text-sm tracking-widest mb-4">{t("werewolf.roleReveal.yourRoleIs")}</p>
          <div className={`rounded-full border-2 border-current p-6 mb-4 ${meta?.color}`}>
            <Icon className="w-12 h-12" />
          </div>
          <h2 className={`font-display text-3xl mb-3 ${meta?.color}`}>
            {role ? t(`werewolf.roleReveal.roles.${role}.title`) : "..."}
          </h2>
          <p className="text-moon-300 text-sm leading-relaxed">
            {role ? t(`werewolf.roleReveal.roles.${role}.desc`) : ""}
          </p>
          <p className="text-moon-400/60 text-xs mt-6">{t("werewolf.roleReveal.villageStirs")}</p>
          <PhaseTimer endsAt={room.phaseEndsAt} className="mt-4" />
        </CardContent>
      </Card>

      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{t("werewolf.roleReveal.theVillage")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PlayerList players={room.players} />
        </CardContent>
      </Card>
    </div>
  );
}
