"use client";

import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnwPlayerList } from "@/components/onw/OnwPlayerList";
import type { OnwRoomState, OnwRole, OnwTimerPhase } from "@/types/game";
import { ONW_ROLE_ORDER } from "@/components/onw/roleInfo";
import { Copy, Minus, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

const TIMER_KEYS: OnwTimerPhase[] = ["NIGHT_STEP", "DAY", "VOTING"];
const TIMER_STEP = 5;
const TIMER_MAX = 600;
const TIMER_MIN: Record<OnwTimerPhase, number> = { NIGHT_STEP: 5, DAY: 0, VOTING: 0 };

function formatSeconds(seconds: number, noLimitLabel: string) {
  if (seconds <= 0) return noLimitLabel;
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return mm > 0 ? `${mm}m ${ss > 0 ? `${ss}s` : ""}`.trim() : `${ss}s`;
}

export function OnwLobby({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t, tp } = useTranslation();
  const isHost = room.you?.isHost;
  const playerCount = room.players.length;
  const deckSize = Object.values(room.roleConfig).reduce((a, b) => a + b, 0);
  const requiredDeckSize = playerCount + 3;
  const [startError, setStartError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function updateRole(role: OnwRole, delta: number) {
    const next = { [role]: Math.max(0, room.roleConfig[role] + delta) };
    socket.emit("update_onw_role_config", { roleConfig: next });
  }

  function updateTimer(phase: OnwTimerPhase, delta: number) {
    const clamped = Math.max(TIMER_MIN[phase], Math.min(TIMER_MAX, room.timerConfig[phase] + delta));
    socket.emit("update_onw_timer_config", { timerConfig: { [phase]: clamped } });
  }

  function handleStart() {
    setStartError(null);
    socket.emit("start_game", {}, (res: { error?: string }) => {
      if (res?.error) setStartError(res.error);
    });
  }

  function copyCode() {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {t("common.room")} {room.code}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={copyCode}>
            <Copy className="w-3 h-3 mr-1" /> {copied ? t("common.copied") : t("common.copyCode")}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-moon-400 text-sm mb-3">{tp("onw.lobby.playersInRoom", playerCount)}</p>
          <OnwPlayerList players={room.players} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("onw.lobby.roleDeck")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
          {ONW_ROLE_ORDER.map((role) => (
            <div key={role} className="flex items-center justify-between">
              <span className="text-sm text-moon-300">{t(`onw.roles.${role}.label`)}</span>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="secondary" disabled={!isHost} onClick={() => updateRole(role, -1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-6 text-center text-moon-200">{room.roleConfig[role] ?? 0}</span>
                <Button size="icon" variant="secondary" disabled={!isHost} onClick={() => updateRole(role, 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          <div className="pt-2 text-xs text-moon-400">
            {t("onw.lobby.deckLine", { deckSize, required: requiredDeckSize })}
            {deckSize !== requiredDeckSize && <span className="text-crimson-500"> {t("onw.lobby.deckMismatch")}</span>}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>{t("onw.lobby.phaseTimers")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            {TIMER_KEYS.map((phase) => (
              <div
                key={phase}
                className="flex items-center justify-between rounded-lg border border-wolf-purple/20 bg-night-900/60 p-3"
              >
                <span className="text-sm text-moon-300">{t(`onw.lobby.timerLabels.${phase}`)}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    disabled={!isHost}
                    onClick={() => updateTimer(phase, -TIMER_STEP)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-16 text-center text-moon-200 text-sm tabular-nums">
                    {formatSeconds(room.timerConfig[phase], t("common.noLimit"))}
                  </span>
                  <Button
                    size="icon"
                    variant="secondary"
                    disabled={!isHost}
                    onClick={() => updateTimer(phase, TIMER_STEP)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-moon-400/60 text-xs pt-3">{t("onw.lobby.timerHint")}</p>
        </CardContent>
      </Card>

      <div className="md:col-span-2">
        {isHost ? (
          <Button className="w-full" size="lg" onClick={handleStart}>
            {t("common.startGame")}
          </Button>
        ) : (
          <p className="text-moon-400 text-sm text-center">{t("common.waitingForHost")}</p>
        )}
        {startError && <p className="text-crimson-500 text-sm text-center mt-2">{startError}</p>}
      </div>
    </div>
  );
}
