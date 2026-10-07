"use client";

import type { Socket } from "socket.io-client";
import type { KrakenGameState, KrakenLobbyState, KrakenRoomState } from "@/types/game";
import { KrakenLobby } from "@/components/kraken/KrakenLobby";
import { KrakenGame } from "@/components/kraken/KrakenGame";
import { KrakenGameOver } from "@/components/kraken/KrakenGameOver";

export function KrakenRoom({ room, socket }: { room: KrakenRoomState; socket: Socket }) {
  // The server sends the lobby shape until a game starts (`room.kr` is null), then the game shape.
  if ("lobby" in room) return <KrakenLobby room={room as KrakenLobbyState} socket={socket} />;
  const game = room as KrakenGameState;
  if (game.phase === "GAME_OVER") return <KrakenGameOver room={game} socket={socket} />;
  return <KrakenGame room={game} socket={socket} />;
}
