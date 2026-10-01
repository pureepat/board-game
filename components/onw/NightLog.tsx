"use client";

import type { OnwNightLogEntry } from "@/types/game";
import { useTranslation } from "@/lib/i18n/useTranslation";

function useDescribe() {
  const { t } = useTranslation();
  const roleLabel = (role: string) => t(`onw.roles.${role}.label`);

  return (entry: OnwNightLogEntry): string => {
    switch (entry.type) {
      case "WEREWOLF_TEAM":
        return entry.teammates.length
          ? t("onw.nightLog.werewolfTeam", { names: entry.teammates.map((x) => x.nickname).join(", ") })
          : t("onw.nightLog.werewolfAlone");
      case "MINION_WOLVES":
        return entry.wolves.length
          ? t("onw.nightLog.minionWolves", { names: entry.wolves.map((x) => x.nickname).join(", ") })
          : t("onw.nightLog.minionNoWolves");
      case "MASON_TEAM":
        return entry.teammates.length
          ? t("onw.nightLog.masonTeam", { names: entry.teammates.map((x) => x.nickname).join(", ") })
          : t("onw.nightLog.masonAlone");
      case "INSOMNIAC_VIEW":
        return t("onw.nightLog.insomniacView", { role: roleLabel(entry.role) });
      case "WEREWOLF_CENTER_PEEK":
        return t("onw.nightLog.werewolfCenterPeek", { n: entry.index + 1, role: roleLabel(entry.role) });
      case "SEER_PLAYER":
        return t("onw.nightLog.seerPlayer", { nickname: entry.targetNickname, role: roleLabel(entry.role) });
      case "SEER_CENTER":
        return t("onw.nightLog.seerCenter", {
          cards: entry.cards.map((c) => `#${c.index + 1} ${roleLabel(c.role)}`).join(", "),
        });
      case "ROBBER_SWAP":
        return t("onw.nightLog.robberSwap", { nickname: entry.targetNickname, role: roleLabel(entry.newRole) });
      case "TROUBLEMAKER_SWAP":
        return t("onw.nightLog.troublemakerSwap", { a: entry.aNickname, b: entry.bNickname });
      case "DRUNK_SWAP":
        return t("onw.nightLog.drunkSwap", { n: entry.index + 1 });
      default:
        return "";
    }
  };
}

export function NightLog({ entries }: { entries: OnwNightLogEntry[] }) {
  const { t } = useTranslation();
  const describe = useDescribe();

  if (entries.length === 0) {
    return <p className="text-moon-400/60 text-xs italic">{t("onw.nightLog.empty")}</p>;
  }
  return (
    <ul className="space-y-2">
      {entries.map((entry, i) => (
        <li key={i} className="text-sm text-moon-200 bg-wolf-purple/10 border border-wolf-purple/30 rounded-lg px-3 py-2">
          {describe(entry)}
        </li>
      ))}
    </ul>
  );
}
