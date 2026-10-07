"use client";

import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayerList } from "@/components/game/PlayerList";
import { ChatBox } from "@/components/game/ChatBox";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import { SeerNote } from "@/components/game/SeerNote";
import type { FilteredRoomState } from "@/types/game";
import { Moon, Eye, Shield, Skull } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function NightPhase({ room, socket }: { room: FilteredRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const role = room.you?.role;
  const alive = Boolean(room.you?.alive);
  const [selected, setSelected] = useState<string | null>(null);
  const night = room.night;

  // Werewolves can't target themselves; the Seer and Bodyguard can pick anyone alive.
  const acting = alive && (role === "WEREWOLF" || role === "SEER" || role === "DOCTOR") && !night?.youActed;
  const disabledIds = role === "WEREWOLF" ? room.players.filter((p) => p.isSelf).map((p) => p.id) : [];

  function confirmTarget() {
    if (!selected) return;
    if (role === "WEREWOLF") socket.emit("wolf_vote", { targetId: selected });
    if (role === "SEER") socket.emit("seer_action", { targetId: selected });
    if (role === "DOCTOR") socket.emit("doctor_action", { targetId: selected });
  }

  const prompt =
    role === "WEREWOLF"
      ? { icon: <Skull className="w-4 h-4 text-crimson-500" />, label: t("werewolf.night.chooseVictim"), done: t("werewolf.night.voteSubmitted") }
      : role === "SEER"
      ? { icon: <Eye className="w-4 h-4 text-wolf-purple" />, label: t("werewolf.night.chooseInvestigate"), done: t("werewolf.night.investigationSubmitted") }
      : role === "DOCTOR"
      ? { icon: <Shield className="w-4 h-4 text-emerald-400" />, label: t("werewolf.night.chooseProtect"), done: t("werewolf.night.protectionAssigned") }
      : null;

  return (
    <div className="space-y-4">
      <PlayerList
        players={room.players}
        time="night"
        selectable={acting}
        selectedId={selected}
        onSelect={setSelected}
        disabledIds={disabledIds}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="animate-day-sweep">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-moon-300" />{" "}
              {alive ? t("werewolf.night.title", { dayCount: room.dayCount }) : t("werewolf.night.spectatingTitle", { dayCount: room.dayCount })}
            </CardTitle>
            <PhaseTimer endsAt={room.phaseEndsAt} />
          </CardHeader>
          <CardContent className="space-y-4">
            {!alive && <p className="text-moon-400 text-sm">{t("werewolf.night.spectatingDesc")}</p>}
            {alive && prompt && night?.youActed && <p className="text-emerald-400 text-sm text-center py-4">{prompt.done}</p>}
            {acting && prompt && (
              <>
                <p className="flex items-center gap-2 text-sm text-moon-300">
                  {prompt.icon} {prompt.label}
                </p>
                <Button className="w-full" disabled={!selected} onClick={confirmTarget}>
                  {t("common.confirm")}
                  {selected && ` — ${room.players.find((p) => p.id === selected)?.nickname}`}
                </Button>
              </>
            )}
            {alive && role === "VILLAGER" && (
              <div className="text-center py-6 text-moon-400">
                <Moon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>{t("werewolf.night.sleepMsg")}</p>
              </div>
            )}
            {room.seerResult && <SeerNote result={room.seerResult} />}
          </CardContent>
        </Card>

        {role === "WEREWOLF" && alive && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-crimson-500" /> {t("werewolf.night.werewolfPackChat")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChatBox
                tint="wolf"
                messages={night?.wolfChat ?? []}
                onSend={(text) => socket.emit("wolf_chat_message", { text })}
                placeholder={t("werewolf.night.coordinatePlaceholder")}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
