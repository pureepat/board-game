"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatBox } from "@/components/game/ChatBox";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import { SeerNote } from "@/components/game/SeerNote";
import { YourRoleBadge } from "@/components/game/YourRoleBadge";
import type { FilteredRoomState } from "@/types/game";
import { Gavel, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function VotingPhase({ room, socket }: { room: FilteredRoomState; socket: Socket }) {
  const { t, tp } = useTranslation();
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {room.players.map((p) => {
              const voteCount = tally[p.id] || 0;
              const votedForByMe = votes[room.you?.id ?? ""] === p.id;
              const votable = alive && p.alive;
              return (
                <button
                  key={p.id}
                  disabled={!votable}
                  onClick={() => vote(p.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 transition-all",
                    "border-wolf-purple/20 bg-night-900/60",
                    !p.alive && "opacity-40",
                    votable && "hover:border-crimson-500 cursor-pointer",
                    votedForByMe && "border-crimson-500 bg-crimson-600/20 ring-1 ring-crimson-500"
                  )}
                >
                  <span className="text-sm text-moon-200">
                    {p.nickname}
                    {p.isSelf && <span className="text-moon-400 text-xs"> ({t("common.you")})</span>}
                  </span>
                  {voteCount > 0 && (
                    <span className="text-xs text-crimson-400 font-bold">
                      {tp("werewolf.voting.vote", voteCount)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <Button
            variant={hasAbstained ? "default" : "outline"}
            className={cn("w-full mt-3", hasAbstained && "ring-1 ring-crimson-500")}
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
  );
}
