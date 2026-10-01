"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Moon, Grid3x3, ArrowLeft, DoorOpen, KeyRound, Zap, Anchor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getSocket } from "@/lib/socketClient";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { GameType } from "@/types/game";

type Step = "choose" | "create" | "join";

const GAME_ICONS: Record<GameType, React.ElementType> = {
  WEREWOLF: Moon,
  TICTACTOE: Grid3x3,
  ONE_NIGHT_WEREWOLF: Zap,
  FEED_THE_KRAKEN: Anchor,
};

const GAME_IDS: GameType[] = ["WEREWOLF", "TICTACTOE", "ONE_NIGHT_WEREWOLF", "FEED_THE_KRAKEN"];

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("choose");
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefill = searchParams.get("code");
    if (prefill) {
      setJoinCode(prefill.toUpperCase());
      setStep("join");
    }
  }, [searchParams]);

  function goToChoose() {
    setStep("choose");
    setGameType(null);
    setError(null);
  }

  function goToRoom(code: string, playerId: string) {
    sessionStorage.setItem("ww_nickname", nickname.trim());
    sessionStorage.setItem(`ww_playerId_${code}`, playerId);
    router.push(`/room/${code}`);
  }

  function handleCreate() {
    if (!gameType) return setError(t("home.errorChooseGame"));
    if (!nickname.trim()) return setError(t("home.errorNickname"));
    setLoading(true);
    setError(null);
    const socket = getSocket();
    socket.emit(
      "create_room",
      { nickname, gameType },
      (res: { code?: string; playerId?: string; error?: string }) => {
        setLoading(false);
        if (res.error) return setError(res.error);
        if (res.code && res.playerId) goToRoom(res.code, res.playerId);
      }
    );
  }

  function handleJoin() {
    if (!nickname.trim()) return setError(t("home.errorNickname"));
    if (!joinCode.trim()) return setError(t("home.errorRoomCode"));
    setLoading(true);
    setError(null);
    const socket = getSocket();
    socket.emit(
      "join_room",
      { code: joinCode.trim().toUpperCase(), nickname },
      (res: { code?: string; playerId?: string; error?: string }) => {
        setLoading(false);
        if (res.error) return setError(res.error);
        if (res.code && res.playerId) goToRoom(res.code, res.playerId);
      }
    );
  }

  const selectedGame = gameType
    ? { id: gameType, label: t(`home.games.${gameType}.label`), tagline: t(`home.games.${gameType}.tagline`), minPlayers: t(`home.games.${gameType}.minPlayers`) }
    : null;
  const tagline =
    step === "create" && selectedGame
      ? selectedGame.tagline
      : step === "join"
      ? t("home.taglineJoin")
      : t("home.taglineChoose");

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-col items-center mb-8">
          <Moon className="w-10 h-10 text-moon-300 mb-3" />
          <h1 className="font-display text-4xl text-moon-200 tracking-widest text-center">{t("home.title")}</h1>
          <p className="text-moon-400 text-sm mt-1 tracking-wide text-center">{tagline}</p>
        </div>

        {step === "choose" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("home.howToPlay")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={() => {
                  setStep("create");
                  setError(null);
                }}
                className="w-full flex items-center gap-4 rounded-lg border border-wolf-purple/30 bg-night-900/60 p-4 text-left transition-all hover:border-crimson-500 hover:bg-night-700"
              >
                <DoorOpen className="w-6 h-6 text-crimson-500 shrink-0" />
                <div>
                  <p className="text-moon-200 font-medium">{t("home.createRoomTitle")}</p>
                  <p className="text-moon-400 text-xs">{t("home.createRoomDesc")}</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setStep("join");
                  setError(null);
                }}
                className="w-full flex items-center gap-4 rounded-lg border border-wolf-purple/30 bg-night-900/60 p-4 text-left transition-all hover:border-crimson-500 hover:bg-night-700"
              >
                <KeyRound className="w-6 h-6 text-wolf-purple shrink-0" />
                <div>
                  <p className="text-moon-200 font-medium">{t("home.joinRoomTitle")}</p>
                  <p className="text-moon-400 text-xs">{t("home.joinRoomDesc")}</p>
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {step === "create" && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <button
                onClick={goToChoose}
                className="text-moon-400 hover:text-moon-200 transition-colors"
                aria-label={t("common.back")}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <CardTitle>{t("home.createRoomTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-moon-400 mb-1 block">{t("home.chooseAGame")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {GAME_IDS.map((id) => {
                    const Icon = GAME_ICONS[id];
                    const active = id === gameType;
                    return (
                      <button
                        key={id}
                        onClick={() => setGameType(id)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all",
                          "border-wolf-purple/20 bg-night-900/60",
                          active && "border-crimson-500 bg-crimson-600/20 ring-1 ring-crimson-500"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", active ? "text-crimson-400" : "text-moon-400")} />
                        <span className="text-xs text-moon-200 leading-tight">{t(`home.games.${id}.label`)}</span>
                        <span className="text-[10px] text-moon-400/70">{t(`home.games.${id}.minPlayers`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-moon-400 mb-1 block">{t("common.nickname")}</label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t("common.nicknamePlaceholder")}
                  maxLength={20}
                />
              </div>

              {error && <p className="text-crimson-500 text-sm">{error}</p>}

              <Button className="w-full" size="lg" disabled={loading || !gameType} onClick={handleCreate}>
                {loading ? t("common.pleaseWait") : t("home.createRoomTitle")}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "join" && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <button
                onClick={goToChoose}
                className="text-moon-400 hover:text-moon-200 transition-colors"
                aria-label={t("common.back")}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <CardTitle>{t("home.joinRoomTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-moon-400 mb-1 block">{t("common.nickname")}</label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t("common.nicknamePlaceholder")}
                  maxLength={20}
                />
              </div>

              <div>
                <label className="text-xs text-moon-400 mb-1 block">{t("common.roomCode")}</label>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder={t("common.roomCodePlaceholder")}
                  maxLength={5}
                  className="tracking-[0.3em] font-display"
                />
              </div>

              {error && <p className="text-crimson-500 text-sm">{error}</p>}

              <Button className="w-full" size="lg" disabled={loading} onClick={handleJoin}>
                {loading ? t("common.pleaseWait") : t("home.joinRoomTitle")}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-moon-400/60 text-xs mt-6">
          {step === "create" && selectedGame
            ? t("home.footerRecommended", { minPlayers: selectedGame.minPlayers, game: selectedGame.label })
            : step === "create"
            ? t("home.footerPickGame")
            : step === "join"
            ? t("home.footerJoin")
            : t("home.footerChoose")}
        </p>
      </div>
    </main>
  );
}
