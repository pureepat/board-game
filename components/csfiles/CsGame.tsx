"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { BadgeCheck, BadgeX, Crosshair, Crown, Mic, Microscope, SkipForward, Trophy, WifiOff, Skull } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatBox } from "@/components/game/ChatBox";
import { PhaseTimer } from "@/components/game/PhaseTimer";
import { SecretPeek, usePlayMode } from "@/components/table/PlayMode";
import type { CsCard, CsGameState, CsPlayer, CsTile } from "@/types/game";
import { CS_CLUE_HEX, CS_MEANS_HEX, CS_ROLE_META, csText } from "@/components/csfiles/csMeta";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

const OPEN_PHASES = ["CS_CLUES", "CS_DISCUSS", "CS_PRESENT", "CS_REPLACE"];

type Mode = "none" | "murder" | "lab" | "rumor" | "accuse" | "witness";
interface Sel {
  playerId: string | null;
  means: number | null; // index into that player's means
  clue: number | null; // index into that player's clues
}
const EMPTY: Sel = { playerId: null, means: null, clue: null };

export function CsGame({ room, socket }: { room: CsGameState; socket: Socket }) {
  const { t, locale } = useTranslation();
  const { showSecrets } = usePlayMode();
  const you = room.you;
  const phase = room.phase;
  const over = phase === "GAME_OVER";
  const isForensic = you?.id === room.forensicId;
  const me = room.players.find((p) => p.isSelf);
  const name = (id: string | null | undefined) => room.players.find((p) => p.id === id)?.nickname ?? "?";
  const tx = (x: { en: string; th: string }) => csText(x, locale);

  const [accusing, setAccusing] = useState(false);
  const [sel, setSel] = useState<Sel>(EMPTY);
  useEffect(() => {
    setSel(EMPTY);
    setAccusing(false);
  }, [phase, room.round]);

  const canAccuse = OPEN_PHASES.includes(phase) && Boolean(me?.badge) && !isForensic;
  const mode: Mode = you?.nightTodo?.murder
    ? "murder"
    : you?.nightTodo?.lab
    ? "lab"
    : you?.nightTodo?.rumor
    ? "rumor"
    : phase === "CS_WITNESS" && you?.role === "MURDERER"
    ? "witness"
    : accusing && canAccuse
    ? "accuse"
    : "none";

  // Card taps: murder/accuse pick one red + one blue in a single folder; lab picks one card anywhere.
  function tapCard(player: CsPlayer, kind: "means" | "clue", index: number) {
    if (mode === "murder" && !player.isSelf) return;
    if (mode === "accuse" && (player.isSelf || player.isForensic)) return;
    if (mode === "lab") return setSel({ playerId: player.id, means: kind === "means" ? index : null, clue: kind === "clue" ? index : null });
    if (mode !== "murder" && mode !== "accuse") return;
    setSel((cur) => {
      const base = cur.playerId === player.id ? cur : { ...EMPTY, playerId: player.id };
      return kind === "means" ? { ...base, means: base.means === index ? null : index } : { ...base, clue: base.clue === index ? null : index };
    });
  }
  function tapFolder(player: CsPlayer) {
    if (mode === "rumor" && !player.isSelf && player.badge !== null) setSel({ ...EMPTY, playerId: player.id });
    if (mode === "witness" && !player.isSelf && !player.isForensic) setSel({ ...EMPTY, playerId: player.id });
  }

  const selPlayer = room.players.find((p) => p.id === sel.playerId);
  const pairReady = selPlayer && sel.means !== null && sel.clue !== null;
  const folders = room.players.filter((p) => !p.isForensic);
  const forensic = room.players.find((p) => p.isForensic);

  return (
    <div className="space-y-4">
      {over ? (
        <GameOverBanner room={room} socket={socket} name={name} tx={tx} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#8a6d3b]/50 bg-[#1b140c]/80 px-4 py-3">
          <div>
            <p className="font-display text-lg text-[#f3e7c9]">{t(`csfiles.phase.${phase}`)}</p>
            <p className="text-xs text-[#c9a86a]">
              {t("csfiles.board.round", { round: room.round, total: room.rounds })}
              {forensic && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Microscope className="h-3 w-3" /> {forensic.nickname}
                </span>
              )}
            </p>
          </div>
          {room.speakerId && (
            <p className="flex items-center gap-1 text-sm text-amber-300">
              <Mic className="h-4 w-4" /> {room.speakerId === you?.id ? t("csfiles.board.yourTurn") : t("csfiles.board.speaking", { name: name(room.speakerId) })}
            </p>
          )}
          <PhaseTimer endsAt={room.phaseEndsAt} />
        </div>
      )}

      <SceneBoard room={room} socket={socket} isForensic={isForensic} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_300px]">
        {/* Everyone's case folder: cards face up, visible to all. */}
        <div className="grid gap-3 sm:grid-cols-2">
          {folders.map((p) => (
            <Folder
              key={p.id}
              player={p}
              room={room}
              mode={mode}
              sel={sel}
              showSecrets={showSecrets || over}
              onCard={(kind, i) => tapCard(p, kind, i)}
              onFolder={() => tapFolder(p)}
            />
          ))}
        </div>

        <div className="space-y-4">
          {!over && (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <SecretPeek>
                  <RolePanel room={room} name={name} tx={tx} />
                </SecretPeek>

                {phase === "CS_NIGHT" && (
                  <SecretPeek>
                    <div className="space-y-2">
                      <p className="text-sm text-moon-300">
                        {mode === "murder" ? t("csfiles.board.nightMurder") : mode === "lab" ? t("csfiles.board.nightLab") : mode === "rumor" ? t("csfiles.board.nightRumor") : t("csfiles.board.nightWait")}
                      </p>
                      {mode === "murder" && (
                        <Button className="w-full" disabled={!pairReady} onClick={() => socket.emit("cs_murder", { means: sel.means, clue: sel.clue })}>
                          <Skull className="w-4 h-4 mr-1" /> {t("csfiles.board.commit")}
                        </Button>
                      )}
                      {mode === "lab" && (
                        <Button
                          className="w-full"
                          disabled={!selPlayer}
                          onClick={() =>
                            socket.emit("cs_lab", { playerId: sel.playerId, kind: sel.means !== null ? "means" : "clue", index: sel.means ?? sel.clue })
                          }
                        >
                          {t("csfiles.board.test")}
                        </Button>
                      )}
                      {mode === "rumor" && (
                        <Button className="w-full" disabled={!selPlayer} onClick={() => socket.emit("cs_rumor", { targetId: sel.playerId })}>
                          {t("csfiles.board.spread")} {selPlayer ? `: ${selPlayer.nickname}` : ""}
                        </Button>
                      )}
                    </div>
                  </SecretPeek>
                )}

                {room.rumorTarget && phase !== "CS_NIGHT" && <p className="text-xs text-orange-300">{t("csfiles.board.rumorDone", { name: name(room.rumorTarget) })}</p>}

                {/* Solve the case */}
                {OPEN_PHASES.includes(phase) && !isForensic && (
                  <div className="space-y-2 border-t border-wolf-purple/20 pt-3">
                    {canAccuse ? (
                      accusing ? (
                        <>
                          <p className="text-xs text-moon-300">{t("csfiles.board.accuseHint")}</p>
                          <Button
                            className="w-full whitespace-normal h-auto py-2"
                            disabled={!pairReady}
                            onClick={() => socket.emit("cs_accuse", { targetId: sel.playerId, means: sel.means, clue: sel.clue })}
                          >
                            {pairReady && selPlayer
                              ? t("csfiles.board.accuseConfirm", {
                                  name: selPlayer.nickname,
                                  means: tx(selPlayer.means[sel.means!]),
                                  clue: tx(selPlayer.clues[sel.clue!]),
                                })
                              : t("csfiles.board.accuse")}
                          </Button>
                          <Button variant="outline" size="sm" className="w-full" onClick={() => setAccusing(false)}>
                            {t("csfiles.board.cancel")}
                          </Button>
                        </>
                      ) : (
                        <Button className="w-full" onClick={() => setAccusing(true)}>
                          <Crosshair className="w-4 h-4 mr-1" /> {t("csfiles.board.accuse")}
                        </Button>
                      )
                    ) : (
                      <p className="text-xs text-moon-400">{t("csfiles.board.noBadge")}</p>
                    )}
                  </div>
                )}

                {phase === "CS_DISCUSS" && (you?.isHost || isForensic) && (
                  <Button variant="secondary" className="w-full" onClick={() => socket.emit("cs_end_discussion")}>
                    {t("csfiles.board.endDiscussion")}
                  </Button>
                )}
                {phase === "CS_PRESENT" && (room.speakerId === you?.id || you?.isHost || isForensic) && (
                  <Button variant="secondary" className="w-full" onClick={() => socket.emit("cs_done_speaking")}>
                    {room.speakerId === you?.id ? t("csfiles.board.doneSpeaking") : t("csfiles.board.skipSpeaker")}
                  </Button>
                )}

                {phase === "CS_WITNESS" &&
                  (mode === "witness" ? (
                    <div className="space-y-2">
                      <p className="text-sm text-moon-300">{t("csfiles.board.witnessHint")}</p>
                      <Button className="w-full" disabled={!selPlayer} onClick={() => socket.emit("cs_witness_guess", { targetId: sel.playerId })}>
                        {selPlayer ? selPlayer.nickname : "..."}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-moon-300">{t("csfiles.board.witnessWait")}</p>
                  ))}

                {you?.isHost && (
                  <div className="border-t border-wolf-purple/20 pt-3">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => socket.emit("cs_force_advance")}>
                      <SkipForward className="w-3 h-3 mr-1" /> {t("csfiles.host.force")}
                    </Button>
                    <p className="text-moon-400/60 text-[11px] mt-1 text-center">{t("csfiles.host.forceHint")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("csfiles.board.accusations")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {room.accusations.length === 0 && <p className="text-xs italic text-moon-400/60">{t("csfiles.board.noAccusations")}</p>}
              {room.accusations.map((a, i) => (
                <p key={i} className="text-xs text-moon-200">
                  <span className="text-moon-400">#{a.round} </span>
                  {t("csfiles.board.accusedLine", { by: name(a.by), target: name(a.target), means: tx(a.means), clue: tx(a.clue) })}{" "}
                  <span className={a.correct ? "font-bold text-emerald-400" : "font-bold text-crimson-400"}>
                    {a.correct ? t("csfiles.board.right") : t("csfiles.board.wrong")}
                  </span>
                </p>
              ))}
            </CardContent>
          </Card>

          {phase !== "CS_NIGHT" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("csfiles.board.chatTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ChatBox
                  messages={room.chat}
                  onSend={(text) => socket.emit("cs_chat_message", { text })}
                  disabled={isForensic && !over}
                  placeholder={isForensic && !over ? t("csfiles.board.forensicSilent") : t("csfiles.board.chatPlaceholder")}
                  inPersonHint={isForensic && !over ? t("csfiles.board.forensicSilent") : undefined}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Banner (game over) -------------------------------------------------------

function GameOverBanner({
  room,
  socket,
  name,
  tx,
}: {
  room: CsGameState;
  socket: Socket;
  name: (id: string | null | undefined) => string;
  tx: (x: { en: string; th: string }) => string;
}) {
  const { t } = useTranslation();
  const good = room.winner === "INVESTIGATORS";
  return (
    <Card className={cn("animate-fade-in text-center", good ? "border-emerald-500/50" : "border-crimson-500/50")}>
      <CardContent className="space-y-3 pt-6">
        {good ? <Trophy className="mx-auto h-10 w-10 text-emerald-400" /> : <Skull className="mx-auto h-10 w-10 text-crimson-400" />}
        <h2 className={cn("font-display text-2xl", good ? "text-emerald-400" : "text-crimson-400")}>{t(`csfiles.gameOver.${room.winner}_${room.reason}`)}</h2>
        {room.solution && (
          <p className="text-moon-200">
            {t("csfiles.gameOver.truth", { name: name(room.solution.murdererId), means: tx(room.solution.means), clue: tx(room.solution.clue) })}
          </p>
        )}
        {room.witnessGuess && <p className="text-sm text-moon-400">{t("csfiles.gameOver.witnessGuess", { name: name(room.witnessGuess) })}</p>}
        {room.you?.isHost ? (
          <Button className="mt-2" onClick={() => socket.emit("cs_play_again")}>
            {t("common.playAgain")}
          </Button>
        ) : (
          <p className="text-moon-400 text-xs">{t("common.waitingForHost")}</p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Role / secret info -------------------------------------------------------

function RolePanel({
  room,
  name,
  tx,
}: {
  room: CsGameState;
  name: (id: string | null | undefined) => string;
  tx: (x: { en: string; th: string }) => string;
}) {
  const { t } = useTranslation();
  const you = room.you;
  if (!you?.role) return null;
  const meta = CS_ROLE_META[you.role];
  const Icon = meta.icon;
  const lab = you.labResult;
  return (
    <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: `${meta.hex}80`, background: `${meta.hex}1a` }}>
      <div className="flex items-center gap-3">
        <Icon className="h-8 w-8 shrink-0" style={{ color: meta.hex }} />
        <div>
          <p className="text-xs text-moon-400">
            {t("csfiles.board.yourRole")} · {you.team ? t(`csfiles.teams.${you.team}`) : ""}
          </p>
          <p className="font-display text-lg" style={{ color: meta.hex }}>
            {t(`csfiles.roles.${you.role}.label`)}
          </p>
        </div>
      </div>
      <p className="text-xs text-moon-300">{t(`csfiles.roles.${you.role}.desc`)}</p>
      {room.solution && (
        <p className="text-sm text-amber-300">
          {t("csfiles.board.solution")}:{" "}
          {t("csfiles.board.solutionLine", { name: name(room.solution.murdererId), means: tx(room.solution.means), clue: tx(room.solution.clue) })}
        </p>
      )}
      {you.suspects && <p className="text-sm text-violet-300">{t("csfiles.board.suspects", { names: you.suspects.map(name).join(", ") })}</p>}
      {you.witnessId && <p className="text-sm text-emerald-300">{t("csfiles.board.witnessIs", { name: name(you.witnessId) })}</p>}
      {lab && (
        <p className={cn("text-sm", lab.hit ? "text-amber-300" : "text-moon-300")}>
          {t("csfiles.board.labResult", {
            card: tx(lab.card),
            name: name(lab.playerId),
            verdict: lab.hit ? t("csfiles.board.labYes") : t("csfiles.board.labNo"),
          })}
        </p>
      )}
    </div>
  );
}

// --- Case folders --------------------------------------------------------------

function Folder({
  player,
  room,
  mode,
  sel,
  showSecrets,
  onCard,
  onFolder,
}: {
  player: CsPlayer;
  room: CsGameState;
  mode: Mode;
  sel: Sel;
  showSecrets: boolean;
  onCard: (kind: "means" | "clue", index: number) => void;
  onFolder: () => void;
}) {
  const { t, locale } = useTranslation();
  const speaking = room.speakerId === player.id;
  const folderPick = (mode === "rumor" && !player.isSelf && player.badge !== null) || (mode === "witness" && !player.isSelf);
  const cardPick = mode === "lab" || (mode === "murder" && player.isSelf) || (mode === "accuse" && !player.isSelf);
  const picked = sel.playerId === player.id;
  // The truth is only drawn for viewers who know it (and in person, only while peeking).
  const sol = room.solution && room.solution.murdererId === player.id && showSecrets ? room.solution : null;
  const roleShown = player.role && (showSecrets || room.phase === "GAME_OVER");
  const meta = player.role ? CS_ROLE_META[player.role] : null;

  return (
    <div
      onClick={folderPick ? onFolder : undefined}
      className={cn(
        "relative rounded-lg border-2 p-2.5 pt-3 shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-colors",
        "border-[#a8844a] bg-[#d9b87a] text-[#2b1d12]",
        speaking && "ring-4 ring-amber-300/80",
        folderPick && "cursor-pointer hover:border-crimson-500",
        folderPick && picked && "border-crimson-600 ring-4 ring-crimson-500/60",
        player.isSelf && "outline outline-2 outline-sky-400/70"
      )}
    >
      {/* folder tab */}
      <span className="absolute -top-2.5 left-3 rounded-t-md bg-[#c9a35f] px-2 text-[10px] font-bold uppercase tracking-wider text-[#4a3215]">CASE</span>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate font-semibold">
          {player.nickname}
          {player.isSelf && <span className="text-xs font-normal opacity-70"> ({t("common.you")})</span>}
        </span>
        {player.isHost && <Crown className="h-3.5 w-3.5 text-amber-700" />}
        {!player.connected && <WifiOff className="h-3.5 w-3.5 opacity-60" />}
        {speaking && <Mic className="h-4 w-4 text-amber-700" />}
        {roleShown && meta && (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: meta.hex }}>
            {t(`csfiles.roles.${player.role}.label`)}
          </span>
        )}
        {player.badge !== null &&
          (player.badge ? (
            <BadgeCheck className="h-5 w-5 text-[#1d4ed8]" aria-label={t("csfiles.board.badge")} />
          ) : (
            <BadgeX className="h-5 w-5 text-[#7a5c3a] opacity-60" aria-label={t("csfiles.board.badgeUsed")} />
          ))}
      </div>
      <CardRow
        cards={player.means}
        hex={CS_MEANS_HEX}
        label={t("csfiles.board.means")}
        locale={locale}
        selected={picked ? sel.means : null}
        solutionId={sol?.means.id ?? null}
        clickable={cardPick}
        onPick={(i) => onCard("means", i)}
      />
      <CardRow
        cards={player.clues}
        hex={CS_CLUE_HEX}
        label={t("csfiles.board.clue")}
        locale={locale}
        selected={picked ? sel.clue : null}
        solutionId={sol?.clue.id ?? null}
        clickable={cardPick}
        onPick={(i) => onCard("clue", i)}
      />
    </div>
  );
}

function CardRow({
  cards,
  hex,
  label,
  locale,
  selected,
  solutionId,
  clickable,
  onPick,
}: {
  cards: CsCard[];
  hex: string;
  label: string;
  locale: string;
  selected: number | null;
  solutionId: number | null;
  clickable: boolean;
  onPick: (index: number) => void;
}) {
  return (
    <div className="mb-1.5 flex gap-1">
      <span className="w-1 shrink-0 rounded" style={{ background: hex }} title={label} />
      <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))` }}>
        {cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            disabled={!clickable}
            onClick={(e) => {
              e.stopPropagation();
              onPick(i);
            }}
            className={cn(
              "min-h-[38px] rounded border-2 bg-[#fffaf0] px-1 py-1 text-center text-[11px] font-semibold leading-tight shadow-sm transition-transform",
              clickable ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default",
              selected === i && "-translate-y-0.5 ring-2 ring-crimson-600",
              solutionId === c.id && "ring-2 ring-amber-500 bg-amber-100"
            )}
            style={{ borderColor: hex, color: hex }}
          >
            {csText(c, locale)}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Scene tiles ---------------------------------------------------------------

function SceneBoard({ room, socket, isForensic }: { room: CsGameState; socket: Socket; isForensic: boolean }) {
  const { t, locale } = useTranslation();
  const [pick, setPick] = useState<{ slot: number; option: number } | null>(null); // round 1 marker
  const [newOpt, setNewOpt] = useState<number | null>(null); // replace: option on the new tile
  const [replaceSlot, setReplaceSlot] = useState<number | null>(null); // replace: which scene tile goes
  useEffect(() => {
    setPick(null);
    setNewOpt(null);
    setReplaceSlot(null);
  }, [room.phase, room.round]);

  const placing = isForensic && room.phase === "CS_CLUES";
  const replacing = isForensic && room.phase === "CS_REPLACE";
  const forensicName = room.players.find((p) => p.isForensic)?.nickname ?? "?";

  return (
    <div className="rounded-xl border-4 border-[#2b1d12] bg-[#3b2a1a] p-3 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm tracking-widest text-[#f3e7c9]">{t("csfiles.board.tilesTitle")}</p>
        {room.phase === "CS_CLUES" && !isForensic && <p className="text-xs text-[#c9a86a]">{t("csfiles.board.waitingForensic", { name: forensicName })}</p>}
        {placing && <p className="text-xs text-amber-300">{room.tiles[1] ? t("csfiles.board.placeHint") : t("csfiles.board.chooseLocation")}</p>}
        {replacing && <p className="text-xs text-amber-300">{t("csfiles.board.replaceHint")}</p>}
      </div>

      {placing && room.locationOptions && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {room.locationOptions.map((tile, i) => (
            <button key={tile.id} type="button" onClick={() => socket.emit("cs_location", { index: i })} className="text-left">
              <Tile tile={tile} marker={null} locale={locale} highlight />
            </button>
          ))}
        </div>
      )}

      {room.pendingTile && (
        <div className="mb-3 max-w-xs">
          <p className="mb-1 text-xs font-bold text-amber-300">{t("csfiles.board.newTile")}</p>
          <Tile tile={room.pendingTile} marker={null} pending={newOpt} locale={locale} highlight onOption={replacing ? setNewOpt : undefined} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {room.tiles.map((slot, i) =>
          slot ? (
            <Tile
              key={i}
              tile={slot.tile}
              marker={slot.marker}
              fresh={slot.fresh}
              locale={locale}
              pending={pick?.slot === i ? pick.option : null}
              onOption={placing && slot.marker === null ? (o) => setPick({ slot: i, option: o }) : undefined}
              replaceable={replacing && i >= 2}
              replaceSelected={replaceSlot === i}
              onReplace={() => setReplaceSlot(i)}
            />
          ) : (
            <div key={i} className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-dashed border-[#8a6d3b]/60 text-xs text-[#c9a86a]/70">
              ?
            </div>
          )
        )}
      </div>

      {placing && pick && (
        <Button className="mt-3 w-full" onClick={() => socket.emit("cs_marker", pick)}>
          <Crosshair className="w-4 h-4 mr-1" /> {t("csfiles.board.placeMarker")}
        </Button>
      )}
      {replacing && (
        <Button className="mt-3 w-full" disabled={newOpt === null || replaceSlot === null} onClick={() => socket.emit("cs_replace", { slot: replaceSlot, option: newOpt })}>
          <Crosshair className="w-4 h-4 mr-1" /> {t("csfiles.board.replaceConfirm")}
        </Button>
      )}
    </div>
  );
}

function Tile({
  tile,
  marker,
  locale,
  fresh,
  highlight,
  pending,
  onOption,
  replaceable,
  replaceSelected,
  onReplace,
}: {
  tile: CsTile;
  marker: number | null;
  locale: string;
  fresh?: boolean;
  highlight?: boolean;
  pending?: number | null;
  onOption?: (option: number) => void;
  replaceable?: boolean;
  replaceSelected?: boolean;
  onReplace?: () => void;
}) {
  return (
    <div
      onClick={replaceable ? onReplace : undefined}
      className={cn(
        "rounded-lg border-2 bg-[#efe2c2] p-2 text-[#2b1d12] shadow-md",
        tile.id === "cause" ? "border-[#7f1d1d]" : tile.id.startsWith("loc-") ? "border-[#14532d]" : "border-[#8a6d3b]",
        fresh && "ring-2 ring-amber-400",
        highlight && "ring-2 ring-amber-300/70",
        replaceable && "cursor-pointer hover:ring-2 hover:ring-crimson-500",
        replaceSelected && "ring-4 ring-crimson-600 opacity-70"
      )}
    >
      <p className="mb-1.5 text-center text-[11px] font-bold uppercase tracking-wide">{csText(tile.title, locale)}</p>
      <div className="grid grid-cols-2 gap-1">
        {tile.options.map((o, i) => {
          const marked = marker === i;
          const pend = pending === i;
          // Read-only options are plain divs: a disabled button would swallow
          // taps meant for the whole tile (picking a location, choosing what to replace).
          const Opt = onOption ? "button" : "div";
          return (
            <Opt
              key={i}
              {...(onOption ? { type: "button" as const } : {})}
              onClick={
                onOption
                  ? (e: React.MouseEvent) => {
                      e.stopPropagation();
                      onOption(i);
                    }
                  : undefined
              }
              className={cn(
                "flex items-center justify-center gap-0.5 rounded px-1 py-1 text-center text-[10px] leading-tight",
                marked ? "bg-[#7f1d1d] font-bold text-white" : "bg-[#fffaf0]/70",
                pend && "bg-amber-300 font-bold",
                onOption ? "cursor-pointer hover:bg-amber-200" : "cursor-default"
              )}
            >
              {marked && <Crosshair className="h-3 w-3 shrink-0" />}
              {csText(o, locale)}
            </Opt>
          );
        })}
      </div>
    </div>
  );
}
