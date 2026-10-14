"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, EyeOff, Globe2, Lock, Users } from "lucide-react";
import type { Socket } from "socket.io-client";
import type { PlayMode } from "@/types/game";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

// Playing at the same table changes how the screen should behave: people
// talk out loud instead of typing, and the person next to you can see your
// phone. The room page provides the mode; components read it from here.
//
// "Peeking" is one shared switch: tap any covered secret and every secret on
// your screen (role card, private notes, secret seat badges) shows for a few
// seconds, then covers itself again.

const PEEK_MS = 6000;

interface PlayModeValue {
  mode: PlayMode;
  local: boolean;
  /** True when secrets may be drawn: always online, only while peeking in person. */
  showSecrets: boolean;
  peek: () => void;
  hide: () => void;
}

const PlayModeContext = createContext<PlayModeValue>({
  mode: "online",
  local: false,
  showSecrets: true,
  peek: () => {},
  hide: () => {},
});

export function PlayModeProvider({ mode, children }: { mode: PlayMode; children: ReactNode }) {
  const [peeking, setPeeking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setPeeking(false);
  }, []);
  const peek = useCallback(() => {
    clearTimeout(timer.current);
    setPeeking(true);
    timer.current = setTimeout(() => setPeeking(false), PEEK_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const local = mode === "local";
  return (
    <PlayModeContext.Provider value={{ mode, local, showSecrets: !local || peeking, peek, hide }}>{children}</PlayModeContext.Provider>
  );
}

export function usePlayMode() {
  return useContext(PlayModeContext);
}

/** Covers private info in person until tapped. Online it renders its children as-is. */
export function SecretPeek({ children, className }: { children: ReactNode; className?: string }) {
  const { t } = useTranslation();
  const { local, showSecrets, peek, hide } = usePlayMode();
  if (!local) return <>{children}</>;
  if (showSecrets) {
    return (
      // Any tap inside keeps it uncovered, so acting on a hand doesn't race the timer.
      <div className="relative" onClickCapture={peek}>
        {children}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            hide();
          }}
          className="absolute right-1 top-1 z-10 rounded-full bg-black/60 p-1 text-moon-300 hover:text-moon-100"
          aria-label={t("playMode.hideNow")}
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={peek}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-moon-400/40 bg-night-900/80 px-3 py-4 text-sm text-moon-300 transition-colors hover:border-amber-300/60 hover:text-amber-200",
        className
      )}
    >
      <Lock className="h-4 w-4" />
      {t("playMode.tapToPeek")}
      <Eye className="h-4 w-4 opacity-60" />
    </button>
  );
}

/** Shown in place of a chat box when everyone is at the same table. */
export function TalkOutLoud({ hint }: { hint?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-night-900/50 px-4 py-6 text-center">
      <Users className="h-7 w-7 text-amber-300/80" />
      <p className="text-moon-200 text-sm">{t("playMode.talkOutLoud")}</p>
      <p className="text-moon-400 text-xs">{hint ?? t("playMode.talkOutLoudHint")}</p>
    </div>
  );
}

/** Two-way switch: same table vs online. Read-only unless `onChange` is given. */
export function PlayModePicker({ value, onChange, compact }: { value: PlayMode; onChange?: (m: PlayMode) => void; compact?: boolean }) {
  const { t } = useTranslation();
  const options: { id: PlayMode; icon: React.ElementType }[] = [
    { id: "local", icon: Users },
    { id: "online", icon: Globe2 },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(({ id, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(id)}
            className={cn(
              "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
              active ? "border-crimson-500 bg-crimson-600/15" : "border-wolf-purple/30 bg-night-900/60",
              onChange ? "hover:border-crimson-500/70" : "cursor-default",
              !onChange && !active && "opacity-50"
            )}
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", active ? "text-crimson-400" : "text-moon-400")} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-moon-200">{t(`playMode.${id}.label`)}</span>
              {!compact && <span className="block text-[11px] leading-snug text-moon-400">{t(`playMode.${id}.desc`)}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Lobby strip: everyone sees the mode, the host can switch it. */
export function PlayModeLobbyBar({ value, isHost, socket }: { value: PlayMode; isHost: boolean; socket: Socket }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 rounded-xl border border-wolf-purple/20 bg-night-800/60 p-3">
      <p className="mb-2 text-xs text-moon-400">{isHost ? t("playMode.titleHost") : t("playMode.title")}</p>
      <PlayModePicker value={value} onChange={isHost ? (m) => socket.emit("set_play_mode", { playMode: m }) : undefined} />
    </div>
  );
}

/** Small header chip showing the mode during a game. */
export function PlayModeChip({ value }: { value: PlayMode }) {
  const { t } = useTranslation();
  const Icon = value === "local" ? Users : Globe2;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-moon-400/30 px-2 py-0.5 text-xs text-moon-300">
      <Icon className="h-3 w-3" /> {t(`playMode.${value}.label`)}
    </span>
  );
}
