"use client";

import type { Socket } from "socket.io-client";
import { Crown, Dices, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InsiderGameState, InsiderLobbyState } from "@/types/game";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

const MODES = [
  { id: "rotate", icon: Repeat, label: "insider.lobby.masterRotate" },
  { id: "random", icon: Dices, label: "insider.lobby.masterRandom" },
  { id: "choose", icon: Crown, label: "insider.lobby.masterChoose" },
] as const;

/** How the next round's Master is picked. The host sets it; everyone else sees the choice. */
export function InsiderMasterPicker({ room, socket }: { room: InsiderLobbyState | InsiderGameState; socket: Socket }) {
  const { t } = useTranslation();
  const isHost = Boolean(room.you?.isHost);
  const name = (id: string | null) => room.players.find((p) => p.id === id)?.nickname ?? "?";
  const set = (mode: string, playerId?: string) => socket.emit("insider_set_master", { mode, playerId });

  const hint =
    room.masterMode === "rotate"
      ? room.nextRotateMaster
        ? t("insider.lobby.masterRotateHint", { name: name(room.nextRotateMaster) })
        : t("insider.lobby.masterRotateFirst")
      : room.masterMode === "random"
      ? t("insider.lobby.masterRandomHint")
      : isHost
      ? t("insider.lobby.masterChooseHint")
      : t("insider.lobby.masterNext", { name: name(room.masterChoice) });

  return (
    <div>
      <p className="text-moon-300 text-sm mb-2">{t("insider.lobby.masterPick")}</p>
      <div className="flex gap-2">
        {MODES.map(({ id, icon: Icon, label }) => (
          <Button
            key={id}
            size="sm"
            variant={room.masterMode === id ? "default" : "secondary"}
            className={cn("flex-1", !isHost && "pointer-events-none")}
            disabled={!isHost && room.masterMode !== id}
            // Switching to "host picks" preselects the first player so the choice is never empty.
            onClick={() => set(id, id === "choose" ? room.masterChoice ?? room.players[0]?.id : undefined)}
          >
            <Icon className="w-3 h-3 mr-1" /> {t(label)}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs text-moon-400">{hint}</p>
      {room.masterMode === "choose" && isHost && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {room.players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => set("choose", p.id)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                room.masterChoice === p.id
                  ? "border-amber-300 bg-amber-300/15 text-amber-200"
                  : "border-wolf-purple/30 bg-night-900/60 text-moon-300 hover:border-amber-300/60"
              )}
            >
              {room.masterChoice === p.id && <Crown className="h-3 w-3" />}
              {p.nickname}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
