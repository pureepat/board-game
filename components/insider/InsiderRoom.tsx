"use client";

import type { Socket } from "socket.io-client";
import type { InsiderGameState, InsiderLobbyState, InsiderRoomState } from "@/types/game";
import { InsiderLobby } from "@/components/insider/InsiderLobby";
import { InsiderGame } from "@/components/insider/InsiderGame";
import { InsiderGameOver } from "@/components/insider/InsiderGameOver";

export function InsiderRoom({ room, socket }: { room: InsiderRoomState; socket: Socket }) {
  // The server sends the lobby shape until a game starts (`room.ins` is null), then the game shape.
  if ("lobby" in room) return <InsiderLobby room={room as InsiderLobbyState} socket={socket} />;
  const game = room as InsiderGameState;
  if (game.phase === "GAME_OVER") return <InsiderGameOver room={game} socket={socket} />;
  return <InsiderGame room={game} socket={socket} />;
}
