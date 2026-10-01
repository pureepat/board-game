"use client";

import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatBox } from "@/components/game/ChatBox";
import { cn } from "@/lib/utils";
import { Anchor, Check, Crown, Skull, Waves, X } from "lucide-react";
import type { KrakenCard, KrakenHistoryEntry, KrakenPlayer, KrakenRoomState } from "@/types/game";
import { KRAKEN_CARD_META, KRAKEN_ROLE_META } from "@/components/kraken/krakenMeta";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function KrakenGame({ room, socket }: { room: KrakenRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const captain = room.players.find((p) => p.id === room.captainId);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <StatusCard room={room} captainName={captain?.nickname ?? "?"} />
        <YourRoleCard room={room} />
        {room.phase === "CREW_SELECT" && <CrewSelect room={room} socket={socket} captainName={captain?.nickname ?? "?"} />}
        {room.phase === "CREW_VOTE" && <CrewVote room={room} socket={socket} />}
        {room.phase === "VOYAGE" && <Voyage room={room} socket={socket} />}
        {room.phase === "VOYAGE_RESULT" && <VoyageResult room={room} socket={socket} />}
        {room.you?.isHost && room.phase !== "VOYAGE_RESULT" && (
          <div className="text-center">
            <Button variant="outline" size="sm" onClick={() => socket.emit("kraken_force_advance")}>
              {t("kraken.host.forceAdvance")}
            </Button>
            <p className="text-moon-400/60 text-[11px] mt-1">{t("kraken.host.forceHint")}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("kraken.chat.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChatBox
              messages={room.chat}
              onSend={(text) => socket.emit("kraken_chat_message", { text })}
              placeholder={t("kraken.chat.placeholder")}
            />
          </CardContent>
        </Card>
        <HistoryCard history={room.history} />
      </div>
    </div>
  );
}

function Track({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-moon-300 mb-1">
        <span>{label}</span>
        <span className="tabular-nums">
          {value} / {max}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={cn("h-2 flex-1 rounded-full bg-night-700", i < value && color)} />
        ))}
      </div>
    </div>
  );
}

function StatusCard({ room, captainName }: { room: KrakenRoomState; captainName: string }) {
  const { t } = useTranslation();
  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Anchor className="w-5 h-5 text-moon-300" /> {t("kraken.status.voyage", { round: room.round })}
        </CardTitle>
        <span className="text-xs text-moon-300 flex items-center gap-1">
          <Crown className="w-3 h-3 text-yellow-400" /> {t("kraken.status.captain", { nickname: captainName })}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <Track label={t("kraken.tracks.sailors")} value={room.score.SAILORS} max={room.winScore} color="bg-emerald-500" />
        <Track label={t("kraken.tracks.pirates")} value={room.score.PIRATES} max={room.winScore} color="bg-crimson-500" />
        <Track label={t("kraken.tracks.kraken")} value={room.score.KRAKEN} max={room.winScore} color="bg-wolf-purple" />
        <p className="text-xs text-moon-400">
          {t("kraken.status.crewOf", { count: room.crewSize })} ·{" "}
          {t("kraken.status.rejects", { count: room.rejects, max: room.maxRejects })}
        </p>
      </CardContent>
    </Card>
  );
}

function YourRoleCard({ room }: { room: KrakenRoomState }) {
  const { t } = useTranslation();
  const role = room.you?.role;
  if (!role) return null;
  const meta = KRAKEN_ROLE_META[role];
  const Icon = meta.icon;
  const fellowPirates = role === "PIRATE" ? room.players.filter((p) => p.role === "PIRATE" && !p.isSelf) : [];

  return (
    <Card>
      <CardContent className="py-4 flex items-start gap-3">
        <Icon className={cn("w-8 h-8 shrink-0", meta.color)} />
        <div>
          <p className="text-xs text-moon-400">{t("kraken.status.yourAllegiance")}</p>
          <p className={cn("font-display text-lg", meta.color)}>{t(`kraken.roles.${role}.label`)}</p>
          <p className="text-moon-300 text-sm">{t(`kraken.roles.${role}.desc`)}</p>
          {role === "PIRATE" && (
            <p className="text-crimson-400 text-sm mt-1">
              {fellowPirates.length > 0
                ? t("kraken.status.fellowPirates", { names: fellowPirates.map((p) => p.nickname).join(", ") })
                : t("kraken.status.lonePirate")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerChip({
  player,
  selectable = false,
  selected = false,
  badge,
  onClick,
}: {
  player: KrakenPlayer;
  selectable?: boolean;
  selected?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      disabled={!selectable}
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
        "border-wolf-purple/20 bg-night-900/60",
        selectable && "hover:border-crimson-500 hover:bg-night-700 cursor-pointer",
        selected && "border-crimson-500 bg-crimson-600/20 ring-1 ring-crimson-500",
        !selectable && "cursor-default"
      )}
    >
      <span className="flex w-full items-center justify-between gap-1">
        <span className="truncate text-sm font-medium text-moon-200">
          {player.nickname}
          {player.isSelf && <span className="text-moon-400 text-xs"> ({t("common.you")})</span>}
        </span>
        {player.isCaptain && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
      </span>
      {player.role === "PIRATE" && !player.isSelf && (
        <Badge variant="werewolf">{t("kraken.roles.PIRATE.label")}</Badge>
      )}
      {badge}
    </button>
  );
}

function CrewSelect({ room, socket, captainName }: { room: KrakenRoomState; socket: Socket; captainName: string }) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<string[]>([]);
  const isCaptain = room.you?.isCaptain;

  function toggle(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < room.crewSize ? [...cur, id] : cur));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isCaptain
            ? t("kraken.select.youAreCaptain", { count: room.crewSize })
            : t("kraken.select.waitingCaptain", { nickname: captainName })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {room.players.map((p) => (
            <PlayerChip
              key={p.id}
              player={p}
              selectable={Boolean(isCaptain)}
              selected={isCaptain ? picked.includes(p.id) : false}
              onClick={() => toggle(p.id)}
            />
          ))}
        </div>
        {isCaptain && (
          <>
            <p className="text-moon-400 text-xs">{t("kraken.select.selected", { n: picked.length, count: room.crewSize })}</p>
            <Button
              className="w-full"
              disabled={picked.length !== room.crewSize}
              onClick={() => {
                socket.emit("kraken_select_crew", { crewIds: picked });
                setPicked([]);
              }}
            >
              {t("kraken.select.propose")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CrewVote({ room, socket }: { room: KrakenRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const voted = room.vote?.youVoted !== null && room.vote?.youVoted !== undefined;
  const votedIds = room.vote?.votedIds ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("kraken.vote.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {room.players.map((p) => (
            <PlayerChip
              key={p.id}
              player={p}
              selected={p.onCrew}
              badge={
                votedIds.includes(p.id) ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : undefined
              }
            />
          ))}
        </div>
        {voted ? (
          <p className="text-moon-300 text-sm">{t("kraken.vote.voted")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => socket.emit("kraken_vote", { approve: true })}>
              <Check className="w-4 h-4 mr-1" /> {t("kraken.vote.approve")}
            </Button>
            <Button variant="secondary" onClick={() => socket.emit("kraken_vote", { approve: false })}>
              <X className="w-4 h-4 mr-1" /> {t("kraken.vote.reject")}
            </Button>
          </div>
        )}
        <p className="text-moon-400 text-xs">
          {t("kraken.vote.votesIn", { cast: votedIds.length, total: room.players.length })}
        </p>
      </CardContent>
    </Card>
  );
}

function CardFace({ card, size = "md" }: { card: KrakenCard; size?: "sm" | "md" }) {
  const { t } = useTranslation();
  const meta = KRAKEN_CARD_META[card];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border border-wolf-purple/30 bg-night-900/60",
        size === "sm" ? "px-3 py-2" : "px-4 py-3"
      )}
    >
      <Icon className={cn(size === "sm" ? "w-5 h-5" : "w-7 h-7", meta.color)} />
      <span className="text-xs text-moon-200">{t(`kraken.cards.${card}.label`)}</span>
    </div>
  );
}

function Voyage({ room, socket }: { room: KrakenRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const onCrew = room.you?.onCrew;
  const yourCard = room.voyage?.yourCard ?? null;
  const allowed = room.voyage?.allowedCards ?? [];
  const crewPlayers = room.players.filter((p) => p.onCrew);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("kraken.voyage.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {crewPlayers.map((p) => (
            <PlayerChip
              key={p.id}
              player={p}
              selected
              badge={room.voyage?.playedIds.includes(p.id) ? <Check className="w-3 h-3 text-emerald-400" /> : undefined}
            />
          ))}
        </div>

        {onCrew && !yourCard && (
          <>
            <p className="text-moon-300 text-sm">{t("kraken.voyage.onCrew")}</p>
            <div className="grid grid-cols-3 gap-2">
              {allowed.map((card) => {
                const meta = KRAKEN_CARD_META[card];
                const Icon = meta.icon;
                return (
                  <button
                    key={card}
                    onClick={() => socket.emit("kraken_play_card", { card })}
                    className="flex flex-col items-center gap-1 rounded-lg border border-wolf-purple/30 bg-night-900/60 p-3 transition-all hover:border-crimson-500 hover:bg-night-700"
                  >
                    <Icon className={cn("w-7 h-7", meta.color)} />
                    <span className="text-xs text-moon-200">{t(`kraken.cards.${card}.label`)}</span>
                    <span className="text-[10px] text-moon-400/70 text-center">{t(`kraken.cards.${card}.desc`)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {onCrew && yourCard && (
          <div className="flex items-center gap-3">
            <CardFace card={yourCard} size="sm" />
            <p className="text-moon-300 text-sm">{t("kraken.voyage.played")}</p>
          </div>
        )}
        {!onCrew && <p className="text-moon-300 text-sm">{t("kraken.voyage.notOnCrew")}</p>}
        <p className="text-moon-400 text-xs">
          {t("kraken.voyage.cardsIn", { played: room.voyage?.playedIds.length ?? 0, total: crewPlayers.length })}
        </p>
      </CardContent>
    </Card>
  );
}

function VoyageResult({ room, socket }: { room: KrakenRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const last = room.history[room.history.length - 1];
  if (!last || !last.cards || !last.outcome || last.outcome === "REJECTED") return null;
  const color =
    last.outcome === "SAILORS" ? "text-emerald-400" : last.outcome === "PIRATES" ? "text-crimson-500" : "text-wolf-purple";

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>{t("kraken.result.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-moon-400 text-xs">{t("kraken.result.cardsRevealed")}</p>
        <div className="flex flex-wrap gap-2">
          {last.cards.map((c, i) => (
            <CardFace key={i} card={c} />
          ))}
        </div>
        <p className={cn("font-display text-lg", color)}>{t(`kraken.result.${last.outcome}`)}</p>
        {room.you?.isHost ? (
          <Button className="w-full" onClick={() => socket.emit("kraken_continue")}>
            {t("kraken.result.next")}
          </Button>
        ) : (
          <p className="text-moon-400 text-sm text-center">{t("kraken.result.waitingHost")}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function HistoryCard({ history }: { history: KrakenHistoryEntry[] }) {
  const { t } = useTranslation();
  const entries = [...history].reverse();
  const names = (list: string[]) => (list.length ? list.join(", ") : t("kraken.history.none"));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("kraken.history.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
        {entries.length === 0 && <p className="text-moon-400/60 text-sm italic">{t("kraken.history.empty")}</p>}
        {entries.map((h, i) => {
          const yes = Object.keys(h.votes).filter((n) => h.votes[n]);
          const no = Object.keys(h.votes).filter((n) => !h.votes[n]);
          return (
            <div key={entries.length - i} className="rounded-lg border border-wolf-purple/20 bg-night-900/60 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-moon-200 font-medium">
                  {t("kraken.history.entry", { round: h.round, captain: h.captain })}
                </span>
                <Badge variant={h.approved ? "villager" : "outline"}>
                  {h.approved ? t("kraken.history.approved") : t("kraken.history.rejected")}
                </Badge>
              </div>
              <p className="text-moon-300">{t("kraken.history.crew", { names: names(h.crew) })}</p>
              <p className="text-emerald-400/80">{t("kraken.history.approvedBy", { names: names(yes) })}</p>
              <p className="text-crimson-400/80">{t("kraken.history.rejectedBy", { names: names(no) })}</p>
              {h.cards && h.outcome && h.outcome !== "REJECTED" && (
                <p className="flex items-center gap-1 text-moon-300">
                  {h.outcome === "PIRATES" ? (
                    <Skull className="w-3 h-3 text-crimson-500" />
                  ) : h.outcome === "KRAKEN" ? (
                    <Waves className="w-3 h-3 text-wolf-purple" />
                  ) : (
                    <Anchor className="w-3 h-3 text-emerald-400" />
                  )}
                  {h.cards.map((c) => t(`kraken.cards.${c}.label`)).join(" · ")}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
