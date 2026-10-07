"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatBox } from "@/components/game/ChatBox";
import { OnwPlayerList } from "@/components/onw/OnwPlayerList";
import { NightLog } from "@/components/onw/NightLog";
import { YourRoleCard } from "@/components/onw/YourRoleCard";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import type { OnwRoomState } from "@/types/game";
import { Sun } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function OnwDay({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const isHost = room.you?.isHost;

  return (
    <div className="space-y-4">
      <OnwPlayerList players={room.players} time="day" center={room.center} />

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-400" /> {t("onw.day.title")}
            </CardTitle>
            <PhaseTimer endsAt={room.phaseEndsAt} />
          </CardHeader>
          <CardContent>
            <p className="text-moon-400 text-sm mb-3">{t("onw.day.discussHint")}</p>
            {isHost && (
              <Button className="w-full" onClick={() => socket.emit("onw_start_voting")}>
                {t("onw.day.callTheVote")}
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("onw.day.villageDiscussion")}</CardTitle>
            </CardHeader>
            <CardContent>
              <YourRoleCard role={room.you?.startingRole} />
              <ChatBox
                messages={room.chat ?? []}
                onSend={(text) => socket.emit("day_chat_message", { text })}
                placeholder={t("onw.day.sharePlaceholder")}
              />
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
    </div>
  );
}
