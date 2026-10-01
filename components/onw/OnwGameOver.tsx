"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnwPlayerList } from "@/components/onw/OnwPlayerList";
import type { OnwRoomState } from "@/types/game";
import { PartyPopper, Skull, Target } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function OnwGameOver({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const isHost = room.you?.isHost;
  const winner = room.winner;

  const winnerCopy =
    winner === "VILLAGE"
      ? { title: t("onw.gameOver.villageWinsTitle"), desc: t("onw.gameOver.villageWinsDesc"), icon: PartyPopper, color: "text-emerald-400" }
      : winner === "TANNER"
      ? { title: t("onw.gameOver.tannerWinsTitle"), desc: t("onw.gameOver.tannerWinsDesc"), icon: Target, color: "text-amber-500" }
      : { title: t("onw.gameOver.werewolvesWinTitle"), desc: t("onw.gameOver.werewolvesWinDesc"), icon: Skull, color: "text-crimson-500" };

  const Icon = winnerCopy.icon;

  return (
    <div className="flex flex-col items-center gap-4">
      <Card className="max-w-lg w-full text-center animate-fade-in border-2 border-wolf-purple/50">
        <CardContent className="py-10">
          <Icon className={`w-12 h-12 mx-auto mb-4 ${winnerCopy.color}`} />
          <h2 className={`font-display text-3xl mb-2 ${winnerCopy.color}`}>{winnerCopy.title}</h2>
          <p className="text-moon-300 text-sm">{winnerCopy.desc}</p>
        </CardContent>
      </Card>

      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>{t("onw.gameOver.finalRoles")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OnwPlayerList players={room.players} />
        </CardContent>
      </Card>

      {isHost && (
        <Button size="lg" onClick={() => socket.emit("onw_play_again")}>
          {t("common.playAgain")}
        </Button>
      )}
    </div>
  );
}
