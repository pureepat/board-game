"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatBox } from "@/components/game/ChatBox";
import { InsiderTable } from "@/components/insider/InsiderTable";
import { InsiderScoreboard, matchWinners } from "@/components/insider/InsiderScoreboard";
import { InsiderMasterPicker } from "@/components/insider/InsiderMasterPicker";
import { QuestionFeed, WordText, insiderSeats } from "@/components/insider/InsiderGame";
import type { InsiderGameState } from "@/types/game";
import { Eye, HourglassIcon, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function InsiderGameOver({ room, socket }: { room: InsiderGameState; socket: Socket }) {
  const { t } = useTranslation();
  const winner = room.winner ?? "NONE";
  const name = (id: string | null) => room.players.find((p) => p.id === id)?.nickname ?? "?";
  const insider = name(room.insiderId);
  const tally = room.vote2Tally ?? {};

  // Everyone's role is public now; second-vote counts sit under each name.
  const seats = insiderSeats(room, t, (p) => ({
    note: tally[p.id] ? t("insider.gameOver.votes", { count: tally[p.id] }) : p.isGuesser ? t("insider.board.guesser") : null,
    selected: p.id === room.accusedId,
  }));

  const match = room.match;
  const matchOver = Boolean(match && match.round >= match.totalRounds);
  const champions = match && matchOver ? matchWinners(match) : [];

  const Icon = winner === "COMMONS" ? Trophy : winner === "INSIDER" ? Eye : HourglassIcon;
  const tone = winner === "COMMONS" ? "text-emerald-400" : winner === "INSIDER" ? "text-[#a78bfa]" : "text-moon-300";

  return (
    <div className="space-y-4">
      <Card className="animate-fade-in text-center">
        <CardContent className="space-y-3 pt-6">
          <Icon className={cn("mx-auto h-10 w-10", tone)} />
          <h2 className={cn("font-display text-2xl", tone)}>{t(`insider.gameOver.${winner}`)}</h2>
          <p className="text-moon-300 text-sm">{t(`insider.gameOver.${winner}_desc`, { name: insider })}</p>
          {winner === "INSIDER" && (
            <p className="text-moon-400 text-sm">
              {room.accusedId ? t("insider.gameOver.INSIDER_accused", { name: name(room.accusedId) }) : t("insider.gameOver.INSIDER_noone")}
            </p>
          )}
          {room.word && (
            <div className="mx-auto inline-flex flex-col items-center gap-1 pt-2">
              <span className="text-moon-400 text-xs">{t("insider.gameOver.word")}</span>
              <span className="rounded-lg border-2 border-amber-300 bg-[#f6ecd2] px-4 py-2 text-night-950">
                <WordText word={room.word} className="text-lg" />
              </span>
            </div>
          )}
          {matchOver && champions.length > 0 && (
            <p className="pt-2 font-display text-xl text-amber-300">
              {champions.length === 1
                ? t("insider.match.champion", { name: champions[0].nickname })
                : t("insider.match.tie", { names: champions.map((c) => c.nickname).join(", ") })}
            </p>
          )}
          {match && !matchOver && (
            <div className="mx-auto max-w-sm pt-2 text-left">
              <InsiderMasterPicker room={room} socket={socket} />
            </div>
          )}
          {room.you?.isHost ? (
            match && !matchOver ? (
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Button onClick={() => socket.emit("insider_next_round")}>
                  {t("insider.match.nextRound", { round: match.round + 1, total: match.totalRounds })}
                </Button>
                <Button variant="outline" onClick={() => socket.emit("insider_play_again")}>
                  {t("insider.match.endEarly")}
                </Button>
              </div>
            ) : (
              <Button className="mt-2" onClick={() => socket.emit("insider_play_again")}>
                {match ? t("insider.match.newMatch") : t("common.playAgain")}
              </Button>
            )
          ) : (
            <p className="text-moon-400 text-xs">{match && !matchOver ? t("insider.match.waitingNext") : t("common.waitingForHost")}</p>
          )}
        </CardContent>
      </Card>

      {match && <InsiderScoreboard match={match} gains={room.gains} selfId={room.you?.id} final={matchOver} />}

      <InsiderTable seats={seats} />

      <div className="grid md:grid-cols-2 gap-4">
        {room.questions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("insider.gameOver.questions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionFeed room={room} live={false} />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>{t("insider.board.chatTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChatBox messages={room.chat} onSend={(text) => socket.emit("insider_chat_message", { text })} placeholder={t("insider.board.chatPlaceholder")} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
