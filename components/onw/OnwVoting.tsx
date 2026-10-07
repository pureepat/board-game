"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatBox } from "@/components/game/ChatBox";
import { YourRoleCard } from "@/components/onw/YourRoleCard";
import { OnwPlayerList } from "@/components/onw/OnwPlayerList";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import type { OnwRoomState } from "@/types/game";
import { Gavel, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function OnwVoting({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const votes = room.vote?.votes ?? {};
  const tally = room.vote?.tally ?? {};
  // undefined = haven't voted yet, null = explicit abstain, id = voted for
  // someone — both are preserved distinctly over the wire (see VotingPhase.tsx).
  const myVote = votes[room.you?.id ?? ""];
  const hasAbstained = room.you?.id !== undefined && myVote === null && Object.prototype.hasOwnProperty.call(votes, room.you.id);

  function vote(targetId: string | null) {
    socket.emit("cast_vote", { targetId });
  }

  return (
    <div className="space-y-4">
      {/* Tap someone at the fire to vote for them; vote counts sit under each name. */}
      <OnwPlayerList
        players={room.players}
        time="day"
        center={room.center}
        selectable
        selectedId={typeof myVote === "string" ? myVote : null}
        onSelect={(id) => vote(id)}
        tally={tally}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-crimson-500" /> {t("onw.voting.title")}
            </CardTitle>
            <PhaseTimer endsAt={room.phaseEndsAt} />
          </CardHeader>
          <CardContent>
            <Button
              variant={hasAbstained ? "default" : "outline"}
              className={cn("w-full", hasAbstained && "ring-1 ring-crimson-500")}
              onClick={() => vote(null)}
            >
              <MinusCircle className="w-4 h-4 mr-2" />
              {hasAbstained ? t("onw.voting.abstained") : t("onw.voting.abstain")}
            </Button>

            <p className="text-moon-400/60 text-xs mt-4">
              {t("onw.voting.votesCastLine", { cast: Object.keys(votes).length, total: room.players.length })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("onw.voting.finalWords")}</CardTitle>
          </CardHeader>
          <CardContent>
            <YourRoleCard role={room.you?.startingRole} />
            <ChatBox
              messages={room.chat ?? []}
              onSend={(text) => socket.emit("day_chat_message", { text })}
              placeholder={t("onw.voting.makeCasePlaceholder")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
