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
  [0, -22],
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
  { id: 0, name: "Start", type: "start", group: null, price: 0, baseRent: 0, rent: [], tax: 0 },
  { id: 1, name: "Coral Crossing", type: "property", group: "coral", price: 60, baseRent: 6, rent: [6], tax: 0 },
  { id: 2, name: "Community Chest", type: "treasure", group: null, price: 0, baseRent: 0, rent: [], tax: 0 },
  { id: 3, name: "Coral Plaza", type: "property", group: "coral", price: 60, baseRent: 8, rent: [8], tax: 0 },
  { id: 4, name: "Income Tax", type: "tax", group: null, price: 0, baseRent: 0, rent: [], tax: 100 },
  { id: 5, name: "Harbor Line", type: "rail", group: null, price: 200, baseRent: 25, rent: [25, 50, 100, 200], tax: 0 },
  { id: 6, name: "Amber Alley", type: "property", group: "amber", price: 100, baseRent: 10, rent: [10], tax: 0 },
  { id: 7, name: "Surprise", type: "surprise", group: null, price: 0, baseRent: 0, rent: [], tax: 0 },
  { id: 8, name: "Amber Arcade", type: "property", group: "amber", price: 100, baseRent: 12, rent: [12], tax: 0 },
  { id: 9, name: "Amber Heights", type: "property", group: "amber", price: 120, baseRent: 14, rent: [14], tax: 0 },
  { id: 10, name: "Jail", type: "jail", group: null, price: 0, baseRent: 0, rent: [], tax: 0 },
  { id: 11, name: "Verdant View", type: "property", group: "verdant", price: 140, baseRent: 16, rent: [16], tax: 0 },
  { id: 12, name: "Riverworks Utility", type: "utility", group: null, price: 150, baseRent: 4, rent: [4, 10], tax: 0 },
  { id: 13, name: "Verdant Grove", type: "property", group: "verdant", price: 140, baseRent: 18, rent: [18], tax: 0 },
  { id: 14, name: "Verdant Square", type: "property", group: "verdant", price: 160, baseRent: 20, rent: [20], tax: 0 },
  { id: 15, name: "Central Station", type: "rail", group: null, price: 200, baseRent: 25, rent: [25, 50, 100, 200], tax: 0 },
  { id: 16, name: "Azure Avenue", type: "property", group: "azure", price: 180, baseRent: 22, rent: [22], tax: 0 },
  { id: 17, name: "Treasure", type: "treasure", group: null, price: 0, baseRent: 0, rent: [], tax: 0 },
  { id: 18, name: "Azure Promenade", type: "property", group: "azure", price: 180, baseRent: 22, rent: [22], tax: 0 },
  { id: 19, name: "Azure Terrace", type: "property", group: "azure", price: 200, baseRent: 24, rent: [24], tax: 0 },
  { id: 20, name: "Free Park", type: "free", group: null, price: 0, baseRent: 0, rent: [], tax: 0 },
  { id: 21, name: "Sunset Street", type: "property", group: "sunset", price: 220, baseRent: 26, rent: [26], tax: 0 },
  { id: 22, name: "Surprise", type: "surprise", group: null, price: 0, baseRent: 0, rent: [], tax: 0 },
  { id: 23, name: "Sunset Market", type: "property", group: "sunset", price: 220, baseRent: 26, rent: [26], tax: 0 },
  { id: 24, name: "Sunset Plaza", type: "property", group: "sunset", price: 240, baseRent: 28, rent: [28], tax: 0 },
  { id: 25, name: "Skyline Express", type: "rail", group: null, price: 200, baseRent: 25, rent: [25, 50, 100, 200], tax: 0 },
  { id: 26, name: "Crimson Row", type: "property", group: "crimson", price: 260, baseRent: 30, rent: [30], tax: 0 },
  { id: 27, name: "Crimson Court", type: "property", group: "crimson", price: 260, baseRent: 32, rent: [32], tax: 0 },
  { id: 28, name: "Gridline Utility", type: "utility", group: null, price: 150, baseRent: 4, rent: [4, 10], tax: 0 },
  { id: 29, name: "Crimson Point", type: "property", group: "crimson", price: 280, baseRent: 34, rent: [34], tax: 0 },
  { id: 30, name: "Go To Jail", type: "gotojail", group: null, price: 0, baseRent: 0, rent: [], tax: 0 },
  { id: 31, name: "Indigo Lane", type: "property", group: "indigo", price: 300, baseRent: 36, rent: [36], tax: 0 },
  { id: 32, name: "Indigo Ridge", type: "property", group: "indigo", price: 300, baseRent: 38, rent: [38], tax: 0 },
  { id: 33, name: "Treasure", type: "treasure", group: null, price: 0, baseRent: 0, rent: [], tax: 0 },
  { id: 34, name: "Indigo Square", type: "property", group: "indigo", price: 320, baseRent: 42, rent: [42], tax: 0 },
  { id: 35, name: "Metro Loop", type: "rail", group: null, price: 200, baseRent: 25, rent: [25, 50, 100, 200], tax: 0 },
  { id: 36, name: "Surprise", type: "surprise", group: null, price: 0, baseRent: 0, rent: [], tax: 0 },
  { id: 37, name: "Aurora Way", type: "property", group: "aurora", price: 350, baseRent: 45, rent: [45], tax: 0 },
  { id: 38, name: "Luxury Tax", type: "tax", group: null, price: 0, baseRent: 0, rent: [], tax: 120 },
  { id: 39, name: "Aurora Plaza", type: "property", group: "aurora", price: 400, baseRent: 50, rent: [50], tax: 0 },
];

const boardState = {
  svg: null,
  tiles: [],
  tileCenters: [],
  tileGroups: [],
  ownerMarkers: new Map(),
  tokenLayer: null,
  tokens: new Map(),
  playerColors: new Map(),
  selectedTile: null,
  selectHandler: null,
};

export function createBoard(svgEl, tiles = BOARD_TILES) {
  boardState.svg = svgEl;
  boardState.tiles = tiles;
  boardState.ownerMarkers.clear();
  boardState.playerColors.clear();
  boardState.tokens.clear();
  boardState.tileCenters = [];
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
  });

  return {
    getTiles: () => boardState.tiles,
    getTileCenter,
    setSelectedTile,
    updateOwnership,
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
      const offset = SLOT_OFFSETS[idx] || SLOT_OFFSETS[SLOT_OFFSETS.length - 1];
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

  if (tile.type === "property" && tile.group) {
    const band = document.createElementNS(SVG_NS, "rect");
    const bandColor = GROUP_COLORS[tile.group] || "#ccc";
    const bandThickness = 18;
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

function handleTileSelect(index) {
  setSelectedTile(index);
  if (boardState.selectHandler) {
    boardState.selectHandler(boardState.tiles[index], index);
  }
}
