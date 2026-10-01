const { customAlphabet } = require("nanoid");
const { PHASES, GAME_TYPES, DEFAULT_TIMER_CONFIG, ONW_DEFAULT_ROLE_CONFIG } = require("./types");

const genCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

// In-memory authoritative store. Swap for Redis if you need multi-instance scaling.
const rooms = new Map();

function gameStateFor(gameType) {
  if (gameType === GAME_TYPES.TICTACTOE) {
    return {
      board: Array(9).fill(null),
      symbols: {}, // socketId -> "X" | "O"
      turn: null,
      winningLine: null,
    };
  }
  if (gameType === GAME_TYPES.ONE_NIGHT_WEREWOLF) {
    return {
      roleConfig: { ...ONW_DEFAULT_ROLE_CONFIG },
      timerConfig: { NIGHT_STEP: 15, DAY: 180, VOTING: 30 },
      phaseEndsAt: null,
      center: [], // filled at start: [{ role }, { role }, { role }]
      nightOrder: [], // subset of ONW_NIGHT_ORDER actually in play this game
      nightStepIndex: 0,
      nightActed: {}, // socketId -> true, reset each step
      nightInfo: {}, // socketId -> [ {type, ...} ] private reveal log for that player
      vote: emptyVote(),
      chat: [],
      deadPlayerIds: [],
    };
  }
  if (gameType === GAME_TYPES.FEED_THE_KRAKEN) {
    return {
      playerOrder: [], // seating order; the Captain rotates through it
      captainIndex: 0,
      round: 0, // voyage number, 1-based once started
      rejects: 0, // consecutive rejected crews
      score: { SAILORS: 0, PIRATES: 0, KRAKEN: 0 },
      crew: [],
      crewVotes: {}, // socketId -> boolean (approve)
      cards: {}, // socketId -> played card
      history: [], // public record of every proposed crew / voyage
      winReason: null,
      chat: [],
    };
  }
  // WEREWOLF
  return {
    dayCount: 0,
    roleConfig: { WEREWOLF: 2, SEER: 1, DOCTOR: 1, VILLAGER: 4 },
    timerConfig: { ...DEFAULT_TIMER_CONFIG },
    phaseEndsAt: null, // ms epoch the current phase auto-advances at, or null for no limit
    night: emptyNight(),
    vote: emptyVote(),
    chat: [], // day chat log { id, from, nickname, text, ts }
    wolfChat: [],
  };
}

function createRoom(hostSocketId, hostNickname, gameType = GAME_TYPES.WEREWOLF) {
  let code;
  do {
    code = genCode();
  } while (rooms.has(code));

  const room = {
    code,
    hostId: hostSocketId,
    gameType,
    phase: PHASES.LOBBY,
    players: {}, // socketId -> { id, nickname, role, alive, connected }
    log: [], // public event log strings
    winner: null,
    createdAt: Date.now(),
    ...gameStateFor(gameType),
  };

  addPlayer(room, hostSocketId, hostNickname);
  rooms.set(code, room);
  return room;
}

function emptyNight() {
  return { wolfVotes: {}, seerTarget: null, seerResult: null, doctorTarget: null, resolved: false };
}

function emptyVote() {
  return { votes: {}, eliminated: null, tally: {} };
}

function addPlayer(room, socketId, nickname) {
  room.players[socketId] = {
    id: socketId,
    nickname: nickname.slice(0, 20),
    role: null,
    startingRole: null, // One Night Ultimate Werewolf: the card originally dealt (unused by other games)
    alive: true,
    connected: true,
  };
}

function getRoom(code) {
  return rooms.get((code || "").toUpperCase());
}

function deleteRoom(code) {
  rooms.delete(code);
}

function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players[socketId]) return room;
  }
  return null;
}

module.exports = { rooms, createRoom, addPlayer, getRoom, deleteRoom, findRoomBySocket, emptyNight, emptyVote };
