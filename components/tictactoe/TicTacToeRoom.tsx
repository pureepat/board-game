"use client";

import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicTacToeRoomState } from "@/types/game";
import { Copy, Crown, X as XIcon, Circle } from "lucide-react";
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

          <div className="grid grid-cols-3 gap-2 mx-auto" style={{ maxWidth: 280 }}>
            {room.board.map((cell, i) => {
              const isWinningCell = room.winningLine?.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => playAt(i)}
                  disabled={!isMyTurn || Boolean(cell)}
                  className={cn(
                    "aspect-square rounded-lg border flex items-center justify-center text-3xl font-display transition-all",
                    "border-wolf-purple/30 bg-night-900/60",
                    !cell && isMyTurn && "hover:border-crimson-500 hover:bg-night-700 cursor-pointer",
                    isWinningCell && "border-crimson-500 bg-crimson-600/20 ring-1 ring-crimson-500"
                  )}
                >
                  {cell === "X" && <XIcon className="w-8 h-8 text-wolf-purple" strokeWidth={3} />}
                  {cell === "O" && <Circle className="w-7 h-7 text-crimson-500" strokeWidth={3} />}
                </button>
              );
            })}
          </div>

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

function PlayerBadge({ label, symbol, active }: { label: string; symbol: "X" | "O" | null; active: boolean }) {
  return (
    <Badge variant={active ? "default" : "outline"} className={cn(active && "animate-pulse-glow")}>
      {label} {symbol && `(${symbol})`}
    </Badge>
  );
}
