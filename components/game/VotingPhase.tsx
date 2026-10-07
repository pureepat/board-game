"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatBox } from "@/components/game/ChatBox";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import { SeerNote } from "@/components/game/SeerNote";
import { YourRoleBadge } from "@/components/game/YourRoleBadge";
import { PlayerList } from "@/components/game/PlayerList";
import type { FilteredRoomState } from "@/types/game";
import { Gavel, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function VotingPhase({ room, socket }: { room: FilteredRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const alive = room.you?.alive;
  const votes = room.vote?.votes ?? {};
  const tally = room.vote?.tally ?? {};
  const alivePlayers = room.players.filter((p) => p.alive);
  const totalAlive = alivePlayers.length;
  // votes[you.id] is undefined until a choice is registered, null once an
  // explicit abstain is cast, or a player id — distinct states preserved
  // over the wire (JSON keeps `null`, drops missing keys), so this reads
  // directly off the public vote map rather than a locally-tracked selection.
  const myVote = votes[room.you?.id ?? ""];
  const hasAbstained = room.you?.id !== undefined && myVote === null && Object.prototype.hasOwnProperty.call(votes, room.you.id);

  function vote(targetId: string | null) {
    socket.emit("cast_vote", { targetId });
  }

  return (
    <div className="space-y-4">
      {/* Tap someone at the fire to vote for them; vote counts sit under each name. */}
      <PlayerList
        players={room.players}
        time="day"
        selectable={Boolean(alive)}
        selectedId={typeof myVote === "string" ? myVote : null}
        onSelect={(id) => vote(id)}
        tally={tally}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-crimson-500" /> {t("werewolf.voting.title", { dayCount: room.dayCount })}
            </CardTitle>
            <PhaseTimer endsAt={room.phaseEndsAt} />
          </CardHeader>
          <CardContent>
            {!alive && <p className="text-moon-400 text-sm mb-3">{t("werewolf.voting.eliminatedObserve")}</p>}
            {room.seerResult && (
              <div className="mb-3">
                <SeerNote result={room.seerResult} />
              </div>
            )}
            <Button
              variant={hasAbstained ? "default" : "outline"}
              className={cn("w-full", hasAbstained && "ring-1 ring-crimson-500")}
              disabled={!alive}
              onClick={() => vote(null)}
            >
              <MinusCircle className="w-4 h-4 mr-2" />
              {hasAbstained ? t("werewolf.voting.abstained") : t("werewolf.voting.abstain")}
            </Button>

            <p className="text-moon-400/60 text-xs mt-4">
              {t("werewolf.voting.votesCastLine", { cast: Object.keys(votes).length, total: totalAlive })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("werewolf.voting.finalWords")}</CardTitle>
          </CardHeader>
          <CardContent>
            <YourRoleBadge role={room.you?.role} />
            <ChatBox
              messages={room.chat ?? []}
              onSend={(text) => socket.emit("day_chat_message", { text })}
              disabled={!alive}
              placeholder={alive ? t("werewolf.voting.makeCasePlaceholder") : t("werewolf.voting.cannotSpeakPlaceholder")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
