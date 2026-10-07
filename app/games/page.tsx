"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GAME_GUIDES } from "@/lib/gamesCatalog";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import type { GameType } from "@/types/game";

export default function GamesPage() {
  return (
    <Suspense fallback={null}>
      <GamesPageInner />
    </Suspense>
  );
}

function GamesPageInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<GameType>("WEREWOLF");

  useEffect(() => {
    const g = searchParams.get("game");
    if (g && GAME_GUIDES.some((x) => x.id === g)) setSelected(g as GameType);
  }, [searchParams]);

  const guide = GAME_GUIDES.find((g) => g.id === selected)!;

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <header className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-moon-400 hover:text-moon-200 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("guide.back")}
          </Link>
          <LanguageSwitcher />
        </header>

        <div className="text-center mb-6">
          <h1 className="font-display text-3xl text-moon-200 tracking-widest">{t("guide.title")}</h1>
          <p className="text-moon-400 text-sm mt-1">{t("guide.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {GAME_GUIDES.map((g) => {
            const Icon = g.icon;
            const active = g.id === selected;
            return (
              <button
                key={g.id}
                onClick={() => setSelected(g.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all",
                  "border-wolf-purple/20 bg-night-900/60 hover:border-crimson-500",
                  active && "border-crimson-500 bg-crimson-600/20 ring-1 ring-crimson-500"
                )}
              >
                <Icon className={cn("w-5 h-5", active ? "text-crimson-400" : "text-moon-400")} />
                <span className="text-xs text-moon-200 leading-tight">{t(`home.games.${g.id}.label`)}</span>
              </button>
            );
          })}
        </div>

        <Card key={guide.id} className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl">{t(`home.games.${guide.id}.label`)}</CardTitle>
            <p className="text-moon-400 text-sm italic">{t(`home.games.${guide.id}.tagline`)}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-moon-300 text-sm">{t(`guide.games.${guide.id}.summary`)}</p>

            <div className="grid grid-cols-2 gap-2">
              <Stat icon={Users} label={t("guide.players")} value={t(`home.games.${guide.id}.minPlayers`)} />
              <Stat icon={Clock} label={t("guide.duration")} value={t(`guide.games.${guide.id}.duration`)} />
            </div>

            <div className="rounded-lg border border-crimson-500/30 bg-crimson-600/10 p-3 flex gap-3">
              <Target className="w-5 h-5 text-crimson-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-moon-400">{t("guide.goal")}</p>
                <p className="text-sm text-moon-200">{t(`guide.games.${guide.id}.goal`)}</p>
              </div>
            </div>

            <section>
              <h4 className="font-display text-moon-200 mb-2">{t("guide.howToPlay")}</h4>
              <ol className="space-y-2">
                {guide.ruleKeys.map((k, i) => (
                  <li key={k} className="flex gap-3 text-sm text-moon-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-wolf-purple/40 text-[11px] text-moon-200">
                      {i + 1}
                    </span>
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ol>
            </section>

            {guide.sections.map((section) => (
              <section key={section.titleKey}>
                <h4 className="font-display text-moon-200 mb-2">{t(section.titleKey)}</h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="flex gap-3 rounded-lg border border-wolf-purple/20 bg-night-900/60 p-3">
                        <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", item.color)} />
                        <div>
                          <p className={cn("text-sm font-medium", item.color)}>{t(item.labelKey)}</p>
                          <p className="text-xs text-moon-300">{t(item.descKey)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <Button className="w-full" size="lg" onClick={() => router.push(`/?game=${guide.id}`)}>
              {t("guide.playThis")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-wolf-purple/20 bg-night-900/60 p-3">
      <Icon className="w-4 h-4 text-moon-400 shrink-0" />
      <div>
        <p className="text-[11px] text-moon-400">{label}</p>
        <p className="text-sm text-moon-200">{value}</p>
      </div>
    </div>
  );
}
