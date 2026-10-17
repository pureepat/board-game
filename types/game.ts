export type GameType = "WEREWOLF" | "TICTACTOE" | "ONE_NIGHT_WEREWOLF" | "FEED_THE_KRAKEN" | "INSIDER" | "CS_FILES";

export type Role = "VILLAGER" | "WEREWOLF" | "SEER" | "DOCTOR";

export type Phase =
  | "LOBBY"
  | "ROLE_REVEAL"
  | "NIGHT"
  | "DAY"
  | "VOTING"
  | "PLAYING"
  | "KR_APPOINT"
  | "KR_MUTINY"
  | "KR_NAV_DISCARD"
  | "KR_NAV_CHOOSE"
  | "KR_ACTION"
  | "KR_RITUAL"
  | "INS_WORD"
  | "INS_QUESTIONS"
  | "INS_DISCUSS"
  | "INS_VOTE1"
  | "INS_VOTE2"
  | "CS_NIGHT"
  | "CS_CLUES"
  | "CS_DISCUSS"
  | "CS_PRESENT"
  | "CS_REPLACE"
  | "CS_WITNESS"
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
  pendingCount: number | null;
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

export type KrakenRole = "SAILOR" | "PIRATE" | "CULT_LEADER" | "CULTIST";
export type KrakenTeam = "SAILORS" | "PIRATES" | "CULT";
export type KrakenColor = "RED" | "BLUE" | "YELLOW";
export type KrakenEffect = "DRUNK" | "MERMAID" | "TELESCOPE" | "ARMED" | "DISARMED" | "CULT_UPRISING";
export type KrakenMapAction = "CABIN_SEARCH" | "FLOGGING" | "OFF_WITH_TONGUE" | "FEED_THE_KRAKEN";
export type KrakenRitual = "GUN_STASH" | "CULT_SEARCH" | "CONVERSION";

export interface KrakenNavCard {
  color: KrakenColor;
  effect: KrakenEffect;
}

export interface KrakenPlayer {
  id: string;
  nickname: string;
  connected: boolean;
  isHost: boolean;
  isSelf: boolean;
  guns: number;
  resumes: number;
  isCaptain: boolean;
  isLieutenant: boolean;
  isNavigator: boolean;
  offDuty: boolean;
  eliminated: boolean;
  tongueless: boolean;
  // Public proof from Flogging: teams this player is known NOT to be on.
  notTeams: KrakenTeam[];
  // Own role; dealt Pirates see each other; Cult Leader <-> their converts; everyone at game over.
  role: KrakenRole | null;
}

// Flat-top hexes in columns; row counts half-hex steps north, so col + row is even.
export type KrakenHexKind = "START" | "SEA" | "KRAKEN" | "PIRATES" | "SAILORS";

export interface KrakenMap {
  id: "QUICK" | "LONG";
  hexes: { col: number; row: number; kind: KrakenHexKind }[];
  island: { col: number; row: number } | null;
  supplyRow: number | null;
  actions: { col: number; row: number; type: KrakenMapAction; used: boolean }[];
}

// Public event log. Names are nicknames, never socket ids.
export type KrakenEvent = { round: number } & (
  | { t: "START"; captain: string; map: "QUICK" | "LONG" }
  | { t: "APPOINT"; captain: string; lieutenant: string; navigator: string }
  | { t: "MUTINY"; commits: Record<string, number>; total: number; threshold: number; success: boolean; newCaptain: string | null }
  | { t: "RESHUFFLE" }
  | { t: "NAVIGATE"; navigator: string; color: KrakenColor; effect: KrakenEffect }
  | { t: "SUPPLY" }
  | { t: "GUNS"; player: string; delta: number }
  | { t: "PEEK"; player: string; effect: "MERMAID" | "TELESCOPE" }
  | { t: "RITUAL"; ritual: KrakenRitual }
  | { t: "CABIN_SEARCH"; captain: string; target: string }
  | { t: "FLOGGING"; captain: string; target: string; notTeam: KrakenTeam }
  | { t: "TONGUE"; captain: string; target: string }
  | { t: "FED"; captain: string; target: string }
  | { t: "OFF_DUTY"; players: string[] }
  | { t: "DRUNK"; captain: string }
  | { t: "WIN"; winner: KrakenTeam; reason: string }
);

// Only ever sent to the player it belongs to.
export type KrakenPrivateNote = { round: number } & (
  | { type: "CABIN_SEARCH"; nickname: string; role: KrakenRole }
  | { type: "CULT_SEARCH"; results: { nickname: string; role: KrakenRole }[] }
  | { type: "MERMAID"; cards: KrakenNavCard[] }
  | { type: "TELESCOPE"; card: KrakenNavCard | null }
  | { type: "CONVERTED"; leader: string }
  | { type: "YOU_CONVERTED"; nickname: string }
  | { type: "GUNS_RECEIVED"; count: number }
);

interface KrakenBase {
  gameType: "FEED_THE_KRAKEN";
  code: string;
  phase: Phase;
  hostId: string;
  winner: KrakenTeam | null;
  winReason: "bay" | "cove" | "kraken" | "fed" | null;
  chat: ChatMessage[];
  log: string[];
}

export interface KrakenLobbyState extends KrakenBase {
  players: { id: string; nickname: string; connected: boolean; isHost: boolean; isSelf: boolean }[];
  lobby: { mapId: "QUICK" | "LONG" | null; threshold: number; offDuty: number };
  you: { id: string; isHost: boolean } | null;
}

export interface KrakenGameState extends KrakenBase {
  players: KrakenPlayer[];
  round: number;
  map: KrakenMap;
  ship: { col: number; row: number };
  supplied: boolean;
  deckCount: number;
  discardCount: number;
  lastCard: KrakenNavCard | null;
  threshold: number;
  events: KrakenEvent[];
  pending: { kind: "ACTION" | "RITUAL"; type: KrakenMapAction | null; ritual: KrakenRitual | null } | null;
  you: {
    id: string;
    role: KrakenRole | null;
    isHost: boolean;
    guns: number;
    isCaptain: boolean;
    isLieutenant: boolean;
    isNavigator: boolean;
    isCultLeader: boolean;
    eliminated: boolean;
    privateLog: KrakenPrivateNote[];
  } | null;
  appointable?: string[];
  mutiny?: { committedIds: string[]; canCommit: boolean; yourCommit: number | null };
  nav?: { waitingIds: string[]; yourHand?: KrakenNavCard[] | null; yourOptions?: KrakenNavCard[] | null };
  conversionTargets?: string[];
}

export type KrakenRoomState = KrakenLobbyState | KrakenGameState;

// --- Insider ----------------------------------------------------------------

export type InsiderRole = "MASTER" | "INSIDER" | "COMMON";
export type InsiderAnswer = "YES" | "NO" | "UNKNOWN" | "CORRECT";
export type InsiderWinner = "COMMONS" | "INSIDER" | "NONE";
export interface InsiderWord {
  en: string;
  th: string;
}

export interface InsiderQuestion {
  id: number;
  from: string;
  nickname: string;
  text: string;
  answer: InsiderAnswer | null;
}

export interface InsiderMatch {
  totalRounds: number;
  round: number;
  scores: { id: string; nickname: string; points: number }[];
  history: {
    round: number;
    word: InsiderWord | null;
    masterId: string;
    insiderId: string;
    guesserId: string | null;
    winner: InsiderWinner;
    gains: Record<string, number>;
  }[];
}

interface InsiderBase {
  gameType: "INSIDER";
  code: string;
  phase: Phase;
  hostId: string;
  winner: InsiderWinner | null;
  chat: ChatMessage[];
  questionSeconds: number;
  masterMode: "rotate" | "random" | "choose";
  masterChoice: string | null;
  nextRotateMaster: string | null;
  /** Match length picked in the lobby; 0 = casual. */
  rounds: number;
  match: InsiderMatch | null;
}

export interface InsiderLobbyState extends InsiderBase {
  players: { id: string; nickname: string; connected: boolean; isHost: boolean; isSelf: boolean }[];
  lobby: { min: number; max: number };
  you: { id: string; isHost: boolean } | null;
}

export interface InsiderPlayer {
  id: string;
  nickname: string;
  connected: boolean;
  isHost: boolean;
  isSelf: boolean;
  isMaster: boolean;
  isGuesser: boolean;
  role: InsiderRole | null;
  voted: boolean;
}

export interface InsiderGameState extends InsiderBase {
  players: InsiderPlayer[];
  phaseEndsAt: number | null;
  phaseSeconds: number;
  word: InsiderWord | null;
  wordOptions: InsiderWord[] | null;
  questions: InsiderQuestion[];
  guesserId: string | null;
  elapsedMs: number | null;
  vote1Result: { yes: number; no: number } | null;
  vote2Tally: Record<string, number> | null;
  yourVote1: boolean | null;
  yourVote2: string | null;
  accusedId: string | null;
  insiderId: string | null;
  reason: "vote1" | "vote2" | "timeout" | null;
  gains: Record<string, number> | null;
  you: { id: string; isHost: boolean; role: InsiderRole | null; isMaster: boolean; isInsider: boolean } | null;
}

export type InsiderRoomState = InsiderLobbyState | InsiderGameState;

// --- CS Files ---------------------------------------------------------------

export type CsRole = "FORENSIC" | "MURDERER" | "ACCOMPLICE" | "WITNESS" | "INVESTIGATOR" | "LAB_TECH" | "RUMORMONGER" | "BODYGUARD";
export type CsTeam = "INVESTIGATORS" | "MURDERER";
export interface CsText {
  en: string;
  th: string;
}
export interface CsCard extends CsText {
  id: number;
}
export interface CsTile {
  id: string;
  title: CsText;
  options: CsText[];
}
export interface CsConfig {
  cards: number;
  discussSeconds: number;
  witness: boolean;
  labTech: boolean;
  rumormonger: boolean;
  bodyguard: boolean;
  forensicMode: "random" | "choose";
  forensicId: string | null;
}

interface CsBase {
  gameType: "CS_FILES";
  code: string;
  phase: Phase;
  hostId: string;
  winner: "INVESTIGATORS" | "MURDERER" | null;
  chat: ChatMessage[];
  config: CsConfig;
}

export interface CsLobbyState extends CsBase {
  players: { id: string; nickname: string; connected: boolean; isHost: boolean; isSelf: boolean }[];
  lobby: { min: number; max: number; roles: CsRole[] };
  you: { id: string; isHost: boolean } | null;
}

export interface CsPlayer {
  id: string;
  nickname: string;
  connected: boolean;
  isHost: boolean;
  isSelf: boolean;
  role: CsRole | null;
  isForensic: boolean;
  badge: boolean | null;
  means: CsCard[];
  clues: CsCard[];
}

export interface CsAccusation {
  by: string;
  target: string;
  means: CsCard;
  clue: CsCard;
  correct: boolean;
  round: number;
}

export interface CsGameState extends CsBase {
  players: CsPlayer[];
  phaseEndsAt: number | null;
  phaseSeconds: number;
  round: number;
  rounds: number;
  forensicId: string;
  tiles: ({ tile: CsTile; marker: number | null; fresh: boolean } | null)[];
  locationOptions: CsTile[] | null;
  pendingTile: CsTile | null;
  speakerId: string | null;
  speakers: string[];
  accusations: CsAccusation[];
  rumorTarget: string | null;
  witnessGuess: string | null;
  reason: "solved" | "witness" | "badges" | "unsolved" | null;
  solution: { murdererId: string; means: CsCard; clue: CsCard } | null;
  you: {
    id: string;
    isHost: boolean;
    role: CsRole | null;
    team: CsTeam | null;
    nightTodo: { murder: boolean; lab: boolean; rumor: boolean } | null;
    suspects: string[] | null;
    witnessId: string | null;
    labResult: { playerId: string; kind: "means" | "clue"; card: CsCard; hit: boolean } | null;
  } | null;
}

export type CsRoomState = CsLobbyState | CsGameState;

export type PlayMode = "local" | "online";

// Every view carries the room's play mode (added in lib/stateFilter.js getFilteredState).
export type RoomState = (WerewolfRoomState | TicTacToeRoomState | OnwRoomState | KrakenRoomState | InsiderRoomState | CsRoomState) & {
  playMode: PlayMode;
};
