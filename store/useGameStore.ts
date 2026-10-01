import { create } from "zustand";
import type { RoomState } from "@/types/game";

interface GameStore {
  room: RoomState | null;
  nickname: string;
  playerId: string | null;
  errorMessage: string | null;
  setRoom: (room: RoomState) => void;
  setNickname: (nickname: string) => void;
  setPlayerId: (id: string | null) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  room: null,
  nickname: "",
  playerId: null,
  errorMessage: null,
  setRoom: (room) => set({ room }),
  setNickname: (nickname) => set({ nickname }),
  setPlayerId: (playerId) => set({ playerId }),
  setError: (errorMessage) => set({ errorMessage }),
  reset: () => set({ room: null, playerId: null, errorMessage: null }),
}));
