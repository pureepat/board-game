"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatBox } from "@/components/game/ChatBox";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, ArrowUp, Compass, Crown, FileText, Hand, MicOff, Moon, Skull, Star, Waves, WifiOff } from "lucide-react";
import type { KrakenEvent, KrakenGameState, KrakenNavCard, KrakenPlayer, KrakenPrivateNote } from "@/types/game";
import { KrakenBoard } from "@/components/kraken/KrakenBoard";
import { KR_EFFECT_ICON, KR_GUN_ICON, KR_HEX, KR_TEAM_HEX, KRAKEN_ROLE_META } from "@/components/kraken/krakenMeta";
import { useTranslation } from "@/lib/i18n/useTranslation";

type T = ReturnType<typeof useTranslation>["t"];

const WOOD = {
  background:
    "repeating-linear-gradient(92deg, rgba(0,0,0,0.06) 0 2px, transparent 2px 14px), radial-gradient(ellipse at center, #6b4426 0%, #4a2d18 60%, #2e1b0e 100%)",
};

// Muted portrait colors, picked by nickname so a player keeps the same color all game.
const PORTRAIT_COLORS = ["#8e5c3a", "#4f6d7a", "#7a5c8e", "#5c7a4f", "#8e4f4f", "#4f5c8e", "#8e7a4f", "#3f7a72"];
function portraitColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PORTRAIT_COLORS[h % PORTRAIT_COLORS.length];
}

const DIR_ICON = { RED: ArrowLeft, BLUE: ArrowRight, YELLOW: ArrowUp };

// What tapping a seat does depends on the phase and who you are.
type SelectMode =
  | { kind: "none" }
  | { kind: "appoint"; allowed: string[] }
  | { kind: "single"; allowed: string[] }
  | { kind: "guns"; allowed: string[] };

function selectModeFor(room: KrakenGameState): SelectMode {
  const you = room.you;
  if (!you || you.eliminated) return { kind: "none" };
  const alive = room.players.filter((p) => !p.eliminated).map((p) => p.id);
  if (room.phase === "KR_APPOINT" && you.isCaptain) return { kind: "appoint", allowed: room.appointable ?? [] };
  if (room.phase === "KR_ACTION" && you.isCaptain) return { kind: "single", allowed: alive.filter((id) => id !== you.id) };
  if (room.phase === "KR_RITUAL" && you.isCultLeader) {
    if (room.pending?.ritual === "CONVERSION") return { kind: "single", allowed: room.conversionTargets ?? [] };
    if (room.pending?.ritual === "GUN_STASH") return { kind: "guns", allowed: alive };
  }
  return { kind: "none" };
}

export function KrakenGame({ room, socket }: { room: KrakenGameState; socket: Socket }) {
  const { t } = useTranslation();
  const [sel, setSel] = useState<string[]>([]);
  const mode = selectModeFor(room);

  // Any change of phase, round or pending step starts a fresh selection.
  const stepKey = `${room.phase}|${room.round}|${room.events.length}`;
  useEffect(() => setSel([]), [stepKey]);

  function tap(id: string) {
    if (mode.kind === "none" || !mode.allowed.includes(id)) return;
    if (mode.kind === "guns") return setSel((cur) => (cur.length < 3 ? [...cur, id] : cur));
    const max = mode.kind === "appoint" ? 2 : 1;
    setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < max ? [...cur, id] : max === 1 ? [id] : cur));
  }

  // Seat everyone else clockwise from your left: left column (bottom→top),
  // across the top, then down the right. You sit at the bottom, by your hand.
  const selfIdx = room.players.findIndex((p) => p.isSelf);
  const others = [...room.players.slice(selfIdx + 1), ...room.players.slice(0, Math.max(0, selfIdx))].filter((p) => !p.isSelf);
  const side = Math.min(2, Math.floor(others.length / 3));
  const left = others.slice(0, side).reverse();
  const top = others.slice(side, others.length - side);
  const right = others.slice(others.length - side);
  const self = room.players.find((p) => p.isSelf);

  const seat = (p: KrakenPlayer) => <Seat key={p.id} room={room} player={p} mode={mode} sel={sel} onTap={() => tap(p.id)} />;
  const silenced = Boolean(room.you?.eliminated || self?.tongueless);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-3 md:p-5 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)] border-4 border-[#2b1d12]" style={WOOD}>
        {/* Phones: everyone else in one wrapped row. md+: seated around the board. */}
        <div className="md:hidden flex flex-wrap justify-center gap-2 mb-3">{others.map(seat)}</div>
        <div className="hidden md:flex flex-wrap justify-center gap-2 mb-3">{top.map(seat)}</div>

        <div className="grid grid-cols-1 md:grid-cols-[128px_minmax(0,1fr)_128px] gap-3 items-center">
          <div className="hidden md:flex flex-col justify-center items-center gap-2">{left.map(seat)}</div>
          <div className="mx-auto w-full max-w-[460px]">
            <KrakenBoard room={room} />
            <DeckStrip room={room} />
          </div>
          <div className="hidden md:flex flex-col justify-center items-center gap-2">{right.map(seat)}</div>
        </div>

        <PhaseBanner room={room} />

        <div className="mt-4 flex flex-col md:flex-row items-center md:items-end justify-center gap-4 rounded-xl bg-black/25 p-3 md:p-4">
          <div className="flex items-end gap-3">
            {self && <Seat room={room} player={self} mode={mode} sel={sel} onTap={() => tap(self.id)} />}
            {room.you?.role && <RoleCard room={room} />}
          </div>
          <div className="flex flex-col items-center gap-2 md:min-w-[300px]">
            <p className="text-[11px] uppercase tracking-widest text-[#c9a86a]">{t("kraken.board.yourHand")}</p>
            <HandActions room={room} socket={socket} mode={mode} sel={sel} onReset={() => setSel([])} />
            {room.you?.isHost && (
              <button
                type="button"
                onClick={() => socket.emit("kraken_force_advance")}
                title={t("kraken.host.forceHint")}
                className="text-[11px] text-[#c9a86a]/80 underline-offset-2 hover:underline"
              >
                {t("kraken.host.forceAdvance")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("kraken.chat.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChatBox
              messages={room.chat}
              onSend={(text) => socket.emit("kraken_chat_message", { text })}
              placeholder={silenced ? t("kraken.chat.silenced") : t("kraken.chat.placeholder")}
              disabled={silenced}
            />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <SecretsCard notes={room.you?.privateLog ?? []} />
          <LogCard events={room.events} />
        </div>
      </div>
    </div>
  );
}

// --- Seats ------------------------------------------------------------------

function Seat({
  room,
  player,
  mode,
  sel,
  onTap,
}: {
  room: KrakenGameState;
  player: KrakenPlayer;
  mode: SelectMode;
  sel: string[];
  onTap: () => void;
}) {
  const { t } = useTranslation();
  const selectable = mode.kind !== "none" && mode.allowed.includes(player.id);
  const selected = sel.includes(player.id);
  const waiting =
    (room.phase === "KR_MUTINY" && room.mutiny && !player.isCaptain && !player.eliminated && !room.mutiny.committedIds.includes(player.id)) ||
    ((room.phase === "KR_NAV_DISCARD" || room.phase === "KR_NAV_CHOOSE") && room.nav?.waitingIds.includes(player.id));
  const showRole = player.role && (!player.isSelf || room.phase === "GAME_OVER");

  // Preview of the officer you're about to appoint / guns you're about to hand out.
  let preview: string | null = null;
  if (mode.kind === "appoint" && selected) preview = sel[0] === player.id ? t("kraken.board.lieutenant") : t("kraken.board.navigator");
  if (mode.kind === "guns" && selected) preview = `+${sel.filter((x) => x === player.id).length}`;

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onTap}
      className={cn(
        "relative w-[100px] sm:w-[116px] rounded-lg border-2 border-[#8a6d3b] bg-[#efe2c2] px-2 pt-2 pb-1.5 text-[#2b1d12] shadow-md shadow-black/40 transition-all",
        selectable ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg ring-2 ring-[#ffd166]/60" : "cursor-default",
        selected && "ring-4 ring-sky-400 -translate-y-1",
        player.eliminated && "grayscale opacity-60",
        !player.connected && "opacity-50"
      )}
    >
      {/* Officer standees */}
      <span className="absolute -top-3 -right-2 flex gap-0.5">
        {player.isCaptain && <Standee icon={Crown} color="text-yellow-400" title={t("kraken.board.captain")} />}
        {player.isLieutenant && <Standee icon={Star} color="text-slate-200" title={t("kraken.board.lieutenant")} />}
        {player.isNavigator && <Standee icon={Compass} color="text-amber-300" title={t("kraken.board.navigator")} />}
      </span>
      {player.offDuty && !player.eliminated && (
        <span
          title={t("kraken.board.offDuty")}
          className="absolute -top-2.5 -left-2 flex h-6 w-6 items-center justify-center rounded-full border border-[#c9a86a] bg-[#3b2a1a]"
        >
          <Moon className="h-3.5 w-3.5 text-[#c9a86a]" />
        </span>
      )}

      <div
        className="relative mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#8a6d3b] font-display text-lg text-[#f3e7c9]"
        style={{ background: portraitColor(player.nickname) }}
      >
        {player.nickname.slice(0, 1).toUpperCase()}
        {player.eliminated && <Skull className="absolute h-6 w-6 text-white/90" />}
        {waiting && <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-amber-400 animate-pulse" />}
      </div>
      <p className="truncate text-center text-xs font-semibold">
        {player.nickname}
        {player.isSelf && <span className="font-normal opacity-70"> ({t("common.you")})</span>}
      </p>

      <div className="mt-1 flex items-center justify-center gap-2 text-[10px] font-semibold">
        <span title={t("kraken.board.guns")} className="flex items-center gap-0.5">
          <KR_GUN_ICON className="h-3 w-3" /> {player.guns}
        </span>
        <span title={t("kraken.board.resumes")} className="flex items-center gap-0.5">
          <FileText className="h-3 w-3" /> {player.resumes}
        </span>
        {player.tongueless && <MicOff className="h-3 w-3 text-[#c0392b]" />}
        {!player.connected && <WifiOff className="h-3 w-3" />}
      </div>

      <div className="mt-1 flex min-h-[16px] flex-wrap items-center justify-center gap-1">
        {showRole && player.role && (
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: KRAKEN_ROLE_META[player.role].hex }}>
            {t(`kraken.roles.${player.role}.label`)}
          </span>
        )}
        {player.notTeams.map((team) => (
          <span
            key={team}
            className="rounded border px-1 text-[9px] font-semibold line-through"
            style={{ borderColor: KR_TEAM_HEX[team], color: KR_TEAM_HEX[team] }}
          >
            {t(`kraken.teams.${team}`)}
          </span>
        ))}
        {preview && <span className="rounded bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold text-white">{preview}</span>}
      </div>
    </button>
  );
}

function Standee({ icon: Icon, color, title }: { icon: any; color: string; title: string }) {
  return (
    <span title={title} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#c9a86a] bg-[#2b1d12] shadow">
      <Icon className={cn("h-3.5 w-3.5", color)} />
    </span>
  );
}

// --- Cards ------------------------------------------------------------------

export function NavCard({
  card,
  size = "md",
  selected = false,
  onClick,
}: {
  card: KrakenNavCard | null;
  size?: "sm" | "md";
  selected?: boolean;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const dims = size === "sm" ? "w-12 h-[72px]" : "w-24 h-36";

  if (!card) {
    return (
      <div className={cn(dims, "rounded-lg border-2 border-[#c9a86a] bg-[#1a2a44] shadow-md shadow-black/50 flex items-center justify-center")}>
        <Waves className={cn(size === "sm" ? "w-4 h-4" : "w-8 h-8", "text-[#c9a86a]")} />
      </div>
    );
  }

  const hex = KR_HEX[card.color];
  const Dir = DIR_ICON[card.color];
  const Effect = KR_EFFECT_ICON[card.effect];
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={t(`kraken.effects.${card.effect}.desc`)}
      className={cn(
        dims,
        "flex flex-col overflow-hidden rounded-lg border-2 bg-[#efe2c2] shadow-md shadow-black/50 transition-transform",
        onClick && "hover:-translate-y-2 cursor-pointer",
        selected ? "-translate-y-2 ring-4 ring-sky-400 border-sky-400" : "border-[#8a6d3b]"
      )}
    >
      <div className="flex items-center justify-center" style={{ background: hex, height: size === "sm" ? 26 : 56 }}>
        <Dir className={cn("text-white", size === "sm" ? "h-4 w-4" : "h-9 w-9")} strokeWidth={3} />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-1">
        <Effect className={size === "sm" ? "h-4 w-4" : "h-6 w-6"} style={{ color: hex }} />
        <span className={cn("text-center font-bold leading-tight text-[#2b1d12]", size === "sm" ? "text-[7px]" : "text-[11px]")}>
          {t(`kraken.effects.${card.effect}.label`)}
        </span>
        {size === "md" && <span className="text-[9px] font-semibold text-[#2b1d12]/60">{t(`kraken.colors.${card.color}`)}</span>}
      </div>
    </Tag>
  );
}

function DeckStrip({ room }: { room: KrakenGameState }) {
  const { t } = useTranslation();
  return (
    <div className="mt-2 flex items-end justify-center gap-4 text-[10px] font-semibold text-[#f3e7c9]">
      <div className="flex flex-col items-center gap-1">
        <NavCard card={null} size="sm" />
        <span>
          {t("kraken.board.deck")} · {room.deckCount}
        </span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="w-12 h-[72px] rounded-lg border-2 border-dashed border-[#c9a86a]/60" />
        <span>
          {t("kraken.board.discard")} · {room.discardCount}
        </span>
      </div>
      {room.lastCard && (
        <div key={room.events.length} className="flex flex-col items-center gap-1 animate-card-flip">
          <NavCard card={room.lastCard} size="sm" />
          <span>{t("kraken.board.lastCard")}</span>
        </div>
      )}
    </div>
  );
}

function RoleCard({ room }: { room: KrakenGameState }) {
  const { t } = useTranslation();
  const role = room.you!.role!;
  const meta = KRAKEN_ROLE_META[role];
  const Icon = meta.icon;
  const known = room.players.filter((p) => !p.isSelf && p.role);

  return (
    <div className="flex w-36 flex-col overflow-hidden rounded-lg border-2 border-[#8a6d3b] bg-[#efe2c2] text-[#2b1d12] shadow-md shadow-black/50">
      <div className="px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: meta.hex }}>
        {t(`kraken.roles.${role}.label`)}
      </div>
      <div className="flex flex-col items-center gap-1 p-2">
        <Icon className="h-8 w-8" style={{ color: meta.hex }} />
        <p className="text-center text-[10px] leading-snug opacity-80">{t(`kraken.roles.${role}.desc`)}</p>
        {known.length > 0 && (
          <p className="text-center text-[10px] font-semibold" style={{ color: meta.hex }}>
            {known.map((p) => `${p.nickname} (${t(`kraken.roles.${p.role}.label`)})`).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

// --- Instructions + hand ------------------------------------------------------

function PhaseBanner({ room }: { room: KrakenGameState }) {
  const { t } = useTranslation();
  const name = (pred: (p: KrakenPlayer) => boolean) => room.players.find(pred)?.nickname ?? "?";
  const captain = name((p) => p.isCaptain);
  const you = room.you;
  const pendingLabel =
    room.pending?.kind === "ACTION" && room.pending.type
      ? t(`kraken.actions.${room.pending.type}.label`)
      : room.pending?.ritual
      ? t(`kraken.rituals.${room.pending.ritual}.label`)
      : "";

  let text = "";
  let sub = "";
  switch (room.phase) {
    case "KR_APPOINT":
      text = you?.isCaptain ? t("kraken.phase.appointYou") : t("kraken.phase.appointWait", { captain });
      break;
    case "KR_MUTINY":
      text = t("kraken.phase.mutinyTitle", { lieutenant: name((p) => p.isLieutenant), navigator: name((p) => p.isNavigator) });
      sub = t("kraken.phase.mutinyHint", { threshold: room.threshold });
      break;
    case "KR_NAV_DISCARD":
      text = room.nav?.yourHand ? t("kraken.phase.discardYou") : t("kraken.phase.discardWait");
      sub = t("kraken.phase.noTalk");
      break;
    case "KR_NAV_CHOOSE":
      text = room.nav?.yourOptions ? t("kraken.phase.chooseYou") : t("kraken.phase.chooseWait", { navigator: name((p) => p.isNavigator) });
      sub = t("kraken.phase.noTalk");
      break;
    case "KR_ACTION":
      text = you?.isCaptain
        ? t("kraken.phase.actionYou", { action: pendingLabel })
        : t("kraken.phase.actionWait", { captain, action: pendingLabel });
      sub = room.pending?.type ? t(`kraken.actions.${room.pending.type}.desc`) : "";
      break;
    case "KR_RITUAL":
      text = you?.isCultLeader
        ? room.pending?.ritual === "CONVERSION"
          ? t("kraken.phase.ritualConversion")
          : t("kraken.phase.ritualGuns")
        : t("kraken.phase.ritualWait", { ritual: pendingLabel });
      break;
  }
  if (you?.eliminated) sub = t("kraken.phase.spectating");
  if (!text) return null;

  return (
    <div className="mx-auto mt-4 max-w-2xl rounded-md border-2 border-[#8a6d3b] bg-[#efe2c2] px-4 py-2 text-center text-[#2b1d12] shadow-md shadow-black/40">
      <p className="text-sm font-semibold">{text}</p>
      {sub && <p className="text-[11px] opacity-75 mt-0.5">{sub}</p>}
    </div>
  );
}

function HandActions({
  room,
  socket,
  mode,
  sel,
  onReset,
}: {
  room: KrakenGameState;
  socket: Socket;
  mode: SelectMode;
  sel: string[];
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const [cardIdx, setCardIdx] = useState<number | null>(null);
  const stepKey = `${room.phase}|${room.round}|${room.events.length}`;
  useEffect(() => setCardIdx(null), [stepKey]);
  const muted = "text-sm text-[#f3e7c9]/80 text-center max-w-[260px]";

  if (room.you?.eliminated) return <p className={muted}>{t("kraken.phase.spectating")}</p>;

  if (room.phase === "KR_APPOINT" && mode.kind === "appoint") {
    return (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onReset} disabled={!sel.length}>
          {t("kraken.phase.reset")}
        </Button>
        <Button disabled={sel.length !== 2} onClick={() => socket.emit("kr_appoint", { lieutenantId: sel[0], navigatorId: sel[1] })}>
          {t("kraken.phase.appoint")} ({sel.length}/2)
        </Button>
      </div>
    );
  }

  if (room.phase === "KR_MUTINY" && room.mutiny) {
    const { canCommit, yourCommit, committedIds } = room.mutiny;
    const total = room.players.filter((p) => !p.isCaptain && !p.eliminated).length;
    if (!canCommit) return <p className={muted}>{t("kraken.phase.mutinyCaptain")}</p>;
    if (yourCommit !== null) {
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#c9a86a] bg-[#2b1d12]">
            <Hand className="h-7 w-7 text-[#c9a86a]" />
          </span>
          <p className={muted}>{t("kraken.phase.mutinyDone", { done: committedIds.length, total })}</p>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: (room.you?.guns ?? 0) + 1 }, (_, n) => (
          <button
            key={n}
            type="button"
            onClick={() => socket.emit("kr_mutiny", { guns: n })}
            className="flex flex-col items-center gap-1 rounded-lg border-2 border-[#8a6d3b] bg-[#efe2c2] px-3 py-2 text-[#2b1d12] shadow-md shadow-black/40 transition-transform hover:-translate-y-1"
          >
            <span className="flex gap-0.5">
              {n === 0 ? (
                <Hand className="h-5 w-5 opacity-60" />
              ) : (
                Array.from({ length: n }, (_, i) => <KR_GUN_ICON key={i} className="h-5 w-5 text-[#c0392b]" />)
              )}
            </span>
            <span className="text-[11px] font-bold">{t("kraken.phase.hold", { n })}</span>
          </button>
        ))}
      </div>
    );
  }

  if (room.phase === "KR_NAV_DISCARD" || room.phase === "KR_NAV_CHOOSE") {
    const cards = room.nav?.yourHand ?? room.nav?.yourOptions;
    const discarding = room.phase === "KR_NAV_DISCARD";
    if (!cards) {
      return (
        <p className={muted}>
          {discarding
            ? t("kraken.phase.discardWait")
            : t("kraken.phase.chooseWait", { navigator: room.players.find((p) => p.isNavigator)?.nickname ?? "?" })}
        </p>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-3">
          {cards.map((c, i) => (
            <NavCard key={i} card={c} selected={cardIdx === i} onClick={() => setCardIdx(i)} />
          ))}
        </div>
        <Button
          disabled={cardIdx === null}
          variant={discarding ? "secondary" : "default"}
          onClick={() => socket.emit(discarding ? "kr_discard" : "kr_choose", { index: cardIdx })}
        >
          {discarding ? `${t("kraken.board.discard")} ✕` : `${t("kraken.phase.confirm")} ➜`}
        </Button>
      </div>
    );
  }

  if (room.phase === "KR_ACTION" && room.you?.isCaptain) {
    return (
      <Button disabled={sel.length !== 1} onClick={() => socket.emit("kr_action", { targetId: sel[0] })}>
        {t("kraken.phase.confirm")}
      </Button>
    );
  }

  if (room.phase === "KR_RITUAL" && room.you?.isCultLeader) {
    if (mode.kind === "single") {
      return (
        <Button disabled={sel.length !== 1} onClick={() => socket.emit("kr_ritual", { targetId: sel[0] })}>
          {t("kraken.phase.confirm")}
        </Button>
      );
    }
    const gunsTo: Record<string, number> = {};
    for (const id of sel) gunsTo[id] = (gunsTo[id] ?? 0) + 1;
    return (
      <div className="flex flex-col items-center gap-2">
        <p className={muted}>{t("kraken.phase.gunsLeft", { left: 3 - sel.length })}</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onReset} disabled={!sel.length}>
            {t("kraken.phase.reset")}
          </Button>
          <Button onClick={() => socket.emit("kr_ritual", { gunsTo })}>{t("kraken.phase.confirm")}</Button>
        </div>
      </div>
    );
  }

  return null;
}

// --- Logs -------------------------------------------------------------------

function cardText(t: T, c: KrakenNavCard) {
  return `${t(`kraken.effects.${c.effect}.label`)} (${t(`kraken.log.dirs.${c.color}`)})`;
}

export function eventText(t: T, e: KrakenEvent): string {
  switch (e.t) {
    case "START":
      return t("kraken.log.START", { map: t(`kraken.lobby.maps.${e.map}`), captain: e.captain });
    case "APPOINT":
      return t("kraken.log.APPOINT", { captain: e.captain, lieutenant: e.lieutenant, navigator: e.navigator });
    case "MUTINY": {
      const head = e.success
        ? t("kraken.log.MUTINY_SUCCESS", { total: e.total, threshold: e.threshold, captain: e.newCaptain ?? "?" })
        : t("kraken.log.MUTINY_FAIL", { total: e.total, threshold: e.threshold });
      const shown = Object.entries(e.commits).filter(([, n]) => n > 0);
      return shown.length ? `${head} ${t("kraken.log.commits", { list: shown.map(([who, n]) => `${who} ${n}`).join(", ") })}` : head;
    }
    case "NAVIGATE":
      return t("kraken.log.NAVIGATE", {
        navigator: e.navigator,
        dir: t(`kraken.log.dirs.${e.color}`),
        effect: t(`kraken.effects.${e.effect}.label`),
      });
    case "GUNS":
      return t(e.delta > 0 ? "kraken.log.GUNS_UP" : "kraken.log.GUNS_DOWN", { player: e.player });
    case "PEEK":
      return t("kraken.log.PEEK", { player: e.player, effect: t(`kraken.effects.${e.effect}.label`) });
    case "RITUAL":
      return t("kraken.log.RITUAL", { ritual: t(`kraken.rituals.${e.ritual}.label`) });
    case "CABIN_SEARCH":
      return t("kraken.log.CABIN_SEARCH", { captain: e.captain, target: e.target });
    case "FLOGGING":
      return t("kraken.log.FLOGGING", { captain: e.captain, target: e.target, team: t(`kraken.teams.${e.notTeam}`) });
    case "TONGUE":
      return t("kraken.log.TONGUE", { captain: e.captain, target: e.target });
    case "FED":
      return t("kraken.log.FED", { captain: e.captain, target: e.target });
    case "OFF_DUTY":
      return t("kraken.log.OFF_DUTY", { names: e.players.join(", ") || "—" });
    case "DRUNK":
      return t("kraken.log.DRUNK", { captain: e.captain });
    case "SUPPLY":
    case "RESHUFFLE":
    case "WIN":
      return t(`kraken.log.${e.t}`);
  }
}

function noteText(t: T, n: KrakenPrivateNote): string {
  const role = (r: string) => t(`kraken.roles.${r}.label`);
  switch (n.type) {
    case "CABIN_SEARCH":
      return t("kraken.log.note.CABIN_SEARCH", { nickname: n.nickname, role: role(n.role) });
    case "CULT_SEARCH":
      return t("kraken.log.note.CULT_SEARCH", { list: n.results.map((r) => `${r.nickname}: ${role(r.role)}`).join(", ") || "—" });
    case "MERMAID":
      return t("kraken.log.note.MERMAID", { cards: n.cards.map((c) => cardText(t, c)).join(", ") || "—" });
    case "TELESCOPE":
      return n.card ? t("kraken.log.note.TELESCOPE", { card: cardText(t, n.card) }) : t("kraken.log.note.TELESCOPE_EMPTY");
    case "CONVERTED":
      return t("kraken.log.note.CONVERTED", { leader: n.leader });
    case "YOU_CONVERTED":
      return t("kraken.log.note.YOU_CONVERTED", { nickname: n.nickname });
    case "GUNS_RECEIVED":
      return t("kraken.log.note.GUNS_RECEIVED", { count: n.count });
  }
}

function SecretsCard({ notes }: { notes: KrakenPrivateNote[] }) {
  const { t } = useTranslation();
  if (!notes.length) return null;
  return (
    <Card className="border-[#d4a017]/40">
      <CardHeader>
        <CardTitle>{t("kraken.log.secrets")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {[...notes].reverse().map((n, i) => (
          <p key={notes.length - i} className="text-xs text-moon-200">
            <span className="text-moon-400 mr-1">#{n.round}</span>
            {noteText(t, n)}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

export function LogCard({ events }: { events: KrakenEvent[] }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("kraken.log.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
        {events.length === 0 && <p className="text-moon-400/60 text-sm italic">{t("kraken.log.empty")}</p>}
        {[...events].reverse().map((e, i) => (
          <p key={events.length - i} className="text-xs text-moon-300">
            <span className="text-moon-400/70 mr-1">#{e.round}</span>
            {eventText(t, e)}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
