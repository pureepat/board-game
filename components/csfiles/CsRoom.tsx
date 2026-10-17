"use client";

import type { Socket } from "socket.io-client";
import type { CsGameState, CsLobbyState, CsRoomState } from "@/types/game";
import { CsLobby } from "@/components/csfiles/CsLobby";
import { CsGame } from "@/components/csfiles/CsGame";

export function CsRoom({ room, socket }: { room: CsRoomState; socket: Socket }) {
  // The server sends the lobby shape until a game starts (`room.cs` is null), then the game shape.
  if ("lobby" in room) return <CsLobby room={room as CsLobbyState} socket={socket} />;
  return <CsGame room={room as CsGameState} socket={socket} />;
}
