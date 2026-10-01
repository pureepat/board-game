"use client";

import { Eye } from "lucide-react";
import type { SeerResult } from "@/types/game";
import { useTranslation } from "@/lib/i18n/useTranslation";

/** The Seer's private knowledge from their latest check — persists across phases until their next check. */
export function SeerNote({ result }: { result: SeerResult | null | undefined }) {
  const { t } = useTranslation();
  if (!result) return null;
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-wolf-purple/10 border border-wolf-purple/40 text-sm">
      <Eye className="w-4 h-4 text-wolf-purple shrink-0 mt-0.5" />
      <p>
        <span className="text-moon-200">{result.targetNickname}</span>{" "}
        <span className={result.isWerewolf ? "text-crimson-500 font-bold" : "text-emerald-400 font-bold"}>
          {result.isWerewolf ? t("werewolf.night.isWerewolf") : t("werewolf.night.notWerewolf")}
        </span>
        .
      </p>
    </div>
  );
}
