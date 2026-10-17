const { PHASES, CS_MIN_PLAYERS, CS_MAX_PLAYERS } = require("./types");
const { CS_MEANS, CS_CLUES, CS_CAUSE_TILE, CS_LOCATION_TILES, CS_SCENE_TILES } = require("./csData");

// CS Files (the Thai edition of Deception: Murder in Hong Kong), as taught in
// the GamesKradarn video, plus its "Undercover Allies" expansion roles.
//
// One player is the public Forensic Scientist: they know the solution but may
// only hint at it by placing markers on scene tiles. The Murderer secretly
// picks one Means card and one Clue card from their own hand. Everyone else
// (each with one badge) tries to name the Murderer and both cards.
//
// Phases: CS_NIGHT → CS_CLUES (round 1: 6 markers) → CS_DISCUSS → CS_PRESENT
//   → [CS_REPLACE → CS_DISCUSS → CS_PRESENT] ×2 → GAME_OVER
//   A correct accusation with a Witness in play detours through CS_WITNESS.
// Every phase change bumps cs.phaseSeq and sets cs.phaseSeconds; server.js
// schedules one countdown per sequence number and calls onTimeout().
//
// All in-game state lives under room.cs (null in the lobby).

const ROLES = {
  FORENSIC: "FORENSIC",
  MURDERER: "MURDERER",
  ACCOMPLICE: "ACCOMPLICE",
  WITNESS: "WITNESS",
  INVESTIGATOR: "INVESTIGATOR",
  LAB_TECH: "LAB_TECH",
  RUMORMONGER: "RUMORMONGER",
  BODYGUARD: "BODYGUARD",
};
const MURDER_TEAM = [ROLES.MURDERER, ROLES.ACCOMPLICE, ROLES.RUMORMONGER];
const teamOf = (role) => (MURDER_TEAM.includes(role) ? "MURDERER" : "INVESTIGATORS");

const ROUNDS = 3;
const NIGHT_SECONDS = 90;
const SPEAK_SECONDS = 30;
const WITNESS_SECONDS = 60;
const DISCUSS_CHOICES = [60, 120, 180, 300];
const CARD_CHOICES = [3, 4, 5];
const SCENE_SLOTS = [2, 3, 4, 5]; // tiles[0] = cause of death, tiles[1] = location
const OPEN_PHASES = [PHASES.CS_CLUES, PHASES.CS_DISCUSS, PHASES.CS_PRESENT, PHASES.CS_REPLACE];

const DEFAULT_CONFIG = {
  cards: 4,
  discussSeconds: 180,
  witness: true,
  labTech: false,
  rumormonger: false,
  bodyguard: false,
  forensicMode: "random", // "random" | "choose"
  forensicId: null,
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const range = (n) => Array.from({ length: n }, (_, i) => i);

function config(room) {
  return { ...DEFAULT_CONFIG, ...(room.csConfig || {}) };
}

/**
 * Roles for n players, following the video's setup tables. Base game: 4–5
 * players get Forensic + Murderer + Investigators; 6+ add the Accomplice and
 * (optionally) the Witness. Expansion roles are host toggles that only kick
 * in at the player counts the expansion uses (Lab Tech 7+, Rumormonger 8+,
 * Bodyguard whenever there's a Witness and 7+ players), each replacing an
 * Investigator.
 */
function roleList(n, cfg) {
  const roles = [ROLES.FORENSIC, ROLES.MURDERER];
  if (n >= 6) roles.push(ROLES.ACCOMPLICE);
  const witness = cfg.witness && n >= 6;
  if (witness) roles.push(ROLES.WITNESS);
  if (cfg.labTech && n >= 7) roles.push(ROLES.LAB_TECH);
  if (cfg.rumormonger && n >= 8) roles.push(ROLES.RUMORMONGER);
  if (cfg.bodyguard && witness && n >= 7) roles.push(ROLES.BODYGUARD);
  while (roles.length < n) roles.push(ROLES.INVESTIGATOR);
  return roles.slice(0, n);
}

function validateStart(room) {
  const n = Object.keys(room.players).length;
  if (n < CS_MIN_PLAYERS || n > CS_MAX_PLAYERS) return `CS Files needs ${CS_MIN_PLAYERS}–${CS_MAX_PLAYERS} players.`;
  const need = (n - 1) * config(room).cards;
  if (need > CS_MEANS.length) return "Not enough cards for that many players; deal fewer cards each.";
  return null;
}

function setPhase(room, phase, seconds) {
  room.phase = phase;
  room.cs.phaseSeq += 1;
  room.cs.phaseSeconds = seconds;
  room.cs.phaseStartedAt = Date.now();
}

function startGame(room) {
  const error = validateStart(room);
  if (error) return { error };
  const cfg = config(room);
  const order = Object.keys(room.players);

  const forensicId =
    cfg.forensicMode === "choose" && order.includes(cfg.forensicId) ? cfg.forensicId : order[Math.floor(Math.random() * order.length)];
  const others = shuffle(order.filter((id) => id !== forensicId));
  const roles = { [forensicId]: ROLES.FORENSIC };
  roleList(order.length, cfg)
    .slice(1)
    .forEach((role, i) => (roles[others[i]] = role));

  // Deal: everyone but the Forensic Scientist gets `cards` means and `cards` clues, face up.
  const meansDeck = shuffle(range(CS_MEANS.length));
  const cluesDeck = shuffle(range(CS_CLUES.length));
  const hands = {};
  const badges = {};
  for (const id of order) {
    room.players[id].role = roles[id];
    room.players[id].alive = true;
    if (id === forensicId) continue;
    hands[id] = { means: meansDeck.splice(0, cfg.cards), clues: cluesDeck.splice(0, cfg.cards) };
    badges[id] = true;
  }

  // Presentations go round the table starting left of the Forensic Scientist.
  const fi = order.indexOf(forensicId);
  const speakers = [...order.slice(fi + 1), ...order.slice(0, fi)];

  room.winner = null;
  room.chat = [];
  room.log = [];
  room.cs = {
    phaseSeq: room.cs?.phaseSeq ?? 0,
    phaseSeconds: 0,
    phaseStartedAt: Date.now(),
    order,
    forensicId,
    roles,
    hands,
    badges,
    solution: null, // { murdererId, means, clue } — card ids
    night: { murderDone: false, labPick: null, labDone: !has(roles, ROLES.LAB_TECH), rumorTarget: null, rumorDone: !has(roles, ROLES.RUMORMONGER) },
    labResult: null, // { playerId, kind, card, hit }
    rumorTarget: null,
    tiles: [{ tile: CS_CAUSE_TILE, marker: null }, null, null, null, null, null], // filled in round 1
    locationOptions: CS_LOCATION_TILES,
    sceneDeck: shuffle(range(CS_SCENE_TILES.length)),
    pendingTile: null, // scene tile index drawn for rounds 2 and 3
    round: 1,
    speakers,
    speakerIdx: 0,
    accusations: [], // { by, target, means, clue, correct, round }
    witnessGuess: null,
    reason: null, // "solved" | "witness" | "badges" | "unsolved"
  };
  // Four scene tiles come face up for round 1 (the location is the Forensic's pick).
  for (const slot of SCENE_SLOTS) room.cs.tiles[slot] = { tile: CS_SCENE_TILES[room.cs.sceneDeck.shift()], marker: null };

  setPhase(room, PHASES.CS_NIGHT, NIGHT_SECONDS);
  return {};
}

function has(roles, role) {
  return Object.values(roles).includes(role);
}
function idOf(cs, role) {
  return Object.keys(cs.roles).find((id) => cs.roles[id] === role) ?? null;
}

// --- Night -------------------------------------------------------------------

function murderChoose(room, playerId, meansIdx, clueIdx) {
  const cs = room.cs;
  if (room.phase !== PHASES.CS_NIGHT) return { error: "The crime has already been committed." };
  if (cs.roles[playerId] !== ROLES.MURDERER) return { error: "Only the Murderer chooses." };
  const hand = cs.hands[playerId];
  const means = hand.means[Number(meansIdx)];
  const clue = hand.clues[Number(clueIdx)];
  if (means === undefined || clue === undefined) return { error: "Choose one red card and one blue card from your own hand." };
  cs.solution = { murdererId: playerId, means, clue };
  cs.night.murderDone = true;
  maybeEndNight(room);
  return {};
}

// Lab Technician (expansion): picks any card on the table; learns whether it's
// one of the two the Murderer chose (the Forensic's thumbs up / down).
function labPick(room, playerId, targetId, kind, idx) {
  const cs = room.cs;
  if (room.phase !== PHASES.CS_NIGHT) return { error: "Only during the night." };
  if (cs.roles[playerId] !== ROLES.LAB_TECH || cs.night.labDone) return { error: "You can't do that." };
  const card = cs.hands[targetId]?.[kind === "clue" ? "clues" : "means"]?.[Number(idx)];
  if (card === undefined) return { error: "Pick a card on the table." };
  cs.night.labPick = { playerId: targetId, kind: kind === "clue" ? "clue" : "means", card };
  cs.night.labDone = true;
  maybeEndNight(room);
  return {};
}

// Rumormonger (expansion): picks a player, who loses their badge at dawn.
function rumorPick(room, playerId, targetId) {
  const cs = room.cs;
  if (room.phase !== PHASES.CS_NIGHT) return { error: "Only during the night." };
  if (cs.roles[playerId] !== ROLES.RUMORMONGER || cs.night.rumorDone) return { error: "You can't do that." };
  if (!(targetId in cs.badges) || targetId === playerId) return { error: "Pick another player with a badge." };
  cs.night.rumorTarget = targetId;
  cs.night.rumorDone = true;
  maybeEndNight(room);
  return {};
}

function maybeEndNight(room) {
  const n = room.cs.night;
  if (n.murderDone && n.labDone && n.rumorDone) endNight(room);
}

function endNight(room) {
  const cs = room.cs;
  if (!cs.solution) {
    // Murderer timed out: the crime picks itself.
    const id = idOf(cs, ROLES.MURDERER);
    const hand = cs.hands[id];
    cs.solution = { murdererId: id, means: hand.means[0], clue: hand.clues[0] };
  }
  if (cs.night.labPick) {
    const p = cs.night.labPick;
    const hit = p.playerId === cs.solution.murdererId && (p.kind === "means" ? p.card === cs.solution.means : p.card === cs.solution.clue);
    cs.labResult = { ...p, hit };
  }
  if (cs.night.rumorTarget) {
    cs.rumorTarget = cs.night.rumorTarget;
    cs.badges[cs.rumorTarget] = false;
  }
  setPhase(room, PHASES.CS_CLUES, 0);
}

// --- Forensic Scientist's markers -------------------------------------------

function isForensic(room, id) {
  return room.cs.forensicId === id;
}

function pickLocation(room, playerId, index) {
  const cs = room.cs;
  if (room.phase !== PHASES.CS_CLUES) return { error: "Not now." };
  if (!isForensic(room, playerId)) return { error: "Only the Forensic Scientist places clues." };
  if (cs.tiles[1]) return { error: "The location tile is already down." };
  const tile = cs.locationOptions[Number(index)];
  if (!tile) return { error: "Pick one of the location tiles." };
  cs.tiles[1] = { tile, marker: null };
  return {};
}

// Round 1: one marker per tile; a placed marker is final, like a bullet on the board.
function placeMarker(room, playerId, slot, option) {
  const cs = room.cs;
  if (room.phase !== PHASES.CS_CLUES) return { error: "Not now." };
  if (!isForensic(room, playerId)) return { error: "Only the Forensic Scientist places clues." };
  const t = cs.tiles[Number(slot)];
  if (!t) return { error: "Put down the location tile first." };
  if (t.marker !== null) return { error: "That tile already has its marker." };
  const o = Number(option);
  if (!(o >= 0 && o < t.tile.options.length)) return { error: "Pick one of the six options." };
  t.marker = o;
  if (cs.tiles.every((x) => x && x.marker !== null)) setPhase(room, PHASES.CS_DISCUSS, config(room).discussSeconds);
  return {};
}

// Rounds 2–3: the new tile replaces one scene tile (never cause or location) and gets its marker.
function replaceTile(room, playerId, slot, option) {
  const cs = room.cs;
  if (room.phase !== PHASES.CS_REPLACE) return { error: "Not now." };
  if (!isForensic(room, playerId)) return { error: "Only the Forensic Scientist places clues." };
  const s = Number(slot);
  if (!SCENE_SLOTS.includes(s)) return { error: "Only scene tiles can be replaced." };
  const tile = CS_SCENE_TILES[cs.pendingTile];
  const o = Number(option);
  if (!(o >= 0 && o < tile.options.length)) return { error: "Pick one of the six options." };
  cs.tiles[s] = { tile, marker: o, fresh: true };
  for (const x of cs.tiles) if (x && x !== cs.tiles[s]) x.fresh = false;
  cs.pendingTile = null;
  setPhase(room, PHASES.CS_DISCUSS, config(room).discussSeconds);
  return {};
}

// --- Discussion and presentations ------------------------------------------

function endDiscussion(room) {
  if (room.phase !== PHASES.CS_DISCUSS) return { error: "Not in discussion." };
  room.cs.speakerIdx = 0;
  setPhase(room, PHASES.CS_PRESENT, SPEAK_SECONDS);
  return {};
}

function doneSpeaking(room, playerId) {
  const cs = room.cs;
  if (room.phase !== PHASES.CS_PRESENT) return { error: "Nobody is presenting." };
  const speaker = cs.speakers[cs.speakerIdx];
  if (playerId && playerId !== speaker && playerId !== room.hostId && !isForensic(room, playerId)) return { error: "It's not your turn." };
  nextSpeaker(room);
  return {};
}

function nextSpeaker(room) {
  const cs = room.cs;
  cs.speakerIdx += 1;
  // Skip anyone who has left the room.
  while (cs.speakerIdx < cs.speakers.length && !room.players[cs.speakers[cs.speakerIdx]]) cs.speakerIdx += 1;
  if (cs.speakerIdx < cs.speakers.length) return setPhase(room, PHASES.CS_PRESENT, SPEAK_SECONDS);
  if (cs.round >= ROUNDS) return finish(room, "MURDERER", "unsolved");
  cs.round += 1;
  if (!cs.sceneDeck.length) cs.sceneDeck = shuffle(range(CS_SCENE_TILES.length));
  cs.pendingTile = cs.sceneDeck.shift();
  setPhase(room, PHASES.CS_REPLACE, 0);
}

// --- Accusations ("solve the case") -----------------------------------------

function accuse(room, playerId, targetId, meansIdx, clueIdx) {
  const cs = room.cs;
  if (!OPEN_PHASES.includes(room.phase)) return { error: "You can't solve the case right now." };
  if (!cs.badges[playerId]) return { error: "You've already used your badge." };
  if (targetId === playerId || !cs.hands[targetId]) return { error: "Accuse another player (not the Forensic Scientist)." };
  const hand = cs.hands[targetId];
  const means = hand.means[Number(meansIdx)];
  const clue = hand.clues[Number(clueIdx)];
  if (means === undefined || clue === undefined) return { error: "Pick one red and one blue card in front of that player." };

  const s = cs.solution;
  const correct = targetId === s.murdererId && means === s.means && clue === s.clue;
  cs.badges[playerId] = false;
  cs.accusations.push({ by: playerId, target: targetId, means, clue, correct, round: cs.round });

  if (correct) {
    // With a Witness in play, the Murderer gets one last chance.
    if (idOf(cs, ROLES.WITNESS)) setPhase(room, PHASES.CS_WITNESS, WITNESS_SECONDS);
    else finish(room, "INVESTIGATORS", "solved");
    return {};
  }
  // Out of badges on the investigators' side: the case goes cold.
  const investigatorBadges = Object.keys(cs.badges).filter((id) => cs.badges[id] && teamOf(cs.roles[id]) === "INVESTIGATORS" && room.players[id]);
  if (!investigatorBadges.length) finish(room, "MURDERER", "badges");
  return {};
}

function witnessGuess(room, playerId, targetId) {
  const cs = room.cs;
  if (room.phase !== PHASES.CS_WITNESS) return { error: "Not now." };
  if (cs.roles[playerId] !== ROLES.MURDERER) return { error: "The Murderer makes this call." };
  if (!room.players[targetId] || targetId === playerId || isForensic(room, targetId)) return { error: "Pick another player." };
  cs.witnessGuess = targetId;
  if (cs.roles[targetId] === ROLES.WITNESS) finish(room, "MURDERER", "witness");
  else finish(room, "INVESTIGATORS", "solved");
  return {};
}

function finish(room, winner, reason) {
  room.winner = winner;
  room.cs.reason = reason;
  setPhase(room, PHASES.GAME_OVER, 0);
}

// --- Timers and host controls -------------------------------------------------

function onTimeout(room) {
  if (!room.cs) return;
  switch (room.phase) {
    case PHASES.CS_NIGHT:
      return void endNight(room);
    case PHASES.CS_DISCUSS:
      return void endDiscussion(room);
    case PHASES.CS_PRESENT:
      return void nextSpeaker(room);
    case PHASES.CS_WITNESS:
      // The Murderer didn't name anyone: the solved case stands.
      return void finish(room, "INVESTIGATORS", "solved");
  }
}

// Host escape hatch: also places any missing markers at random so an AFK
// Forensic Scientist can't stall the table.
function forceAdvance(room) {
  const cs = room.cs;
  if (!cs || room.phase === PHASES.GAME_OVER) return { error: "Nothing to advance." };
  if (room.phase === PHASES.CS_CLUES) {
    if (!cs.tiles[1]) cs.tiles[1] = { tile: cs.locationOptions[Math.floor(Math.random() * cs.locationOptions.length)], marker: null };
    for (let i = 0; i < cs.tiles.length; i++) {
      if (cs.tiles[i].marker === null) placeMarker(room, cs.forensicId, i, Math.floor(Math.random() * 6));
    }
    return {};
  }
  if (room.phase === PHASES.CS_REPLACE) return replaceTile(room, cs.forensicId, SCENE_SLOTS[Math.floor(Math.random() * 4)], Math.floor(Math.random() * 6));
  onTimeout(room);
  return {};
}

function resetToLobby(room) {
  room.phase = PHASES.LOBBY;
  room.winner = null;
  room.chat = [];
  room.log = [];
  room.cs = null;
  for (const p of Object.values(room.players)) {
    p.role = null;
    p.alive = true;
  }
}

function setConfig(room, patch) {
  const cfg = config(room);
  const next = { ...cfg };
  if (patch.cards !== undefined && CARD_CHOICES.includes(Number(patch.cards))) next.cards = Number(patch.cards);
  if (patch.discussSeconds !== undefined && DISCUSS_CHOICES.includes(Number(patch.discussSeconds))) next.discussSeconds = Number(patch.discussSeconds);
  for (const k of ["witness", "labTech", "rumormonger", "bodyguard"]) if (patch[k] !== undefined) next[k] = Boolean(patch[k]);
  if (patch.forensicMode === "random") next.forensicMode = "random";
  if (patch.forensicMode === "choose") {
    if (!room.players[patch.forensicId]) return { error: "Choose a player in the room." };
    next.forensicMode = "choose";
    next.forensicId = patch.forensicId;
  }
  room.csConfig = next;
  return {};
}

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
  if (room.cs) room.cs = walk(room.cs);
  if (room.csConfig?.forensicId === oldId) room.csConfig.forensicId = newId;
}

module.exports = {
  ROLES,
  MURDER_TEAM,
  ROUNDS,
  DEFAULT_CONFIG,
  DISCUSS_CHOICES,
  CARD_CHOICES,
  OPEN_PHASES,
  teamOf,
  roleList,
  config,
  validateStart,
  startGame,
  murderChoose,
  labPick,
  rumorPick,
  pickLocation,
  placeMarker,
  replaceTile,
  endDiscussion,
  doneSpeaking,
  accuse,
  witnessGuess,
  onTimeout,
  forceAdvance,
  resetToLobby,
  setConfig,
  rekeyPlayer,
};
