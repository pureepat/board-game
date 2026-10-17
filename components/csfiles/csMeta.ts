import { Eye, FlaskConical, Megaphone, Microscope, Search, ShieldCheck, Skull, UserX } from "lucide-react";
import type { CsRole, CsText } from "@/types/game";

// Labels/descriptions come from t(`csfiles.roles.${role}.label` | `.desc`);
// this map only holds each role's visual identity.
export const CS_ROLE_META: Record<CsRole, { icon: React.ElementType; hex: string }> = {
  FORENSIC: { icon: Microscope, hex: "#0ea5e9" },
  MURDERER: { icon: Skull, hex: "#dc2626" },
  ACCOMPLICE: { icon: UserX, hex: "#be123c" },
  WITNESS: { icon: Eye, hex: "#a855f7" },
  INVESTIGATOR: { icon: Search, hex: "#64748b" },
  LAB_TECH: { icon: FlaskConical, hex: "#14b8a6" },
  RUMORMONGER: { icon: Megaphone, hex: "#f97316" },
  BODYGUARD: { icon: ShieldCheck, hex: "#22c55e" },
};

export const CS_MEANS_HEX = "#b91c1c";
export const CS_CLUE_HEX = "#1d4ed8";

/** Card / tile text in the viewer's language. */
export function csText(text: CsText, locale: string) {
  return locale === "th" ? text.th : text.en;
}
