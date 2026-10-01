"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HistoryCard } from "@/components/kraken/KrakenGame";
import { KRAKEN_ROLE_META } from "@/components/kraken/krakenMeta";
import type { KrakenRoomState } from "@/types/game";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function KrakenGameOver({ room, socket }: { room: KrakenRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const winner = room.winner;
  const key =
    winner === "PIRATES" ? (room.winReason === "mutiny" ? "PIRATES_mutiny" : "PIRATES_sabotage") : winner ?? "SAILORS";
  const roleKey = winner === "SAILORS" ? "SAILOR" : winner === "PIRATES" ? "PIRATE" : "CULTIST";
  const meta = KRAKEN_ROLE_META[roleKey];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col items-center gap-4">
      <Card className="max-w-lg w-full text-center animate-fade-in border-2 border-wolf-purple/50">
        <CardContent className="py-10">
          <Icon className={`w-12 h-12 mx-auto mb-4 ${meta.color}`} />
          <h2 className={`font-display text-3xl mb-2 ${meta.color}`}>{t(`kraken.gameOver.${key}.title`)}</h2>
          <p className="text-moon-300 text-sm">{t(`kraken.gameOver.${key}.desc`)}</p>
        </CardContent>
      </Card>

      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>{t("kraken.gameOver.finalRoles")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {room.players.map((p) => (
            <div key={p.id} className="rounded-lg border border-wolf-purple/20 bg-night-900/60 p-3 space-y-1">
              <p className="truncate text-sm text-moon-200">
                {p.nickname}
                {p.isSelf && <span className="text-moon-400 text-xs"> ({t("common.you")})</span>}
              </p>
              {p.role && <Badge variant={KRAKEN_ROLE_META[p.role].badge}>{t(`kraken.roles.${p.role}.label`)}</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="max-w-lg w-full">
        <HistoryCard history={room.history} />
      </div>

      {room.you?.isHost && (
        <Button size="lg" onClick={() => socket.emit("kraken_play_again")}>
          {t("common.playAgain")}
        </Button>
      )}
    </div>
  );
}
