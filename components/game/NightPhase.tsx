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
  const alive = room.you?.alive;
  const [selected, setSelected] = useState<string | null>(null);
  const night = room.night;

  const alivePlayers = room.players.filter((p) => p.alive);
  const selectableTargets = alivePlayers.filter((p) => !p.isSelf || role !== "WEREWOLF");

  function confirmTarget() {
    if (!selected) return;
    if (role === "WEREWOLF") socket.emit("wolf_vote", { targetId: selected });
    if (role === "SEER") socket.emit("seer_action", { targetId: selected });
    if (role === "DOCTOR") socket.emit("doctor_action", { targetId: selected });
  }

  if (!alive) {
    return <SpectatorNight room={room} />;
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="animate-day-sweep">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-moon-300" /> {t("werewolf.night.title", { dayCount: room.dayCount })}
          </CardTitle>
          <PhaseTimer endsAt={room.phaseEndsAt} />
        </CardHeader>
        <CardContent>
          {role === "WEREWOLF" && (
            <RoleAction
              icon={<Skull className="w-4 h-4 text-crimson-500" />}
              label={t("werewolf.night.chooseVictim")}
              players={selectableTargets}
              selected={selected}
              onSelect={setSelected}
              onConfirm={confirmTarget}
              acted={night?.youActed}
              actedLabel={t("werewolf.night.voteSubmitted")}
            />
          )}
          {role === "SEER" && (
            <RoleAction
              icon={<Eye className="w-4 h-4 text-wolf-purple" />}
              label={t("werewolf.night.chooseInvestigate")}
              players={selectableTargets}
              selected={selected}
              onSelect={setSelected}
              onConfirm={confirmTarget}
              acted={night?.youActed}
              actedLabel={t("werewolf.night.investigationSubmitted")}
            />
          )}
          {room.seerResult && (
            <div className="mt-4">
              <SeerNote result={room.seerResult} />
            </div>
          )}
          {role === "DOCTOR" && (
            <RoleAction
              icon={<Shield className="w-4 h-4 text-emerald-400" />}
              label={t("werewolf.night.chooseProtect")}
              players={selectableTargets}
              selected={selected}
              onSelect={setSelected}
              onConfirm={confirmTarget}
              acted={night?.youActed}
              actedLabel={t("werewolf.night.protectionAssigned")}
            />
          )}
          {role === "VILLAGER" && (
            <div className="text-center py-10 text-moon-400">
              <Moon className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>{t("werewolf.night.sleepMsg")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {role === "WEREWOLF" && (
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

        <Card>
          <CardHeader>
            <CardTitle>{t("werewolf.night.theVillage")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerList players={room.players} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RoleAction({
  icon,
  label,
  players,
  selected,
  onSelect,
  onConfirm,
  acted,
  actedLabel,
}: {
  icon: React.ReactNode;
  label: string;
  players: FilteredRoomState["players"];
  selected: string | null;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  acted?: boolean;
  actedLabel: string;
}) {
  const { t } = useTranslation();
  if (acted) {
    return <p className="text-emerald-400 text-sm text-center py-6">{actedLabel}</p>;
  }
  return (
    <div>
      <p className="flex items-center gap-2 text-sm text-moon-300 mb-3">
        {icon} {label}
      </p>
      <PlayerList players={players} selectable selectedId={selected} onSelect={onSelect} />
      <Button className="w-full mt-4" disabled={!selected} onClick={onConfirm}>
        {t("common.confirm")}
      </Button>
    </div>
  );
}

function SpectatorNight({ room }: { room: FilteredRoomState }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-moon-300" /> {t("werewolf.night.spectatingTitle", { dayCount: room.dayCount })}
        </CardTitle>
        <PhaseTimer endsAt={room.phaseEndsAt} />
      </CardHeader>
      <CardContent>
        <p className="text-moon-400 text-sm mb-3">{t("werewolf.night.spectatingDesc")}</p>
        <PlayerList players={room.players} />
      </CardContent>
    </Card>
  );
}
