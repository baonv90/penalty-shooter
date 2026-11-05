import { StadiumId } from "../../constants/stadiums";

/** All views share the same tiers, canopy height and footprint. */
export function getStadiumLayout(id: StadiumId) {
  if (id === "san-siro") return {
    levels: 3, rowsPerLevel: 5, rowDepth: 4, rowRise: 1.1, floorRise: 8,
    roofHeight: 26, roofOuterX: 44, roofOuterZ: 50, roofInnerX: 22, roofInnerZ: 29,
  };
  if (id === "stamford-bridge") return {
    levels: 2, rowsPerLevel: 8, rowDepth: 2, rowRise: 0.9, floorRise: 10,
    roofHeight: 24, roofOuterX: 42, roofOuterZ: 48, roofInnerX: 22, roofInnerZ: 29,
  };
  return {
    levels: 1, rowsPerLevel: 6, rowDepth: 2.2, rowRise: 1.2, floorRise: 8,
    roofHeight: 10.5, roofOuterX: 37, roofOuterZ: 44, roofInnerX: 23, roofInnerZ: 32,
  };
}

export function getStadiumRows(id: StadiumId) {
  const layout = getStadiumLayout(id);
  return Array.from({ length: layout.levels * layout.rowsPerLevel }, (_, index) => {
    const level = Math.floor(index / layout.rowsPerLevel);
    const row = index % layout.rowsPerLevel;
    return {
      level, row,
      base: level * layout.floorRise,
      height: level * layout.floorRise + 1.6 + row * layout.rowRise,
      offset: (id !== "arena" ? 0 : level * (layout.rowsPerLevel * layout.rowDepth + 1)) + row * layout.rowDepth,
      depth: layout.rowDepth,
    };
  });
}
