"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Anchor, Skull, Waves } from "lucide-react";
import type { KrakenGameState, KrakenHexKind } from "@/types/game";
import { KR_ACTION_ICON, KR_HEX } from "@/components/kraken/krakenMeta";
import { useTranslation } from "@/lib/i18n/useTranslation";

// The server's map is a set of flat-top hexes in columns, traced from the
// printed board: col runs west(-)/east(+), row counts half-hex steps north
// from the start at (0,0), so neighboring columns sit half a hex apart.
//
// Tiles and the ship are pixel-art sprites rendered in Blender
// (assets-src/kraken/kraken_pixel.blend) with a fixed isometric camera, so
// one SVG unit = one sprite pixel and the spacing below must match the render.
const SPRITE = "/assets/kraken";
const SPRITE_SIZE = 64;
const DX = 42; // column spacing in sprite px
const DY = 14; // one half-hex row step in sprite px
const TILE_ANCHOR: [number, number] = [32, 36]; // center of the hex's top face
const SHIP_ANCHOR: [number, number] = [32, 44]; // hull at the waterline
const TILE_BELOW = SPRITE_SIZE - TILE_ANCHOR[1]; // side depth under the anchor
const PAD = 16;
const HEADER = 30; // room above the goal hexes for their labels
const FOOTER = 30; // room under the start hex for the round counter
const SEA_SHADES = 4; // tile_sea_0 (light, south) .. tile_sea_3 (deep, north)

type ShipDir = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
const DIRS: ShipDir[] = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];

// Screen-space movement -> nearest of the 8 rendered headings.
function headingOf(dx: number, dy: number): ShipDir {
  const deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
  return DIRS[((Math.round(deg / 45) % 8) + 8) % 8];
}

const GOAL_SPRITE: Partial<Record<KrakenHexKind, string>> = {
  START: "tile_start",
  KRAKEN: "tile_kraken",
  PIRATES: "tile_pirate",
  SAILORS: "tile_sailor",
};

const pixelated = { imageRendering: "pixelated" as const };

export function KrakenBoard({ room }: { room: KrakenGameState }) {
  const { t } = useTranslation();
  const { map, ship } = room;

  const geo = useMemo(() => {
    const cols = map.hexes.map((h) => h.col);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);
    const topRow = Math.max(...map.hexes.map((h) => h.row));
    const width = (maxCol - minCol) * DX + SPRITE_SIZE + PAD * 2;
    const height = PAD + HEADER + TILE_ANCHOR[1] + topRow * DY + TILE_BELOW + FOOTER + PAD;
    const pos = (col: number, row: number): [number, number] => [
      PAD + TILE_ANCHOR[0] + (col - minCol) * DX,
      PAD + HEADER + TILE_ANCHOR[1] + (topRow - row) * DY,
    ];
    // Back rows first so each hex's top face covers the side of the one behind it.
    const tiles = [...map.hexes].sort((a, b) => b.row - a.row || a.col - b.col);
    const centroid = (kind: KrakenHexKind): [number, number] => {
      const own = map.hexes.filter((h) => h.kind === kind).map((h) => pos(h.col, h.row));
      return [own.reduce((s, p) => s + p[0], 0) / own.length, Math.min(...own.map((p) => p[1]))];
    };
    return { topRow, width, height, pos, tiles, pirates: centroid("PIRATES"), sailors: centroid("SAILORS"), kraken: centroid("KRAKEN") };
  }, [map.hexes]);

  const { width, height, pos, tiles, topRow } = geo;
  const [shipX, shipY] = pos(ship.col, ship.row);
  const [startX, startY] = pos(0, 0);
  const supplyY = map.supplyRow !== null ? pos(0, map.supplyRow)[1] + DY : null;

  const spriteFor = (col: number, row: number, kind: KrakenHexKind) => {
    if (GOAL_SPRITE[kind]) return GOAL_SPRITE[kind]!;
    if (map.island && map.island.col === col && map.island.row === row) return "tile_island";
    const shade = Math.min(SEA_SHADES - 1, Math.floor((row / topRow) * SEA_SHADES));
    // Stable pick between the two patterns so the sea doesn't look tiled.
    return (((col * 5 + row * 3) % 4) + 4) % 4 < 2 ? `tile_sea_${shade}` : `tile_sea_${shade}b`;
  };

  // Face the ship along its last move; it starts facing north toward open sea.
  const [heading, setHeading] = useState<ShipDir>("N");
  const lastPos = useRef<[number, number]>([shipX, shipY]);
  useEffect(() => {
    const [px, py] = lastPos.current;
    if (px !== shipX || py !== shipY) setHeading(headingOf(shipX - px, shipY - py));
    lastPos.current = [shipX, shipY];
  }, [shipX, shipY]);

  const goalLabel = (at: [number, number], Icon: typeof Skull, label: string, color: string) => (
    <g transform={`translate(${at[0]}, ${at[1] - TILE_ANCHOR[1] - 8})`}>
      <rect x="-39" y="-10" width="78" height="16" rx="4" fill={color} stroke="#2b1d12" strokeWidth="1.5" />
      <Icon x={-35} y={-7} width={10} height={10} color="#fff" />
      <text x="5" y="1.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff" letterSpacing="0.5">
        {label}
      </text>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none" role="img" aria-label="Feed the Kraken board">
      {/* Frame + open water behind the hexes */}
      <rect x="0" y="0" width={width} height={height} rx="16" fill="#2b1d12" />
      <rect x="6" y="6" width={width - 12} height={height - 12} rx="12" fill="#c9a86a" />
      <rect x="11" y="11" width={width - 22} height={height - 22} rx="10" fill="#0c2236" />

      {/* Hex tiles, back to front */}
      {tiles.map(({ col, row, kind }) => {
        const [x, y] = pos(col, row);
        return (
          <image
            key={`${col},${row}`}
            href={`${SPRITE}/${spriteFor(col, row, kind)}.png`}
            x={x - TILE_ANCHOR[0]}
            y={y - TILE_ANCHOR[1]}
            width={SPRITE_SIZE}
            height={SPRITE_SIZE}
            style={pixelated}
          />
        );
      })}

      {/* Map action markers sit on top of the tiles so a front row never hides them */}
      {map.actions.map((action) => {
        const [x, cy] = pos(action.col, action.row);
        // On the island hex, sit the marker on the beach so the island stays visible.
        const onIsland = map.island?.col === action.col && map.island?.row === action.row;
        const y = onIsland ? cy + 8 : cy;
        const Icon = KR_ACTION_ICON[action.type];
        return (
          <g key={`action-${action.col},${action.row}`} opacity={action.used ? 0.4 : 1}>
            <ellipse cx={x} cy={y} rx="11" ry="8" fill="#f3e7c9" stroke="#2b1d12" strokeWidth="1.5" />
            <Icon x={x - 6} y={y - 6} width={12} height={12} color={action.type === "FEED_THE_KRAKEN" ? "#8a5a00" : "#2b1d12"} />
          </g>
        );
      })}

      {/* Supply line (Long Journey only) */}
      {supplyY !== null && (
        <g opacity={room.supplied ? 0.35 : 1}>
          <line x1={PAD} x2={width - PAD} y1={supplyY} y2={supplyY} stroke="#f3e7c9" strokeWidth="1.5" strokeDasharray="6 5" />
          <text x={PAD + 4} y={supplyY - 4} fontSize="8" fontWeight="700" fill="#f3e7c9" letterSpacing="1">
            {t("kraken.board.supplyLine")}
          </text>
        </g>
      )}

      {/* Goal labels: Crimson Cove (north-west), the Kraken (north), Bluewater Bay (north-east) */}
      {goalLabel(geo.pirates, Skull, t("kraken.board.pirateVictory"), KR_HEX.RED)}
      {goalLabel(geo.kraken, Waves, t("kraken.board.kraken"), KR_HEX.YELLOW)}
      {goalLabel(geo.sailors, Anchor, t("kraken.board.sailorVictory"), KR_HEX.BLUE)}

      {/* Start label + round counter */}
      <text x={startX} y={startY + TILE_BELOW + 6} textAnchor="middle" fontSize="8" fontWeight="700" fill="#f3e7c9" letterSpacing="1">
        {t("kraken.board.harbor")}
      </text>
      <g transform={`translate(${width / 2}, ${height - 22})`}>
        <rect x="-44" y="-10" width="88" height="19" rx="4" fill="#2b1d12" stroke="#c9a86a" strokeWidth="1.5" />
        <text textAnchor="middle" y="3.5" fontSize="10" fontWeight="700" fill="#f3e7c9" letterSpacing="1">
          {t("kraken.board.round", { round: room.round })}
        </text>
      </g>

      {/* The ship — CSS transition animates it hex-to-hex */}
      <g style={{ transform: `translate(${shipX}px, ${shipY}px)`, transition: "transform 900ms cubic-bezier(.4,0,.2,1)" }}>
        <g className="animate-bob">
          <image
            href={`${SPRITE}/ship_${heading}.png`}
            x={-SHIP_ANCHOR[0]}
            y={-SHIP_ANCHOR[1]}
            width={SPRITE_SIZE}
            height={SPRITE_SIZE}
            style={pixelated}
          />
        </g>
      </g>
    </svg>
  );
}
