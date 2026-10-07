"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Anchor, Skull, Waves } from "lucide-react";
import { LogCard } from "@/components/kraken/KrakenGame";
import { KrakenBoard } from "@/components/kraken/KrakenBoard";
import { KR_TEAM_HEX, KRAKEN_ROLE_META } from "@/components/kraken/krakenMeta";
import type { KrakenGameState } from "@/types/game";
import { useTranslation } from "@/lib/i18n/useTranslation";

const WINNER_ICON = { SAILORS: Anchor, PIRATES: Skull, CULT: Waves };

export function KrakenGameOver({ room, socket }: { room: KrakenGameState; socket: Socket }) {
  const { t } = useTranslation();
  const winner = room.winner ?? "SAILORS";
  const key = `${winner}_${room.winReason ?? "bay"}`;
  const Icon = WINNER_ICON[winner];
  const hex = KR_TEAM_HEX[winner];

  return (
    <div className="flex flex-col items-center gap-4">
      <Card className="max-w-lg w-full text-center animate-fade-in border-2" style={{ borderColor: hex }}>
        <CardContent className="py-8">
          <Icon className="w-12 h-12 mx-auto mb-4" style={{ color: hex }} />
          <h2 className="font-display text-3xl mb-2" style={{ color: hex }}>
            {t(`kraken.gameOver.${key}.title`)}
          </h2>
          <p className="text-moon-300 text-sm">{t(`kraken.gameOver.${key}.desc`)}</p>
        </CardContent>
      </Card>

      <div className="w-full max-w-md rounded-2xl border-4 border-[#2b1d12] bg-[#3b2414] p-3">
        <KrakenBoard room={room} />
      </div>

      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>{t("kraken.gameOver.finalRoles")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {room.players.map((p) => {
            const won = p.role && KRAKEN_ROLE_META[p.role].team === winner;
            return (
              <div
                key={p.id}
                className="rounded-lg border bg-night-900/60 p-3 space-y-1"
                style={{ borderColor: won ? hex : "rgba(109,40,217,0.2)" }}
              >
                <p className="truncate text-sm text-moon-200">
                  {p.nickname}
                  {p.isSelf && <span className="text-moon-400 text-xs"> ({t("common.you")})</span>}
                  {p.eliminated && <Skull className="inline w-3 h-3 ml-1 text-moon-400" />}
                </p>
                {p.role && (
                  <span className="inline-block rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: KRAKEN_ROLE_META[p.role].hex }}>
                    {t(`kraken.roles.${p.role}.label`)}
                  </span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="max-w-2xl w-full">
        <LogCard events={room.events} />
      </div>

      {room.you?.isHost && (
        <Button size="lg" onClick={() => socket.emit("kraken_play_again")}>
          {t("common.playAgain")}
        </Button>
      )}
    </div>
  );
}
