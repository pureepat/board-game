"use client";

import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Crown, Dices, Wifi, WifiOff } from "lucide-react";
import type { CsConfig, CsLobbyState } from "@/types/game";
import { CS_ROLE_META } from "@/components/csfiles/csMeta";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

const CARD_CHOICES = [3, 4, 5];
const DISCUSS_CHOICES = [60, 120, 180, 300];

export function CsLobby({ room, socket }: { room: CsLobbyState; socket: Socket }) {
  const { t, tp } = useTranslation();
  const isHost = Boolean(room.you?.isHost);
  const count = room.players.length;
  const canStart = count >= room.lobby.min && count <= room.lobby.max;
  const cfg = room.config;
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const set = (patch: Partial<CsConfig>) => socket.emit("cs_set_config", patch);

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

  // Choice buttons: interactive for the host, a read-only display for everyone else.
  const choice = (active: boolean) => cn("flex-1", !isHost && "pointer-events-none", !isHost && !active && "opacity-50");

  const toggles: { key: "witness" | "labTech" | "rumormonger" | "bodyguard"; label: string }[] = [
    { key: "witness", label: t("csfiles.lobby.witness") },
    { key: "labTech", label: t("csfiles.lobby.labTech") },
    { key: "rumormonger", label: t("csfiles.lobby.rumormonger") },
    { key: "bodyguard", label: t("csfiles.lobby.bodyguard") },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {t("common.room")} {room.code}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={copyCode}>
            <Copy className="w-3 h-3 mr-1" /> {copied ? t("common.copied") : t("common.copyCode")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-moon-400 text-sm">{tp("csfiles.lobby.playersInRoom", count)}</p>
          <div className="grid grid-cols-2 gap-2">
            {room.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-wolf-purple/20 bg-night-900/60 p-3">
                <span className="truncate text-sm text-moon-200">
                  {p.nickname}
                  {p.isSelf && <span className="text-moon-400 text-xs"> ({t("common.you")})</span>}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {p.isHost && <Crown className="w-3 h-3 text-yellow-400" />}
                  {p.connected ? <Wifi className="w-3 h-3 text-emerald-500/70" /> : <WifiOff className="w-3 h-3 text-moon-400/70" />}
                </span>
              </div>
            ))}
          </div>

          <p className="text-moon-200 text-sm font-semibold pt-1">{t("csfiles.lobby.settings")}</p>

          {/* Forensic Scientist: random or the host's pick */}
          <div>
            <p className="text-moon-300 text-sm mb-2">{t("csfiles.lobby.forensicPick")}</p>
            <div className="flex gap-2">
              <Button size="sm" variant={cfg.forensicMode === "random" ? "default" : "secondary"} className={choice(cfg.forensicMode === "random")} onClick={() => set({ forensicMode: "random" })}>
                <Dices className="w-3 h-3 mr-1" /> {t("csfiles.lobby.forensicRandom")}
              </Button>
              <Button
                size="sm"
                variant={cfg.forensicMode === "choose" ? "default" : "secondary"}
                className={choice(cfg.forensicMode === "choose")}
                onClick={() => set({ forensicMode: "choose", forensicId: cfg.forensicId ?? room.players[0]?.id })}
              >
                <Crown className="w-3 h-3 mr-1" /> {t("csfiles.lobby.forensicChoose")}
              </Button>
            </div>
            {cfg.forensicMode === "choose" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {room.players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!isHost}
                    onClick={() => set({ forensicMode: "choose", forensicId: p.id })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs",
                      cfg.forensicId === p.id ? "border-sky-400 bg-sky-400/15 text-sky-200" : "border-wolf-purple/30 bg-night-900/60 text-moon-300",
                      !isHost && cfg.forensicId !== p.id && "opacity-50"
                    )}
                  >
                    {p.nickname}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-moon-300 text-sm mb-2">
              {t("csfiles.lobby.cards")} <span className="text-moon-400 text-xs">({t("csfiles.lobby.cardsHint")})</span>
            </p>
            <div className="flex gap-2">
              {CARD_CHOICES.map((c) => (
                <Button key={c} size="sm" variant={cfg.cards === c ? "default" : "secondary"} className={choice(cfg.cards === c)} onClick={() => set({ cards: c })}>
                  {c}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-moon-300 text-sm mb-2">{t("csfiles.lobby.discussTime")}</p>
            <div className="flex gap-2">
              {DISCUSS_CHOICES.map((s) => (
                <Button key={s} size="sm" variant={cfg.discussSeconds === s ? "default" : "secondary"} className={choice(cfg.discussSeconds === s)} onClick={() => set({ discussSeconds: s })}>
                  {t("csfiles.lobby.minutes", { count: s / 60 })}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            {toggles.map(({ key, label }, i) => (
              <div key={key}>
                {i === 1 && <p className="pt-1 text-xs text-moon-400">{t("csfiles.lobby.expansion")}</p>}
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => set({ [key]: !cfg[key] })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm",
                    cfg[key] ? "border-crimson-500/70 bg-crimson-600/10 text-moon-100" : "border-wolf-purple/30 bg-night-900/60 text-moon-400"
                  )}
                >
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded border", cfg[key] ? "border-crimson-400 bg-crimson-500" : "border-moon-400/50")}>
                    {cfg[key] && <Check className="h-3 w-3 text-white" />}
                  </span>
                  {label}
                </button>
              </div>
            ))}
          </div>

          {room.lobby.roles.length > 0 && (
            <div>
              <p className="text-moon-300 text-sm mb-2">{t("csfiles.lobby.rolesPreview")}</p>
              <div className="flex flex-wrap gap-1.5">
                {room.lobby.roles.map((r, i) => {
                  const Icon = CS_ROLE_META[r].icon;
                  return (
                    <span key={i} className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: CS_ROLE_META[r].hex }}>
                      <Icon className="h-3 w-3" /> {t(`csfiles.roles.${r}.label`)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {!canStart && <p className="text-moon-400 text-xs">{t("csfiles.lobby.needPlayers", { min: room.lobby.min, max: room.lobby.max })}</p>}

          {isHost ? (
            <Button className="w-full" size="lg" disabled={!canStart} onClick={handleStart}>
              {t("common.startGame")}
            </Button>
          ) : (
            <p className="text-moon-400 text-sm text-center">{t("common.waitingForHost")}</p>
          )}
          {startError && <p className="text-crimson-500 text-sm">{startError}</p>}
        </CardContent>
      </Card>

      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>{t("csfiles.lobby.rulesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-moon-300 list-disc pl-5">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <li key={n}>{t(`csfiles.lobby.rule${n}`)}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
