"use client";

// Device helpers for eyes-closed play: vibration, a spoken narrator, and
// keeping the screen awake. All of them degrade quietly: iPhones have no
// Vibration API, Wake Lock needs HTTPS, and speech voices vary by device.

export const VIBRATE_WAKE = [300, 150, 300, 150, 300]; // your turn: open your eyes
export const VIBRATE_DAWN = [700]; // everyone: open your eyes
export const VIBRATE_TEST = [120, 80, 120];

export function canVibrate() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function vibrate(pattern: number[]) {
  try {
    if (canVibrate()) navigator.vibrate(pattern);
  } catch {
    // Some browsers throw before the page has had a tap; nothing to do.
  }
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Voice for the UI language, if the device has one. */
function voiceFor(lang: string) {
  if (!canSpeak()) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.replace("_", "-").toLowerCase().startsWith(lang.toLowerCase())) ?? null;
}

export function hasVoiceFor(locale: string) {
  return Boolean(voiceFor(locale === "th" ? "th" : "en"));
}

/** Queue lines to be read out in order. */
export function speak(lines: string[], locale: string) {
  if (!canSpeak() || !lines.length) return;
  const lang = locale === "th" ? "th-TH" : "en-US";
  const voice = voiceFor(locale === "th" ? "th" : "en");
  for (const line of lines) {
    const u = new SpeechSynthesisUtterance(line);
    u.lang = lang;
    if (voice) u.voice = voice;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
}

/** iOS only lets a page speak after speech was started from a tap; call this from the enable button. */
export function unlockSpeech() {
  if (!canSpeak()) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

// --- Screen Wake Lock ------------------------------------------------------------

type Sentinel = { released: boolean; release: () => Promise<void> };
let sentinel: Sentinel | null = null;

export function canWakeLock() {
  return typeof navigator !== "undefined" && "wakeLock" in navigator && typeof window !== "undefined" && window.isSecureContext;
}

export async function keepAwake() {
  if (!canWakeLock()) return false;
  try {
    if (sentinel && !sentinel.released) return true;
    sentinel = await (navigator as any).wakeLock.request("screen");
    return true;
  } catch {
    return false;
  }
}

export async function releaseAwake() {
  try {
    await sentinel?.release();
  } catch {
    // already released
  }
  sentinel = null;
}
