export type GameType = "WEREWOLF" | "TICTACTOE" | "ONE_NIGHT_WEREWOLF" | "FEED_THE_KRAKEN";

export type Role = "VILLAGER" | "WEREWOLF" | "SEER" | "DOCTOR";

export type Phase =
  | "LOBBY"
  | "ROLE_REVEAL"
  | "NIGHT"
  | "DAY"
  | "VOTING"
  | "PLAYING"
  | "CREW_SELECT"
  | "CREW_VOTE"
  | "VOYAGE"
  | "VOYAGE_RESULT"
  | "GAME_OVER";

export interface RoleConfig {
  WEREWOLF: number;
  SEER: number;
  DOCTOR: number;
  VILLAGER: number;
}

export type TimerPhase = "ROLE_REVEAL" | "NIGHT" | "DAY" | "VOTING";

export type TimerConfig = Record<TimerPhase, number>;

export interface PublicPlayer {
  id: string;
  nickname: string;
  alive: boolean;
  connected: boolean;
  isHost: boolean;
  isSelf: boolean;
  role: Role | null;
}

export interface ChatMessage {
  id: string;
  from: string;
  nickname: string;
  text: string;
  ts: number;
}

export interface SeerResult {
  targetId: string;
  targetNickname: string;
  isWerewolf: boolean;
}

export interface NightView {
  wolfChat: ChatMessage[];
  wolfVotes?: Record<string, string>;
  youActed?: boolean;
}

export interface VoteView {
  votes: Record<string, string | null>;
  tally: Record<string, number>;
  youVoted: string | null;
}

export interface WerewolfRoomState {
  gameType: "WEREWOLF";
  code: string;
  phase: Phase;
  dayCount: number;
  hostId: string;
  roleConfig: RoleConfig;
  timerConfig: TimerConfig;
  phaseEndsAt: number | null;
  players: PublicPlayer[];
  log: string[];
  winner: "VILLAGE" | "WEREWOLF" | null;
  you: { id: string; role: Role | null; alive: boolean; isHost: boolean } | null;
  // Only ever populated for the Seer, and not tied to the NIGHT phase — it's
  // knowledge they now hold, valid until their next check resets it.
  seerResult?: SeerResult | null;
  night?: NightView;
  chat?: ChatMessage[];
  vote?: VoteView;
}

/** @deprecated use WerewolfRoomState / FilteredRoomState union */
export type FilteredRoomState = WerewolfRoomState;

export type Symbol = "X" | "O";

export interface TicTacToePlayer {
  id: string;
  nickname: string;
  connected: boolean;
  isHost: boolean;
  isSelf: boolean;
  symbol: Symbol | null;
}

export interface TicTacToeRoomState {
  gameType: "TICTACTOE";
  code: string;
  phase: Phase;
  hostId: string;
  players: TicTacToePlayer[];
  board: (Symbol | null)[];
  turn: string | null;
  winner: Symbol | "DRAW" | null;
  winningLine: number[] | null;
  log: string[];
  you: { id: string; symbol: Symbol | null; isHost: boolean } | null;
}

// --- One Night Ultimate Werewolf ------------------------------------------

export type OnwRole =
  | "WEREWOLF"
  | "MINION"
  | "MASON"
  | "SEER"
  | "ROBBER"
  | "TROUBLEMAKER"
  | "DRUNK"
  | "INSOMNIAC"
  | "TANNER"
  | "HUNTER"
  | "VILLAGER";

export type OnwRoleConfig = Record<OnwRole, number>;

export type OnwTimerPhase = "NIGHT_STEP" | "DAY" | "VOTING";
export type OnwTimerConfig = Record<OnwTimerPhase, number>;

export interface OnwPlayer {
  id: string;
  nickname: string;
  connected: boolean;
  isHost: boolean;
  isSelf: boolean;
  dead: boolean;
  // Only populated once the game has ended.
  startingRole: OnwRole | null;
  role: OnwRole | null;
}

export interface OnwCenterCard {
  index: number;
  // null unless this viewer has personally peeked this slot, or the game ended.
  role: OnwRole | null;
}

export type OnwNightLogEntry =
  | { type: "WEREWOLF_TEAM"; teammates: { id: string; nickname: string }[] }
  | { type: "MINION_WOLVES"; wolves: { id: string; nickname: string }[] }
  | { type: "MASON_TEAM"; teammates: { id: string; nickname: string }[] }
  | { type: "INSOMNIAC_VIEW"; role: OnwRole }
  | { type: "WEREWOLF_CENTER_PEEK"; index: number; role: OnwRole }
  | { type: "SEER_PLAYER"; targetId: string; targetNickname: string; role: OnwRole }
  | { type: "SEER_CENTER"; cards: { index: number; role: OnwRole }[] }
  | { type: "ROBBER_SWAP"; targetId: string; targetNickname: string; newRole: OnwRole }
  | { type: "TROUBLEMAKER_SWAP"; aId: string; aNickname: string; bId: string; bNickname: string }
  | { type: "DRUNK_SWAP"; index: number };

export interface OnwRoomState {
  gameType: "ONE_NIGHT_WEREWOLF";
  code: string;
  phase: Phase;
  hostId: string;
  roleConfig: OnwRoleConfig;
  timerConfig: OnwTimerConfig;
  phaseEndsAt: number | null;
  players: OnwPlayer[];
  center: OnwCenterCard[];
  nightOrder: OnwRole[];
  currentStep: OnwRole | null;
  pendingCount: number;
  isMyTurn: boolean;
  myNightLog: OnwNightLogEntry[];
  deadPlayerIds: string[];
  log: string[];
  winner: "VILLAGE" | "WEREWOLF" | "TANNER" | null;
  you: { id: string; startingRole: OnwRole | null; isHost: boolean } | null;
  chat?: ChatMessage[];
  vote?: VoteView;
}

// --- Feed the Kraken -------------------------------------------------------

export type KrakenRole = "SAILOR" | "PIRATE" | "CULTIST";
export type KrakenCard = "CALM" | "SABOTAGE" | "OFFERING";
export type KrakenOutcome = "SAILORS" | "PIRATES" | "KRAKEN";

export interface KrakenPlayer {
  id: string;
  nickname: string;
  connected: boolean;
  isHost: boolean;
  isSelf: boolean;
  isCaptain: boolean;
  onCrew: boolean;
  // Own role, fellow Pirates' roles, or everyone's once the game is over.
  role: KrakenRole | null;
}

export interface KrakenHistoryEntry {
  round: number;
  captain: string;
  crew: string[];
  votes: Record<string, boolean>;
  approved: boolean;
  // Shuffled — never attributed to a player. null until the voyage resolves.
  cards: KrakenCard[] | null;
  outcome: KrakenOutcome | "REJECTED" | null;
}

export interface KrakenRoomState {
  gameType: "FEED_THE_KRAKEN";
  code: string;
  phase: Phase;
  hostId: string;
  players: KrakenPlayer[];
  round: number;
  captainId: string | null;
  crewSize: number;
  crew: string[];
  rejects: number;
  maxRejects: number;
  score: { SAILORS: number; PIRATES: number; KRAKEN: number };
  winScore: number;
  composition: Record<KrakenRole, number> | null;
  history: KrakenHistoryEntry[];
  log: string[];
  winner: "SAILORS" | "PIRATES" | "CULTIST" | null;
  winReason: "voyages" | "sabotage" | "mutiny" | "kraken" | null;
  chat: ChatMessage[];
  you: { id: string; role: KrakenRole | null; isHost: boolean; isCaptain: boolean; onCrew: boolean } | null;
  vote?: { votedIds: string[]; youVoted: boolean | null };
  voyage?: { playedIds: string[]; yourCard: KrakenCard | null; allowedCards: KrakenCard[] };
}

export type RoomState = WerewolfRoomState | TicTacToeRoomState | OnwRoomState | KrakenRoomState;
