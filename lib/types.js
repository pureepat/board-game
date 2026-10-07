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
  KR_APPOINT: "KR_APPOINT",
  KR_MUTINY: "KR_MUTINY",
  KR_NAV_DISCARD: "KR_NAV_DISCARD",
  KR_NAV_CHOOSE: "KR_NAV_CHOOSE",
  KR_ACTION: "KR_ACTION",
  KR_RITUAL: "KR_RITUAL",
  GAME_OVER: "GAME_OVER",
};

const GAME_TYPES = {
  WEREWOLF: "WEREWOLF",
  TICTACTOE: "TICTACTOE",
  ONE_NIGHT_WEREWOLF: "ONE_NIGHT_WEREWOLF",
  FEED_THE_KRAKEN: "FEED_THE_KRAKEN",
};

// --- Feed the Kraken -------------------------------------------------------
// Everything rules-specific lives in lib/krakenRules.js; only what server.js
// needs for room plumbing is here.
const KRAKEN_MIN_PLAYERS = 5;
const KRAKEN_MAX_PLAYERS = 11;

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
  KRAKEN_MIN_PLAYERS,
  KRAKEN_MAX_PLAYERS,
};
