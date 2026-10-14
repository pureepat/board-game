import { Crown, Eye, User } from "lucide-react";
import type { InsiderRole } from "@/types/game";

// Labels/descriptions are translated via t(`insider.roles.${role}.label` | `.desc`);
// this map only holds each role's visual identity.
export const INS_ROLE_META: Record<InsiderRole, { hex: string; icon: React.ElementType }> = {
  MASTER: { hex: "#d4a017", icon: Crown },
  INSIDER: { hex: "#7c3aed", icon: Eye },
  COMMON: { hex: "#94a3b8", icon: User },
};
