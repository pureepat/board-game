"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatBox } from "@/components/game/ChatBox";
import { YourRoleCard } from "@/components/onw/YourRoleCard";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import type { OnwRoomState } from "@/types/game";
import { Gavel, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function OnwVoting({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  const { t, tp } = useTranslation();
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
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-crimson-500" /> {t("onw.voting.title")}
          </CardTitle>
          <PhaseTimer endsAt={room.phaseEndsAt} />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {room.players.map((p) => {
              const voteCount = tally[p.id] || 0;
              const votedForByMe = votes[room.you?.id ?? ""] === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => vote(p.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 transition-all",
                    "border-wolf-purple/20 bg-night-900/60 hover:border-crimson-500 cursor-pointer",
                    votedForByMe && "border-crimson-500 bg-crimson-600/20 ring-1 ring-crimson-500"
                  )}
                >
                  <span className="text-sm text-moon-200">
                    {p.nickname}
                    {p.isSelf && <span className="text-moon-400 text-xs"> ({t("common.you")})</span>}
                  </span>
                  {voteCount > 0 && (
                    <span className="text-xs text-crimson-400 font-bold">{tp("onw.voting.vote", voteCount)}</span>
                  )}
                </button>
              );
            })}
          </div>

          <Button
            variant={hasAbstained ? "default" : "outline"}
            className={cn("w-full mt-3", hasAbstained && "ring-1 ring-crimson-500")}
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
  );
}
