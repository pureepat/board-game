"use client";

import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Copy, Wifi, WifiOff } from "lucide-react";
import type { InsiderLobbyState } from "@/types/game";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { InsiderMasterPicker } from "@/components/insider/InsiderMasterPicker";

const QUESTION_SECONDS = [180, 300, 420];
const MATCH_ROUNDS = [0, 3, 5, 7, 10];

export function InsiderLobby({ room, socket }: { room: InsiderLobbyState; socket: Socket }) {
  const { t, tp } = useTranslation();
  const isHost = room.you?.isHost;
  const count = room.players.length;
  const canStart = count >= room.lobby.min && count <= room.lobby.max;
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  function copyCode() {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleStart() {
    setStartError(null);
    socket.emit("start_game", {}, (res: { error?: string }) => {
      if (res?.error) setStartError(res.error);
    });
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {t("common.room")} {room.code}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={copyCode}>
            <Copy className="w-3 h-3 mr-1" /> {copied ? t("common.copied") : t("common.copyCode")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-moon-400 text-sm">{tp("insider.lobby.playersInRoom", count)}</p>
          <div className="grid grid-cols-2 gap-2">
            {room.players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-wolf-purple/20 bg-night-900/60 p-3"
              >
                <span className="truncate text-sm text-moon-200">
                  {p.nickname}
                  {p.isSelf && <span className="text-moon-400 text-xs"> ({t("common.you")})</span>}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {p.isHost && <Crown className="w-3 h-3 text-yellow-400" />}
                  {p.connected ? <Wifi className="w-3 h-3 text-emerald-500/70" /> : <WifiOff className="w-3 h-3 text-moon-400/70" />}
                </span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-moon-300 text-sm mb-2">{t("insider.lobby.questionTime")}</p>
            <div className="flex gap-2">
              {QUESTION_SECONDS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={room.questionSeconds === s ? "default" : "secondary"}
                  className={cn("flex-1", !isHost && "pointer-events-none")}
                  disabled={!isHost && room.questionSeconds !== s}
                  onClick={() => socket.emit("insider_set_timer", { seconds: s })}
                >
                  {t("insider.lobby.minutes", { count: s / 60 })}
                </Button>
              ))}
            </div>
          </div>

          <InsiderMasterPicker room={room} socket={socket} />

          <div>
            <p className="text-moon-300 text-sm mb-2">{t("insider.lobby.matchLength")}</p>
            <div className="flex flex-wrap gap-2">
              {MATCH_ROUNDS.map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={room.rounds === r ? "default" : "secondary"}
                  className={cn(r === 0 ? "basis-full sm:basis-auto" : "flex-1", !isHost && "pointer-events-none")}
                  disabled={!isHost && room.rounds !== r}
                  onClick={() => socket.emit("insider_set_rounds", { rounds: r })}
                >
                  {r === 0 ? t("insider.lobby.casual") : t("insider.lobby.roundsN", { count: r })}
                </Button>
              ))}
            </div>
            {room.rounds > 0 && <p className="mt-2 text-xs leading-relaxed text-moon-400">{t("insider.lobby.scoringRules")}</p>}
          </div>

          {!canStart && <p className="text-moon-400 text-xs">{t("insider.lobby.needPlayers", { min: room.lobby.min, max: room.lobby.max })}</p>}

          {isHost ? (
            <Button className="w-full" size="lg" disabled={!canStart} onClick={handleStart}>
              {t("common.startGame")}
            </Button>
          ) : (
            <p className="text-moon-400 text-sm text-center">{t("common.waitingForHost")}</p>
          )}
          {startError && <p className="text-crimson-500 text-sm">{startError}</p>}
        </CardContent>
      </Card>

      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>{t("insider.lobby.rulesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-moon-300 list-disc pl-5">
            {["rule1", "rule2", "rule3", "rule4", "rule5", "rule6"].map((k) => (
              <li key={k}>{t(`insider.lobby.${k}`)}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
