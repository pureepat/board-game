"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatBox } from "@/components/game/ChatBox";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import { InsiderTable, Hourglass } from "@/components/insider/InsiderTable";
import { InsiderScoreboard } from "@/components/insider/InsiderScoreboard";
import type { CampSeat } from "@/components/table/CampfireCircle";
import type { InsiderAnswer, InsiderGameState, InsiderQuestion, InsiderWord } from "@/types/game";
import { Check, HelpCircle, RefreshCw, Send, SkipForward, X } from "lucide-react";
import { INS_ROLE_META } from "@/components/insider/insiderMeta";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SecretPeek, TalkOutLoud, usePlayMode } from "@/components/table/PlayMode";

const ANSWER_STYLE: Record<InsiderAnswer, string> = {
  YES: "bg-emerald-600 text-white",
  NO: "bg-crimson-600 text-white",
  UNKNOWN: "bg-night-600 text-moon-200",
  CORRECT: "bg-amber-400 text-night-950",
};

export function formatDuration(ms: number | null) {
  const s = Math.round((ms ?? 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The word in the viewer's language, with the other language as a hint. */
export function WordText({ word, className }: { word: InsiderWord; className?: string }) {
  const { locale } = useTranslation();
  const main = locale === "th" ? word.th : word.en;
  const alt = locale === "th" ? word.en : word.th;
  return (
    <span className={cn("flex flex-col items-center leading-tight", className)}>
      <span className="font-display">{main}</span>
      <span className="text-[10px] opacity-70">{alt}</span>
    </span>
  );
}

export function insiderSeats(
  room: InsiderGameState,
  label: (key: string, vars?: Record<string, string | number>) => string,
  extra?: (p: InsiderGameState["players"][number]) => Partial<CampSeat>
): CampSeat[] {
  return room.players.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    isSelf: p.isSelf,
    isHost: p.isHost,
    connected: p.connected,
    badge: p.role
      ? { label: label(`insider.roles.${p.role}.label`), hex: INS_ROLE_META[p.role].hex, secret: p.role === "INSIDER" && room.phase !== "GAME_OVER" }
      : null,
    note: [p.isGuesser && label("insider.board.guesser"), p.voted && "✓"].filter(Boolean).join(" ") || null,
    ...extra?.(p),
  }));
}

export function InsiderGame({ room, socket }: { room: InsiderGameState; socket: Socket }) {
  const { t } = useTranslation();
  const you = room.you;
  const phase = room.phase;
  const name = (id: string | null) => room.players.find((p) => p.id === id)?.nickname ?? "?";
  const master = room.players.find((p) => p.isMaster);
  const voting2 = phase === "INS_VOTE2";
  const total = room.players.filter((p) => p.connected).length;
  const cast = room.players.filter((p) => p.voted).length;
  const canEndDiscussion = Boolean(you?.isHost || you?.isMaster);
  const { local, showSecrets, peek } = usePlayMode();
  // At the same table, questions are spoken; the Master taps whoever said the word.
  const markingGuess = local && phase === "INS_QUESTIONS" && Boolean(you?.isMaster);
  const [guessPick, setGuessPick] = useState<string | null>(null);
  useEffect(() => setGuessPick(null), [phase]);
  // Before it's guessed, the word is known only to the Master and the Insider.
  const wordSecret = !room.guesserId;
  const wordShown = room.word && (!wordSecret || showSecrets) ? room.word : null;

  const seats = insiderSeats(room, t, (p) => ({
    selectable: (voting2 || markingGuess) && !p.isSelf && !p.isMaster,
    selected: voting2 ? room.yourVote2 === p.id : guessPick === p.id,
  }));
  const onSeatClick = voting2 ? (id: string) => socket.emit("ins_vote2", { targetId: id }) : markingGuess ? setGuessPick : undefined;

  const center = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        // In person, a covered word card flips up on tap (the same peek as the role card).
        onClick={room.word && wordSecret && local ? peek : undefined}
        className={cn(
          "flex h-16 w-24 items-center justify-center rounded-lg border-2 px-1 text-center shadow-[0_6px_14px_rgba(0,0,0,0.5)]",
          wordShown ? "border-amber-300 bg-[#f6ecd2] text-night-950" : "border-[#8a6d3b] bg-[#3b2a1a] text-[#d9c7a0]",
          !(room.word && wordSecret && local) && "cursor-default"
        )}
      >
        {wordShown ? <WordText word={wordShown} className="text-sm" /> : <HelpCircle className="h-7 w-7" />}
      </button>
      {room.phaseEndsAt && <Hourglass endsAt={room.phaseEndsAt} total={room.phaseSeconds} />}
    </div>
  );

  return (
    <div className="space-y-4">
      <InsiderTable seats={seats} center={center} onSeatClick={onSeatClick} />

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{t(`insider.phase.${phase}`)}</CardTitle>
            <PhaseTimer endsAt={room.phaseEndsAt} />
          </CardHeader>
          <CardContent className="space-y-4">
            <SecretPeek>
              <RoleCard room={room} />
            </SecretPeek>

            {phase === "INS_WORD" &&
              (you?.isMaster && room.wordOptions ? (
                <SecretPeek>
                <div className="space-y-2">
                  <p className="text-moon-300 text-sm">{t("insider.board.chooseWord")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {room.wordOptions.map((w, i) => (
                      <button
                        key={w.en}
                        type="button"
                        onClick={() => socket.emit("ins_choose", { index: i })}
                        className="rounded-lg border-2 border-amber-300/70 bg-[#f6ecd2] px-2 py-3 text-night-950 transition-transform hover:-translate-y-0.5"
                      >
                        <WordText word={w} className="text-sm" />
                      </button>
                    ))}
                  </div>
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => socket.emit("ins_reroll")}>
                    <RefreshCw className="w-3 h-3 mr-1" /> {t("insider.board.reroll")}
                  </Button>
                </div>
                </SecretPeek>
              ) : (
                <p className="text-moon-400 text-sm text-center py-2">{t("insider.board.waitingMaster", { name: master?.nickname ?? "?" })}</p>
              ))}

            {phase === "INS_QUESTIONS" && you?.isMaster && !local && <p className="text-moon-300 text-sm">{t("insider.board.masterHint")}</p>}

            {markingGuess && (
              <div className="space-y-2">
                <p className="text-moon-300 text-sm">{t("insider.board.localMasterHint")}</p>
                <Button className="w-full" disabled={!guessPick} onClick={() => guessPick && socket.emit("ins_mark_correct", { playerId: guessPick })}>
                  <Check className="w-4 h-4 mr-1" />
                  {guessPick ? t("insider.board.confirmCorrect", { name: name(guessPick) }) : t("insider.board.pickGuesser")}
                </Button>
              </div>
            )}

            {phase === "INS_DISCUSS" && (
              <div className="space-y-3">
                <p className="text-amber-300 text-sm">{t("insider.board.foundBy", { name: name(room.guesserId), time: formatDuration(room.elapsedMs) })}</p>
                <p className="text-moon-300 text-sm">{t("insider.board.discussHint")}</p>
                {canEndDiscussion && (
                  <Button className="w-full" onClick={() => socket.emit("ins_end_discussion")}>
                    {t("insider.board.endDiscussion")}
                  </Button>
                )}
              </div>
            )}

            {phase === "INS_VOTE1" && (
              <div className="space-y-3">
                <p className="text-moon-200 font-display text-lg text-center">{t("insider.board.vote1Question", { name: name(room.guesserId) })}</p>
                <p className="text-moon-400 text-xs text-center">{t("insider.board.vote1Hint", { name: name(room.guesserId) })}</p>
                <div className="flex gap-2">
                  <Button
                    className={cn("flex-1", room.yourVote1 === true && "ring-2 ring-amber-300")}
                    variant={room.yourVote1 === true ? "default" : "secondary"}
                    onClick={() => socket.emit("ins_vote1", { yes: true })}
                  >
                    <Check className="w-4 h-4 mr-1" /> {t("insider.board.yes")}
                  </Button>
                  <Button
                    className={cn("flex-1", room.yourVote1 === false && "ring-2 ring-amber-300")}
                    variant={room.yourVote1 === false ? "default" : "secondary"}
                    onClick={() => socket.emit("ins_vote1", { yes: false })}
                  >
                    <X className="w-4 h-4 mr-1" /> {t("insider.board.no")}
                  </Button>
                </div>
                <p className="text-moon-400/70 text-xs text-center">{t("insider.board.votedCount", { cast, total })}</p>
              </div>
            )}

            {voting2 && (
              <div className="space-y-2">
                {room.vote1Result && <p className="text-moon-400 text-xs">{t("insider.board.vote1Was", room.vote1Result)}</p>}
                <p className="text-moon-300 text-sm">{t("insider.board.vote2Hint", { name: name(room.guesserId) })}</p>
                {room.yourVote2 && <p className="text-amber-300 text-sm">{t("insider.board.yourVote", { name: name(room.yourVote2) })}</p>}
                <p className="text-moon-400/70 text-xs">{t("insider.board.votedCount", { cast, total })}</p>
              </div>
            )}

            {you?.isHost && phase !== "INS_QUESTIONS" && (
              <div className="border-t border-wolf-purple/20 pt-3">
                <Button variant="outline" size="sm" className="w-full" onClick={() => socket.emit("insider_force_advance")}>
                  <SkipForward className="w-3 h-3 mr-1" /> {t("insider.host.force")}
                </Button>
                <p className="text-moon-400/60 text-[11px] mt-1 text-center">{t("insider.host.forceHint")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {local && (phase === "INS_QUESTIONS" || phase === "INS_WORD") ? (
          <Card>
            <CardContent className="pt-6">
              <TalkOutLoud hint={t("insider.board.localAskHint", { name: master?.nickname ?? "?" })} />
            </CardContent>
          </Card>
        ) : phase === "INS_QUESTIONS" || phase === "INS_WORD" ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("insider.board.questionsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionFeed room={room} socket={socket} live={phase === "INS_QUESTIONS"} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("insider.board.chatTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ChatBox
                  messages={room.chat}
                  onSend={(text) => socket.emit("insider_chat_message", { text })}
                  placeholder={t("insider.board.chatPlaceholder")}
                />
              </CardContent>
            </Card>
            {room.questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("insider.board.questionsTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuestionFeed room={room} socket={socket} live={false} />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {room.match && <InsiderScoreboard match={room.match} selfId={room.you?.id} />}
    </div>
  );
}

function RoleCard({ room }: { room: InsiderGameState }) {
  const { t, locale } = useTranslation();
  const role = room.you?.role;
  if (!role) return null;
  const meta = INS_ROLE_META[role];
  const Icon = meta.icon;
  return (
    <div className="flex gap-3 rounded-lg border p-3" style={{ borderColor: `${meta.hex}80`, background: `${meta.hex}1a` }}>
      <Icon className="h-8 w-8 shrink-0" style={{ color: meta.hex }} />
      <div className="min-w-0 space-y-1">
        <p className="text-xs text-moon-400">{t("insider.board.yourRole")}</p>
        <p className="font-display text-lg" style={{ color: meta.hex }}>
          {t(`insider.roles.${role}.label`)}
        </p>
        <p className="text-moon-300 text-xs">{t(`insider.roles.${role}.desc`)}</p>
        {room.word && (
          <p className="text-sm text-moon-200">
            {t("insider.board.theWord")}: <span className="font-display text-amber-300">{locale === "th" ? room.word.th : room.word.en}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function QuestionFeed({ room, socket, live }: { room: InsiderGameState; socket?: Socket; live: boolean }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMaster = Boolean(room.you?.isMaster);

  useEffect(() => {
    if (live) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [room.questions.length, live]);

  function submit() {
    if (!text.trim() || !socket) return;
    socket.emit("ins_ask", { text });
    setText("");
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-2 overflow-y-auto scrollbar-thin rounded-t-lg bg-night-900/50 p-3" style={{ minHeight: 160, maxHeight: live ? 360 : 220 }}>
        {room.questions.length === 0 && <p className="text-moon-400/50 text-xs italic">{t("insider.board.noQuestions")}</p>}
        {room.questions.map((q) => (
          <QuestionRow
            key={q.id}
            q={q}
            live={live}
            canAnswer={live && isMaster}
            onAnswer={(a) => socket?.emit("ins_answer", { questionId: q.id, answer: a })}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      {live && !isMaster && (
        <div className="flex gap-2 p-2 bg-night-800 rounded-b-lg border-t border-wolf-purple/20">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={t("insider.board.askPlaceholder")}
            maxLength={200}
          />
          <Button size="icon" onClick={submit} aria-label={t("insider.board.ask")}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  q,
  live,
  canAnswer,
  onAnswer,
}: {
  q: InsiderQuestion;
  live: boolean;
  canAnswer: boolean;
  onAnswer: (a: InsiderAnswer) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0">
          <span className="text-wolf-purple font-medium">{q.nickname}:</span> <span className="text-moon-200 break-words">{q.text}</span>
        </p>
        {q.answer ? (
          <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold", ANSWER_STYLE[q.answer])}>{t(`insider.answers.${q.answer}`)}</span>
        ) : (
          live && !canAnswer && <span className="shrink-0 text-[11px] italic text-moon-400/60">{t("insider.board.waitingAnswer")}</span>
        )}
      </div>
      {canAnswer && !q.answer && (
        <div className="mt-1 flex flex-wrap gap-1">
          {(["YES", "NO", "UNKNOWN", "CORRECT"] as InsiderAnswer[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onAnswer(a)}
              className={cn("rounded px-2 py-1 text-xs font-bold transition-opacity hover:opacity-80", ANSWER_STYLE[a])}
            >
              {t(`insider.answers.${a}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
