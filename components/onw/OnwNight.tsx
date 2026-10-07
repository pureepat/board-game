"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnwPlayerList } from "@/components/onw/OnwPlayerList";
import { NightLog } from "@/components/onw/NightLog";
import { YourRoleCard } from "@/components/onw/YourRoleCard";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import type { OnwRoomState } from "@/types/game";
import { Moon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

// What the current night step lets you tap around the campfire. Selection
// lives here (not in each action) because the campfire is shared by all of them.
type Pick = { players: number; center: number };
const NONE: Pick = { players: 0, center: 0 };

export function OnwNight({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<string[]>([]);
  const [center, setCenter] = useState<number[]>([]);
  const [seerMode, setSeerMode] = useState<"player" | "center">("player");

  const step = room.isMyTurn ? room.currentStep : null;
  const teamEntry = room.myNightLog.find((e) => e.type === "WEREWOLF_TEAM") as
    | { type: "WEREWOLF_TEAM"; teammates: { id: string; nickname: string }[] }
    | undefined;
  const loneWolf = step === "WEREWOLF" && teamEntry?.teammates.length === 0;

  const pick: Pick =
    step === "SEER"
      ? seerMode === "player"
        ? { players: 1, center: 0 }
        : { players: 0, center: 2 }
      : step === "ROBBER"
      ? { players: 1, center: 0 }
      : step === "TROUBLEMAKER"
      ? { players: 2, center: 0 }
      : step === "DRUNK" || loneWolf
      ? { players: 0, center: 1 }
      : NONE;

  // Each new step (or Seer mode switch) starts with nothing picked.
  useEffect(() => {
    setPlayers([]);
    setCenter([]);
  }, [room.currentStep, room.isMyTurn, seerMode]);

  function toggle<T>(list: T[], item: T, max: number): T[] {
    if (list.includes(item)) return list.filter((x) => x !== item);
    if (list.length >= max) return max === 1 ? [item] : [...list.slice(1), item];
    return [...list, item];
  }

  const selfId = room.you?.id;

  return (
    <div className="space-y-4">
      <OnwPlayerList
        players={room.players}
        time="night"
        center={room.center}
        selectable={pick.players > 0}
        disabledIds={selfId ? [selfId] : []}
        selectedIds={players}
        onSelect={(id) => setPlayers((cur) => toggle(cur, id, pick.players))}
        centerSelectable={pick.center > 0}
        selectedCenter={center}
        onSelectCenter={(i) => setCenter((cur) => toggle(cur, i, pick.center))}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="animate-day-sweep">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-moon-300" /> {t("onw.night.title")}
            </CardTitle>
            <PhaseTimer endsAt={room.phaseEndsAt} />
          </CardHeader>
          <CardContent>
            <YourRoleCard role={room.you?.startingRole} />
            {step ? (
              <NightAction
                step={step}
                loneWolf={loneWolf}
                players={players}
                center={center}
                seerMode={seerMode}
                setSeerMode={setSeerMode}
                socket={socket}
              />
            ) : (
              <p className="text-moon-400 text-sm text-center py-4">
                {room.currentStep
                  ? t("onw.night.waitingOn", { role: t(`onw.roles.${room.currentStep}.label`), count: room.pendingCount })
                  : t("onw.night.waitingResolve")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("onw.night.yourNightLog")}</CardTitle>
          </CardHeader>
          <CardContent>
            <NightLog entries={room.myNightLog} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NightAction({
  step,
  loneWolf,
  players,
  center,
  seerMode,
  setSeerMode,
  socket,
}: {
  step: NonNullable<OnwRoomState["currentStep"]>;
  loneWolf: boolean;
  players: string[];
  center: number[];
  seerMode: "player" | "center";
  setSeerMode: (m: "player" | "center") => void;
  socket: Socket;
}) {
  const { t } = useTranslation();
  const confirm = (enabled: boolean, onClick: () => void) => (
    <Button className="w-full" disabled={!enabled} onClick={onClick}>
      {t("common.confirm")}
    </Button>
  );

  if (step === "WEREWOLF" && loneWolf) {
    return (
      <div className="space-y-3">
        <p className="text-moon-300 text-sm">{t("onw.night.loneWolfMsg")}</p>
        <div className="flex gap-2">
          <Button className="flex-1" disabled={center.length !== 1} onClick={() => socket.emit("onw_werewolf_peek", { centerIndex: center[0] })}>
            {t("onw.night.peek")}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => socket.emit("onw_continue")}>
            {t("common.skip")}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "SEER") {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button variant={seerMode === "player" ? "default" : "secondary"} size="sm" onClick={() => setSeerMode("player")}>
            {t("onw.night.viewAPlayer")}
          </Button>
          <Button variant={seerMode === "center" ? "default" : "secondary"} size="sm" onClick={() => setSeerMode("center")}>
            {t("onw.night.viewTwoCenter")}
          </Button>
        </div>
        {seerMode === "player"
          ? confirm(players.length === 1, () => socket.emit("onw_seer_view_player", { targetId: players[0] }))
          : confirm(center.length === 2, () => socket.emit("onw_seer_view_center", { indices: center }))}
      </div>
    );
  }

  if (step === "ROBBER") {
    return (
      <div className="space-y-3">
        <p className="text-moon-300 text-sm">{t("onw.night.chooseSwapTarget")}</p>
        {confirm(players.length === 1, () => socket.emit("onw_robber_swap", { targetId: players[0] }))}
      </div>
    );
  }

  if (step === "TROUBLEMAKER") {
    return (
      <div className="space-y-3">
        <p className="text-moon-300 text-sm">{t("onw.night.chooseTroublemakerTargets")}</p>
        {confirm(players.length === 2, () => socket.emit("onw_troublemaker_swap", { targetAId: players[0], targetBId: players[1] }))}
      </div>
    );
  }

  if (step === "DRUNK") {
    return (
      <div className="space-y-3">
        <p className="text-moon-300 text-sm">{t("onw.night.chooseDrunkCard")}</p>
        {confirm(center.length === 1, () => socket.emit("onw_drunk_swap", { centerIndex: center[0] }))}
      </div>
    );
  }

  // WEREWOLF (with a pack), MINION, MASON, INSOMNIAC: purely informational, just acknowledge.
  return (
    <div className="text-center">
      <p className="text-moon-300 text-sm mb-4">{t("onw.night.checkLog")}</p>
      <Button onClick={() => socket.emit("onw_continue")}>{t("common.continue")}</Button>
    </div>
  );
}
