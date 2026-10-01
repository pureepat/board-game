"use client";

import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Copy, Wifi, WifiOff } from "lucide-react";
import type { KrakenRoomState } from "@/types/game";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function KrakenLobby({ room, socket }: { room: KrakenRoomState; socket: Socket }) {
  const { t, tp } = useTranslation();
  const isHost = room.you?.isHost;
  const count = room.players.length;
  const canStart = count >= 5 && count <= 11;
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

  const comp = room.composition;

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
          <p className="text-moon-400 text-sm">{tp("kraken.lobby.playersInRoom", count)}</p>
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
                  {p.connected ? (
                    <Wifi className="w-3 h-3 text-emerald-500/70" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-moon-400/70" />
                  )}
                </span>
              </div>
            ))}
          </div>

          {comp ? (
            <p className="text-moon-300 text-xs">
              {t("kraken.lobby.compositionLine", {
                count,
                sailors: comp.SAILOR,
                pirates: comp.PIRATE,
                cultists: comp.CULTIST,
              })}
            </p>
          ) : (
            <p className="text-moon-400 text-xs">{t("kraken.lobby.needPlayers")}</p>
          )}

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
          <CardTitle>{t("kraken.lobby.rulesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-moon-300 list-disc pl-5">
            {["rule1", "rule2", "rule3", "rule4", "rule5"].map((k) => (
              <li key={k}>{t(`kraken.lobby.${k}`)}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
