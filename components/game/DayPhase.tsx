"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatBox } from "@/components/game/ChatBox";
import { PlayerList } from "@/components/game/PlayerList";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import { SeerNote } from "@/components/game/SeerNote";
import { YourRoleBadge } from "@/components/game/YourRoleBadge";
import type { FilteredRoomState } from "@/types/game";
import { Sun } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function DayPhase({ room, socket }: { room: FilteredRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const isHost = room.you?.isHost;
  const lastEvent = room.log[room.log.length - 1];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-yellow-400" /> {t("werewolf.day.title", { dayCount: room.dayCount })}
          </CardTitle>
          <PhaseTimer endsAt={room.phaseEndsAt} />
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-night-900/60 border border-wolf-purple/20 p-4 mb-4">
            <p className="text-moon-200 text-sm">{lastEvent}</p>
          </div>
          {room.seerResult && (
            <div className="mb-4">
              <SeerNote result={room.seerResult} />
            </div>
          )}
          <PlayerList players={room.players} />
          {isHost && (
            <Button className="w-full mt-4" onClick={() => socket.emit("start_voting")}>
              {t("werewolf.day.proceedToVoting")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("werewolf.day.villageDiscussion")}</CardTitle>
        </CardHeader>
        <CardContent>
          <YourRoleBadge role={room.you?.role} />
          <ChatBox
            messages={room.chat ?? []}
            onSend={(text) => socket.emit("day_chat_message", { text })}
            disabled={!room.you?.alive}
            placeholder={room.you?.alive ? t("werewolf.day.sharePlaceholder") : t("werewolf.day.cannotSpeak")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
