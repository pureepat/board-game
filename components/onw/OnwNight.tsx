"use client";

import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnwPlayerList } from "@/components/onw/OnwPlayerList";
import { NightLog } from "@/components/onw/NightLog";
import { YourRoleCard } from "@/components/onw/YourRoleCard";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import type { OnwRoomState } from "@/types/game";
import { cn } from "@/lib/utils";
import { Moon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function OnwNight({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t } = useTranslation();

  return (
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

          <div className="mt-4">
            {room.isMyTurn ? (
              <NightAction room={room} socket={socket} />
            ) : (
              <p className="text-moon-400 text-sm text-center py-6">
                {room.currentStep
                  ? t("onw.night.waitingOn", { role: t(`onw.roles.${room.currentStep}.label`), count: room.pendingCount })
                  : t("onw.night.waitingResolve")}
              </p>
            )}
          </div>
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
  );
}

function NightAction({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const step = room.currentStep;
  if (!step) return null;

  if (step === "WEREWOLF") return <WerewolfAction room={room} socket={socket} />;
  if (step === "SEER") return <SeerAction room={room} socket={socket} />;
  if (step === "ROBBER") return <RobberAction room={room} socket={socket} />;
  if (step === "TROUBLEMAKER") return <TroublemakerAction room={room} socket={socket} />;
  if (step === "DRUNK") return <DrunkAction room={room} socket={socket} />;
  // MINION, MASON, INSOMNIAC: purely informational, just acknowledge.
  return <ContinueAction socket={socket} />;
}

function ContinueAction({ socket }: { socket: Socket }) {
  const { t } = useTranslation();
  return (
    <div className="text-center">
      <p className="text-moon-300 text-sm mb-4">{t("onw.night.checkLog")}</p>
      <Button onClick={() => socket.emit("onw_continue")}>{t("common.continue")}</Button>
    </div>
  );
}

function otherPlayers(room: OnwRoomState) {
  return room.players.filter((p) => !p.isSelf);
}

function WerewolfAction({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const teamEntry = room.myNightLog.find((e) => e.type === "WEREWOLF_TEAM") as
    | { type: "WEREWOLF_TEAM"; teammates: { id: string; nickname: string }[] }
    | undefined;
  const isLoneWolf = teamEntry?.teammates.length === 0;
  const [selected, setSelected] = useState<number | null>(null);

  if (!isLoneWolf) return <ContinueAction socket={socket} />;

  return (
    <div>
      <p className="text-moon-300 text-sm mb-3">{t("onw.night.loneWolfMsg")}</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={cn(
              "aspect-[3/4] rounded-lg border flex items-center justify-center text-moon-300 text-sm",
              "border-wolf-purple/30 bg-night-900/60 hover:border-crimson-500 cursor-pointer",
              selected === i && "border-crimson-500 bg-crimson-600/20 ring-1 ring-crimson-500"
            )}
          >
            {t("onw.night.card", { n: i + 1 })}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={selected === null}
          onClick={() => socket.emit("onw_werewolf_peek", { centerIndex: selected })}
        >
          {t("onw.night.peek")}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => socket.emit("onw_continue")}>
          {t("common.skip")}
        </Button>
      </div>
    </div>
  );
}

function SeerAction({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"player" | "center">("player");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<number[]>([]);

  function toggleCenter(i: number) {
    setSelectedCenter((prev) => {
      if (prev.includes(i)) return prev.filter((x) => x !== i);
      if (prev.length >= 2) return [prev[1], i];
      return [...prev, i];
    });
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <Button variant={mode === "player" ? "default" : "secondary"} size="sm" onClick={() => setMode("player")}>
          {t("onw.night.viewAPlayer")}
        </Button>
        <Button variant={mode === "center" ? "default" : "secondary"} size="sm" onClick={() => setMode("center")}>
          {t("onw.night.viewTwoCenter")}
        </Button>
      </div>

      {mode === "player" ? (
        <>
          <OnwPlayerList
            players={otherPlayers(room)}
            selectable
            selectedId={selectedPlayer}
            onSelect={setSelectedPlayer}
          />
          <Button
            className="w-full mt-4"
            disabled={!selectedPlayer}
            onClick={() => socket.emit("onw_seer_view_player", { targetId: selectedPlayer })}
          >
            {t("common.confirm")}
          </Button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => toggleCenter(i)}
                className={cn(
                  "aspect-[3/4] rounded-lg border flex items-center justify-center text-moon-300 text-sm",
                  "border-wolf-purple/30 bg-night-900/60 hover:border-crimson-500 cursor-pointer",
                  selectedCenter.includes(i) && "border-crimson-500 bg-crimson-600/20 ring-1 ring-crimson-500"
                )}
              >
                {t("onw.night.card", { n: i + 1 })}
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={selectedCenter.length !== 2}
            onClick={() => socket.emit("onw_seer_view_center", { indices: selectedCenter })}
          >
            {t("common.confirm")}
          </Button>
        </>
      )}
    </div>
  );
}

function RobberAction({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div>
      <p className="text-moon-300 text-sm mb-3">{t("onw.night.chooseSwapTarget")}</p>
      <OnwPlayerList players={otherPlayers(room)} selectable selectedId={selected} onSelect={setSelected} />
      <Button
        className="w-full mt-4"
        disabled={!selected}
        onClick={() => socket.emit("onw_robber_swap", { targetId: selected })}
      >
        {t("common.confirm")}
      </Button>
    </div>
  );
}

function TroublemakerAction({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  return (
    <div>
      <p className="text-moon-300 text-sm mb-3">{t("onw.night.chooseTroublemakerTargets")}</p>
      <OnwPlayerList players={otherPlayers(room)} selectable selectedIds={selected} onSelect={toggle} />
      <Button
        className="w-full mt-4"
        disabled={selected.length !== 2}
        onClick={() => socket.emit("onw_troublemaker_swap", { targetAId: selected[0], targetBId: selected[1] })}
      >
        {t("common.confirm")}
      </Button>
    </div>
  );
}

function DrunkAction({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div>
      <p className="text-moon-300 text-sm mb-3">{t("onw.night.chooseDrunkCard")}</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={cn(
              "aspect-[3/4] rounded-lg border flex items-center justify-center text-moon-300 text-sm",
              "border-wolf-purple/30 bg-night-900/60 hover:border-crimson-500 cursor-pointer",
              selected === i && "border-crimson-500 bg-crimson-600/20 ring-1 ring-crimson-500"
            )}
          >
            {t("onw.night.card", { n: i + 1 })}
          </button>
        ))}
      </div>
      <Button
        className="w-full"
        disabled={selected === null}
        onClick={() => socket.emit("onw_drunk_swap", { centerIndex: selected })}
      >
        {t("common.confirm")}
      </Button>
    </div>
  );
}
