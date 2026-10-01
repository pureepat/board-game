const {
  PHASES,
  KRAKEN_ROLES,
  KRAKEN_CARDS,
  KRAKEN_ALLOWED_CARDS,
  KRAKEN_DISTRIBUTION,
  KRAKEN_CREW_SIZE,
  KRAKEN_MIN_PLAYERS,
  KRAKEN_MAX_PLAYERS,
  KRAKEN_WIN_SCORE,
  KRAKEN_MAX_REJECTS,
} = require("./types");

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// playerOrder keeps ids of players who later left; every query goes through
// here so a vanished player never blocks a vote, a card, or the Captain seat.
function activeIds(room) {
  return room.playerOrder.filter((id) => room.players[id]);
}

function captainId(room) {
  const n = room.playerOrder.length;
  for (let i = 0; i < n; i++) {
    const id = room.playerOrder[(room.captainIndex + i) % n];
    if (room.players[id]) return id;
  }
  return null;
}

function advanceCaptain(room) {
  const n = room.playerOrder.length;
  for (let step = 1; step <= n; step++) {
    const idx = (room.captainIndex + step) % n;
    if (room.players[room.playerOrder[idx]]) {
      room.captainIndex = idx;
      return;
    }
  }
}

function crewSize(room) {
  const count = activeIds(room).length;
  return KRAKEN_CREW_SIZE[Math.min(Math.max(count, KRAKEN_MIN_PLAYERS), KRAKEN_MAX_PLAYERS)];
}

function nick(room, id) {
  return room.players[id]?.nickname ?? "?";
}

function validateStart(room) {
  const count = Object.keys(room.players).length;
  if (count < KRAKEN_MIN_PLAYERS) return `Feed the Kraken needs at least ${KRAKEN_MIN_PLAYERS} players.`;
  if (count > KRAKEN_MAX_PLAYERS) return `Feed the Kraken holds at most ${KRAKEN_MAX_PLAYERS} players.`;
  return null;
}

function startGame(room) {
  const error = validateStart(room);
  if (error) return { error };

  const ids = shuffle(Object.keys(room.players));
  const [sailors, pirates, cultists] = KRAKEN_DISTRIBUTION[ids.length];
  const deck = shuffle([
    ...Array(sailors).fill(KRAKEN_ROLES.SAILOR),
    ...Array(pirates).fill(KRAKEN_ROLES.PIRATE),
    ...Array(cultists).fill(KRAKEN_ROLES.CULTIST),
  ]);
  ids.forEach((id, i) => {
    room.players[id].role = deck[i];
    room.players[id].alive = true;
  });

  room.playerOrder = ids;
  room.captainIndex = 0;
  room.round = 1;
  room.rejects = 0;
  room.score = { SAILORS: 0, PIRATES: 0, KRAKEN: 0 };
  room.crew = [];
  room.crewVotes = {};
  room.cards = {};
  room.history = [];
  room.winner = null;
  room.winReason = null;
  room.chat = [];
  room.phase = PHASES.CREW_SELECT;
  room.log = [`The ship sets sail. ${nick(room, captainId(room))} is the first Captain.`];
  return { room };
}

function selectCrew(room, playerId, crewIds) {
  if (room.phase !== PHASES.CREW_SELECT) return { error: "The Captain is not choosing a crew right now." };
  if (captainId(room) !== playerId) return { error: "Only the Captain can choose the crew." };
  if (!Array.isArray(crewIds)) return { error: "Invalid crew." };
  const unique = [...new Set(crewIds)];
  const size = crewSize(room);
  if (unique.length !== size || unique.length !== crewIds.length) return { error: `Choose exactly ${size} crew members.` };
  if (!unique.every((id) => room.players[id])) return { error: "Invalid crew member." };

  room.crew = unique;
  room.crewVotes = {};
  room.phase = PHASES.CREW_VOTE;
  room.log.push(`Captain ${nick(room, playerId)} proposes: ${unique.map((id) => nick(room, id)).join(", ")}.`);
  return { room };
}

function castCrewVote(room, playerId, approve) {
  if (room.phase !== PHASES.CREW_VOTE) return { error: "No crew vote is open." };
  if (!room.players[playerId]) return { error: "You are not in this game." };
  if (typeof approve !== "boolean") return { error: "Invalid vote." };
  if (room.crewVotes[playerId] !== undefined) return { error: "You already voted." };

  room.crewVotes[playerId] = approve;
  const resolved = activeIds(room).every((id) => room.crewVotes[id] !== undefined);
  if (resolved) resolveCrewVote(room);
  return { room, resolved };
}

// Missing votes count as a rejection (only reachable via the host's force-advance).
function resolveCrewVote(room) {
  const active = activeIds(room);
  const votes = Object.fromEntries(active.map((id) => [id, room.crewVotes[id] === true]));
  const yes = active.filter((id) => votes[id]).length;
  const approved = yes > active.length - yes;

  const entry = {
    round: room.round,
    captain: nick(room, captainId(room)),
    crew: room.crew.map((id) => nick(room, id)),
    votes: Object.fromEntries(active.map((id) => [nick(room, id), votes[id]])),
    approved,
    cards: null,
    outcome: approved ? null : "REJECTED",
  };
  room.history.push(entry);

  if (approved) {
    room.rejects = 0;
    room.cards = {};
    room.phase = PHASES.VOYAGE;
    room.log.push(`The crew is approved (${yes}–${active.length - yes}). The voyage begins.`);
    return;
  }

  room.rejects += 1;
  room.log.push(`The crew is rejected (${yes}–${active.length - yes}). (${room.rejects}/${KRAKEN_MAX_REJECTS})`);
  if (room.rejects >= KRAKEN_MAX_REJECTS) {
    endGame(room, "PIRATES", "mutiny");
    return;
  }
  room.crew = [];
  room.crewVotes = {};
  advanceCaptain(room);
  room.phase = PHASES.CREW_SELECT;
  room.log.push(`${nick(room, captainId(room))} is the new Captain.`);
}

function playCard(room, playerId, card) {
  if (room.phase !== PHASES.VOYAGE) return { error: "No voyage is underway." };
  if (!room.crew.includes(playerId) || !room.players[playerId]) return { error: "You are not on this crew." };
  if (room.cards[playerId]) return { error: "You already played a card." };
  const allowed = KRAKEN_ALLOWED_CARDS[room.players[playerId].role] || [];
  if (!allowed.includes(card)) return { error: "You can't play that card." };

  room.cards[playerId] = card;
  const resolved = room.crew.filter((id) => room.players[id]).every((id) => room.cards[id]);
  if (resolved) resolveVoyage(room);
  return { room, resolved };
}

// Cards are shuffled before being shown so the result never says who played what.
// Priority: any Offering feeds the Kraken (and the voyage scores for nobody else);
// otherwise any Sabotage scores for the Pirates; otherwise the Sailors score.
function resolveVoyage(room) {
  const played = room.crew.filter((id) => room.players[id]).map((id) => room.cards[id] || KRAKEN_CARDS.CALM);
  const shown = shuffle(played);

  let outcome;
  if (shown.includes(KRAKEN_CARDS.OFFERING)) {
    outcome = "KRAKEN";
    room.score.KRAKEN += 1;
  } else if (shown.includes(KRAKEN_CARDS.SABOTAGE)) {
    outcome = "PIRATES";
    room.score.PIRATES += 1;
  } else {
    outcome = "SAILORS";
    room.score.SAILORS += 1;
  }

  const entry = room.history[room.history.length - 1];
  entry.cards = shown;
  entry.outcome = outcome;
  room.cards = {};
  room.log.push(
    outcome === "KRAKEN"
      ? "Something stirs beneath the waves... the Kraken is fed."
      : outcome === "PIRATES"
      ? "The voyage was sabotaged!"
      : "A calm voyage. The ship sails on."
  );

  if (room.score.KRAKEN >= KRAKEN_WIN_SCORE) return endGame(room, "CULTIST", "kraken");
  if (room.score.PIRATES >= KRAKEN_WIN_SCORE) return endGame(room, "PIRATES", "sabotage");
  if (room.score.SAILORS >= KRAKEN_WIN_SCORE) return endGame(room, "SAILORS", "voyages");
  room.phase = PHASES.VOYAGE_RESULT;
}

function continueFromResult(room) {
  if (room.phase !== PHASES.VOYAGE_RESULT) return { error: "Nothing to continue." };
  nextVoyage(room);
  return { room };
}

function nextVoyage(room) {
  room.round += 1;
  room.crew = [];
  room.crewVotes = {};
  room.cards = {};
  advanceCaptain(room);
  room.phase = PHASES.CREW_SELECT;
  room.log.push(`Voyage ${room.round}: ${nick(room, captainId(room))} is the Captain.`);
}

// Host escape hatch for an AFK player — pushes whichever phase is stuck forward.
function forceAdvance(room) {
  switch (room.phase) {
    case PHASES.CREW_SELECT:
      room.log.push("The host skips an absent Captain.");
      advanceCaptain(room);
      return { room };
    case PHASES.CREW_VOTE:
      resolveCrewVote(room);
      return { room };
    case PHASES.VOYAGE:
      resolveVoyage(room);
      return { room };
    case PHASES.VOYAGE_RESULT:
      nextVoyage(room);
      return { room };
    default:
      return { error: "Nothing to advance." };
  }
}

function endGame(room, winner, reason) {
  room.phase = PHASES.GAME_OVER;
  room.winner = winner;
  room.winReason = reason;
  room.log.push(
    winner === "SAILORS"
      ? "The Sailors reached port. Victory!"
      : winner === "PIRATES"
      ? "The Pirates have taken the ship."
      : "The Kraken rises. The Cultist wins."
  );
}

// Re-key every per-player reference when a player reconnects on a new socket id.
function rekeyPlayer(room, oldId, newId) {
  room.playerOrder = room.playerOrder.map((id) => (id === oldId ? newId : id));
  room.crew = room.crew.map((id) => (id === oldId ? newId : id));
  for (const map of [room.crewVotes, room.cards]) {
    if (map && map[oldId] !== undefined) {
      map[newId] = map[oldId];
      delete map[oldId];
    }
  }
}

module.exports = {
  startGame,
  selectCrew,
  castCrewVote,
  playCard,
  continueFromResult,
  forceAdvance,
  rekeyPlayer,
  validateStart,
  activeIds,
  captainId,
  crewSize,
};
