"use client";

import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BellRing, Megaphone, Smartphone, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  VIBRATE_DAWN,
  VIBRATE_TEST,
  VIBRATE_WAKE,
  canVibrate,
  canWakeLock,
  hasVoiceFor,
  keepAwake,
  releaseAwake,
  speak,
  unlockSpeech,
  vibrate,
} from "@/lib/nightCues";

// Eyes-closed signals for games with a night: your phone buzzes when it's
// your turn to open your eyes and everyone's buzzes at dawn, and one device
// (the host's by default) reads the night out loud like a moderator.
// Only in "together" mode, and only for games that close their eyes.

export const CUE_GAMES = ["WEREWOLF", "ONE_NIGHT_WEREWOLF", "CS_FILES"];

interface CueSettings {
  vibrate: boolean;
  narrator: "auto" | "on" | "off"; // auto = on for the host's device only
  setVibrate: (v: boolean) => void;
  setNarrator: (n: "auto" | "on" | "off") => void;
}

export const useCueStore = create<CueSettings>()(
  persist(
    (set) => ({
      vibrate: true,
      narrator: "auto",
      setVibrate: (vibrate) => set({ vibrate }),
      setNarrator: (narrator) => set({ narrator }),
    }),
    { name: "partybros-cues" }
  )
);

export interface Cue {
  vibrate?: number[];
  /** Wait before buzzing so it lands with the narrator's "...open your eyes", not before it. */
  delayMs?: number;
  lines?: string[];
}

type T = (key: string, vars?: Record<string, string | number>) => string;

/**
 * What to signal when the room goes from `prev` to `next`, for this viewer.
 * Vibrations are private (only the player who must wake up, or everyone at
 * dawn); spoken lines are public and follow the fixed night order, so they
 * never give away who holds which role.
 */
export function deriveCue(prev: any, next: any, t: T): Cue | null {
  if (!prev || !next || prev.gameType !== next.gameType || prev.code !== next.code) return null;
  const lines: string[] = [];
  let buzz: number[] | undefined;
  let delayMs = 0;

  if (next.gameType === "ONE_NIGHT_WEREWOLF") {
    const wasNight = prev.phase === "NIGHT";
    const isNight = next.phase === "NIGHT";
    const role = (r: string) => t(`onw.roles.${r}.label`);
    if (isNight && !wasNight) lines.push(t("cues.everyoneSleep"));
    if (isNight && (!wasNight || prev.currentStep !== next.currentStep)) {
      if (wasNight && prev.currentStep) lines.push(t("cues.roleSleep", { role: role(prev.currentStep) }));
      if (next.currentStep) lines.push(t("cues.roleWake", { role: role(next.currentStep) }));
    }
    const newTurn = next.isMyTurn && !(wasNight && prev.isMyTurn && prev.currentStep === next.currentStep);
    if (isNight && newTurn) {
      buzz = VIBRATE_WAKE;
      delayMs = wasNight ? 2200 : 3000;
    }
    if (wasNight && !isNight) {
      if (prev.currentStep) lines.push(t("cues.roleSleep", { role: role(prev.currentStep) }));
      lines.push(t("cues.everyoneWake"));
      buzz = VIBRATE_DAWN;
      delayMs = 2000;
    }
  }

  if (next.gameType === "WEREWOLF") {
    const wasNight = prev.phase === "NIGHT";
    const isNight = next.phase === "NIGHT";
    if (isNight && !wasNight) {
      lines.push(t("cues.everyoneSleep"), t("cues.werewolfNightWake"));
      const actor = next.you?.alive && ["WEREWOLF", "SEER", "DOCTOR"].includes(next.you?.role);
      if (actor) {
        buzz = VIBRATE_WAKE;
        delayMs = 3500;
      }
    }
    if (wasNight && !isNight) {
      lines.push(t("cues.everyoneWake"));
      buzz = VIBRATE_DAWN;
    }
  }

  if (next.gameType === "CS_FILES") {
    const wasNight = prev.phase === "CS_NIGHT";
    const isNight = next.phase === "CS_NIGHT";
    if (isNight && !wasNight) {
      lines.push(t("cues.everyoneSleep"), t("cues.csNightWake"));
      const todo = next.you?.nightTodo;
      if (todo && (todo.murder || todo.lab || todo.rumor)) {
        buzz = VIBRATE_WAKE;
        delayMs = 3500;
      }
    }
    if (wasNight && !isNight) {
      lines.push(t("cues.everyoneWake"));
      buzz = VIBRATE_DAWN;
    }
  }

  return lines.length || buzz ? { vibrate: buzz, delayMs, lines } : null;
}

/** Watches the room and fires vibrations / narration. Renders the in-game toggle pill. */
export function NightCues({ room, active }: { room: any; active: boolean }) {
  const { t, locale } = useTranslation();
  const { vibrate: vibrateOn, narrator } = useCueStore();
  const prev = useRef<any>(null);
  const isHost = room?.hostId && room?.you?.id === room.hostId;
  const narrate = narrator === "on" || (narrator === "auto" && isHost);

  useEffect(() => {
    const before = prev.current;
    prev.current = room;
    if (!active) return;
    const cue = deriveCue(before, room, t);
    if (!cue) return;
    if (cue.vibrate && vibrateOn) {
      const pattern = cue.vibrate;
      setTimeout(() => vibrate(pattern), cue.delayMs ?? 0);
    }
    if (cue.lines?.length && narrate) speak(cue.lines, locale);
    // `t` and `locale` are read at fire time; re-running on them would re-fire cues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, active, vibrateOn, narrate]);

  // Keep the screen on during a game so a sleeping phone doesn't miss its cue.
  const inGame = active && room?.phase !== "LOBBY" && room?.phase !== "GAME_OVER";
  useEffect(() => {
    if (!inGame) {
      releaseAwake();
      return;
    }
    keepAwake();
    const again = () => document.visibilityState === "visible" && keepAwake();
    document.addEventListener("visibilitychange", again);
    return () => document.removeEventListener("visibilitychange", again);
  }, [inGame]);

  if (!active || room?.phase === "LOBBY") return null;
  return (
    <button
      type="button"
      onClick={() => armCues(t, locale)}
      title={t("cues.rearm")}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-night-900/90 px-3 py-2 text-xs text-amber-200 shadow-lg backdrop-blur"
    >
      <BellRing className="h-4 w-4" />
      {vibrateOn && canVibrate() ? t("cues.pillOn") : narrate ? t("cues.pillVoice") : t("cues.pillOff")}
    </button>
  );
}

/** Must run from a tap: unlocks vibration and speech, grabs the wake lock, and gives a short test. */
function armCues(t: T, locale: string) {
  vibrate(VIBRATE_TEST);
  unlockSpeech();
  keepAwake();
  speak([t("cues.testLine")], locale);
}

/** Lobby panel: settings plus the enable / test button. */
export function NightCuesPanel({ isHost }: { isHost: boolean }) {
  const { t, locale } = useTranslation();
  const { vibrate: vibrateOn, narrator, setVibrate, setNarrator } = useCueStore();
  const [tested, setTested] = useState(false);
  const [voiceOk, setVoiceOk] = useState(true);
  useEffect(() => {
    // Voices load asynchronously on some browsers.
    const check = () => setVoiceOk(hasVoiceFor(locale));
    check();
    window.speechSynthesis?.addEventListener?.("voiceschanged", check);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", check);
  }, [locale]);

  const narrate = narrator === "on" || (narrator === "auto" && isHost);
  const vibrateSupported = canVibrate();

  return (
    <div className="mb-4 rounded-xl border border-amber-300/30 bg-night-800/60 p-3 space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
        <BellRing className="h-4 w-4" /> {t("cues.title")}
      </p>
      <p className="text-xs text-moon-400">{t("cues.intro")}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setVibrate(!vibrateOn)}
          disabled={!vibrateSupported}
          className={cn(
            "flex items-start gap-2 rounded-lg border p-2.5 text-left",
            vibrateOn && vibrateSupported ? "border-amber-300/70 bg-amber-300/10" : "border-wolf-purple/30 bg-night-900/60 opacity-80"
          )}
        >
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
          <span>
            <span className="block text-sm text-moon-100">
              {t("cues.vibrate")}: {vibrateSupported ? (vibrateOn ? t("cues.on") : t("cues.off")) : t("cues.unsupported")}
            </span>
            <span className="block text-[11px] text-moon-400">{vibrateSupported ? t("cues.vibrateHint") : t("cues.vibrateIos")}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setNarrator(narrate ? "off" : "on")}
          className={cn(
            "flex items-start gap-2 rounded-lg border p-2.5 text-left",
            narrate ? "border-amber-300/70 bg-amber-300/10" : "border-wolf-purple/30 bg-night-900/60 opacity-80"
          )}
        >
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
          <span>
            <span className="block text-sm text-moon-100">
              {t("cues.narrator")}: {narrate ? t("cues.on") : t("cues.off")}
            </span>
            <span className="block text-[11px] text-moon-400">{t("cues.narratorHint")}</span>
            {narrate && !voiceOk && <span className="block text-[11px] text-orange-300">{t("cues.noVoice")}</span>}
          </span>
        </button>
      </div>

      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          armCues(t, locale);
          setTested(true);
        }}
      >
        <Sun className="w-4 h-4 mr-1" /> {t("cues.test")}
      </Button>
      {tested && <p className="text-[11px] text-moon-400">{canWakeLock() ? t("cues.awakeOk") : t("cues.awakeHttps")}</p>}
      <p className="text-[11px] text-moon-400/80">{t("cues.holdPhone")}</p>
    </div>
  );
}
