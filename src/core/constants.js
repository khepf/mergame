export const TILE = 32;

// Tile types
export const T = {
  GRASS: 0,
  PATH: 1,
  WATER: 2,
  SAND: 3,
  WALL: 4,
  FLOOR: 5,
  DOOR: 6,
  STONE: 7, // cobblestone plaza
  LOT: 8, // empty building lot
  CAVE_FLOOR: 9,
  CAVE_WALL: 10,
};

export const SOLID_TILES = new Set([T.WALL, T.CAVE_WALL]);
export const SWIMMABLE_TILES = new Set([T.WATER]);

// Extra tiles you can't ride a bike onto (no biking indoors, into the pond, or into the cave).
export const NO_RIDE_TILES = new Set([T.WATER, T.FLOOR, T.DOOR, T.CAVE_FLOOR]);
