const { PHASES, INSIDER_MIN_PLAYERS, INSIDER_MAX_PLAYERS } = require("./types");
const { INSIDER_WORDS, normalizeWord } = require("./insiderWords");

// Insider (Oink Games). One public Master knows the secret word and answers
// yes/no questions; one hidden Insider also knows it and quietly steers the
// Commons toward it. Find the word before the timer runs out, then find the
// Insider. All in-game state lives under room.ins (null in the lobby).
//
// Phase flow: INS_WORD → INS_QUESTIONS → INS_DISCUSS → INS_VOTE1 → (INS_VOTE2) → GAME_OVER
// Every phase change bumps ins.phaseSeq and sets ins.phaseSeconds; server.js
// watches phaseSeq to (re)schedule the countdown and calls onTimeout() when it fires.

const ROLES = { MASTER: "MASTER", INSIDER: "INSIDER", COMMON: "COMMON" };
const ANSWERS = ["YES", "NO", "UNKNOWN", "CORRECT"];

const WORD_PICK_SECONDS = 60; // the Master's pick auto-resolves to the first option after this
const VOTE_SECONDS = 60;
// The discussion lasts as long as the word took to find (the flipped sand
// timer in the box), but never so short that nobody can say anything.
const MIN_DISCUSS_SECONDS = 20;
const WORD_OPTIONS = 3;

const QUESTION_SECONDS_CHOICES = [180, 300, 420];
// Match length the host can pick in the lobby; 0 = casual, no scoring.
const MATCH_ROUND_CHOICES = [0, 3, 5, 7, 10];
// How the next round's Master is picked: pass to the next player, random, or the host's pick.
const MASTER_MODES = ["rotate", "random", "choose"];

// Match scoring (house rules): finding the word is worth 2 to whoever said it;
// catching the Insider is worth 1 to everyone else (the Master too); an
// Insider who gets away scores 1. Nobody scores if time runs out.
const POINTS = { GUESSED: 2, CAUGHT: 1, ESCAPED: 1 };
const DEFAULT_QUESTION_SECONDS = 300;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function validateStart(room) {
  const n = Object.keys(room.players).length;
  if (n < INSIDER_MIN_PLAYERS || n > INSIDER_MAX_PLAYERS) {
    return `Insider needs ${INSIDER_MIN_PLAYERS}–${INSIDER_MAX_PLAYERS} players.`;
  }
  return null;
}

// Words already played in this room are skipped until the pool runs dry.
function drawWords(room, count) {
  room.insUsedWords = room.insUsedWords || [];
  let pool = INSIDER_WORDS.filter((w) => !room.insUsedWords.includes(w.en));
  if (pool.length < count) {
    room.insUsedWords = [];
    pool = INSIDER_WORDS;
  }
  return shuffle(pool).slice(0, count);
}

function setPhase(room, phase, seconds) {
  room.phase = phase;
  room.ins.phaseSeq += 1;
  room.ins.phaseSeconds = seconds;
  room.ins.phaseStartedAt = Date.now();
}

// Called from the lobby: starts a scored match if the host picked a length.
function startMatch(room) {
  const rounds = room.insConfig?.rounds || 0;
  room.insMatch = rounds ? { totalRounds: rounds, round: 0, scores: {}, history: [] } : null;
}

function startGame(room) {
  const error = validateStart(room);
  if (error) return { error };
  const match = room.insMatch;
  if (match && match.round >= match.totalRounds) return { error: "The match is over." };

  const order = Object.keys(room.players);
  const masterId = pickMaster(room, order);
  const others = order.filter((id) => id !== masterId);
  const insiderId = others[Math.floor(Math.random() * others.length)];

  for (const id of order) {
    const p = room.players[id];
    p.role = id === masterId ? ROLES.MASTER : id === insiderId ? ROLES.INSIDER : ROLES.COMMON;
    p.alive = true;
  }

  if (match) {
    match.round += 1;
    for (const id of order) {
      match.scores[id] = match.scores[id] || { nickname: room.players[id].nickname, points: 0 };
    }
  }

  room.winner = null;
  room.log = [];
  room.chat = [];
  room.ins = {
    // Keep counting across rounds so server.js always sees a new phase.
    phaseSeq: room.ins?.phaseSeq ?? 0,
    phaseSeconds: 0,
    phaseStartedAt: Date.now(),
    masterId,
    insiderId,
    wordOptions: drawWords(room, WORD_OPTIONS),
    word: null,
    questions: [],
    nextQuestionId: 1,
    guesserId: null,
    elapsedMs: null,
    vote1: {}, // playerId -> true (guesser is the Insider) | false
    vote1Result: null, // { yes, no } once tallied
    vote2: {}, // playerId -> accused playerId
    vote2Tally: null,
    accusedId: null,
    reason: null, // "vote1" | "vote2" | "timeout"
    gains: null, // playerId -> points scored this round, once it ends
  };
  setPhase(room, PHASES.INS_WORD, WORD_PICK_SECONDS);
  return {};
}

// Host's choice for the coming round. A chosen player who has since left
// falls back to rotation, so the round can always start.
function pickMaster(room, order) {
  const mode = room.insConfig?.masterMode || "rotate";
  const chosen = room.insConfig?.masterId;
  if (mode === "choose" && chosen && order.includes(chosen)) return chosen;
  if (mode === "random") return order[Math.floor(Math.random() * order.length)];
  // Rotate: hand the card to the next player; first game of the room is random.
  const prev = order.indexOf(room.insPrevMaster);
  return prev >= 0 ? order[(prev + 1) % order.length] : order[Math.floor(Math.random() * order.length)];
}

function setMasterPick(room, mode, playerId) {
  if (!MASTER_MODES.includes(mode)) return { error: "Unknown Master option." };
  if (mode === "choose" && !room.players[playerId]) return { error: "Choose a player in the room." };
  room.insConfig = { ...(room.insConfig || {}), masterMode: mode, masterId: mode === "choose" ? playerId : null };
  return {};
}

function rerollWords(room, playerId) {
  const ins = room.ins;
  if (room.phase !== PHASES.INS_WORD) return { error: "The word is already chosen." };
  if (playerId !== ins.masterId) return { error: "Only the Master picks the word." };
  ins.wordOptions = drawWords(room, WORD_OPTIONS);
  return {};
}

function chooseWord(room, playerId, index) {
  const ins = room.ins;
  if (room.phase !== PHASES.INS_WORD) return { error: "The word is already chosen." };
  if (playerId !== ins.masterId) return { error: "Only the Master picks the word." };
  const word = ins.wordOptions[Number(index)];
  if (!word) return { error: "Pick one of the offered words." };
  ins.word = word;
  ins.wordOptions = [];
  room.insUsedWords.push(word.en);
  setPhase(room, PHASES.INS_QUESTIONS, room.insConfig?.questionSeconds || DEFAULT_QUESTION_SECONDS);
  return {};
}

function isTheWord(room, text) {
  const n = normalizeWord(text);
  return n.length > 0 && (n === normalizeWord(room.ins.word.en) || n === normalizeWord(room.ins.word.th));
}

function ask(room, playerId, text) {
  const ins = room.ins;
  if (room.phase !== PHASES.INS_QUESTIONS) return { error: "It's not question time." };
  if (playerId === ins.masterId) return { error: "The Master only answers." };
  const player = room.players[playerId];
  const clean = String(text || "").trim().slice(0, 200);
  if (!player || !clean) return { error: "Type a question or a guess." };

  const q = { id: ins.nextQuestionId++, from: playerId, nickname: player.nickname, text: clean, answer: null, ts: Date.now() };
  ins.questions.push(q);
  // Typing the exact word is a correct guess; the Master doesn't have to confirm it.
  if (isTheWord(room, clean)) {
    q.answer = "CORRECT";
    wordFound(room, playerId);
  }
  return {};
}

function answer(room, playerId, questionId, value) {
  const ins = room.ins;
  if (room.phase !== PHASES.INS_QUESTIONS) return { error: "It's not question time." };
  if (playerId !== ins.masterId) return { error: "Only the Master answers." };
  if (!ANSWERS.includes(value)) return { error: "Unknown answer." };
  const q = ins.questions.find((x) => x.id === Number(questionId));
  if (!q) return { error: "No such question." };
  q.answer = value;
  if (value === "CORRECT") wordFound(room, q.from);
  return {};
}

// Playing at the same table, questions are asked out loud; the Master just
// taps whoever said the word.
function markCorrect(room, playerId, guesserId) {
  const ins = room.ins;
  if (room.phase !== PHASES.INS_QUESTIONS) return { error: "It's not question time." };
  if (playerId !== ins.masterId) return { error: "Only the Master confirms the word." };
  if (!room.players[guesserId] || guesserId === ins.masterId) return { error: "Choose the player who said the word." };
  wordFound(room, guesserId);
  return {};
}

function wordFound(room, guesserId) {
  const ins = room.ins;
  ins.guesserId = guesserId;
  ins.elapsedMs = Date.now() - ins.phaseStartedAt;
  setPhase(room, PHASES.INS_DISCUSS, Math.max(MIN_DISCUSS_SECONDS, Math.ceil(ins.elapsedMs / 1000)));
}

function endDiscussion(room) {
  if (room.phase !== PHASES.INS_DISCUSS) return { error: "Not in discussion." };
  setPhase(room, PHASES.INS_VOTE1, VOTE_SECONDS);
  return {};
}

// Players who still have to vote: everyone present and connected.
function voters(room) {
  return Object.values(room.players)
    .filter((p) => p.connected)
    .map((p) => p.id);
}

function castVote1(room, playerId, yes) {
  if (room.phase !== PHASES.INS_VOTE1) return { error: "Not voting on the guesser now." };
  if (!room.players[playerId]) return { error: "You're not in this game." };
  room.ins.vote1[playerId] = Boolean(yes);
  if (voters(room).every((id) => id in room.ins.vote1)) resolveVote1(room);
  return {};
}

// First vote: is the player who found the word the Insider? A strict
// majority of yes votes accuses them; anything else goes to the open vote.
function resolveVote1(room) {
  const ins = room.ins;
  const votes = Object.values(ins.vote1);
  const yes = votes.filter(Boolean).length;
  ins.vote1Result = { yes, no: votes.length - yes };
  const total = Object.keys(room.players).length;
  if (yes * 2 > total) return finish(room, ins.guesserId, "vote1");
  setPhase(room, PHASES.INS_VOTE2, VOTE_SECONDS);
}

function castVote2(room, playerId, targetId) {
  const ins = room.ins;
  if (room.phase !== PHASES.INS_VOTE2) return { error: "Not voting for the Insider now." };
  if (!room.players[playerId]) return { error: "You're not in this game." };
  if (!room.players[targetId] || targetId === playerId) return { error: "Choose another player." };
  if (targetId === ins.masterId) return { error: "The Master can't be the Insider." };
  ins.vote2[playerId] = targetId;
  if (voters(room).every((id) => id in ins.vote2)) resolveVote2(room);
  return {};
}

// Second vote: most votes is accused. A tie is broken by whoever found the
// word; if their vote isn't among the tied players, nobody is accused.
function resolveVote2(room) {
  const ins = room.ins;
  const tally = {};
  for (const target of Object.values(ins.vote2)) tally[target] = (tally[target] || 0) + 1;
  ins.vote2Tally = tally;
  const max = Math.max(0, ...Object.values(tally));
  const leaders = Object.keys(tally).filter((id) => tally[id] === max);
  let accused = null;
  if (leaders.length === 1) accused = leaders[0];
  else if (leaders.includes(ins.vote2[ins.guesserId])) accused = ins.vote2[ins.guesserId];
  finish(room, accused, "vote2");
}

function finish(room, accusedId, reason) {
  const ins = room.ins;
  ins.accusedId = accusedId;
  ins.reason = reason;
  room.winner = reason === "timeout" ? "NONE" : accusedId === ins.insiderId ? "COMMONS" : "INSIDER";
  room.insPrevMaster = ins.masterId;
  ins.gains = scoreRound(room);
  const match = room.insMatch;
  if (match) {
    for (const [id, pts] of Object.entries(ins.gains)) {
      match.scores[id] = match.scores[id] || { nickname: room.players[id]?.nickname ?? "?", points: 0 };
      match.scores[id].points += pts;
    }
    match.history.push({
      round: match.round,
      word: ins.word,
      masterId: ins.masterId,
      insiderId: ins.insiderId,
      guesserId: ins.guesserId,
      winner: room.winner,
      gains: ins.gains,
    });
  }
  setPhase(room, PHASES.GAME_OVER, 0);
}

function scoreRound(room) {
  const ins = room.ins;
  const gains = {};
  const add = (id, pts) => {
    if (id) gains[id] = (gains[id] || 0) + pts;
  };
  if (room.winner === "NONE") return gains;
  add(ins.guesserId, POINTS.GUESSED);
  if (room.winner === "COMMONS") {
    for (const id of Object.keys(room.players)) if (id !== ins.insiderId) add(id, POINTS.CAUGHT);
  } else {
    add(ins.insiderId, POINTS.ESCAPED);
  }
  return gains;
}

// Called by server.js when the phase countdown runs out.
function onTimeout(room) {
  const ins = room.ins;
  if (!ins) return;
  switch (room.phase) {
    case PHASES.INS_WORD:
      return void chooseWord(room, ins.masterId, 0);
    case PHASES.INS_QUESTIONS:
      return void finish(room, null, "timeout");
    case PHASES.INS_DISCUSS:
      return void endDiscussion(room);
    case PHASES.INS_VOTE1:
      return void resolveVote1(room);
    case PHASES.INS_VOTE2:
      return void resolveVote2(room);
  }
}

// Host escape hatch for an AFK Master or voter. Question time can't be cut
// short; it's the core of the game and has its own clock.
function forceAdvance(room) {
  if (!room.ins || room.phase === PHASES.GAME_OVER) return { error: "Nothing to advance." };
  if (room.phase === PHASES.INS_QUESTIONS) return { error: "Question time ends when the word is found or the timer runs out." };
  onTimeout(room);
  return {};
}

function resetToLobby(room) {
  room.phase = PHASES.LOBBY;
  room.winner = null;
  room.log = [];
  room.chat = [];
  room.ins = null;
  room.insMatch = null;
  for (const p of Object.values(room.players)) {
    p.role = null;
    p.alive = true;
  }
}

function setQuestionSeconds(room, seconds) {
  const s = Number(seconds);
  if (!QUESTION_SECONDS_CHOICES.includes(s)) return { error: "Unsupported timer." };
  room.insConfig = { ...(room.insConfig || {}), questionSeconds: s };
  return {};
}

function setMatchRounds(room, rounds) {
  const r = Number(rounds);
  if (!MATCH_ROUND_CHOICES.includes(r)) return { error: "Unsupported match length." };
  room.insConfig = { ...(room.insConfig || {}), rounds: r };
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
  if (room.ins) room.ins = walk(room.ins);
  if (room.insMatch) room.insMatch = walk(room.insMatch);
  if (room.insConfig?.masterId === oldId) room.insConfig.masterId = newId;
  if (room.insPrevMaster === oldId) room.insPrevMaster = newId;
}

module.exports = {
  ROLES,
  QUESTION_SECONDS_CHOICES,
  MATCH_ROUND_CHOICES,
  POINTS,
  startMatch,
  setMatchRounds,
  setMasterPick,
  MASTER_MODES,
  DEFAULT_QUESTION_SECONDS,
  validateStart,
  startGame,
  rerollWords,
  chooseWord,
  ask,
  answer,
  markCorrect,
  endDiscussion,
  castVote1,
  castVote2,
  onTimeout,
  forceAdvance,
  resetToLobby,
  setQuestionSeconds,
  rekeyPlayer,
};
