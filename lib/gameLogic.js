const { PHASES, ROLES, ROLE_TEAM, TEAMS } = require("./types");
const { emptyNight, emptyVote } = require("./rooms");

const MIN_PLAYERS = 5;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(roleConfig, playerCount) {
  const deck = [];
  for (const role of [ROLES.WEREWOLF, ROLES.SEER, ROLES.DOCTOR, ROLES.VILLAGER]) {
    const count = roleConfig[role] || 0;
    for (let i = 0; i < count; i++) deck.push(role);
  }
  while (deck.length < playerCount) deck.push(ROLES.VILLAGER);
  return deck.slice(0, playerCount);
}

function validateRoleConfig(room) {
  const playerCount = Object.keys(room.players).length;
  if (playerCount < MIN_PLAYERS) {
    return `Need at least ${MIN_PLAYERS} players (currently ${playerCount}).`;
  }
  const deckSize = Object.values(room.roleConfig).reduce((a, b) => a + b, 0);
  if (deckSize !== playerCount) {
    return `Role deck has ${deckSize} roles but there are ${playerCount} players. Adjust the deck.`;
  }
  if ((room.roleConfig.WEREWOLF || 0) < 1) {
    return "Need at least 1 werewolf.";
  }
  if ((room.roleConfig.WEREWOLF || 0) >= playerCount / 2) {
    return "Too many werewolves for a fair game.";
  }
  return null;
}

function startGame(room) {
  const error = validateRoleConfig(room);
  if (error) return { error };

  const ids = Object.keys(room.players);
  const deck = shuffle(buildDeck(room.roleConfig, ids.length));

  ids.forEach((id, idx) => {
    room.players[id].role = deck[idx];
    room.players[id].alive = true;
  });

  room.phase = PHASES.ROLE_REVEAL;
  room.dayCount = 0;
  room.night = emptyNight();
  room.vote = emptyVote();
  room.chat = [];
  room.wolfChat = [];
  room.winner = null;
  room.log = ["The village falls asleep as darkness gathers over the forest..."];
  return { room };
}

function beginNight(room) {
  room.phase = PHASES.NIGHT;
  room.dayCount += 1;
  room.night = emptyNight();
  room.log.push(`Night ${room.dayCount} falls. Eyes close across the village.`);
  return room;
}

function alivePlayers(room) {
  return Object.values(room.players).filter((p) => p.alive);
}

function submitWolfVote(room, voterId, targetId) {
  const voter = room.players[voterId];
  if (!voter || voter.role !== ROLES.WEREWOLF || !voter.alive) return { error: "Not authorized." };
  if (room.phase !== PHASES.NIGHT) return { error: "Not night phase." };
  const target = room.players[targetId];
  if (!target || !target.alive) return { error: "Invalid target." };
  room.night.wolfVotes[voterId] = targetId;
  return { room };
}

function submitSeerTarget(room, seerId, targetId) {
  const seer = room.players[seerId];
  if (!seer || seer.role !== ROLES.SEER || !seer.alive) return { error: "Not authorized." };
  if (room.phase !== PHASES.NIGHT) return { error: "Not night phase." };
  const target = room.players[targetId];
  if (!target) return { error: "Invalid target." };
  room.night.seerTarget = targetId;
  room.night._seerActedBy = seerId;
  room.night.seerResult = {
    targetId,
    targetNickname: target.nickname,
    isWerewolf: target.role === ROLES.WEREWOLF,
  };
  return { room };
}

function submitDoctorTarget(room, doctorId, targetId) {
  const doctor = room.players[doctorId];
  if (!doctor || doctor.role !== ROLES.DOCTOR || !doctor.alive) return { error: "Not authorized." };
  if (room.phase !== PHASES.NIGHT) return { error: "Not night phase." };
  const target = room.players[targetId];
  if (!target || !target.alive) return { error: "Invalid target." };
  room.night.doctorTarget = targetId;
  room.night._doctorActedBy = doctorId;
  return { room };
}

function allNightActionsIn(room) {
  const wolves = alivePlayers(room).filter((p) => p.role === ROLES.WEREWOLF);
  const seerAlive = alivePlayers(room).some((p) => p.role === ROLES.SEER);
  const doctorAlive = alivePlayers(room).some((p) => p.role === ROLES.DOCTOR);

  const wolvesDone = wolves.length === 0 || wolves.every((w) => room.night.wolfVotes[w.id]);
  const seerDone = !seerAlive || room.night.seerTarget !== null;
  const doctorDone = !doctorAlive || room.night.doctorTarget !== null;
  return wolvesDone && seerDone && doctorDone;
}

function tallyVotes(votes) {
  const counts = {};
  for (const target of Object.values(votes)) {
    if (!target) continue; // skip abstains (null) so they never form a phantom tally bucket
    counts[target] = (counts[target] || 0) + 1;
  }
  return counts;
}

function pickMajorityTarget(counts) {
  let best = null;
  let bestCount = 0;
  let tie = false;
  for (const [id, count] of Object.entries(counts)) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
      tie = false;
    } else if (count === bestCount) {
      tie = true;
    }
  }
  return tie ? null : best;
}

function resolveNight(room) {
  const wolfCounts = tallyVotes(room.night.wolfVotes);
  const victimId = pickMajorityTarget(wolfCounts);
  const saved = victimId && room.night.doctorTarget === victimId;

  if (victimId && !saved && room.players[victimId]) {
    room.players[victimId].alive = false;
    room.log.push(`${room.players[victimId].nickname} was found dead. They were a ${room.players[victimId].role}.`);
  } else if (victimId && saved) {
    room.log.push(`The werewolves attacked, but the doctor's intervention saved a life.`);
  } else {
    room.log.push(`The night passed with no attack.`);
  }

  room.night.resolved = true;
  room.night.lastVictimId = saved ? null : victimId;
  room.phase = PHASES.DAY;
  return room;
}

function startVoting(room) {
  room.phase = PHASES.VOTING;
  room.vote = emptyVote();
  room.log.push("The village must now vote to lynch a suspect.");
  return room;
}

function castVote(room, voterId, targetId) {
  const voter = room.players[voterId];
  if (!voter || !voter.alive) return { error: "Only living players may vote." };
  if (room.phase !== PHASES.VOTING) return { error: "Not voting phase." };
  if (targetId !== null) {
    const target = room.players[targetId];
    if (!target || !target.alive) return { error: "Invalid target." };
  }
  room.vote.votes[voterId] = targetId;
  room.vote.tally = tallyVotes(room.vote.votes);
  return { room };
}

function allVotesIn(room) {
  return alivePlayers(room).every((p) => room.vote.votes[p.id] !== undefined);
}

function resolveVoting(room) {
  const counts = tallyVotes(room.vote.votes);
  const eliminatedId = pickMajorityTarget(counts);

  if (eliminatedId && room.players[eliminatedId]) {
    room.players[eliminatedId].alive = false;
    room.vote.eliminated = eliminatedId;
    room.log.push(
      `${room.players[eliminatedId].nickname} was lynched by the village. They were a ${room.players[eliminatedId].role}.`
    );
  } else {
    room.vote.eliminated = null;
    room.log.push("The vote ended in a tie. No one was lynched.");
  }
  return room;
}

function checkWinCondition(room) {
  const alive = alivePlayers(room);
  const wolves = alive.filter((p) => ROLE_TEAM[p.role] === TEAMS.WEREWOLF);
  const villagers = alive.filter((p) => ROLE_TEAM[p.role] === TEAMS.VILLAGE);

  if (wolves.length === 0) return TEAMS.VILLAGE;
  if (wolves.length >= villagers.length) return TEAMS.WEREWOLF;
  return null;
}

function endGame(room, winner) {
  room.phase = PHASES.GAME_OVER;
  room.winner = winner;
  room.log.push(
    winner === TEAMS.VILLAGE ? "The village has purged every werewolf. Villagers win!" : "The werewolves have overrun the village. Werewolves win!"
  );
  return room;
}

module.exports = {
  MIN_PLAYERS,
  validateRoleConfig,
  startGame,
  beginNight,
  submitWolfVote,
  submitSeerTarget,
  submitDoctorTarget,
  allNightActionsIn,
  resolveNight,
  startVoting,
  castVote,
  allVotesIn,
  resolveVoting,
  checkWinCondition,
  endGame,
  alivePlayers,
};
