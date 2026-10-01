const {
  PHASES,
  ROLES,
  GAME_TYPES,
  KRAKEN_ROLES,
  KRAKEN_ALLOWED_CARDS,
  KRAKEN_DISTRIBUTION,
  KRAKEN_WIN_SCORE,
  KRAKEN_MAX_REJECTS,
} = require("./types");
const kraken = require("./krakenLogic");

/**
 * SECURITY BOUNDARY: this is the only function allowed to turn full room
 * state into something sent over the wire. Every socket payload MUST be
 * built by calling this per-recipient — never JSON.stringify(room) directly.
 * A villager's payload must not contain werewolf identities, a doctor's
 * pick must not leak to anyone else, etc. Add new fields here, not ad hoc
 * in server.js, or you will reintroduce the leak this function exists to close.
 */
function getFilteredState(room, viewerId) {
  if (room.gameType === GAME_TYPES.TICTACTOE) {
    return getTicTacToeView(room, viewerId);
  }
  if (room.gameType === GAME_TYPES.ONE_NIGHT_WEREWOLF) {
    return getOnwView(room, viewerId);
  }
  if (room.gameType === GAME_TYPES.FEED_THE_KRAKEN) {
    return getKrakenView(room, viewerId);
  }
  return getWerewolfView(room, viewerId);
}

function basePlayers(room, viewerId) {
  return Object.values(room.players).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    connected: p.connected,
    isHost: p.id === room.hostId,
    isSelf: p.id === viewerId,
  }));
}

function getWerewolfView(room, viewerId) {
  const viewer = room.players[viewerId];
  const viewerRole = viewer ? viewer.role : null;
  const isWolf = viewerRole === ROLES.WEREWOLF;
  const isDead = viewer && !viewer.alive;
  // Dead players become spectators and can see everything (classic house rule).
  const revealAll = isDead || room.phase === PHASES.GAME_OVER;

  const players = Object.values(room.players).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    alive: p.alive,
    connected: p.connected,
    isHost: p.id === room.hostId,
    isSelf: p.id === viewerId,
    // Role is only visible if: it's you, you're both werewolves, the player
    // is dead (role reveal on elimination), someone is spectating as dead,
    // or the game has ended.
    role:
      p.id === viewerId || (isWolf && p.role === ROLES.WEREWOLF) || !p.alive || revealAll
        ? p.role
        : null,
  }));

  const base = {
    code: room.code,
    gameType: GAME_TYPES.WEREWOLF,
    phase: room.phase,
    dayCount: room.dayCount,
    hostId: room.hostId,
    roleConfig: room.roleConfig,
    timerConfig: room.timerConfig,
    phaseEndsAt: room.phaseEndsAt,
    players,
    log: room.log,
    winner: room.winner,
    you: viewer
      ? { id: viewer.id, role: viewer.role, alive: viewer.alive, isHost: viewer.id === room.hostId }
      : null,
    // Deliberately NOT gated to the NIGHT phase: this is knowledge the Seer
    // now possesses, not a live night-only signal. Gating it to NIGHT meant a
    // Seer who acted last would have their result overwritten by the
    // same-tick night->DAY broadcast before ever seeing it. It naturally
    // resets to null when the next night's emptyNight() runs.
    seerResult: viewerRole === ROLES.SEER ? room.night.seerResult : undefined,
  };

  if (room.phase === PHASES.NIGHT) {
    base.night = {
      // Wolves see the shared wolf chat + who has voted for whom, so far.
      wolfChat: isWolf || revealAll ? room.wolfChat : [],
      wolfVotes: isWolf || revealAll ? room.night.wolfVotes : undefined,
      // Each role only sees confirmation that THEY acted, not what others chose.
      youActed:
        viewerRole === ROLES.WEREWOLF
          ? Boolean(room.night.wolfVotes[viewerId])
          : viewerRole === ROLES.SEER
          ? room.night.seerTarget !== null && room.night._seerActedBy === viewerId
          : viewerRole === ROLES.DOCTOR
          ? room.night._doctorActedBy === viewerId
          : undefined,
    };
  }

  if (room.phase === PHASES.DAY || room.phase === PHASES.VOTING) {
    base.chat = room.chat;
  }

  if (room.phase === PHASES.VOTING) {
    base.vote = {
      votes: room.vote.votes, // who-voted-for-whom is public during lynch voting
      tally: room.vote.tally,
      youVoted: room.vote.votes[viewerId] || null,
    };
  }

  return base;
}

// Tic Tac Toe has no hidden information, so the "filtered" view is really
// just a consistently-shaped public view, kept in this file so every game
// funnels through the same per-recipient broadcast pipeline.
function getTicTacToeView(room, viewerId) {
  const viewer = room.players[viewerId];
  const players = basePlayers(room, viewerId).map((p) => ({
    ...p,
    symbol: room.symbols[p.id] || null,
  }));

  return {
    code: room.code,
    gameType: GAME_TYPES.TICTACTOE,
    phase: room.phase,
    hostId: room.hostId,
    players,
    board: room.board,
    turn: room.turn,
    winner: room.winner,
    winningLine: room.winningLine,
    log: room.log,
    you: viewer
      ? {
          id: viewer.id,
          symbol: room.symbols[viewerId] || null,
          isHost: viewer.id === room.hostId,
        }
      : null,
  };
}

// One Night Ultimate Werewolf: nobody's role (starting or current) is ever
// revealed to anyone but themselves — and even to themselves, only via the
// specific reveal mechanics that actually surface it (nightInfo entries),
// not a blanket "your role" field, since a Robber/Troublemaker/Drunk target
// isn't told their card changed. Center cards are similarly hidden per-slot
// unless THIS viewer personally peeked that slot (or the game has ended).
function getOnwView(room, viewerId) {
  const viewer = room.players[viewerId];
  const gameOver = room.phase === PHASES.GAME_OVER;
  const myLog = room.nightInfo[viewerId] || [];

  const players = Object.values(room.players).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    connected: p.connected,
    isHost: p.id === room.hostId,
    isSelf: p.id === viewerId,
    dead: (room.deadPlayerIds || []).includes(p.id),
    startingRole: gameOver ? p.startingRole : null,
    role: gameOver ? p.role : null,
  }));

  const center = (room.center || []).map((c, i) => {
    const revealedToMe =
      gameOver ||
      myLog.some(
        (entry) =>
          (entry.type === "WEREWOLF_CENTER_PEEK" && entry.index === i) ||
          (entry.type === "SEER_CENTER" && entry.cards.some((cc) => cc.index === i))
      );
    return { index: i, role: revealedToMe ? c.role : null };
  });

  let currentStep = null;
  let pendingCount = 0;
  let isMyTurn = false;
  if (room.phase === PHASES.NIGHT) {
    currentStep = room.nightOrder[room.nightStepIndex] ?? null;
    if (currentStep) {
      const eligible = Object.values(room.players).filter((p) => p.startingRole === currentStep);
      pendingCount = eligible.filter((p) => !room.nightActed[p.id]).length;
      isMyTurn = viewer?.startingRole === currentStep && !room.nightActed[viewerId];
    }
  }

  const base = {
    code: room.code,
    gameType: GAME_TYPES.ONE_NIGHT_WEREWOLF,
    phase: room.phase,
    hostId: room.hostId,
    roleConfig: room.roleConfig,
    timerConfig: room.timerConfig,
    phaseEndsAt: room.phaseEndsAt,
    players,
    center,
    nightOrder: room.nightOrder,
    currentStep,
    pendingCount,
    isMyTurn,
    myNightLog: myLog,
    deadPlayerIds: room.deadPlayerIds || [],
    log: room.log,
    winner: room.winner,
    you: viewer ? { id: viewer.id, startingRole: viewer.startingRole, isHost: viewer.id === room.hostId } : null,
  };

  if (room.phase === PHASES.DAY || room.phase === PHASES.VOTING) {
    base.chat = room.chat;
  }

  if (room.phase === PHASES.VOTING) {
    base.vote = {
      votes: room.vote.votes,
      tally: room.vote.tally,
      youVoted: room.vote.votes[viewerId] || null,
    };
  }

  return base;
}

// Feed the Kraken: a player's allegiance is visible only to themselves, to
// fellow Pirates (Pirates know each other), and to everyone once the game ends.
// The Cultist knows nobody and nobody knows the Cultist. Crew votes stay secret
// until the last vote lands (only "who has voted" is shown); played cards are
// never attributed — history only carries the shuffled card list.
function getKrakenView(room, viewerId) {
  const viewer = room.players[viewerId];
  const viewerRole = viewer ? viewer.role : null;
  const gameOver = room.phase === PHASES.GAME_OVER;
  const isPirate = viewerRole === KRAKEN_ROLES.PIRATE;
  const captain = kraken.captainId(room);

  const players = Object.values(room.players).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    connected: p.connected,
    isHost: p.id === room.hostId,
    isSelf: p.id === viewerId,
    isCaptain: p.id === captain,
    onCrew: room.crew.includes(p.id),
    role: p.id === viewerId || gameOver || (isPirate && p.role === KRAKEN_ROLES.PIRATE) ? p.role : null,
  }));

  const count = Object.keys(room.players).length;
  const dist = KRAKEN_DISTRIBUTION[count];
  const inGame = room.phase !== PHASES.LOBBY;

  const base = {
    code: room.code,
    gameType: GAME_TYPES.FEED_THE_KRAKEN,
    phase: room.phase,
    hostId: room.hostId,
    players,
    round: room.round,
    captainId: inGame ? captain : null,
    crewSize: kraken.crewSize(room),
    crew: room.crew,
    rejects: room.rejects,
    maxRejects: KRAKEN_MAX_REJECTS,
    score: room.score,
    winScore: KRAKEN_WIN_SCORE,
    composition: dist ? { SAILOR: dist[0], PIRATE: dist[1], CULTIST: dist[2] } : null,
    history: room.history,
    log: room.log,
    winner: room.winner,
    winReason: room.winReason,
    chat: room.chat,
    you: viewer
      ? {
          id: viewer.id,
          role: viewer.role,
          isHost: viewer.id === room.hostId,
          isCaptain: viewer.id === captain,
          onCrew: room.crew.includes(viewerId),
        }
      : null,
  };

  if (room.phase === PHASES.CREW_VOTE) {
    base.vote = {
      votedIds: Object.keys(room.crewVotes),
      youVoted: room.crewVotes[viewerId] === undefined ? null : room.crewVotes[viewerId],
    };
  }

  if (room.phase === PHASES.VOYAGE) {
    base.voyage = {
      playedIds: Object.keys(room.cards),
      yourCard: room.cards[viewerId] ?? null,
      allowedCards: viewer && room.crew.includes(viewerId) ? KRAKEN_ALLOWED_CARDS[viewer.role] : [],
    };
  }

  return base;
}

module.exports = { getFilteredState };
