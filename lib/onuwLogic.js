const { PHASES, ONW_ROLES, ONW_NIGHT_ORDER } = require("./types");

const MIN_PLAYERS = 3;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(roleConfig) {
  const deck = [];
  for (const role of Object.keys(ONW_ROLES)) {
    const count = roleConfig[role] || 0;
    for (let i = 0; i < count; i++) deck.push(role);
  }
  return deck;
}

function validateStart(room) {
  const playerCount = Object.keys(room.players).length;
  if (playerCount < MIN_PLAYERS) return `Need at least ${MIN_PLAYERS} players (currently ${playerCount}).`;
  const deck = buildDeck(room.roleConfig);
  if (deck.length !== playerCount + 3) {
    return `Deck must have exactly ${playerCount + 3} cards (players + 3 center) — currently ${deck.length}.`;
  }
  if ((room.roleConfig.MINION || 0) > 0 && (room.roleConfig.WEREWOLF || 0) === 0) {
    return "Minion needs at least one Werewolf in the deck.";
  }
  return null;
}

function eligiblePlayersForStep(room, stepRole) {
  return Object.values(room.players).filter((p) => p.startingRole === stepRole);
}

function currentStepRole(room) {
  if (!room.nightOrder || room.nightStepIndex >= room.nightOrder.length) return null;
  return room.nightOrder[room.nightStepIndex];
}

function pushInfo(room, playerId, entry) {
  if (!room.nightInfo[playerId]) room.nightInfo[playerId] = [];
  room.nightInfo[playerId].push(entry);
}

function markActed(room, playerId) {
  room.nightActed[playerId] = true;
}

// Populates the auto-revealed info for "wake up and just look" roles the
// instant their step begins. Choice roles (Seer/Robber/Troublemaker/Drunk,
// and a lone Werewolf's optional center peek) populate on-action instead.
function onStepEnter(room) {
  const step = currentStepRole(room);
  if (!step) return;
  const eligible = eligiblePlayersForStep(room, step);
  if (eligible.length === 0) return;

  if (step === "WEREWOLF") {
    const teammates = eligible.map((p) => ({ id: p.id, nickname: p.nickname }));
    eligible.forEach((p) =>
      pushInfo(room, p.id, { type: "WEREWOLF_TEAM", teammates: teammates.filter((t) => t.id !== p.id) })
    );
  }
  if (step === "MINION") {
    const wolves = Object.values(room.players)
      .filter((p) => p.startingRole === "WEREWOLF")
      .map((p) => ({ id: p.id, nickname: p.nickname }));
    eligible.forEach((p) => pushInfo(room, p.id, { type: "MINION_WOLVES", wolves }));
  }
  if (step === "MASON") {
    const masons = eligible.map((p) => ({ id: p.id, nickname: p.nickname }));
    eligible.forEach((p) =>
      pushInfo(room, p.id, { type: "MASON_TEAM", teammates: masons.filter((m) => m.id !== p.id) })
    );
  }
  if (step === "INSOMNIAC") {
    eligible.forEach((p) => pushInfo(room, p.id, { type: "INSOMNIAC_VIEW", role: room.players[p.id].role }));
  }
}

function isStepDone(room) {
  const step = currentStepRole(room);
  if (!step) return true;
  const eligible = eligiblePlayersForStep(room, step);
  return eligible.every((p) => room.nightActed[p.id]);
}

// Advances past any steps with zero eligible players and populates the next
// blocking step. Returns { done: true } once the whole sequence is spent.
function enterNightStep(room) {
  while (room.nightStepIndex < room.nightOrder.length) {
    const step = room.nightOrder[room.nightStepIndex];
    const eligible = eligiblePlayersForStep(room, step);
    if (eligible.length === 0) {
      room.nightStepIndex += 1;
      continue;
    }
    onStepEnter(room);
    return { done: false, step };
  }
  room.phase = PHASES.DAY;
  room.log.push("Dawn breaks over the village. Discuss what you learned, then vote.");
  return { done: true };
}

function startGame(room) {
  const error = validateStart(room);
  if (error) return { error };

  const ids = Object.keys(room.players);
  const deck = shuffle(buildDeck(room.roleConfig));

  ids.forEach((id, i) => {
    room.players[id].startingRole = deck[i];
    room.players[id].role = deck[i];
    room.players[id].alive = true;
  });
  room.center = [{ role: deck[ids.length] }, { role: deck[ids.length + 1] }, { role: deck[ids.length + 2] }];
  room.nightOrder = ONW_NIGHT_ORDER.filter((step) => ids.some((id) => room.players[id].startingRole === step));
  room.nightStepIndex = 0;
  room.nightActed = {};
  room.nightInfo = {};
  room.vote = { votes: {}, eliminated: null, tally: {} };
  room.deadPlayerIds = [];
  room.chat = [];
  room.winner = null;
  room.log = ["The village drifts to sleep. One fateful night begins..."];
  room.phase = PHASES.NIGHT;

  enterNightStep(room);
  return { room };
}

// Generic "I have nothing more to submit" for passive steps (multi-Werewolf
// or lone-Werewolf-skip, Minion, Mason, Insomniac).
function continueStep(room, playerId) {
  const step = currentStepRole(room);
  const player = room.players[playerId];
  if (!player || player.startingRole !== step) return { error: "It's not your turn." };
  if (room.nightActed[playerId]) return { error: "You've already acted." };
  markActed(room, playerId);
  return { room };
}

function werewolfPeekCenter(room, playerId, centerIndex) {
  const player = room.players[playerId];
  if (!player || player.startingRole !== "WEREWOLF") return { error: "Not authorized." };
  if (currentStepRole(room) !== "WEREWOLF") return { error: "It's not your turn." };
  if (room.nightActed[playerId]) return { error: "You've already acted." };
  const wolves = eligiblePlayersForStep(room, "WEREWOLF");
  if (wolves.length !== 1) return { error: "Only a lone Werewolf may peek at the center." };
  if (!Number.isInteger(centerIndex) || centerIndex < 0 || centerIndex > 2) return { error: "Invalid card." };
  pushInfo(room, playerId, { type: "WEREWOLF_CENTER_PEEK", index: centerIndex, role: room.center[centerIndex].role });
  markActed(room, playerId);
  return { room };
}

function seerViewPlayer(room, playerId, targetId) {
  const player = room.players[playerId];
  if (!player || player.startingRole !== "SEER") return { error: "Not authorized." };
  if (currentStepRole(room) !== "SEER") return { error: "It's not your turn." };
  if (room.nightActed[playerId]) return { error: "You've already acted." };
  const target = room.players[targetId];
  if (!target || targetId === playerId) return { error: "Invalid target." };
  pushInfo(room, playerId, {
    type: "SEER_PLAYER",
    targetId,
    targetNickname: target.nickname,
    role: target.role,
  });
  markActed(room, playerId);
  return { room };
}

function seerViewCenter(room, playerId, indices) {
  const player = room.players[playerId];
  if (!player || player.startingRole !== "SEER") return { error: "Not authorized." };
  if (currentStepRole(room) !== "SEER") return { error: "It's not your turn." };
  if (room.nightActed[playerId]) return { error: "You've already acted." };
  const unique = Array.from(new Set(indices));
  if (unique.length !== 2 || unique.some((i) => !Number.isInteger(i) || i < 0 || i > 2)) {
    return { error: "Choose exactly two center cards." };
  }
  pushInfo(room, playerId, {
    type: "SEER_CENTER",
    cards: unique.map((i) => ({ index: i, role: room.center[i].role })),
  });
  markActed(room, playerId);
  return { room };
}

function robberSwap(room, playerId, targetId) {
  const player = room.players[playerId];
  if (!player || player.startingRole !== "ROBBER") return { error: "Not authorized." };
  if (currentStepRole(room) !== "ROBBER") return { error: "It's not your turn." };
  if (room.nightActed[playerId]) return { error: "You've already acted." };
  const target = room.players[targetId];
  if (!target || targetId === playerId) return { error: "Invalid target." };
  const myOldRole = player.role;
  player.role = target.role;
  target.role = myOldRole;
  pushInfo(room, playerId, {
    type: "ROBBER_SWAP",
    targetId,
    targetNickname: target.nickname,
    newRole: player.role,
  });
  markActed(room, playerId);
  return { room };
}

function troublemakerSwap(room, playerId, targetAId, targetBId) {
  const player = room.players[playerId];
  if (!player || player.startingRole !== "TROUBLEMAKER") return { error: "Not authorized." };
  if (currentStepRole(room) !== "TROUBLEMAKER") return { error: "It's not your turn." };
  if (room.nightActed[playerId]) return { error: "You've already acted." };
  if (!targetAId || !targetBId || targetAId === targetBId || targetAId === playerId || targetBId === playerId) {
    return { error: "Pick two other players." };
  }
  const a = room.players[targetAId];
  const b = room.players[targetBId];
  if (!a || !b) return { error: "Invalid targets." };
  [a.role, b.role] = [b.role, a.role];
  pushInfo(room, playerId, {
    type: "TROUBLEMAKER_SWAP",
    aId: targetAId,
    aNickname: a.nickname,
    bId: targetBId,
    bNickname: b.nickname,
  });
  markActed(room, playerId);
  return { room };
}

function drunkSwap(room, playerId, centerIndex) {
  const player = room.players[playerId];
  if (!player || player.startingRole !== "DRUNK") return { error: "Not authorized." };
  if (currentStepRole(room) !== "DRUNK") return { error: "It's not your turn." };
  if (room.nightActed[playerId]) return { error: "You've already acted." };
  if (!Number.isInteger(centerIndex) || centerIndex < 0 || centerIndex > 2) return { error: "Invalid card." };
  const oldRole = player.role;
  player.role = room.center[centerIndex].role;
  room.center[centerIndex].role = oldRole;
  // The Drunk swaps blind — no info entry reveals the new (or old) role to them.
  pushInfo(room, playerId, { type: "DRUNK_SWAP", index: centerIndex });
  markActed(room, playerId);
  return { room };
}

// Called after any action/continue. Advances the step (and populates the
// next one) once every eligible player for the current step has acted.
function tryAdvanceNight(room) {
  if (!isStepDone(room)) return { advanced: false };
  room.nightStepIndex += 1;
  room.nightActed = {};
  const result = enterNightStep(room);
  return { advanced: true, nightComplete: result.done };
}

// Host escape hatch: force everyone still pending on the current step to be
// treated as "acted" (without recording a choice for them), then advance.
function forceCompleteStep(room) {
  const step = currentStepRole(room);
  if (!step) return { room };
  eligiblePlayersForStep(room, step).forEach((p) => markActed(room, p.id));
  return tryAdvanceNight(room);
}

function tallyVotes(votes) {
  const counts = {};
  for (const target of Object.values(votes)) {
    if (target) counts[target] = (counts[target] || 0) + 1;
  }
  return counts;
}

function resolveVoting(room) {
  const counts = tallyVotes(room.vote.votes);
  const maxCount = Object.values(counts).length ? Math.max(...Object.values(counts)) : 0;
  let deadIds = maxCount > 0 ? Object.entries(counts).filter(([, c]) => c === maxCount).map(([id]) => id) : [];

  // Hunter chain: anyone dying whose current role is Hunter also takes down
  // whoever they voted for (breadth-first so a chained Hunter can cascade).
  const seen = new Set(deadIds);
  let frontier = deadIds;
  while (frontier.length) {
    const next = [];
    for (const id of frontier) {
      const player = room.players[id];
      if (player && player.role === "HUNTER") {
        const target = room.vote.votes[id];
        if (target && !seen.has(target)) {
          seen.add(target);
          next.push(target);
        }
      }
    }
    frontier = next;
  }

  room.deadPlayerIds = Array.from(seen);
  room.deadPlayerIds.forEach((id) => {
    if (room.players[id]) room.players[id].alive = false;
  });

  if (room.deadPlayerIds.length === 0) {
    room.log.push("No one was voted out. The night's secrets go unresolved.");
  } else {
    const names = room.deadPlayerIds.map((id) => room.players[id]?.nickname).filter(Boolean).join(", ");
    room.log.push(`${names} ${room.deadPlayerIds.length > 1 ? "were" : "was"} voted out.`);
  }
  return room;
}

function checkWinner(room) {
  const deadRoles = room.deadPlayerIds.map((id) => room.players[id]?.role).filter(Boolean);
  const anyTannerDied = deadRoles.includes("TANNER");
  const anyWerewolfDied = deadRoles.includes("WEREWOLF");
  const werewolvesInPlay = Object.values(room.players).some((p) => p.role === "WEREWOLF");

  if (anyTannerDied) return "TANNER";
  if (anyWerewolfDied) return "VILLAGE";
  if (!werewolvesInPlay && room.deadPlayerIds.length === 0) return "VILLAGE";
  return "WEREWOLF";
}

function endGame(room, winner) {
  room.phase = PHASES.GAME_OVER;
  room.winner = winner;
  const label = winner === "VILLAGE" ? "The Village" : winner === "WEREWOLF" ? "The Werewolves" : "The Tanner";
  room.log.push(`${label} win${winner === "TANNER" ? "s" : ""}!`);
  return room;
}

module.exports = {
  MIN_PLAYERS,
  validateStart,
  startGame,
  currentStepRole,
  eligiblePlayersForStep,
  continueStep,
  werewolfPeekCenter,
  seerViewPlayer,
  seerViewCenter,
  robberSwap,
  troublemakerSwap,
  drunkSwap,
  tryAdvanceNight,
  forceCompleteStep,
  resolveVoting,
  checkWinner,
  endGame,
};
