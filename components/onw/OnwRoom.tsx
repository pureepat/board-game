"use client";

import type { Socket } from "socket.io-client";
import type { OnwRoomState } from "@/types/game";
import { OnwLobby } from "@/components/onw/OnwLobby";
import { OnwNight } from "@/components/onw/OnwNight";
import { OnwDay } from "@/components/onw/OnwDay";
import { OnwVoting } from "@/components/onw/OnwVoting";
import { OnwGameOver } from "@/components/onw/OnwGameOver";

export function OnwRoom({ room, socket }: { room: OnwRoomState; socket: Socket }) {
  if (room.phase === "LOBBY") return <OnwLobby room={room} socket={socket} />;
  if (room.phase === "NIGHT") return <OnwNight room={room} socket={socket} />;
  if (room.phase === "DAY") return <OnwDay room={room} socket={socket} />;
  if (room.phase === "VOTING") return <OnwVoting room={room} socket={socket} />;
  if (room.phase === "GAME_OVER") return <OnwGameOver room={room} socket={socket} />;
  return null;
}
