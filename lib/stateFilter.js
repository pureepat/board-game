const { PHASES, ROLES, GAME_TYPES } = require("./types");
const kraken = require("./krakenLogic");
const { KR_ROLES, mapFor, mutinyThreshold, offDutyCount } = require("./krakenRules");

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

  // A peeked slot shows the card *as it was when you looked*, taken from your
  // own night log — never the slot's current card. A Drunk who swaps with that
  // slot later in the night must not be revealed to the earlier peeker.
  const center = (room.center || []).map((c, i) => {
    if (gameOver) return { index: i, role: c.role };
    let seen = null;
    for (const entry of myLog) {
      if (entry.type === "WEREWOLF_CENTER_PEEK" && entry.index === i) seen = entry.role;
      if (entry.type === "SEER_CENTER") seen = entry.cards.find((cc) => cc.index === i)?.role ?? seen;
    }
    return { index: i, role: seen };
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

// Feed the Kraken: a role is visible to its owner; Pirates see who was dealt
// Pirate (they met before the voyage); a Cult Leader sees the players they
// converted and a convert sees their Cult Leader; everyone sees everything
// once the game is over. Navigation hands, mutiny commits (until the reveal),
// cabin-search results and ritual details are only ever sent to the one
// player entitled to them.
function getKrakenView(room, viewerId) {
  const viewer = room.players[viewerId];
  const kr = room.kr;
  const gameOver = room.phase === PHASES.GAME_OVER;

  const base = {
    code: room.code,
    gameType: GAME_TYPES.FEED_THE_KRAKEN,
    phase: room.phase,
    hostId: room.hostId,
    winner: room.winner,
    winReason: room.winReason ?? null,
    chat: room.chat,
    log: room.log,
  };

  if (!kr) {
    const count = Object.keys(room.players).length;
    return {
      ...base,
      players: Object.values(room.players).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        connected: p.connected,
        isHost: p.id === room.hostId,
        isSelf: p.id === viewerId,
      })),
      lobby: {
        mapId: count >= 5 ? mapFor(count).id : null,
        threshold: mutinyThreshold(count),
        offDuty: offDutyCount(count),
      },
      you: viewer ? { id: viewer.id, isHost: viewer.id === room.hostId } : null,
    };
  }

  const viewerRole = viewer?.role ?? null;
  const viewerDealtPirate = kr.startingRole[viewerId] === KR_ROLES.PIRATE;

  function visibleRole(id) {
    const p = room.players[id];
    if (id === viewerId || gameOver) return p.role;
    if (viewerDealtPirate && kr.startingRole[id] === KR_ROLES.PIRATE) return KR_ROLES.PIRATE;
    if (viewerRole === KR_ROLES.CULT_LEADER && kr.convertedBy[id] === viewerId) return KR_ROLES.CULTIST;
    if (viewerRole === KR_ROLES.CULTIST && kr.convertedBy[viewerId] === id) return KR_ROLES.CULT_LEADER;
    return null;
  }

  const seatOf = (id) => kr.seats.indexOf(id);
  const players = Object.values(room.players)
    .sort((a, b) => seatOf(a.id) - seatOf(b.id))
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      connected: p.connected,
      isHost: p.id === room.hostId,
      isSelf: p.id === viewerId,
      guns: kr.guns[p.id] ?? 0,
      resumes: kr.resumes[p.id] ?? 0,
      isCaptain: p.id === kr.captainId,
      isLieutenant: p.id === kr.lieutenantId,
      isNavigator: p.id === kr.navigatorId,
      offDuty: kr.offDuty.includes(p.id),
      eliminated: kr.eliminated.includes(p.id),
      tongueless: kr.tongueless.includes(p.id),
      notTeams: kr.flogged.filter((f) => f.id === p.id).map((f) => f.notTeam),
      role: visibleRole(p.id),
    }));

  const map = mapFor(kr.playerCount);
  const leader = kraken.cultLeaderId(room);
  const pending = kr.queue[0] ?? null;

  const view = {
    ...base,
    players,
    round: kr.round,
    map: {
      id: map.id,
      hexes: map.hexes,
      island: map.island,
      supplyRow: map.supplyRow,
      actions: map.actions.map((a) => ({ ...a, used: kr.usedActions.includes(`${a.col},${a.row}`) })),
    },
    ship: kr.ship,
    supplied: kr.supplied,
    deckCount: kr.deck.length,
    discardCount: kr.discard.length,
    lastCard: kr.lastCard,
    threshold: mutinyThreshold(kr.playerCount),
    events: kr.events,
    pending: pending ? { kind: pending.kind, type: pending.type ?? null, ritual: pending.ritual ?? null } : null,
    you: viewer
      ? {
          id: viewer.id,
          role: viewer.role,
          isHost: viewer.id === room.hostId,
          guns: kr.guns[viewerId] ?? 0,
          isCaptain: viewerId === kr.captainId,
          isLieutenant: viewerId === kr.lieutenantId,
          isNavigator: viewerId === kr.navigatorId,
          isCultLeader: viewerId === leader,
          eliminated: kr.eliminated.includes(viewerId),
          privateLog: kr.privateLog[viewerId] ?? [],
        }
      : null,
  };

  if (room.phase === PHASES.KR_APPOINT && viewerId === kr.captainId) {
    view.appointable = kraken.appointable(room);
  }
  if (room.phase === PHASES.KR_MUTINY) {
    view.mutiny = {
      committedIds: Object.keys(kr.mutiny.commits),
      canCommit: kraken.mutineers(room).includes(viewerId),
      yourCommit: kr.mutiny.commits[viewerId] ?? null,
    };
  }
  if (room.phase === PHASES.KR_NAV_DISCARD) {
    view.nav = {
      waitingIds: Object.keys(kr.hands),
      yourHand: kr.hands[viewerId] ?? null,
    };
  }
  if (room.phase === PHASES.KR_NAV_CHOOSE) {
    view.nav = { waitingIds: [kr.navigatorId], yourOptions: viewerId === kr.navigatorId ? kr.options : null };
  }
  if (room.phase === PHASES.KR_RITUAL && viewerId === leader && pending?.ritual === "CONVERSION") {
    view.conversionTargets = kraken.conversionTargets(room);
  }

  return view;
}

module.exports = { getFilteredState };
