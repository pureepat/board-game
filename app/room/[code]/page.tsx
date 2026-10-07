"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socketClient";
import { useGameStore } from "@/store/useGameStore";
import { Lobby } from "@/components/game/Lobby";
import { RoleReveal } from "@/components/game/RoleReveal";
import { NightPhase } from "@/components/game/NightPhase";
import { DayPhase } from "@/components/game/DayPhase";
import { VotingPhase } from "@/components/game/VotingPhase";
import { GameOver } from "@/components/game/GameOver";
import { TicTacToeRoom } from "@/components/tictactoe/TicTacToeRoom";
import { OnwRoom } from "@/components/onw/OnwRoom";
import { KrakenRoom } from "@/components/kraken/KrakenRoom";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Moon, LogOut } from "lucide-react";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code as string).toUpperCase();
  const router = useRouter();
  const { t } = useTranslation();
  const { room, setRoom, errorMessage, setError, reset } = useGameStore();
  const [connecting, setConnecting] = useState(true);

  function handleLeaveRoom() {
    const isMidGame = room && room.phase !== "LOBBY" && room.phase !== "GAME_OVER";
    if (isMidGame && !window.confirm(t("room.leaveConfirm"))) {
      return;
    }
    getSocket().emit("leave_room");
    sessionStorage.removeItem(`ww_playerId_${code}`);
    reset();
    router.push("/");
  }

  useEffect(() => {
    const socket = getSocket();
    const nickname = sessionStorage.getItem("ww_nickname");
    const storedPlayerId = sessionStorage.getItem(`ww_playerId_${code}`);

    function onRoomUpdate(state: any) {
      setRoom(state);
      setConnecting(false);
    }
    function onError(msg: string) {
      setError(msg);
    }

    socket.on("room_update", onRoomUpdate);
    socket.on("error_message", onError);

    function attemptEntry() {
      if (storedPlayerId) {
        socket.emit("rejoin_room", { code, playerId: storedPlayerId }, (res: any) => {
          if (res?.error) {
            fallbackJoin();
          } else {
            sessionStorage.setItem(`ww_playerId_${code}`, res.playerId);
          }
        });
      } else {
        fallbackJoin();
      }
    }

    function fallbackJoin() {
      if (!nickname) {
        router.push(`/?code=${code}`);
        return;
      }
      socket.emit("join_room", { code, nickname }, (res: any) => {
        if (res?.error) {
          setError(res.error);
          setConnecting(false);
        } else {
          sessionStorage.setItem(`ww_playerId_${code}`, res.playerId);
        }
      });
    }

    if (socket.connected) {
      attemptEntry();
    } else {
      socket.once("connect", attemptEntry);
    }

    return () => {
      socket.off("room_update", onRoomUpdate);
      socket.off("error_message", onError);
      socket.off("connect", attemptEntry);
    };
  }, [code, router, setRoom, setError]);

  const socket = getSocket();

  if (connecting || !room) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Moon className="w-8 h-8 mx-auto mb-3 text-moon-300 animate-pulse" />
          <p className="text-moon-400">{errorMessage ?? t("room.enteringVillage")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="font-display text-2xl text-moon-200 tracking-widest">{t(`room.titles.${room.gameType}`)}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            <span className="text-moon-400 text-sm">
              {t("common.room")} <span className="font-display text-moon-200">{room.code}</span>
            </span>
            <Button variant="outline" size="sm" onClick={handleLeaveRoom}>
              <LogOut className="w-3 h-3 mr-1" /> {t("common.changeGame")}
            </Button>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-4 rounded-md bg-crimson-700/20 border border-crimson-600/40 px-3 py-2 text-sm text-crimson-400">
            {errorMessage}
          </div>
        )}

        {room.gameType === "TICTACTOE" && <TicTacToeRoom room={room} socket={socket} />}

        {room.gameType === "ONE_NIGHT_WEREWOLF" && <OnwRoom room={room} socket={socket} />}

        {room.gameType === "FEED_THE_KRAKEN" && <KrakenRoom room={room} socket={socket} />}

        {room.gameType === "WEREWOLF" && (
          <>
            {room.phase === "LOBBY" && <Lobby room={room} socket={socket} />}
            {room.phase === "ROLE_REVEAL" && <RoleReveal room={room} />}
            {room.phase === "NIGHT" && <NightPhase room={room} socket={socket} />}
            {room.phase === "DAY" && <DayPhase room={room} socket={socket} />}
            {room.phase === "VOTING" && <VotingPhase room={room} socket={socket} />}
            {room.phase === "GAME_OVER" && <GameOver room={room} socket={socket} />}
          </>
        )}
      </div>
    </main>
  );
}
