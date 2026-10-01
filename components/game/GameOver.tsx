"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayerList } from "@/components/game/PlayerList";
import type { FilteredRoomState } from "@/types/game";
import { PartyPopper, Skull } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function GameOver({ room, socket }: { room: FilteredRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const villageWon = room.winner === "VILLAGE";
  const isHost = room.you?.isHost;

  return (
    <div className="flex flex-col items-center gap-4">
      <Card className="max-w-lg w-full text-center animate-fade-in border-2 border-wolf-purple/50">
        <CardContent className="py-10">
          {villageWon ? (
            <PartyPopper className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
          ) : (
            <Skull className="w-12 h-12 mx-auto mb-4 text-crimson-500" />
          )}
          <h2 className={`font-display text-3xl mb-2 ${villageWon ? "text-emerald-400" : "text-crimson-500"}`}>
            {villageWon ? t("werewolf.gameOver.villageWins") : t("werewolf.gameOver.werewolvesWin")}
          </h2>
          <p className="text-moon-300 text-sm">
            {villageWon ? t("werewolf.gameOver.villageWinDesc") : t("werewolf.gameOver.werewolvesWinDesc")}
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>{t("werewolf.gameOver.finalRoles")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PlayerList players={room.players} />
        </CardContent>
      </Card>

      {isHost && (
        <Button size="lg" onClick={() => socket.emit("play_again")}>
          {t("common.playAgain")}
        </Button>
      )}
    </div>
  );
}
