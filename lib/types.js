// Shared game constants (plain JS so both server.js and lib modules can require it)

const ROLES = {
  VILLAGER: "VILLAGER",
  WEREWOLF: "WEREWOLF",
  SEER: "SEER",
  DOCTOR: "DOCTOR",
};

const TEAMS = {
  VILLAGE: "VILLAGE",
  WEREWOLF: "WEREWOLF",
};

const ROLE_TEAM = {
  [ROLES.VILLAGER]: TEAMS.VILLAGE,
  [ROLES.SEER]: TEAMS.VILLAGE,
  [ROLES.DOCTOR]: TEAMS.VILLAGE,
  [ROLES.WEREWOLF]: TEAMS.WEREWOLF,
};

const PHASES = {
  LOBBY: "LOBBY",
  ROLE_REVEAL: "ROLE_REVEAL",
  NIGHT: "NIGHT",
  DAY: "DAY",
  VOTING: "VOTING",
  PLAYING: "PLAYING",
  // Feed the Kraken
  CREW_SELECT: "CREW_SELECT",
  CREW_VOTE: "CREW_VOTE",
  VOYAGE: "VOYAGE",
  VOYAGE_RESULT: "VOYAGE_RESULT",
  GAME_OVER: "GAME_OVER",
};

const GAME_TYPES = {
  WEREWOLF: "WEREWOLF",
  TICTACTOE: "TICTACTOE",
  ONE_NIGHT_WEREWOLF: "ONE_NIGHT_WEREWOLF",
  FEED_THE_KRAKEN: "FEED_THE_KRAKEN",
};

// --- Feed the Kraken -------------------------------------------------------

const KRAKEN_ROLES = { SAILOR: "SAILOR", PIRATE: "PIRATE", CULTIST: "CULTIST" };
const KRAKEN_CARDS = { CALM: "CALM", SABOTAGE: "SABOTAGE", OFFERING: "OFFERING" };

// Which cards each allegiance is allowed to play on a voyage.
const KRAKEN_ALLOWED_CARDS = {
  SAILOR: ["CALM"],
  PIRATE: ["CALM", "SABOTAGE"],
  CULTIST: ["CALM", "SABOTAGE", "OFFERING"],
};

// players -> [sailors, pirates, cultists]
const KRAKEN_DISTRIBUTION = {
  5: [3, 2, 0],
  6: [4, 2, 0],
  7: [4, 2, 1],
  8: [5, 2, 1],
  9: [5, 3, 1],
  10: [6, 3, 1],
  11: [7, 3, 1],
};

// players -> how many people the Captain sends on each voyage
const KRAKEN_CREW_SIZE = { 5: 2, 6: 3, 7: 3, 8: 3, 9: 4, 10: 4, 11: 4 };

const KRAKEN_MIN_PLAYERS = 5;
const KRAKEN_MAX_PLAYERS = 11;
const KRAKEN_WIN_SCORE = 3; // successes / sabotages / offerings needed to win
const KRAKEN_MAX_REJECTS = 3; // consecutive rejected crews before the ship is lost

// --- One Night Ultimate Werewolf -----------------------------------------

const ONW_ROLES = {
  WEREWOLF: "WEREWOLF",
  MINION: "MINION",
  MASON: "MASON",
  SEER: "SEER",
  ROBBER: "ROBBER",
  TROUBLEMAKER: "TROUBLEMAKER",
  DRUNK: "DRUNK",
  INSOMNIAC: "INSOMNIAC",
  TANNER: "TANNER",
  HUNTER: "HUNTER",
  VILLAGER: "VILLAGER",
};

// Fixed wake order. A role with zero players holding it (as their starting
// card) is skipped automatically — see lib/onuwLogic.js#enterNightStep.
const ONW_NIGHT_ORDER = ["WEREWOLF", "MINION", "MASON", "SEER", "ROBBER", "TROUBLEMAKER", "DRUNK", "INSOMNIAC"];

const ONW_TEAM = {
  WEREWOLF: "WEREWOLF",
  MINION: "WEREWOLF",
  TANNER: "TANNER",
  SEER: "VILLAGE",
  ROBBER: "VILLAGE",
  TROUBLEMAKER: "VILLAGE",
  MASON: "VILLAGE",
  DRUNK: "VILLAGE",
  INSOMNIAC: "VILLAGE",
  HUNTER: "VILLAGE",
  VILLAGER: "VILLAGE",
};

// Deck size must equal players + 3 (the center cards) — this is just a
// reasonable starting point for a 5-player lobby; the host retunes it.
const ONW_DEFAULT_ROLE_CONFIG = {
  WEREWOLF: 3,
  MINION: 0,
  MASON: 0,
  SEER: 1,
  ROBBER: 1,
  TROUBLEMAKER: 1,
  DRUNK: 0,
  INSOMNIAC: 0,
  TANNER: 0,
  HUNTER: 0,
  VILLAGER: 2,
};

// Werewolf phases that can carry a host-configurable countdown. Seconds.
// A value of 0 means "no limit" — the phase only advances when the host
// (or the players, e.g. all night actions in) moves it forward.
const TIMER_PHASES = ["ROLE_REVEAL", "NIGHT", "DAY", "VOTING"];
const DEFAULT_TIMER_CONFIG = { ROLE_REVEAL: 10, NIGHT: 60, DAY: 90, VOTING: 60 };
const TIMER_MIN_SECONDS = 0;
const TIMER_MAX_SECONDS = 600;

module.exports = {
  ROLES,
  TEAMS,
  ROLE_TEAM,
  PHASES,
  GAME_TYPES,
  TIMER_PHASES,
  DEFAULT_TIMER_CONFIG,
  TIMER_MIN_SECONDS,
  TIMER_MAX_SECONDS,
  ONW_ROLES,
  ONW_NIGHT_ORDER,
  ONW_TEAM,
  ONW_DEFAULT_ROLE_CONFIG,
  KRAKEN_ROLES,
  KRAKEN_CARDS,
  KRAKEN_ALLOWED_CARDS,
  KRAKEN_DISTRIBUTION,
  KRAKEN_CREW_SIZE,
  KRAKEN_MIN_PLAYERS,
  KRAKEN_MAX_PLAYERS,
  KRAKEN_WIN_SCORE,
  KRAKEN_MAX_REJECTS,
};
