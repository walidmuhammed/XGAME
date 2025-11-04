import { createBoard, drawTokens, updateToken, updateOwnership, BOARD_TILES } from "./board.js";
import { createInitialState, stepTurn, selectors } from "./rules.js";
import { createUI } from "./ui.js";

const STORAGE_KEY = "richup-basic-save";

const elements = {
  boardSvg: document.getElementById("board-svg"),
  rollBtn: document.getElementById("roll-btn"),
  buyBtn: document.getElementById("buy-btn"),
  endBtn: document.getElementById("end-btn"),
  payBailBtn: document.getElementById("pay-bail-btn"),
  useCardBtn: document.getElementById("use-card-btn"),
  diceResult: document.getElementById("dice-result"),
  currentPlayer: document.getElementById("current-player"),
  turnInfo: document.getElementById("turn-info"),
  tileDetail: document.getElementById("tile-detail"),
  playerList: document.getElementById("player-list"),
  logList: document.getElementById("log-list"),
  newGameBtn: document.getElementById("new-game-btn"),
  cardModal: document.getElementById("card-modal"),
  cardOkBtn: document.getElementById("card-ok-btn"),
  cardTitle: document.getElementById("card-title"),
  cardText: document.getElementById("card-text"),
  setupModal: document.getElementById("setup-modal"),
  setupForm: document.getElementById("setup-form"),
  playerCount: document.getElementById("player-count"),
  playerConfig: document.getElementById("player-config"),
  cancelSetupBtn: document.getElementById("cancel-setup-btn"),
  winModal: document.getElementById("win-modal"),
  winText: document.getElementById("win-text"),
  winOkBtn: document.getElementById("win-ok-btn"),
};

let state = createInitialState();
const boardApi = createBoard(elements.boardSvg, BOARD_TILES);
const ui = createUI({
  elements,
  boardApi,
  onIntent: dispatch,
  getState: () => state,
});

let currentTokenIds = [];
let isAnimating = false;

init();

function init() {
  const restored = loadState();
  if (restored && Array.isArray(restored.players) && restored.players.length >= 2) {
    state = restored;
    ensureTokenLayer();
    syncTokenPositions();
    updateOwnership(state.tileOwnership);
    ui.resetCardTracker();
    const active = selectors.getCurrentPlayer(state);
    ui.setSelectedTile(active ? active.position : 0);
    ui.refresh();
  } else {
    ui.openSetup();
    ui.refresh();
  }
}

async function dispatch(intent) {
  if (!intent || !intent.type) return;
  if (isAnimating && intent.type !== "NEW_GAME") return;

  const previous = state;
  let next;
  try {
    next = stepTurn(state, intent);
  } catch (err) {
    console.error("Failed to process intent", intent, err); // eslint-disable-line no-console
    return;
  }
  state = next;

  if (intent.type === "NEW_GAME") {
    currentTokenIds = [];
    ensureTokenLayer();
    syncTokenPositions();
    updateOwnership(state.tileOwnership);
    ui.resetCardTracker();
    ui.setSelectedTile(0);
    ui.refresh();
    saveState();
    return;
  }

  if (intent.type === "ROLL_DICE") {
    ui.refresh();
    saveState();
    await runMovementSequence(previous, next);
    syncTokenPositions();
    updateOwnership(state.tileOwnership);
    ui.refresh();
    return;
  }

  saveState();
  syncTokenPositions();
  updateOwnership(state.tileOwnership);
  ui.refresh();
}

function ensureTokenLayer() {
  const ids = state.players.map((p) => p.id);
  const changed = ids.length !== currentTokenIds.length || ids.some((id, i) => currentTokenIds[i] !== id);
  if (changed) {
    drawTokens(state.players);
    currentTokenIds = ids.slice();
  }
}

function syncTokenPositions() {
  ensureTokenLayer();
  state.players.forEach((player) => {
    updateToken(player.id, player.position);
  });
}

async function runMovementSequence(prevState, nextState) {
  const player = selectors.getCurrentPlayer(nextState);
  if (!player) return;
  const paths = [];
  if (Array.isArray(nextState.turn.movement) && nextState.turn.movement.length) {
    paths.push(nextState.turn.movement);
  }
  if (Array.isArray(nextState.turn.chainMovements)) {
    nextState.turn.chainMovements.forEach((segment) => {
      if (Array.isArray(segment) && segment.length) {
        paths.push(segment);
      }
    });
  }
  if (!paths.length) {
    return;
  }
  isAnimating = true;
  ensureTokenLayer();
  for (const path of paths) {
    await animatePath(player.id, path);
  }
  isAnimating = false;
}

async function animatePath(playerId, path) {
  for (const tileId of path) {
    await pause(260);
    updateToken(playerId, tileId);
  }
  await pause(120);
}

function pause(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // storage may be unavailable
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}
