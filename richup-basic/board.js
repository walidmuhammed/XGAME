const SVG_NS = "http://www.w3.org/2000/svg";
const BOARD_SIZE = 600;
const CORNER_SIZE = 110;
const EDGE_COUNT = 9;
const EDGE_SIZE = (BOARD_SIZE - CORNER_SIZE * 2) / EDGE_COUNT;
const SLOT_OFFSETS = [
  [0, 0],
  [-14, -14],
  [14, 14],
  [-14, 14],
  [14, -14],
  [0, -24],
  [-18, 18],
  [18, -18],
];

const GROUP_COLORS = {
  coral: "#f8a5c2",
  amber: "#f6b93b",
  verdant: "#78e08f",
  azure: "#60a3bc",
  sunset: "#f19066",
  crimson: "#eb4d4b",
  indigo: "#546de5",
  aurora: "#9b59b6",
};

const TYPE_COLORS = {
  start: "#f6f2d4",
  jail: "#f8c291",
  gotojail: "#f3a683",
  free: "#dfe6e9",
  tax: "#fadbd8",
  treasure: "#d1f2eb",
  surprise: "#d6eaf8",
  rail: "#d5d8dc",
  utility: "#d6dbe0",
  property: "#ffffff",
};

export const BOARD_TILES = [
  { id: 0, name: "Start", type: "start", group: null, price: 0 },
  {
    id: 1,
    name: "Coral Crossing",
    type: "property",
    group: "coral",
    price: 60,
    houseCost: 50,
    rents: [2, 10, 30, 90, 160, 250],
    mortgage: 30,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  { id: 2, name: "Community Chest", type: "treasure", group: null, price: 0 },
  {
    id: 3,
    name: "Coral Plaza",
    type: "property",
    group: "coral",
    price: 60,
    houseCost: 50,
    rents: [4, 20, 60, 180, 320, 450],
    mortgage: 30,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  { id: 4, name: "Income Tax", type: "tax", group: null, price: 0, tax: 100 },
  {
    id: 5,
    name: "Harbor Line",
    type: "rail",
    group: null,
    price: 200,
    rent: [25, 50, 100, 200],
    mortgage: 100,
    mortgaged: false,
  },
  {
    id: 6,
    name: "Amber Alley",
    type: "property",
    group: "amber",
    price: 100,
    houseCost: 50,
    rents: [6, 30, 90, 270, 400, 550],
    mortgage: 50,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  { id: 7, name: "Surprise", type: "surprise", group: null, price: 0 },
  {
    id: 8,
    name: "Amber Arcade",
    type: "property",
    group: "amber",
    price: 100,
    houseCost: 50,
    rents: [6, 30, 90, 270, 400, 550],
    mortgage: 50,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 9,
    name: "Amber Heights",
    type: "property",
    group: "amber",
    price: 120,
    houseCost: 50,
    rents: [8, 40, 100, 300, 450, 600],
    mortgage: 60,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  { id: 10, name: "Jail", type: "jail", group: null, price: 0 },
  {
    id: 11,
    name: "Verdant View",
    type: "property",
    group: "verdant",
    price: 140,
    houseCost: 100,
    rents: [10, 50, 150, 450, 650, 750],
    mortgage: 70,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 12,
    name: "Riverworks Utility",
    type: "utility",
    group: null,
    price: 150,
    rent: [4, 10],
    mortgage: 75,
    mortgaged: false,
  },
  {
    id: 13,
    name: "Verdant Grove",
    type: "property",
    group: "verdant",
    price: 140,
    houseCost: 100,
    rents: [12, 60, 180, 500, 700, 900],
    mortgage: 70,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 14,
    name: "Verdant Square",
    type: "property",
    group: "verdant",
    price: 160,
    houseCost: 100,
    rents: [14, 70, 200, 550, 750, 950],
    mortgage: 80,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 15,
    name: "Central Station",
    type: "rail",
    group: null,
    price: 200,
    rent: [25, 50, 100, 200],
    mortgage: 100,
    mortgaged: false,
  },
  {
    id: 16,
    name: "Azure Avenue",
    type: "property",
    group: "azure",
    price: 180,
    houseCost: 100,
    rents: [18, 90, 250, 700, 875, 1050],
    mortgage: 90,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  { id: 17, name: "Treasure", type: "treasure", group: null, price: 0 },
  {
    id: 18,
    name: "Azure Promenade",
    type: "property",
    group: "azure",
    price: 180,
    houseCost: 100,
    rents: [18, 90, 250, 700, 875, 1050],
    mortgage: 90,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 19,
    name: "Azure Terrace",
    type: "property",
    group: "azure",
    price: 200,
    houseCost: 100,
    rents: [20, 100, 300, 750, 925, 1100],
    mortgage: 100,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  { id: 20, name: "Free Park", type: "free", group: null, price: 0 },
  {
    id: 21,
    name: "Sunset Street",
    type: "property",
    group: "sunset",
    price: 220,
    houseCost: 150,
    rents: [22, 110, 330, 800, 975, 1150],
    mortgage: 110,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  { id: 22, name: "Surprise", type: "surprise", group: null, price: 0 },
  {
    id: 23,
    name: "Sunset Market",
    type: "property",
    group: "sunset",
    price: 220,
    houseCost: 150,
    rents: [22, 110, 330, 800, 975, 1150],
    mortgage: 110,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 24,
    name: "Sunset Plaza",
    type: "property",
    group: "sunset",
    price: 240,
    houseCost: 150,
    rents: [24, 120, 360, 850, 1025, 1200],
    mortgage: 120,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 25,
    name: "Skyline Express",
    type: "rail",
    group: null,
    price: 200,
    rent: [25, 50, 100, 200],
  },
  {
    id: 26,
    name: "Crimson Row",
    type: "property",
    group: "crimson",
    price: 260,
    houseCost: 150,
    rents: [26, 130, 390, 900, 1100, 1275],
    mortgage: 130,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 27,
    name: "Crimson Court",
    type: "property",
    group: "crimson",
    price: 260,
    houseCost: 150,
    rents: [26, 130, 390, 900, 1100, 1275],
    mortgage: 130,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 28,
    name: "Gridline Utility",
    type: "utility",
    group: null,
    price: 150,
    rent: [4, 10],
  },
  {
    id: 29,
    name: "Crimson Point",
    type: "property",
    group: "crimson",
    price: 280,
    houseCost: 150,
    rents: [28, 150, 420, 950, 1150, 1400],
    mortgage: 140,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  { id: 30, name: "Go To Jail", type: "gotojail", group: null, price: 0 },
  {
    id: 31,
    name: "Indigo Lane",
    type: "property",
    group: "indigo",
    price: 300,
    houseCost: 150,
    rents: [35, 175, 500, 1100, 1300, 1500],
    mortgage: 150,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 32,
    name: "Indigo Ridge",
    type: "property",
    group: "indigo",
    price: 300,
    houseCost: 150,
    rents: [35, 175, 500, 1100, 1300, 1500],
    mortgage: 150,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  { id: 33, name: "Treasure", type: "treasure", group: null, price: 0 },
  {
    id: 34,
    name: "Indigo Square",
    type: "property",
    group: "indigo",
    price: 320,
    houseCost: 150,
    rents: [40, 200, 550, 1200, 1400, 1600],
    mortgage: 160,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 35,
    name: "Metro Loop",
    type: "rail",
    group: null,
    price: 200,
    rent: [25, 50, 100, 200],
    mortgage: 100,
    mortgaged: false,
  },
  { id: 36, name: "Surprise", type: "surprise", group: null, price: 0 },
  {
    id: 37,
    name: "Aurora Way",
    type: "property",
    group: "aurora",
    price: 350,
    houseCost: 200,
    rents: [50, 200, 600, 1400, 1700, 2000],
    mortgage: 175,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
  {
    id: 38,
    name: "Luxury Tax",
    type: "tax",
    group: null,
    price: 0,
    tax: 120,
  },
  {
    id: 39,
    name: "Aurora Plaza",
    type: "property",
    group: "aurora",
    price: 400,
    houseCost: 200,
    rents: [75, 350, 900, 1700, 2000, 2300],
    mortgage: 200,
    mortgaged: false,
    ownerId: null,
    houses: 0,
  },
];

const boardState = {
  svg: null,
  tiles: [],
  tileCenters: [],
  tileRects: [],
  tileGroups: [],
  ownerMarkers: new Map(),
  structureGroups: new Map(),
  mortgageBadges: new Map(),
  baseRects: new Map(),
  baseFills: new Map(),
  tokens: new Map(),
  playerColors: new Map(),
  selectedTile: null,
  selectHandler: null,
  tokenLayer: null,
};

export function createBoard(svgEl, tiles = BOARD_TILES) {
  boardState.svg = svgEl;
  boardState.tiles = tiles;
  boardState.ownerMarkers.clear();
  boardState.structureGroups.clear();
  boardState.mortgageBadges.clear();
  boardState.baseRects.clear();
  boardState.baseFills.clear();
  boardState.playerColors.clear();
  boardState.tokens.clear();
  boardState.tileCenters = [];
  boardState.tileRects = [];
  boardState.tileGroups = [];
  boardState.selectedTile = null;
  boardState.selectHandler = null;

  while (svgEl.firstChild) {
    svgEl.removeChild(svgEl.firstChild);
  }

  const tileLayer = document.createElementNS(SVG_NS, "g");
  tileLayer.setAttribute("id", "tile-layer");
  svgEl.appendChild(tileLayer);

  const tokenLayer = document.createElementNS(SVG_NS, "g");
  tokenLayer.setAttribute("id", "token-layer");
  svgEl.appendChild(tokenLayer);
  boardState.tokenLayer = tokenLayer;

  tiles.forEach((tile, index) => {
    const tileRect = computeTileRect(index);
    const tileGroup = buildTileElement(tile, tileRect, index);
    tileLayer.appendChild(tileGroup);
    boardState.tileGroups[index] = tileGroup;
    boardState.tileCenters[index] = tileRect.center;
    boardState.tileRects[index] = tileRect;
  });

  return {
    getTiles: () => boardState.tiles,
    getTileCenter,
    setSelectedTile,
    updateOwnership,
    updateStructures,
    updateMortgages,
    onTileSelect,
  };
}

export function drawTokens(players) {
  ensureBoard();
  const layer = boardState.tokenLayer;
  while (layer.firstChild) {
    layer.removeChild(layer.firstChild);
  }

  boardState.tokens.clear();
  boardState.playerColors.clear();

  players.forEach((player, index) => {
    boardState.playerColors.set(player.id, player.color);
    const group = document.createElementNS(SVG_NS, "g");
    group.classList.add("token");
    group.setAttribute("data-player", player.id);
    group.style.transition = "transform 0.25s linear";

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("r", 14);
    circle.setAttribute("fill", player.color);
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "3");
    circle.setAttribute("cx", 0);
    circle.setAttribute("cy", 0);
    group.appendChild(circle);

    const label = document.createElementNS(SVG_NS, "text");
    label.textContent = (player.name || `P${index + 1}`).slice(0, 1).toUpperCase();
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("fill", "#ffffff");
    label.setAttribute("font-size", "11");
    label.style.pointerEvents = "none";
    group.appendChild(label);

    boardState.tokenLayer.appendChild(group);
    boardState.tokens.set(player.id, { group, tile: player.position ?? 0 });
  });

  relayoutTokens();
}

export function updateToken(playerId, tileIndex) {
  ensureBoard();
  const token = boardState.tokens.get(playerId);
  if (!token) return;
  token.tile = tileIndex;
  relayoutTokens();
}

export function updateOwnership(ownership = {}) {
  ensureBoard();
  boardState.tiles.forEach((tile, index) => {
    const marker = boardState.ownerMarkers.get(index);
    if (!marker) return;
    const ownerId = ownership[index] ?? ownership[String(index)];
    if (ownerId && boardState.playerColors.has(ownerId)) {
      marker.setAttribute("fill", boardState.playerColors.get(ownerId));
      marker.setAttribute("opacity", "0.9");
    } else {
      marker.setAttribute("opacity", "0");
    }
  });
}

export function updateStructures(structures = {}) {
  ensureBoard();
  boardState.tiles.forEach((tile) => {
    if (tile.type !== "property") return;
    const houses = structures[tile.id] ?? 0;
    drawStructuresForTile(tile.id, houses);
  });
}

export function updateMortgages(mortgages = {}) {
  ensureBoard();
  boardState.tiles.forEach((tile, index) => {
    if (tile.type !== "property" && tile.type !== "rail" && tile.type !== "utility") return;
    const badge = boardState.mortgageBadges.get(index);
    const baseRect = boardState.baseRects.get(index);
    const baseFill = boardState.baseFills.get(index);
    if (!badge || !baseRect) return;
    const mortgaged = Boolean(mortgages[tile.id] ?? mortgages[String(tile.id)]);
    badge.setAttribute("opacity", mortgaged ? "1" : "0");
    baseRect.setAttribute("fill", mortgaged ? "#dfe6e9" : baseFill);
  });
}

export function drawStructuresForTile(tileId, houses = 0) {
  ensureBoard();
  const entry = boardState.structureGroups.get(tileId);
  if (!entry) return;
  const { group, rect } = entry;
  while (group.firstChild) {
    group.removeChild(group.firstChild);
  }

  if (houses <= 0) return;

  if (houses >= 5) {
    const hotel = document.createElementNS(SVG_NS, "rect");
    hotel.classList.add("hotel-marker");
    const { x, y, width, height } = computeStructureContainer(rect);
    const size = Math.min(width, height);
    hotel.setAttribute("x", x + (width - size) / 2);
    hotel.setAttribute("y", y + (height - size) / 2);
    hotel.setAttribute("width", size);
    hotel.setAttribute("height", size);
    group.appendChild(hotel);
    return;
  }

  const positions = computeHousePositions(rect, houses);
  positions.forEach((pos) => {
    const marker = document.createElementNS(SVG_NS, "rect");
    marker.classList.add("house-marker");
    marker.setAttribute("x", pos.x);
    marker.setAttribute("y", pos.y);
    marker.setAttribute("width", pos.width);
    marker.setAttribute("height", pos.height);
    group.appendChild(marker);
  });
}

export function setSelectedTile(tileId) {
  ensureBoard();
  if (boardState.selectedTile !== null && boardState.tileGroups[boardState.selectedTile]) {
    boardState.tileGroups[boardState.selectedTile].classList.remove("selected");
  }
  boardState.selectedTile = tileId;
  if (tileId !== null && boardState.tileGroups[tileId]) {
    boardState.tileGroups[tileId].classList.add("selected");
  }
}

export function onTileSelect(handler) {
  boardState.selectHandler = handler;
}

export function getTileCenter(tileId) {
  ensureBoard();
  return boardState.tileCenters[tileId];
}

export function getGroupTiles(tiles, group) {
  return tiles.filter((tile) => tile.type === "property" && tile.group === group);
}

function ensureBoard() {
  if (!boardState.svg) {
    throw new Error("Board not initialized. Call createBoard first.");
  }
}

function relayoutTokens() {
  const occupancy = new Map();
  boardState.tokens.forEach((token, playerId) => {
    const tile = typeof token.tile === "number" ? token.tile : 0;
    if (!occupancy.has(tile)) {
      occupancy.set(tile, []);
    }
    occupancy.get(tile).push(playerId);
  });

  occupancy.forEach((playerIds, tileId) => {
    const center = boardState.tileCenters[tileId];
    if (!center) return;
    playerIds.forEach((pid, idx) => {
      const token = boardState.tokens.get(pid);
      if (!token) return;
      const offset = SLOT_OFFSETS[Math.min(idx, SLOT_OFFSETS.length - 1)];
      const x = center.x + offset[0];
      const y = center.y + offset[1];
      token.group.setAttribute("transform", `translate(${x}, ${y})`);
    });
  });
}

function computeTileRect(index) {
  let x = 0;
  let y = 0;
  let width = CORNER_SIZE;
  let height = CORNER_SIZE;
  let orientation = "corner";

  if (index === 0) {
    x = BOARD_SIZE - CORNER_SIZE;
    y = BOARD_SIZE - CORNER_SIZE;
    orientation = "corner-bottom";
  } else if (index > 0 && index < 10) {
    const offset = index;
    width = EDGE_SIZE;
    height = CORNER_SIZE;
    x = BOARD_SIZE - CORNER_SIZE - EDGE_SIZE * offset;
    y = BOARD_SIZE - CORNER_SIZE;
    orientation = "bottom";
  } else if (index === 10) {
    x = 0;
    y = BOARD_SIZE - CORNER_SIZE;
    orientation = "corner-left";
  } else if (index > 10 && index < 20) {
    const offset = index - 10;
    width = CORNER_SIZE;
    height = EDGE_SIZE;
    x = 0;
    y = BOARD_SIZE - CORNER_SIZE - EDGE_SIZE * offset;
    orientation = "left";
  } else if (index === 20) {
    x = 0;
    y = 0;
    orientation = "corner-top";
  } else if (index > 20 && index < 30) {
    const offset = index - 20;
    width = EDGE_SIZE;
    height = CORNER_SIZE;
    x = CORNER_SIZE + EDGE_SIZE * (offset - 1);
    y = 0;
    orientation = "top";
  } else if (index === 30) {
    x = BOARD_SIZE - CORNER_SIZE;
    y = 0;
    orientation = "corner-right";
  } else {
    const offset = index - 30;
    width = CORNER_SIZE;
    height = EDGE_SIZE;
    x = BOARD_SIZE - CORNER_SIZE;
    y = CORNER_SIZE + EDGE_SIZE * (offset - 1);
    orientation = "right";
  }

  return {
    x,
    y,
    width,
    height,
    orientation,
    center: { x: x + width / 2, y: y + height / 2 },
  };
}

function buildTileElement(tile, rect, index) {
  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("tile", `tile-${tile.type}`);
  group.setAttribute("data-tile", index);
  group.setAttribute("tabindex", "0");

  const base = document.createElementNS(SVG_NS, "rect");
  base.setAttribute("x", rect.x);
  base.setAttribute("y", rect.y);
  base.setAttribute("width", rect.width);
  base.setAttribute("height", rect.height);
  base.setAttribute("fill", TYPE_COLORS[tile.type] || TYPE_COLORS.property);
  base.setAttribute("stroke", "#2c3e50");
  base.setAttribute("stroke-width", "1.5");
  group.appendChild(base);
  boardState.baseRects.set(index, base);
  boardState.baseFills.set(index, TYPE_COLORS[tile.type] || TYPE_COLORS.property);

  if (tile.type === "property" && tile.group) {
    const band = document.createElementNS(SVG_NS, "rect");
    const bandColor = GROUP_COLORS[tile.group] || "#ccc";
    const bandThickness = 20;
    if (rect.orientation === "bottom" || rect.orientation === "corner-bottom") {
      band.setAttribute("x", rect.x);
      band.setAttribute("y", rect.y);
      band.setAttribute("width", rect.width);
      band.setAttribute("height", bandThickness);
    } else if (rect.orientation === "top" || rect.orientation === "corner-top") {
      band.setAttribute("x", rect.x);
      band.setAttribute("y", rect.y + rect.height - bandThickness);
      band.setAttribute("width", rect.width);
      band.setAttribute("height", bandThickness);
    } else if (rect.orientation === "left" || rect.orientation === "corner-left") {
      band.setAttribute("x", rect.x + rect.width - bandThickness);
      band.setAttribute("y", rect.y);
      band.setAttribute("width", bandThickness);
      band.setAttribute("height", rect.height);
    } else {
      band.setAttribute("x", rect.x);
      band.setAttribute("y", rect.y);
      band.setAttribute("width", bandThickness);
      band.setAttribute("height", rect.height);
    }
    band.setAttribute("fill", bandColor);
    group.appendChild(band);
  }

  const structures = document.createElementNS(SVG_NS, "g");
  structures.classList.add("tile-structures");
  group.appendChild(structures);
  boardState.structureGroups.set(index, { group: structures, rect });

  const mortgageBadge = createMortgageBadge(rect);
  group.appendChild(mortgageBadge);
  boardState.mortgageBadges.set(index, mortgageBadge);

  const label = document.createElementNS(SVG_NS, "text");
  label.classList.add("tile-label");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.setAttribute("fill", "#2c3e50");
  label.setAttribute("font-size", tile.type === "property" ? "10" : "12");

  let textX = rect.x + rect.width / 2;
  let textY = rect.y + rect.height / 2;
  if (rect.orientation === "left") {
    label.setAttribute("transform", `rotate(90 ${textX} ${textY})`);
  } else if (rect.orientation === "right") {
    label.setAttribute("transform", `rotate(-90 ${textX} ${textY})`);
  }

  const lines = wrapLabel(tile.name);
  lines.forEach((line, lineIndex) => {
    const tspan = document.createElementNS(SVG_NS, "tspan");
    tspan.setAttribute("x", textX);
    tspan.setAttribute("dy", lineIndex === 0 ? "0" : "1.1em");
    tspan.textContent = line;
    label.appendChild(tspan);
  });
  label.setAttribute("x", textX);
  label.setAttribute("y", textY);
  group.appendChild(label);

  if (tile.price && tile.price > 0) {
    const price = document.createElementNS(SVG_NS, "text");
    price.classList.add("tile-price");
    price.setAttribute("text-anchor", "middle");
    price.setAttribute("fill", "#34495e");
    price.setAttribute("font-size", "9");

    if (rect.orientation === "bottom") {
      price.setAttribute("x", rect.x + rect.width / 2);
      price.setAttribute("y", rect.y + rect.height - 8);
    } else if (rect.orientation === "top") {
      price.setAttribute("x", rect.x + rect.width / 2);
      price.setAttribute("y", rect.y + 12);
    } else if (rect.orientation === "left") {
      price.setAttribute("transform", `rotate(90 ${rect.x + rect.width - 10} ${rect.y + rect.height / 2})`);
      price.setAttribute("x", rect.x + rect.width - 10);
      price.setAttribute("y", rect.y + rect.height / 2 + 18);
    } else if (rect.orientation === "right") {
      price.setAttribute("transform", `rotate(-90 ${rect.x + 10} ${rect.y + rect.height / 2})`);
      price.setAttribute("x", rect.x + 10);
      price.setAttribute("y", rect.y + rect.height / 2 + 18);
    } else {
      price.setAttribute("x", rect.x + rect.width / 2);
      price.setAttribute("y", rect.y + rect.height - 12);
    }
    price.textContent = `$${tile.price}`;
    group.appendChild(price);
  }

  if (tile.type === "property" || tile.type === "rail" || tile.type === "utility") {
    const marker = createOwnerMarker(rect);
    boardState.ownerMarkers.set(index, marker);
    group.appendChild(marker);
  }

  group.addEventListener("click", () => handleTileSelect(index));
  group.addEventListener("focus", () => setSelectedTile(index));
  group.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTileSelect(index);
    }
  });

  return group;
}

function wrapLabel(text) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 12 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function createOwnerMarker(rect) {
  const marker = document.createElementNS(SVG_NS, "circle");
  const position = ownerMarkerPosition(rect);
  marker.setAttribute("cx", position.x);
  marker.setAttribute("cy", position.y);
  marker.setAttribute("r", 9);
  marker.setAttribute("fill", "#000000");
  marker.setAttribute("stroke", "#ffffff");
  marker.setAttribute("stroke-width", "2");
  marker.setAttribute("opacity", "0");
  marker.classList.add("tile-owner-marker");
  return marker;
}

function createMortgageBadge(rect) {
  const badge = document.createElementNS(SVG_NS, "g");
  badge.classList.add("tile-mortgage-badge");
  badge.style.pointerEvents = "none";
  const size = 18;
  const badgeX = rect.x + rect.width - size - 6;
  const badgeY = rect.y + 6;

  const shape = document.createElementNS(SVG_NS, "rect");
  shape.setAttribute("x", badgeX);
  shape.setAttribute("y", badgeY);
  shape.setAttribute("width", size);
  shape.setAttribute("height", size);
  shape.setAttribute("rx", 4);
  shape.setAttribute("ry", 4);
  shape.setAttribute("fill", "#8e44ad");
  shape.setAttribute("stroke", "#ffffff");
  shape.setAttribute("stroke-width", "1.2");
  badge.appendChild(shape);

  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("x", badgeX + size / 2);
  text.setAttribute("y", badgeY + size / 2 + 0.5);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("fill", "#ffffff");
  text.setAttribute("font-size", "11");
  text.textContent = "M";
  badge.appendChild(text);

  badge.setAttribute("opacity", "0");
  return badge;
}

function ownerMarkerPosition(rect) {
  const margin = 20;
  if (rect.orientation === "bottom") {
    return { x: rect.x + rect.width / 2, y: rect.y + margin };
  }
  if (rect.orientation === "top") {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height - margin };
  }
  if (rect.orientation === "left") {
    return { x: rect.x + rect.width - margin, y: rect.y + rect.height / 2 };
  }
  if (rect.orientation === "right") {
    return { x: rect.x + margin, y: rect.y + rect.height / 2 };
  }
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function computeStructureContainer(rect) {
  const padding = 26;
  if (rect.orientation === "bottom") {
    return {
      x: rect.x + 12,
      y: rect.y + padding,
      width: rect.width - 24,
      height: rect.height - padding - 12,
    };
  }
  if (rect.orientation === "top") {
    return {
      x: rect.x + 12,
      y: rect.y + 12,
      width: rect.width - 24,
      height: rect.height - padding - 12,
    };
  }
  if (rect.orientation === "left") {
    return {
      x: rect.x + padding,
      y: rect.y + 12,
      width: rect.width - padding - 12,
      height: rect.height - 24,
    };
  }
  if (rect.orientation === "right") {
    return {
      x: rect.x + 12,
      y: rect.y + 12,
      width: rect.width - padding - 12,
      height: rect.height - 24,
    };
  }
  return {
    x: rect.x + 16,
    y: rect.y + 16,
    width: rect.width - 32,
    height: rect.height - 32,
  };
}

function computeHousePositions(rect, count) {
  const container = computeStructureContainer(rect);
  const positions = [];
  const slotCount = 4;
  const horizontal = rect.orientation === "bottom" || rect.orientation === "top" || rect.orientation.includes("corner");

  if (horizontal) {
    const markerWidth = Math.min(24, container.width / slotCount - 6);
    const markerHeight = 14;
    const gap = (container.width - markerWidth * slotCount) / (slotCount - 1 || 1);
    for (let i = 0; i < count; i += 1) {
      positions.push({
        x: container.x + i * (markerWidth + gap),
        y: rect.orientation === "bottom" ? container.y + container.height - markerHeight - 4 : container.y + 4,
        width: markerWidth,
        height: markerHeight,
      });
    }
  } else {
    const markerHeight = Math.min(24, container.height / slotCount - 6);
    const markerWidth = 14;
    const gap = (container.height - markerHeight * slotCount) / (slotCount - 1 || 1);
    for (let i = 0; i < count; i += 1) {
      positions.push({
        x: rect.orientation === "left" ? container.x + container.width - markerWidth - 4 : container.x + 4,
        y: container.y + i * (markerHeight + gap),
        width: markerWidth,
        height: markerHeight,
      });
    }
  }

  return positions;
}

function handleTileSelect(index) {
  setSelectedTile(index);
  if (boardState.selectHandler) {
    boardState.selectHandler(boardState.tiles[index], index);
  }
}
