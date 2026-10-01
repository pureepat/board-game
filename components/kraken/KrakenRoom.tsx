"use client";

import type { Socket } from "socket.io-client";
import type { KrakenRoomState } from "@/types/game";
import { KrakenLobby } from "@/components/kraken/KrakenLobby";
import { KrakenGame } from "@/components/kraken/KrakenGame";
import { KrakenGameOver } from "@/components/kraken/KrakenGameOver";

export function KrakenRoom({ room, socket }: { room: KrakenRoomState; socket: Socket }) {
  if (room.phase === "LOBBY") return <KrakenLobby room={room} socket={socket} />;
  if (room.phase === "GAME_OVER") return <KrakenGameOver room={room} socket={socket} />;
  return <KrakenGame room={room} socket={socket} />;
}
