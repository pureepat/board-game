const { PHASES, KRAKEN_MIN_PLAYERS, KRAKEN_MAX_PLAYERS } = require("./types");
const {
  KR_ROLES,
  KR_TEAM,
  KR_DISTRIBUTION,
  KR_START_GUNS,
  KR_RITUALS,
  mutinyThreshold,
  offDutyCount,
  mapFor,
  hexAt,
  nextShipPos,
} = require("./krakenRules");

// Round: APPOINT (captain names lieutenant + navigator) → MUTINY (everyone but
// the captain secretly commits guns; enough guns = the top gun-holder takes
// command and we go back to APPOINT) → NAV_DISCARD (captain and lieutenant
// each draw 2, discard 1) → NAV_CHOOSE (navigator plays 1 of the 2 passed
// cards) → the ship moves → any map action (captain) / cult ritual (cult
// leader) is resolved in ACTION / RITUAL → off-duty → next round.
//
// All game state is under room.kr; the shared room fields are only
// players/hostId/phase/winner/log/chat.

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const nick = (room, id) => room.players[id]?.nickname ?? "?";
const isAlive = (room, id) => Boolean(room.players[id]) && !room.kr.eliminated.includes(id);

function aliveSeats(room) {
  return room.kr.seats.filter((id) => isAlive(room, id));
}

function event(room, e) {
  room.kr.events.push({ ...e, round: room.kr.round });
}

function privateNote(room, id, entry) {
  (room.kr.privateLog[id] ||= []).push({ ...entry, round: room.kr.round });
}

// --- Setup -------------------------------------------------------------------

function validateStart(room) {
  const count = Object.keys(room.players).length;
  if (count < KRAKEN_MIN_PLAYERS) return `Feed the Kraken needs at least ${KRAKEN_MIN_PLAYERS} players.`;
  if (count > KRAKEN_MAX_PLAYERS) return `Feed the Kraken holds at most ${KRAKEN_MAX_PLAYERS} players.`;
  return null;
}

function dealRoles(count) {
  const dist = KR_DISTRIBUTION[count] ?? (Math.random() < 0.5 ? [3, 1, 1, 0] : [2, 2, 1, 0]);
  const [s, p, cl, c] = dist;
  return shuffle([
    ...Array(s).fill(KR_ROLES.SAILOR),
    ...Array(p).fill(KR_ROLES.PIRATE),
    ...Array(cl).fill(KR_ROLES.CULT_LEADER),
    ...Array(c).fill(KR_ROLES.CULTIST),
  ]);
}

function startGame(room) {
  const error = validateStart(room);
  if (error) return { error };

  const seats = shuffle(Object.keys(room.players));
  const roles = dealRoles(seats.length);
  const map = mapFor(seats.length);
  const guns = {};
  const startingRole = {};
  seats.forEach((id, i) => {
    room.players[id].role = roles[i];
    room.players[id].alive = true;
    startingRole[id] = roles[i];
    guns[id] = KR_START_GUNS;
  });

  room.kr = {
    mapId: map.id,
    playerCount: seats.length,
    seats,
    startingRole,
    round: 1,
    captainId: seats[0],
    lieutenantId: null,
    navigatorId: null,
    offDuty: [],
    guns,
    resumes: Object.fromEntries(seats.map((id) => [id, 0])),
    eliminated: [],
    tongueless: [],
    searched: [], // anyone a Cabin Search has looked at — can no longer be converted
    flogged: [], // { id, notRole }
    ship: { col: 0, row: 0 },
    usedActions: [], // "col,row"
    supplied: false,
    deck: shuffle(map.deck),
    discard: [],
    mutiny: { commits: {} },
    hands: {}, // captain/lieutenant id -> [card, card] during NAV_DISCARD
    passed: [], // cards handed to the navigator
    options: [], // the navigator's two (shuffled) choices
    lastCard: null,
    queue: [], // pending { kind: "ACTION", type } | { kind: "RITUAL", ritual }
    drunkPending: false,
    events: [],
    privateLog: {},
    convertedBy: {}, // cultist id -> cult leader id
  };
  room.winner = null;
  room.winReason = null;
  room.chat = [];
  room.log = [];
  room.phase = PHASES.KR_APPOINT;
  event(room, { t: "START", captain: nick(room, room.kr.captainId), map: map.id });
  return { room };
}

// --- Appointments + mutiny ---------------------------------------------------

/** Players who may be named lieutenant/navigator. Off-duty is waived if it would leave fewer than 2. */
function appointable(room) {
  const pool = aliveSeats(room).filter((id) => id !== room.kr.captainId);
  const onDuty = pool.filter((id) => !room.kr.offDuty.includes(id));
  return onDuty.length >= 2 ? onDuty : pool;
}

function appoint(room, playerId, lieutenantId, navigatorId) {
  const kr = room.kr;
  if (room.phase !== PHASES.KR_APPOINT) return { error: "Not the time to appoint officers." };
  if (playerId !== kr.captainId) return { error: "Only the Captain appoints officers." };
  const pool = appointable(room);
  if (lieutenantId === navigatorId) return { error: "Lieutenant and Navigator must be different players." };
  if (!pool.includes(lieutenantId) || !pool.includes(navigatorId)) return { error: "That player can't be appointed." };

  kr.lieutenantId = lieutenantId;
  kr.navigatorId = navigatorId;
  kr.mutiny = { commits: {} };
  room.phase = PHASES.KR_MUTINY;
  event(room, { t: "APPOINT", captain: nick(room, playerId), lieutenant: nick(room, lieutenantId), navigator: nick(room, navigatorId) });
  return { room };
}

function mutineers(room) {
  return aliveSeats(room).filter((id) => id !== room.kr.captainId);
}

function commitGuns(room, playerId, count) {
  const kr = room.kr;
  if (room.phase !== PHASES.KR_MUTINY) return { error: "No mutiny is brewing." };
  if (!mutineers(room).includes(playerId)) return { error: "You can't take part in this mutiny." };
  if (kr.mutiny.commits[playerId] !== undefined) return { error: "You already chose." };
  const n = Math.round(Number(count));
  if (!Number.isFinite(n) || n < 0 || n > kr.guns[playerId]) return { error: "Invalid number of guns." };

  kr.mutiny.commits[playerId] = n;
  if (mutineers(room).every((id) => kr.mutiny.commits[id] !== undefined)) resolveMutiny(room);
  return { room };
}

function canCaptain(room, id) {
  return isAlive(room, id) && !room.kr.tongueless.includes(id);
}

// Missing commits count as 0 (only reachable through the host's force-advance).
function resolveMutiny(room) {
  const kr = room.kr;
  const ids = mutineers(room);
  const commits = Object.fromEntries(ids.map((id) => [id, kr.mutiny.commits[id] ?? 0]));
  const total = Object.values(commits).reduce((a, b) => a + b, 0);
  const threshold = mutinyThreshold(kr.playerCount);
  const success = total >= threshold;

  let newCaptain = null;
  if (success) {
    const best = Math.max(...ids.filter((id) => canCaptain(room, id)).map((id) => commits[id]));
    const tied = ids.filter((id) => canCaptain(room, id) && commits[id] === best && best > 0);
    newCaptain = tied.length ? tied[Math.floor(Math.random() * tied.length)] : null;
    // Revealed guns are spent only when the mutiny goes off.
    for (const id of ids) kr.guns[id] -= commits[id];
  }

  event(room, {
    t: "MUTINY",
    commits: Object.fromEntries(ids.map((id) => [nick(room, id), commits[id]])),
    total,
    threshold,
    success: Boolean(success && newCaptain),
    newCaptain: newCaptain ? nick(room, newCaptain) : null,
  });

  if (success && newCaptain) {
    kr.captainId = newCaptain;
    kr.lieutenantId = null;
    kr.navigatorId = null;
    room.phase = PHASES.KR_APPOINT;
    return;
  }
  startNavigation(room);
}

// --- Navigation --------------------------------------------------------------

function draw(room) {
  const kr = room.kr;
  if (!kr.deck.length) {
    kr.deck = shuffle(kr.discard);
    kr.discard = [];
  }
  return kr.deck.pop();
}

function startNavigation(room) {
  const kr = room.kr;
  if (kr.deck.length < 4) {
    kr.deck = shuffle([...kr.deck, ...kr.discard]);
    kr.discard = [];
    event(room, { t: "RESHUFFLE" });
  }
  kr.hands = {
    [kr.captainId]: [draw(room), draw(room)],
    [kr.lieutenantId]: [draw(room), draw(room)],
  };
  kr.passed = [];
  kr.options = [];
  room.phase = PHASES.KR_NAV_DISCARD;
}

function discardCard(room, playerId, index) {
  const kr = room.kr;
  if (room.phase !== PHASES.KR_NAV_DISCARD) return { error: "Not the time to discard." };
  const hand = kr.hands[playerId];
  if (!hand) return { error: "You have no navigation cards." };
  if (index !== 0 && index !== 1) return { error: "Invalid card." };

  kr.discard.push(hand[index]);
  kr.passed.push(hand[1 - index]);
  delete kr.hands[playerId];
  if (Object.keys(kr.hands).length === 0) {
    kr.options = shuffle(kr.passed); // the navigator can't tell whose card is whose
    room.phase = PHASES.KR_NAV_CHOOSE;
  }
  return { room };
}

function chooseCard(room, playerId, index) {
  const kr = room.kr;
  if (room.phase !== PHASES.KR_NAV_CHOOSE) return { error: "Not the time to navigate." };
  if (playerId !== kr.navigatorId) return { error: "Only the Navigator sets the course." };
  if (index !== 0 && index !== 1) return { error: "Invalid card." };

  const card = kr.options[index];
  kr.discard.push(kr.options[1 - index], card);
  kr.options = [];
  kr.passed = [];
  kr.lastCard = card;
  kr.resumes[playerId] += 1;
  playCard(room, card);
  return { room };
}

function playCard(room, card) {
  const kr = room.kr;
  const map = mapFor(kr.playerCount);
  kr.ship = nextShipPos(map, kr.ship, card.color);
  event(room, { t: "NAVIGATE", navigator: nick(room, kr.navigatorId), color: card.color, effect: card.effect });

  const landed = hexAt(map, kr.ship.col, kr.ship.row);
  if (landed?.kind === "PIRATES") return endGame(room, "PIRATES", "cove");
  if (landed?.kind === "SAILORS") return endGame(room, "SAILORS", "bay");
  if (landed?.kind === "KRAKEN") return endGame(room, "CULT", "kraken");

  // Map action on the hex the ship just entered (each fires once).
  const key = `${kr.ship.col},${kr.ship.row}`;
  const action = map.actions.find((a) => `${a.col},${a.row}` === key);
  if (action && !kr.usedActions.includes(key)) {
    kr.usedActions.push(key);
    kr.queue.push({ kind: "ACTION", type: action.type });
  }

  if (map.supplyRow !== null && !kr.supplied && kr.ship.row >= map.supplyRow) {
    kr.supplied = true;
    for (const id of aliveSeats(room)) kr.guns[id] = Math.max(kr.guns[id], KR_START_GUNS);
    event(room, { t: "SUPPLY" });
  }

  const nav = kr.navigatorId;
  switch (card.effect) {
    case "DRUNK":
      kr.drunkPending = true;
      break;
    case "ARMED":
      kr.guns[nav] += 1;
      event(room, { t: "GUNS", player: nick(room, nav), delta: 1 });
      break;
    case "DISARMED":
      if (kr.guns[nav] > 0) {
        kr.guns[nav] -= 1;
        event(room, { t: "GUNS", player: nick(room, nav), delta: -1 });
      }
      break;
    case "MERMAID": {
      // The navigator secretly looks at the last three discarded cards.
      privateNote(room, nav, { type: "MERMAID", cards: kr.discard.slice(-3) });
      event(room, { t: "PEEK", player: nick(room, nav), effect: "MERMAID" });
      break;
    }
    case "TELESCOPE": {
      if (kr.deck.length < 1) {
        kr.deck = shuffle([...kr.deck, ...kr.discard]);
        kr.discard = [];
      }
      privateNote(room, nav, { type: "TELESCOPE", card: kr.deck[kr.deck.length - 1] ?? null });
      event(room, { t: "PEEK", player: nick(room, nav), effect: "TELESCOPE" });
      break;
    }
    case "CULT_UPRISING": {
      const ritual = KR_RITUALS[Math.floor(Math.random() * KR_RITUALS.length)];
      kr.queue.push({ kind: "RITUAL", ritual });
      event(room, { t: "RITUAL", ritual });
      break;
    }
  }

  processQueue(room);
}

// --- Map actions + cult rituals ----------------------------------------------

function cultLeaderId(room) {
  return room.kr.seats.find((id) => room.players[id]?.role === KR_ROLES.CULT_LEADER && isAlive(room, id)) ?? null;
}

function conversionTargets(room) {
  const kr = room.kr;
  return aliveSeats(room).filter(
    (id) =>
      room.players[id].role !== KR_ROLES.CULT_LEADER &&
      room.players[id].role !== KR_ROLES.CULTIST &&
      !kr.searched.includes(id) &&
      !kr.flogged.some((f) => f.id === id)
  );
}

function processQueue(room) {
  const kr = room.kr;
  while (kr.queue.length) {
    const next = kr.queue[0];
    if (next.kind === "ACTION") {
      room.phase = PHASES.KR_ACTION;
      return;
    }
    const leader = cultLeaderId(room);
    if (!leader) {
      kr.queue.shift();
      continue;
    }
    if (next.ritual === "CULT_SEARCH") {
      // The cult leader silently learns the factions of this round's officers.
      const officers = [kr.captainId, kr.lieutenantId, kr.navigatorId].filter((id) => id && id !== leader && room.players[id]);
      privateNote(room, leader, {
        type: "CULT_SEARCH",
        results: officers.map((id) => ({ nickname: nick(room, id), role: room.players[id].role })),
      });
      kr.queue.shift();
      continue;
    }
    if (next.ritual === "CONVERSION" && conversionTargets(room).length === 0) {
      kr.queue.shift();
      continue;
    }
    room.phase = PHASES.KR_RITUAL;
    return;
  }
  endRound(room);
}

function resolveAction(room, playerId, targetId) {
  const kr = room.kr;
  if (room.phase !== PHASES.KR_ACTION) return { error: "No action to resolve." };
  if (playerId !== kr.captainId) return { error: "Only the Captain resolves this." };
  if (!isAlive(room, targetId) || targetId === kr.captainId) return { error: "Choose another living player." };

  const { type } = kr.queue[0];
  const captain = nick(room, playerId);
  const target = nick(room, targetId);
  const role = room.players[targetId].role;

  if (type === "CABIN_SEARCH") {
    if (!kr.searched.includes(targetId)) kr.searched.push(targetId);
    privateNote(room, playerId, { type: "CABIN_SEARCH", nickname: target, role });
    event(room, { t: "CABIN_SEARCH", captain, target });
  } else if (type === "FLOGGING") {
    // Public proof of one faction the flogged player does NOT belong to.
    const team = KR_TEAM[role];
    const notTeams = ["SAILORS", "PIRATES", "CULT"].filter((x) => x !== team);
    const notTeam = notTeams[Math.floor(Math.random() * notTeams.length)];
    kr.flogged.push({ id: targetId, notTeam });
    event(room, { t: "FLOGGING", captain, target, notTeam });
  } else if (type === "OFF_WITH_TONGUE") {
    if (!kr.tongueless.includes(targetId)) kr.tongueless.push(targetId);
    event(room, { t: "TONGUE", captain, target });
  } else if (type === "FEED_THE_KRAKEN") {
    kr.eliminated.push(targetId);
    room.players[targetId].alive = false;
    kr.offDuty = kr.offDuty.filter((id) => id !== targetId);
    event(room, { t: "FED", captain, target });
    if (role === KR_ROLES.CULT_LEADER) {
      kr.queue = [];
      endGame(room, "CULT", "fed");
      return { room };
    }
  }

  kr.queue.shift();
  processQueue(room);
  return { room };
}

function resolveRitual(room, playerId, payload) {
  const kr = room.kr;
  if (room.phase !== PHASES.KR_RITUAL) return { error: "No ritual is underway." };
  if (playerId !== cultLeaderId(room)) return { error: "Only the Cult Leader performs the ritual." };
  const { ritual } = kr.queue[0];

  if (ritual === "CONVERSION") {
    const targetId = payload?.targetId;
    if (!conversionTargets(room).includes(targetId)) return { error: "That player can't be converted." };
    room.players[targetId].role = KR_ROLES.CULTIST;
    kr.convertedBy[targetId] = playerId;
    privateNote(room, targetId, { type: "CONVERTED", leader: nick(room, playerId) });
    privateNote(room, playerId, { type: "YOU_CONVERTED", nickname: nick(room, targetId) });
  } else if (ritual === "GUN_STASH") {
    const gunsTo = payload?.gunsTo && typeof payload.gunsTo === "object" ? payload.gunsTo : {};
    let total = 0;
    for (const [id, raw] of Object.entries(gunsTo)) {
      const n = Math.round(Number(raw));
      if (!Number.isFinite(n) || n < 0 || !isAlive(room, id)) return { error: "Invalid gun distribution." };
      total += n;
    }
    if (total > 3) return { error: "The stash only holds 3 guns." };
    for (const [id, raw] of Object.entries(gunsTo)) {
      const n = Math.round(Number(raw));
      if (!n) continue;
      kr.guns[id] += n;
      privateNote(room, id, { type: "GUNS_RECEIVED", count: n });
    }
  }

  kr.queue.shift();
  processQueue(room);
  return { room };
}

// --- Round end ---------------------------------------------------------------

function endRound(room) {
  const kr = room.kr;
  const leadingCaptain = kr.captainId;

  // Off-duty: navigator, then lieutenant, then captain, as many as the table size calls for.
  kr.offDuty = [kr.navigatorId, kr.lieutenantId, leadingCaptain]
    .slice(0, offDutyCount(kr.playerCount))
    .filter((id) => id && isAlive(room, id));
  event(room, { t: "OFF_DUTY", players: kr.offDuty.map((id) => nick(room, id)) });

  if (kr.drunkPending) {
    kr.drunkPending = false;
    // Command passes clockwise to the next player with the fewest résumés.
    const n = kr.seats.length;
    const start = kr.seats.indexOf(leadingCaptain);
    const order = Array.from({ length: n - 1 }, (_, i) => kr.seats[(start + 1 + i) % n]).filter((id) => canCaptain(room, id));
    if (order.length) {
      const fewest = Math.min(...order.map((id) => kr.resumes[id]));
      kr.captainId = order.find((id) => kr.resumes[id] === fewest);
      event(room, { t: "DRUNK", captain: nick(room, kr.captainId) });
    }
  }

  ensureCaptain(room);
  kr.lieutenantId = null;
  kr.navigatorId = null;
  kr.round += 1;
  room.phase = PHASES.KR_APPOINT;
}

// A captain who left the room (past the reconnect grace period) hands command
// to the next seat clockwise, so the game can't stall on an empty chair.
function ensureCaptain(room) {
  const kr = room.kr;
  if (canCaptain(room, kr.captainId)) return;
  const n = kr.seats.length;
  const start = kr.seats.indexOf(kr.captainId);
  for (let i = 1; i <= n; i++) {
    const id = kr.seats[(start + i) % n];
    if (canCaptain(room, id)) {
      kr.captainId = id;
      return;
    }
  }
}

function endGame(room, winner, reason) {
  room.phase = PHASES.GAME_OVER;
  room.winner = winner;
  room.winReason = reason;
  event(room, { t: "WIN", winner, reason });
}

// --- Host escape hatch -------------------------------------------------------

function forceAdvance(room) {
  const kr = room.kr;
  const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];
  switch (room.phase) {
    case PHASES.KR_APPOINT: {
      ensureCaptain(room);
      const pool = shuffle(appointable(room));
      if (pool.length < 2) return { error: "Not enough players to appoint." };
      return appoint(room, kr.captainId, pool[0], pool[1]);
    }
    case PHASES.KR_MUTINY:
      resolveMutiny(room);
      return { room };
    case PHASES.KR_NAV_DISCARD:
      for (const id of Object.keys(kr.hands)) discardCard(room, id, Math.random() < 0.5 ? 0 : 1);
      return { room };
    case PHASES.KR_NAV_CHOOSE:
      return chooseCard(room, kr.navigatorId, Math.random() < 0.5 ? 0 : 1);
    case PHASES.KR_ACTION: {
      const targets = aliveSeats(room).filter((id) => id !== kr.captainId);
      return resolveAction(room, kr.captainId, pickRandom(targets));
    }
    case PHASES.KR_RITUAL:
      kr.queue.shift();
      processQueue(room);
      return { room };
    default:
      return { error: "Nothing to advance." };
  }
}

// --- Reconnect ---------------------------------------------------------------

// Socket ids appear as object keys and string values all over room.kr; walk it
// and swap every occurrence, so new state added later is covered automatically.
function rekeyPlayer(room, oldId, newId) {
  function walk(v) {
    if (v === oldId) return newId;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out = {};
      for (const [k, val] of Object.entries(v)) out[k === oldId ? newId : k] = walk(val);
      return out;
    }
    return v;
  }
  if (room.kr) room.kr = walk(room.kr);
}

module.exports = {
  startGame,
  appoint,
  commitGuns,
  discardCard,
  chooseCard,
  resolveAction,
  resolveRitual,
  forceAdvance,
  rekeyPlayer,
  validateStart,
  appointable,
  mutineers,
  conversionTargets,
  cultLeaderId,
};
