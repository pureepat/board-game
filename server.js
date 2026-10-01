const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const {
  PHASES,
  ROLES,
  GAME_TYPES,
  TIMER_PHASES,
  TIMER_MIN_SECONDS,
  TIMER_MAX_SECONDS,
  ONW_ROLES,
  KRAKEN_MAX_PLAYERS,
} = require("./lib/types");
const { createRoom, addPlayer, getRoom, deleteRoom, findRoomBySocket } = require("./lib/rooms");
const { getFilteredState } = require("./lib/stateFilter");
const gl = require("./lib/gameLogic");
const ttt = require("./lib/tictactoeLogic");
const onw = require("./lib/onuwLogic");
const kraken = require("./lib/krakenLogic");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// How long a disconnected player is kept "in" the room before the seat frees up.
const DISCONNECT_GRACE_MS = 2 * 60 * 1000;
const disconnectTimers = new Map();

// Active Werewolf phase-countdown timeouts, keyed by room code, so an early
// resolution (e.g. all night actions in) can cancel the pending auto-advance.
const phaseTimers = new Map();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  function broadcastRoom(room) {
    for (const playerId of Object.keys(room.players)) {
      io.to(playerId).emit("room_update", getFilteredState(room, playerId));
    }
  }

  // --- Werewolf phase timers -------------------------------------------
  // Each Werewolf phase can carry a host-configured duration (room.timerConfig).
  // 0/falsy means "no limit" — the phase only advances via player/host action.

  function clearPhaseTimer(room) {
    const handle = phaseTimers.get(room.code);
    if (handle) clearTimeout(handle);
    phaseTimers.delete(room.code);
    room.phaseEndsAt = null;
  }

  function schedulePhaseTimer(room, phase, onExpire) {
    clearPhaseTimer(room);
    const seconds = room.timerConfig?.[phase];
    if (!seconds || seconds <= 0) return;
    room.phaseEndsAt = Date.now() + seconds * 1000;
    const handle = setTimeout(() => {
      phaseTimers.delete(room.code);
      onExpire();
    }, seconds * 1000);
    phaseTimers.set(room.code, handle);
  }

  function startNightTimer(room) {
    schedulePhaseTimer(room, PHASES.NIGHT, () => {
      // Time's up — resolve with whatever actions were submitted.
      gl.resolveNight(room);
      const winner = gl.checkWinCondition(room);
      if (winner) gl.endGame(room, winner);
      else startDayTimer(room);
      broadcastRoom(room);
    });
  }

  function startDayTimer(room) {
    schedulePhaseTimer(room, PHASES.DAY, () => {
      gl.startVoting(room);
      startVotingTimer(room);
      broadcastRoom(room);
    });
  }

  function startVotingTimer(room) {
    schedulePhaseTimer(room, PHASES.VOTING, () => {
      // Time's up — tally whatever votes were cast.
      gl.resolveVoting(room);
      const winner = gl.checkWinCondition(room);
      if (winner) gl.endGame(room, winner);
      else {
        gl.beginNight(room);
        startNightTimer(room);
      }
      broadcastRoom(room);
    });
  }

  function tryAdvanceNight(room) {
    if (gl.allNightActionsIn(room)) {
      clearPhaseTimer(room);
      gl.resolveNight(room);
      const winner = gl.checkWinCondition(room);
      if (winner) {
        gl.endGame(room, winner);
      } else {
        startDayTimer(room);
      }
      broadcastRoom(room);
    }
  }

  function tryAdvanceVoting(room) {
    if (gl.allVotesIn(room)) {
      clearPhaseTimer(room);
      gl.resolveVoting(room);
      const winner = gl.checkWinCondition(room);
      if (winner) {
        gl.endGame(room, winner);
      } else {
        gl.beginNight(room);
        startNightTimer(room);
      }
      broadcastRoom(room);
    }
  }

  // --- One Night Ultimate Werewolf timers --------------------------------
  // Reuses the same clearPhaseTimer/schedulePhaseTimer primitives above; the
  // night here is a single pass through a fixed step sequence rather than
  // a repeating night/day/vote loop.

  function onwEnterStepTimer(room) {
    if (room.phase !== PHASES.NIGHT) return;
    const step = onw.currentStepRole(room);
    if (!step) return;
    schedulePhaseTimer(room, "NIGHT_STEP", () => {
      onw.forceCompleteStep(room);
      onwAfterNightAdvance(room);
      broadcastRoom(room);
    });
  }

  // Call after anything that may have changed room.phase away from where a
  // timer was previously scheduled — schedules whatever timer belongs next.
  function onwAfterNightAdvance(room) {
    if (room.phase === PHASES.NIGHT) onwEnterStepTimer(room);
    else if (room.phase === PHASES.DAY) onwStartDayTimer(room);
  }

  function onwStartDayTimer(room) {
    schedulePhaseTimer(room, PHASES.DAY, () => {
      room.phase = PHASES.VOTING;
      room.log.push("Time's up. Cast your votes.");
      onwStartVotingTimer(room);
      broadcastRoom(room);
    });
  }

  function onwStartVotingTimer(room) {
    schedulePhaseTimer(room, PHASES.VOTING, () => {
      onw.resolveVoting(room);
      const winner = onw.checkWinner(room);
      onw.endGame(room, winner);
      broadcastRoom(room);
    });
  }

  function onwTryAdvanceVoting(room) {
    if (gl.allVotesIn(room)) {
      clearPhaseTimer(room);
      onw.resolveVoting(room);
      const winner = onw.checkWinner(room);
      onw.endGame(room, winner);
      broadcastRoom(room);
    }
  }

  function onwAdvanceAfterAction(room) {
    const adv = onw.tryAdvanceNight(room);
    if (adv.advanced) onwAfterNightAdvance(room);
    broadcastRoom(room);
  }

  io.on("connection", (socket) => {
    socket.on("create_room", ({ nickname, gameType }, cb) => {
      if (!nickname || !nickname.trim()) return cb?.({ error: "Nickname required." });
      const resolvedType = Object.values(GAME_TYPES).includes(gameType) ? gameType : GAME_TYPES.WEREWOLF;
      const room = createRoom(socket.id, nickname.trim(), resolvedType);
      socket.join(room.code);
      cb?.({ code: room.code, playerId: socket.id });
      broadcastRoom(room);
    });

    socket.on("join_room", ({ code, nickname }, cb) => {
      const room = getRoom(code);
      if (!room) return cb?.({ error: "Room not found." });
      if (room.phase !== PHASES.LOBBY) return cb?.({ error: "Game already in progress." });
      if (!nickname || !nickname.trim()) return cb?.({ error: "Nickname required." });
      if (room.gameType === GAME_TYPES.TICTACTOE && Object.keys(room.players).length >= 2) {
        return cb?.({ error: "Tic Tac Toe rooms only hold 2 players." });
      }
      if (room.gameType === GAME_TYPES.FEED_THE_KRAKEN && Object.keys(room.players).length >= KRAKEN_MAX_PLAYERS) {
        return cb?.({ error: `Feed the Kraken rooms hold at most ${KRAKEN_MAX_PLAYERS} players.` });
      }
      const taken = Object.values(room.players).some(
        (p) => p.nickname.toLowerCase() === nickname.trim().toLowerCase()
      );
      if (taken) return cb?.({ error: "Nickname already taken in this room." });

      addPlayer(room, socket.id, nickname.trim());
      socket.join(room.code);
      cb?.({ code: room.code, playerId: socket.id });
      broadcastRoom(room);
    });

    socket.on("rejoin_room", ({ code, playerId }, cb) => {
      const room = getRoom(code);
      if (!room || !room.players[playerId]) return cb?.({ error: "Cannot rejoin." });
      // Re-key the player under the new socket id, preserving role/alive state.
      const player = room.players[playerId];
      delete room.players[playerId];
      player.id = socket.id;
      player.connected = true;
      room.players[socket.id] = player;
      if (room.hostId === playerId) room.hostId = socket.id;
      if (room.gameType === GAME_TYPES.TICTACTOE && room.symbols) {
        if (room.symbols[playerId]) {
          room.symbols[socket.id] = room.symbols[playerId];
          delete room.symbols[playerId];
        }
        if (room.turn === playerId) room.turn = socket.id;
      }
      if (room.gameType === GAME_TYPES.ONE_NIGHT_WEREWOLF) {
        if (room.nightActed && room.nightActed[playerId] !== undefined) {
          room.nightActed[socket.id] = room.nightActed[playerId];
          delete room.nightActed[playerId];
        }
        if (room.nightInfo && room.nightInfo[playerId]) {
          room.nightInfo[socket.id] = room.nightInfo[playerId];
          delete room.nightInfo[playerId];
        }
        if (room.vote?.votes && room.vote.votes[playerId] !== undefined) {
          room.vote.votes[socket.id] = room.vote.votes[playerId];
          delete room.vote.votes[playerId];
        }
      }
      if (room.gameType === GAME_TYPES.FEED_THE_KRAKEN) kraken.rekeyPlayer(room, playerId, socket.id);
      clearTimeout(disconnectTimers.get(playerId));
      disconnectTimers.delete(playerId);
      socket.join(room.code);
      cb?.({ code: room.code, playerId: socket.id });
      broadcastRoom(room);
    });

    socket.on("update_role_config", ({ roleConfig }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.WEREWOLF || room.hostId !== socket.id || room.phase !== PHASES.LOBBY)
        return;
      room.roleConfig = {
        WEREWOLF: Math.max(0, Number(roleConfig.WEREWOLF) || 0),
        SEER: Math.max(0, Math.min(1, Number(roleConfig.SEER) || 0)),
        DOCTOR: Math.max(0, Math.min(1, Number(roleConfig.DOCTOR) || 0)),
        VILLAGER: Math.max(0, Number(roleConfig.VILLAGER) || 0),
      };
      broadcastRoom(room);
    });

    socket.on("update_timer_config", ({ timerConfig }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.WEREWOLF || room.hostId !== socket.id || room.phase !== PHASES.LOBBY)
        return;
      if (!timerConfig || typeof timerConfig !== "object") return;
      const next = { ...room.timerConfig };
      for (const phase of TIMER_PHASES) {
        if (timerConfig[phase] === undefined) continue;
        const seconds = Math.round(Number(timerConfig[phase]));
        if (!Number.isFinite(seconds)) continue;
        // Role Reveal has no host/player action to fall back on, so it can
        // never be set to "no limit" — the game would get stuck there.
        const min = phase === PHASES.ROLE_REVEAL ? Math.max(TIMER_MIN_SECONDS, 3) : TIMER_MIN_SECONDS;
        next[phase] = Math.max(min, Math.min(TIMER_MAX_SECONDS, seconds));
      }
      room.timerConfig = next;
      broadcastRoom(room);
    });

    socket.on("update_onw_role_config", ({ roleConfig }) => {
      const room = findRoomBySocket(socket.id);
      if (
        !room ||
        room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF ||
        room.hostId !== socket.id ||
        room.phase !== PHASES.LOBBY
      )
        return;
      if (!roleConfig || typeof roleConfig !== "object") return;
      const next = { ...room.roleConfig };
      for (const role of Object.keys(ONW_ROLES)) {
        if (roleConfig[role] === undefined) continue;
        const count = Math.round(Number(roleConfig[role]));
        if (!Number.isFinite(count)) continue;
        next[role] = Math.max(0, Math.min(10, count));
      }
      room.roleConfig = next;
      broadcastRoom(room);
    });

    socket.on("update_onw_timer_config", ({ timerConfig }) => {
      const room = findRoomBySocket(socket.id);
      if (
        !room ||
        room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF ||
        room.hostId !== socket.id ||
        room.phase !== PHASES.LOBBY
      )
        return;
      if (!timerConfig || typeof timerConfig !== "object") return;
      const next = { ...room.timerConfig };
      for (const phase of ["NIGHT_STEP", "DAY", "VOTING"]) {
        if (timerConfig[phase] === undefined) continue;
        const seconds = Math.round(Number(timerConfig[phase]));
        if (!Number.isFinite(seconds)) continue;
        // A night step can't be "no limit" or the sequence stalls forever on one AFK player.
        const min = phase === "NIGHT_STEP" ? 5 : TIMER_MIN_SECONDS;
        next[phase] = Math.max(min, Math.min(TIMER_MAX_SECONDS, seconds));
      }
      room.timerConfig = next;
      broadcastRoom(room);
    });

    socket.on("start_game", (_payload, cb) => {
      const room = findRoomBySocket(socket.id);
      if (!room) return cb?.({ error: "Room not found." });
      if (room.hostId !== socket.id) return cb?.({ error: "Only the host can start the game." });

      if (room.gameType === GAME_TYPES.TICTACTOE) {
        const { error } = ttt.startGame(room);
        if (error) return cb?.({ error });
        broadcastRoom(room);
        return cb?.({ ok: true });
      }

      if (room.gameType === GAME_TYPES.ONE_NIGHT_WEREWOLF) {
        const { error } = onw.startGame(room);
        if (error) return cb?.({ error });
        onwAfterNightAdvance(room); // schedules the timer for wherever the sequence landed
        broadcastRoom(room);
        return cb?.({ ok: true });
      }

      if (room.gameType === GAME_TYPES.FEED_THE_KRAKEN) {
        const { error } = kraken.startGame(room);
        if (error) return cb?.({ error });
        broadcastRoom(room);
        return cb?.({ ok: true });
      }

      const { error } = gl.startGame(room);
      if (error) return cb?.({ error });

      // Auto-advance from ROLE_REVEAL to NIGHT once the configured beat elapses.
      schedulePhaseTimer(room, PHASES.ROLE_REVEAL, () => {
        gl.beginNight(room);
        startNightTimer(room);
        broadcastRoom(room);
      });
      broadcastRoom(room);
      cb?.({ ok: true });
    });

    socket.on("ttt_move", ({ index }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.TICTACTOE) return;
      const { error } = ttt.makeMove(room, socket.id, index);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
    });

    socket.on("ttt_rematch", () => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.TICTACTOE || room.hostId !== socket.id) return;
      const { error } = ttt.rematch(room);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
    });

    // --- One Night Ultimate Werewolf night-sequence actions --------------

    socket.on("onw_continue", () => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF) return;
      const { error } = onw.continueStep(room, socket.id);
      if (error) return socket.emit("error_message", error);
      onwAdvanceAfterAction(room);
    });

    socket.on("onw_werewolf_peek", ({ centerIndex }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF) return;
      const { error } = onw.werewolfPeekCenter(room, socket.id, centerIndex);
      if (error) return socket.emit("error_message", error);
      onwAdvanceAfterAction(room);
    });

    socket.on("onw_seer_view_player", ({ targetId }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF) return;
      const { error } = onw.seerViewPlayer(room, socket.id, targetId);
      if (error) return socket.emit("error_message", error);
      onwAdvanceAfterAction(room);
    });

    socket.on("onw_seer_view_center", ({ indices }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF) return;
      const { error } = onw.seerViewCenter(room, socket.id, Array.isArray(indices) ? indices : []);
      if (error) return socket.emit("error_message", error);
      onwAdvanceAfterAction(room);
    });

    socket.on("onw_robber_swap", ({ targetId }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF) return;
      const { error } = onw.robberSwap(room, socket.id, targetId);
      if (error) return socket.emit("error_message", error);
      onwAdvanceAfterAction(room);
    });

    socket.on("onw_troublemaker_swap", ({ targetAId, targetBId }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF) return;
      const { error } = onw.troublemakerSwap(room, socket.id, targetAId, targetBId);
      if (error) return socket.emit("error_message", error);
      onwAdvanceAfterAction(room);
    });

    socket.on("onw_drunk_swap", ({ centerIndex }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF) return;
      const { error } = onw.drunkSwap(room, socket.id, centerIndex);
      if (error) return socket.emit("error_message", error);
      onwAdvanceAfterAction(room);
    });

    socket.on("onw_force_complete_step", () => {
      // Host-only escape hatch if someone in the current step has gone AFK.
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF || room.hostId !== socket.id || room.phase !== PHASES.NIGHT)
        return;
      const adv = onw.forceCompleteStep(room);
      if (adv.advanced) onwAfterNightAdvance(room);
      broadcastRoom(room);
    });

    socket.on("onw_start_voting", () => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF || room.hostId !== socket.id || room.phase !== PHASES.DAY)
        return;
      clearPhaseTimer(room);
      room.phase = PHASES.VOTING;
      room.log.push("The host calls for a vote.");
      onwStartVotingTimer(room);
      broadcastRoom(room);
    });

    socket.on("onw_play_again", () => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF || room.hostId !== socket.id) return;
      clearPhaseTimer(room);
      room.phase = PHASES.LOBBY;
      room.winner = null;
      room.log = [];
      room.center = [];
      room.nightOrder = [];
      room.nightStepIndex = 0;
      room.nightActed = {};
      room.nightInfo = {};
      room.vote = { votes: {}, eliminated: null, tally: {} };
      room.deadPlayerIds = [];
      room.chat = [];
      Object.values(room.players).forEach((p) => {
        p.role = null;
        p.startingRole = null;
        p.alive = true;
      });
      broadcastRoom(room);
    });

    // --- Feed the Kraken -------------------------------------------------

    function krakenRoom() {
      const room = findRoomBySocket(socket.id);
      return room && room.gameType === GAME_TYPES.FEED_THE_KRAKEN ? room : null;
    }

    socket.on("kraken_select_crew", ({ crewIds }) => {
      const room = krakenRoom();
      if (!room) return;
      const { error } = kraken.selectCrew(room, socket.id, crewIds);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
    });

    socket.on("kraken_vote", ({ approve }) => {
      const room = krakenRoom();
      if (!room) return;
      const { error } = kraken.castCrewVote(room, socket.id, approve);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
    });

    socket.on("kraken_play_card", ({ card }) => {
      const room = krakenRoom();
      if (!room) return;
      const { error } = kraken.playCard(room, socket.id, card);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
    });

    socket.on("kraken_continue", () => {
      const room = krakenRoom();
      if (!room || room.hostId !== socket.id) return;
      const { error } = kraken.continueFromResult(room);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
    });

    socket.on("kraken_force_advance", () => {
      // Host-only escape hatch if the Captain / a voter / a crew member has gone AFK.
      const room = krakenRoom();
      if (!room || room.hostId !== socket.id) return;
      const { error } = kraken.forceAdvance(room);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
    });

    socket.on("kraken_chat_message", ({ text }) => {
      const room = krakenRoom();
      if (!room || room.phase === PHASES.LOBBY) return;
      const player = room.players[socket.id];
      if (!player || !text || !text.trim()) return;
      room.chat.push({
        id: `${Date.now()}-${Math.random()}`,
        from: socket.id,
        nickname: player.nickname,
        text: text.trim().slice(0, 300),
        ts: Date.now(),
      });
      broadcastRoom(room);
    });

    socket.on("kraken_play_again", () => {
      const room = krakenRoom();
      if (!room || room.hostId !== socket.id || room.phase !== PHASES.GAME_OVER) return;
      room.phase = PHASES.LOBBY;
      room.winner = null;
      room.winReason = null;
      room.log = [];
      room.chat = [];
      room.history = [];
      room.crew = [];
      room.crewVotes = {};
      room.cards = {};
      room.playerOrder = [];
      room.round = 0;
      room.rejects = 0;
      room.score = { SAILORS: 0, PIRATES: 0, KRAKEN: 0 };
      Object.values(room.players).forEach((p) => {
        p.role = null;
      });
      broadcastRoom(room);
    });

    socket.on("wolf_chat_message", ({ text }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.WEREWOLF || room.phase !== PHASES.NIGHT) return;
      const player = room.players[socket.id];
      if (!player || player.role !== ROLES.WEREWOLF || !player.alive) return;
      if (!text || !text.trim()) return;
      room.wolfChat.push({
        id: `${Date.now()}-${Math.random()}`,
        from: socket.id,
        nickname: player.nickname,
        text: text.trim().slice(0, 300),
        ts: Date.now(),
      });
      broadcastRoom(room);
    });

    socket.on("wolf_vote", ({ targetId }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.WEREWOLF) return;
      const { error } = gl.submitWolfVote(room, socket.id, targetId);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
      tryAdvanceNight(room);
    });

    socket.on("seer_action", ({ targetId }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.WEREWOLF) return;
      const { error } = gl.submitSeerTarget(room, socket.id, targetId);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
      tryAdvanceNight(room);
    });

    socket.on("doctor_action", ({ targetId }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.WEREWOLF) return;
      const { error } = gl.submitDoctorTarget(room, socket.id, targetId);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
      tryAdvanceNight(room);
    });

    socket.on("force_resolve_night", () => {
      // Host-only escape hatch if a role's player has gone AFK.
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.WEREWOLF || room.hostId !== socket.id || room.phase !== PHASES.NIGHT)
        return;
      clearPhaseTimer(room);
      gl.resolveNight(room);
      const winner = gl.checkWinCondition(room);
      if (winner) gl.endGame(room, winner);
      else startDayTimer(room);
      broadcastRoom(room);
    });

    socket.on("start_voting", () => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.WEREWOLF || room.hostId !== socket.id || room.phase !== PHASES.DAY)
        return;
      clearPhaseTimer(room);
      gl.startVoting(room);
      startVotingTimer(room);
      broadcastRoom(room);
    });

    socket.on("day_chat_message", ({ text }) => {
      const room = findRoomBySocket(socket.id);
      if (!room) return;
      if (room.phase !== PHASES.DAY && room.phase !== PHASES.VOTING) return;
      const player = room.players[socket.id];
      if (!player || !player.alive) return;
      if (!text || !text.trim()) return;
      room.chat.push({
        id: `${Date.now()}-${Math.random()}`,
        from: socket.id,
        nickname: player.nickname,
        text: text.trim().slice(0, 300),
        ts: Date.now(),
      });
      broadcastRoom(room);
    });

    socket.on("cast_vote", ({ targetId }) => {
      const room = findRoomBySocket(socket.id);
      if (!room || (room.gameType !== GAME_TYPES.WEREWOLF && room.gameType !== GAME_TYPES.ONE_NIGHT_WEREWOLF)) return;
      const { error } = gl.castVote(room, socket.id, targetId);
      if (error) return socket.emit("error_message", error);
      broadcastRoom(room);
      if (room.gameType === GAME_TYPES.ONE_NIGHT_WEREWOLF) onwTryAdvanceVoting(room);
      else tryAdvanceVoting(room);
    });

    socket.on("play_again", () => {
      const room = findRoomBySocket(socket.id);
      if (!room || room.hostId !== socket.id || room.gameType !== GAME_TYPES.WEREWOLF) return;
      clearPhaseTimer(room);
      room.phase = PHASES.LOBBY;
      room.winner = null;
      room.log = [];
      Object.values(room.players).forEach((p) => {
        p.role = null;
        p.alive = true;
      });
      broadcastRoom(room);
    });

    socket.on("leave_room", () => handleDisconnect(socket, true));
    socket.on("disconnect", () => handleDisconnect(socket, false));

    function handleDisconnect(socket, explicit) {
      const room = findRoomBySocket(socket.id);
      if (!room) return;
      const player = room.players[socket.id];
      if (!player) return;

      if (explicit || room.phase === PHASES.LOBBY) {
        delete room.players[socket.id];
        if (room.hostId === socket.id) {
          const remaining = Object.keys(room.players);
          room.hostId = remaining[0] || null;
        }
        if (Object.keys(room.players).length === 0) {
          clearPhaseTimer(room);
          deleteRoom(room.code);
          return;
        }
        broadcastRoom(room);
        return;
      }

      // Mid-game: keep the seat warm for reconnect instead of nuking their role.
      player.connected = false;
      broadcastRoom(room);
      const timer = setTimeout(() => {
        if (room.players[socket.id] && !room.players[socket.id].connected) {
          delete room.players[socket.id];
          if (Object.keys(room.players).length === 0) {
            clearPhaseTimer(room);
            deleteRoom(room.code);
          } else broadcastRoom(room);
        }
      }, DISCONNECT_GRACE_MS);
      disconnectTimers.set(socket.id, timer);
    }
  });

  // Explicit 0.0.0.0 bind (not just the default) so the intent — reachable
  // from other devices on the LAN, not just this machine — is unambiguous.
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`> Werewolf server ready on http://localhost:${port}`);
    console.log(`> On your LAN, other devices can reach it at http://<this-machine's-LAN-IP>:${port}`);
  });
});
