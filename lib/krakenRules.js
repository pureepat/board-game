// Feed the Kraken rule data. Kept as plain tables so the numbers can be
// retuned without touching the state machine in lib/krakenLogic.js.
//
// Sources: the published rulebook summaries (officialgamerules.org, rulespal.com).
// The round structure, guns, mutiny thresholds, off-duty counts, deck
// colors and card effects follow those. KRAKEN_MAPS is traced from photos
// of the printed board: the ship starts at the south, red pushes it
// north-west toward Crimson Cove, blue north-east toward Bluewater Bay,
// yellow north toward the Kraken.

const KR_ROLES = {
  SAILOR: "SAILOR",
  PIRATE: "PIRATE",
  CULT_LEADER: "CULT_LEADER",
  CULTIST: "CULTIST", // only ever created by a Conversion ritual (or dealt at 11 players)
};

// Which team a role wins with.
const KR_TEAM = { SAILOR: "SAILORS", PIRATE: "PIRATES", CULT_LEADER: "CULT", CULTIST: "CULT" };

// players -> [sailors, pirates, cult leader, cultists]. 5 players is a coin
// flip between 3/1 and 2/2 (the box removes one random faction chip unseen).
const KR_DISTRIBUTION = {
  5: null,
  6: [3, 2, 1, 0],
  7: [4, 2, 1, 0],
  8: [4, 3, 1, 0],
  9: [5, 3, 1, 0],
  10: [5, 4, 1, 0],
  11: [5, 4, 1, 1],
};

const KR_START_GUNS = 3;

// Mutiny succeeds when the revealed guns reach this many.
function mutinyThreshold(players) {
  if (players <= 7) return 3;
  if (players <= 9) return 4;
  return 5;
}

// How many officers go off-duty after each navigation, assigned in this
// order: navigator, then lieutenant, then captain.
function offDutyCount(players) {
  if (players <= 6) return 1;
  if (players <= 8) return 2;
  return 3;
}

// Direction each color pushes the ship, as printed on every hex: red
// north-west, yellow north, blue north-east. Rows count half-hex steps.
const KR_COLOR_MOVE = { RED: [-1, 1], BLUE: [1, 1], YELLOW: [0, 2] };

// Full Long Journey deck: 11 red, 6 blue, 6 yellow (23 cards).
const KR_DECK_LONG = [
  ...Array(5).fill({ color: "RED", effect: "DRUNK" }),
  ...Array(2).fill({ color: "RED", effect: "MERMAID" }),
  ...Array(2).fill({ color: "RED", effect: "TELESCOPE" }),
  ...Array(2).fill({ color: "RED", effect: "ARMED" }),
  ...Array(4).fill({ color: "BLUE", effect: "DRUNK" }),
  ...Array(2).fill({ color: "BLUE", effect: "DISARMED" }),
  ...Array(6).fill({ color: "YELLOW", effect: "CULT_UPRISING" }),
];

// Quick Journey removes 1 Cult Uprising, 1 blue Drunk and both Armed (19 cards).
const KR_DECK_QUICK = [
  ...Array(5).fill({ color: "RED", effect: "DRUNK" }),
  ...Array(2).fill({ color: "RED", effect: "MERMAID" }),
  ...Array(2).fill({ color: "RED", effect: "TELESCOPE" }),
  ...Array(3).fill({ color: "BLUE", effect: "DRUNK" }),
  ...Array(2).fill({ color: "BLUE", effect: "DISARMED" }),
  ...Array(5).fill({ color: "YELLOW", effect: "CULT_UPRISING" }),
];

const KR_RITUALS = ["GUN_STASH", "CULT_SEARCH", "CONVERSION"];

// Build a map from its column extents. Columns hold flat-top hexes; a hex's
// row counts half-hex steps, so col + row is always even. Each column's top
// sea hex is followed by one goal hex: the Kraken in the middle column,
// Crimson Cove (pirates) to the west, Bluewater Bay (sailors) to the east.
function buildMap({ id, columns, island, supplyRow, deck, actions }) {
  const hexes = [];
  for (const [absCol, [from, to]] of Object.entries(columns)) {
    for (const col of Number(absCol) === 0 ? [0] : [-absCol, Number(absCol)]) {
      for (let row = from; row <= to; row += 2) hexes.push({ col, row, kind: row === 0 && col === 0 ? "START" : "SEA" });
      hexes.push({ col, row: to + 2, kind: col === 0 ? "KRAKEN" : col < 0 ? "PIRATES" : "SAILORS" });
    }
  }
  return { id, hexes, island, supplyRow, deck, actions };
}

// Both layouts are traced from the two sides of the printed board: 5-7
// players sail the smaller one, 8+ the larger. Ship starts at (0,0).
// Each map action space fires once, the first time the ship enters it.
const KRAKEN_MAPS = {
  QUICK: buildMap({
    id: "QUICK",
    columns: { 0: [0, 8], 1: [1, 7], 2: [2, 6], 3: [5, 5] },
    island: { col: 0, row: 4 },
    supplyRow: null,
    deck: KR_DECK_QUICK,
    actions: [
      { col: -2, row: 4, type: "CABIN_SEARCH" },
      { col: -1, row: 3, type: "CABIN_SEARCH" },
      { col: 1, row: 3, type: "CABIN_SEARCH" },
      { col: -1, row: 7, type: "FEED_THE_KRAKEN" },
      { col: 1, row: 7, type: "FEED_THE_KRAKEN" },
    ],
  }),
  LONG: buildMap({
    id: "LONG",
    columns: { 0: [0, 10], 1: [1, 9], 2: [2, 8], 3: [7, 7] },
    island: { col: 0, row: 6 },
    supplyRow: 6, // reaching this row refills everyone's guns to 3, once
    deck: KR_DECK_LONG,
    actions: [
      { col: -2, row: 4, type: "CABIN_SEARCH" },
      { col: -1, row: 3, type: "CABIN_SEARCH" },
      { col: 0, row: 4, type: "CABIN_SEARCH" },
      { col: 1, row: 3, type: "CABIN_SEARCH" },
      { col: 0, row: 6, type: "OFF_WITH_TONGUE" },
      { col: -1, row: 7, type: "FLOGGING" },
      { col: 1, row: 7, type: "FLOGGING" },
      { col: -1, row: 9, type: "FEED_THE_KRAKEN" },
      { col: 1, row: 9, type: "FEED_THE_KRAKEN" },
      { col: 0, row: 10, type: "FEED_THE_KRAKEN" },
    ],
  }),
};

function mapFor(players) {
  return players <= 7 ? KRAKEN_MAPS.QUICK : KRAKEN_MAPS.LONG;
}

function hexAt(map, col, row) {
  return map.hexes.find((h) => h.col === col && h.row === row) ?? null;
}

// Where a card of this color takes the ship. On the printed board, a hex
// whose diagonal would leave the map has that color's arrow on its top edge
// instead, so the ship sails straight north.
function nextShipPos(map, ship, color) {
  const [dc, dr] = KR_COLOR_MOVE[color];
  if (hexAt(map, ship.col + dc, ship.row + dr)) return { col: ship.col + dc, row: ship.row + dr };
  return { col: ship.col, row: ship.row + 2 };
}

module.exports = {
  KR_ROLES,
  KR_TEAM,
  KR_DISTRIBUTION,
  KR_START_GUNS,
  KR_COLOR_MOVE,
  KR_RITUALS,
  KRAKEN_MAPS,
  mutinyThreshold,
  offDutyCount,
  mapFor,
  hexAt,
  nextShipPos,
};
