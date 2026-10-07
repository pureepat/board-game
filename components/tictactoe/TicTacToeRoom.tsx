"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicTacToeRoomState } from "@/types/game";
import { Copy, Crown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function TicTacToeRoom({ room, socket }: { room: TicTacToeRoomState; socket: Socket }) {
  if (room.phase === "LOBBY") return <TicTacToeLobby room={room} socket={socket} />;
  if (room.phase === "GAME_OVER") return <TicTacToeGame room={room} socket={socket} gameOver />;
  return <TicTacToeGame room={room} socket={socket} />;
}

function TicTacToeLobby({ room, socket }: { room: TicTacToeRoomState; socket: Socket }) {
  const { t } = useTranslation();
  const isHost = room.you?.isHost;
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  function copyCode() {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleStart() {
    setStartError(null);
    socket.emit("start_game", {}, (res: { error?: string }) => {
      if (res?.error) setStartError(res.error);
    });
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {t("common.room")} {room.code}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={copyCode}>
          <Copy className="w-3 h-3 mr-1" /> {copied ? t("common.copied") : t("common.copyCode")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-moon-400 text-sm">{t("tictactoe.lobby.needsTwo")}</p>
        <div className="space-y-2">
          {room.players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-wolf-purple/20 bg-night-900/60 p-3"
            >
              <span className="text-moon-200 text-sm flex items-center gap-1">
                {p.nickname}
                {p.isSelf && <span className="text-moon-400 text-xs">({t("common.you")})</span>}
              </span>
              {p.isHost && <Crown className="w-3 h-3 text-yellow-400" />}
            </div>
          ))}
          {room.players.length < 2 && (
            <div className="rounded-lg border border-dashed border-wolf-purple/20 p-3 text-center text-moon-400/60 text-sm">
              {t("tictactoe.lobby.waitingSecond")}
            </div>
          )}
        </div>

        {isHost ? (
          <Button className="w-full" size="lg" disabled={room.players.length !== 2} onClick={handleStart}>
            {t("common.startGame")}
          </Button>
        ) : (
          <p className="text-moon-400 text-sm text-center">{t("common.waitingForHost")}</p>
        )}
        {startError && <p className="text-crimson-500 text-sm">{startError}</p>}
      </CardContent>
    </Card>
  );
}

function TicTacToeGame({
  room,
  socket,
  gameOver = false,
}: {
  room: TicTacToeRoomState;
  socket: Socket;
  gameOver?: boolean;
}) {
  const { t } = useTranslation();
  const you = room.you;
  const isMyTurn = !gameOver && room.turn === you?.id;
  const opponent = room.players.find((p) => !p.isSelf);

  function playAt(index: number) {
    if (!isMyTurn || room.board[index]) return;
    socket.emit("ttt_move", { index });
  }

  const resultText =
    room.winner === "DRAW"
      ? t("tictactoe.game.draw")
      : room.winner
      ? room.winner === you?.symbol
        ? t("tictactoe.game.youWin")
        : t("tictactoe.game.nicknameWins", {
            nickname: room.players.find((p) => p.symbol === room.winner)?.nickname ?? room.winner,
          })
      : null;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {t("common.room")} {room.code}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <PlayerBadge label={t("tictactoe.game.you")} symbol={you?.symbol ?? null} active={isMyTurn} />
            <span className="text-moon-400">{t("tictactoe.game.vs")}</span>
            <PlayerBadge
              label={opponent?.nickname ?? t("tictactoe.game.opponent")}
              symbol={opponent?.symbol ?? null}
              active={!gameOver && room.turn === opponent?.id}
            />
          </div>
        </CardHeader>
        <CardContent>
          {gameOver ? (
            <p className="text-center font-display text-2xl text-moon-200 mb-4 animate-fade-in">{resultText}</p>
          ) : (
            <p className="text-center text-sm text-moon-400 mb-4">
              {isMyTurn
                ? t("tictactoe.game.yourMove")
                : t("tictactoe.game.waitingFor", { nickname: opponent?.nickname ?? t("tictactoe.game.opponent") })}
            </p>
          )}

          <WoodBoard board={room.board} winningLine={room.winningLine} canPlay={isMyTurn} onPlay={playAt} />

          {gameOver && you?.isHost && (
            <Button className="w-full mt-6" size="lg" onClick={() => socket.emit("ttt_rematch")}>
              {t("tictactoe.game.rematch")}
            </Button>
          )}
          {gameOver && !you?.isHost && (
            <p className="text-center text-moon-400 text-sm mt-6">{t("tictactoe.game.waitingRematch")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// A carved wooden board: dark walnut X pieces, light maple O rings. The
// grooves between squares are the board itself showing through the gaps.
const WOOD_FRAME = {
  background:
    "repeating-linear-gradient(88deg, rgba(0,0,0,0.08) 0 2px, transparent 2px 11px), linear-gradient(135deg, #7a4a24 0%, #5a3418 50%, #3e2410 100%)",
};
const WOOD_SQUARE = {
  background:
    "repeating-linear-gradient(92deg, rgba(90,52,24,0.10) 0 1px, transparent 1px 9px), radial-gradient(ellipse at 30% 25%, #e2bf86 0%, #c99a5b 70%, #b8864a 100%)",
};

function WoodBoard({
  board,
  winningLine,
  canPlay,
  onPlay,
}: {
  board: ("X" | "O" | null)[];
  winningLine: number[] | null;
  canPlay: boolean;
  onPlay: (index: number) => void;
}) {
  return (
    <div className="mx-auto rounded-2xl p-3 shadow-[0_12px_30px_rgba(0,0,0,0.6)]" style={{ ...WOOD_FRAME, maxWidth: 320 }}>
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#3e2410] p-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.7)]">
        {board.map((cell, i) => {
          const winning = winningLine?.includes(i);
          const open = !cell && canPlay;
          return (
            <button
              key={i}
              onClick={() => onPlay(i)}
              disabled={!open}
              className={cn(
                "group aspect-square rounded-md flex items-center justify-center shadow-[inset_0_-3px_6px_rgba(0,0,0,0.25),inset_0_2px_3px_rgba(255,255,255,0.25)] transition-all",
                open && "cursor-pointer hover:brightness-110",
                winning && "ring-4 ring-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.8)]"
              )}
              style={WOOD_SQUARE}
            >
              {cell === "X" && <XPiece />}
              {cell === "O" && <OPiece />}
              {open && <span className="h-3 w-3 rounded-full bg-[#5a3418]/0 group-hover:bg-[#5a3418]/30 transition-colors" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function XPiece() {
  const bar = "absolute left-1/2 top-1/2 h-[18%] w-[78%] rounded-full bg-gradient-to-b from-[#5b3a29] to-[#2e1a10] shadow-[0_4px_6px_rgba(0,0,0,0.5)]";
  return (
    <span className="relative block h-[72%] w-[72%] animate-piece-drop">
      <span className={cn(bar, "-translate-x-1/2 -translate-y-1/2 rotate-45")} />
      <span className={cn(bar, "-translate-x-1/2 -translate-y-1/2 -rotate-45")} />
    </span>
  );
}

function OPiece() {
  return (
    <span
      className="block h-[66%] w-[66%] rounded-full border-[9px] border-[#f2dcb0] shadow-[0_4px_6px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(0,0,0,0.35)] animate-piece-drop"
      style={{ borderTopColor: "#fbeccc", borderBottomColor: "#d9bd86" }}
    />
  );
}

function PlayerBadge({ label, symbol, active }: { label: string; symbol: "X" | "O" | null; active: boolean }) {
  return (
    <Badge variant={active ? "default" : "outline"} className={cn(active && "animate-pulse-glow")}>
      {label} {symbol && `(${symbol})`}
    </Badge>
  );
}
