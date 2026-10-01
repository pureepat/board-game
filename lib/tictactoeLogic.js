const { PHASES } = require("./types");

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkResult(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { symbol: board[a], line };
    }
  }
  if (board.every(Boolean)) return { symbol: "DRAW", line: null };
  return null;
}

function startGame(room) {
  const ids = Object.keys(room.players);
  if (ids.length !== 2) return { error: "Tic Tac Toe needs exactly 2 players." };

  const [firstId, secondId] = Math.random() < 0.5 ? ids : [ids[1], ids[0]];
  room.symbols = { [firstId]: "X", [secondId]: "O" };
  room.board = Array(9).fill(null);
  room.turn = firstId;
  room.winningLine = null;
  room.winner = null;
  room.phase = PHASES.PLAYING;
  room.log = [
    `${room.players[firstId].nickname} is X, ${room.players[secondId].nickname} is O. ${room.players[firstId].nickname} moves first.`,
  ];
  return { room };
}

function makeMove(room, playerId, index) {
  if (room.phase !== PHASES.PLAYING) return { error: "Game is not in progress." };
  if (room.turn !== playerId) return { error: "It's not your turn." };
  const symbol = room.symbols[playerId];
  if (!symbol) return { error: "You are not a player in this game." };
  if (typeof index !== "number" || index < 0 || index > 8 || room.board[index]) {
    return { error: "Invalid move." };
  }

  room.board[index] = symbol;
  const result = checkResult(room.board);

  if (result) {
    room.phase = PHASES.GAME_OVER;
    room.winner = result.symbol;
    room.winningLine = result.line;
    room.log.push(
      result.symbol === "DRAW" ? "It's a draw!" : `${room.players[playerId].nickname} (${symbol}) wins!`
    );
  } else {
    const otherId = Object.keys(room.symbols).find((id) => id !== playerId);
    room.turn = otherId;
  }
  return { room };
}

function rematch(room) {
  const ids = Object.keys(room.symbols);
  if (ids.length !== 2) return { error: "Missing players for a rematch." };
  const [prevFirst, prevSecond] = ids;
  // Swap who starts so the same player doesn't always go first.
  room.symbols = { [prevFirst]: "O", [prevSecond]: "X" };
  room.board = Array(9).fill(null);
  room.turn = prevSecond;
  room.winningLine = null;
  room.winner = null;
  room.phase = PHASES.PLAYING;
  room.log = [`${room.players[prevSecond].nickname} is X and moves first this round.`];
  return { room };
}

module.exports = { startGame, makeMove, rematch, checkResult };
