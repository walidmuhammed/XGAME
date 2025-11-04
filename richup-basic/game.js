import {
  createBoard,
  drawTokens,
  updateToken,
  updateOwnership,
  updateStructures,
  updateMortgages,
  BOARD_TILES,
} from "./board.js";
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
  buildBtn: document.getElementById("build-btn"),
  sellBtn: document.getElementById("sell-btn"),
  diceResult: document.getElementById("dice-result"),
  currentPlayer: document.getElementById("current-player"),
  turnInfo: document.getElementById("turn-info"),
  shareUrl: document.getElementById("share-url"),
  shareCopy: document.getElementById("share-copy"),
  chatList: document.getElementById("chat-list"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  chatSend: document.getElementById("chat-send"),
  tileDetail: document.getElementById("tile-detail"),
  structureIcons: document.getElementById("structure-icons"),
  structureInfo: document.getElementById("structure-info"),
  financePanel: document.getElementById("finance-panel"),
  mortgageBtn: document.getElementById("mortgage-btn"),
  unmortgageBtn: document.getElementById("unmortgage-btn"),
  tradeBtn: document.getElementById("trade-btn"),
  tradeCreate: document.getElementById("trade-create"),
  tradeThreads: document.getElementById("trade-threads"),
  tradePickModal: document.getElementById("trade-pick-player"),
  tradePickList: document.getElementById("trade-pick-list"),
  tradeComposerModal: document.getElementById("trade-composer"),
  tradeInboundModal: document.getElementById("trade-inbound"),
  tcFromCash: document.getElementById("tc-from-cash"),
  tcFromCashPill: document.getElementById("tc-from-cash-pill"),
  tcToCash: document.getElementById("tc-to-cash"),
  tcToCashPill: document.getElementById("tc-to-cash-pill"),
  tcFromList: document.getElementById("tc-from-list"),
  tcToList: document.getElementById("tc-to-list"),
  tcFromCards: document.getElementById("tc-from-cards"),
  tcToCards: document.getElementById("tc-to-cards"),
  tcSend: document.getElementById("tc-send"),
  tcClose: document.getElementById("tc-close"),
  tcError: document.getElementById("tc-error"),
  tradeInboundBody: document.getElementById("trade-inbound-body"),
  tradeInboundAccept: document.getElementById("trade-inbound-accept"),
  tradeInboundCounter: document.getElementById("trade-inbound-counter"),
  tradeInboundDecline: document.getElementById("trade-inbound-decline"),
  tradeInboundClose: document.getElementById("trade-inbound-close"),
  tradeInboundNote: document.getElementById("trade-inbound-note"),
  myPropertiesList: document.getElementById("my-properties-list"),
  playerList: document.getElementById("player-list"),
  logList: document.getElementById("log-list"),
  newGameBtn: document.getElementById("new-game-btn"),
  evenBuildToggle: document.getElementById("even-build-toggle"),
  evenBuildStatus: document.getElementById("even-build-status"),
  doubleSetToggle: document.getElementById("double-set-toggle"),
  diceOverlay: document.getElementById("dice-overlay"),
  startOverlay: document.getElementById("start-overlay"),
  startBtn: document.getElementById("start-btn"),
  debtModal: document.getElementById("debt-modal"),
  debtSummary: document.getElementById("debt-summary"),
  debtSellList: document.getElementById("debt-sell-list"),
  debtMortgageList: document.getElementById("debt-mortgage-list"),
  debtTradeList: document.getElementById("debt-trade-list"),
  debtAutoBtn: document.getElementById("debt-auto-btn"),
  debtDoneBtn: document.getElementById("debt-done-btn"),
  debtSurrenderBtn: document.getElementById("debt-surrender-btn"),
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
  appearanceModal: document.getElementById("appearance-modal"),
  appearanceOpen: document.getElementById("appearance-open"),
  appearanceName: document.getElementById("appearance-name"),
  appearanceColor: document.getElementById("appearance-color"),
  appearanceSave: document.getElementById("appearance-save"),
  appearanceCancel: document.getElementById("appearance-cancel"),
  maxPlayersLabel: document.getElementById("max-players-label"),
  toastRoot: document.getElementById("toast-root"),
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

const DEBT_BLOCKED_INTENTS = new Set(["ROLL_DICE", "BUY_PROPERTY", "END_TURN"]);
init();

function init() {
  const restored = loadState();
  if (restored && Array.isArray(restored.players) && restored.players.length >= 2) {
    state = restored;
    ensureStateShapes();
    ensureTokenLayer();
    syncTokenPositions();
    updateOwnership(state.tileOwnership);
    syncStructures();
    syncMortgages();
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
  if (state.debtContext?.active && DEBT_BLOCKED_INTENTS.has(intent.type)) return;
  if (isAnimating && intent.type !== "NEW_GAME" && intent.type !== "TOGGLE_EVEN_BUILD") return;

  const previous = state;
  let next;
  try {
    next = stepTurn(state, intent);
  } catch (err) {
    console.error("Failed to process intent", intent, err); // eslint-disable-line no-console
    return;
  }
  state = next;
  ensureStateShapes();

  if (intent.type === "UPDATE_APPEARANCE") {
    drawTokens(state.players);
    currentTokenIds = state.players.map((player) => player.id);
  }

  if (intent.type === "NEW_GAME") {
    currentTokenIds = [];
    ensureTokenLayer();
    syncTokenPositions();
    updateOwnership(state.tileOwnership);
    syncStructures();
    syncMortgages();
    ui.resetCardTracker();
    if (ui.resetTradeUI) {
      ui.resetTradeUI();
    }
    if (ui.resetChat) {
      ui.resetChat();
    }
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
    syncStructures();
    syncMortgages();
    ui.refresh();
    return;
  }

  saveState();
  syncTokenPositions();
  updateOwnership(state.tileOwnership);
  syncStructures();
  syncMortgages();
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

function syncStructures() {
  updateStructures(state.structures || {});
}

function syncMortgages() {
  updateMortgages(state.mortgages || {});
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

function ensureStateShapes() {
  if (!state.config) {
    state.config = {};
  }
  if (typeof state.config.evenBuild !== "boolean") {
    state.config.evenBuild = true;
  }
  if (typeof state.config.doubleSetRent !== "boolean") {
    state.config.doubleSetRent = false;
  }
  if (!state.structures) {
    state.structures = {};
  }
  if (!state.mortgages) {
    state.mortgages = {};
  }
  if (!Array.isArray(state.trades)) {
    state.trades = [];
  }
  if (state.trade && !Array.isArray(state.trade)) {
    delete state.trade;
  }
  state.trades.forEach((thread) => {
    if (!thread || typeof thread !== "object") {
      return;
    }
    thread.id = thread.id || shortId();
    thread.status = thread.status || "pending";
    thread.round = Number.isInteger(thread.round) ? thread.round : 1;
    thread.log = Array.isArray(thread.log) ? thread.log : [];
    if (!thread.current || typeof thread.current !== "object") {
      thread.current = {
        from: { playerId: thread.initiatorId || null, cash: 0, properties: [], cards: [] },
        to: { playerId: thread.partnerId || null, cash: 0, properties: [], cards: [] },
      };
    }
    ["from", "to"].forEach((key) => {
      const side = thread.current[key] || {};
      thread.current[key] = side;
      side.playerId = side.playerId ?? (key === "from" ? thread.initiatorId : thread.partnerId) ?? null;
      side.properties = Array.isArray(side.properties) ? side.properties : [];
      side.cards = Array.isArray(side.cards) ? side.cards : [];
      if (typeof side.cash !== "number") {
        side.cash = 0;
      }
    });
  });
  if (!state.tradeDraft || typeof state.tradeDraft !== "object") {
    state.tradeDraft = {
      active: false,
      threadId: null,
      partnerId: null,
      validationError: null,
      from: { playerId: null, cash: 0, properties: [], cards: [] },
      to: { playerId: null, cash: 0, properties: [], cards: [] },
    };
  }
  state.tradeDraft.active = Boolean(state.tradeDraft.active);
  state.tradeDraft.threadId = state.tradeDraft.threadId ?? null;
  state.tradeDraft.partnerId = state.tradeDraft.partnerId ?? null;
  state.tradeDraft.from = state.tradeDraft.from || { playerId: null, cash: 0, properties: [], cards: [] };
  state.tradeDraft.to = state.tradeDraft.to || { playerId: null, cash: 0, properties: [], cards: [] };
  state.tradeDraft.from.properties = state.tradeDraft.from.properties || [];
  state.tradeDraft.to.properties = state.tradeDraft.to.properties || [];
  state.tradeDraft.from.cards = state.tradeDraft.from.cards || [];
  state.tradeDraft.to.cards = state.tradeDraft.to.cards || [];
  if (typeof state.tradeDraft.from.cash !== "number") state.tradeDraft.from.cash = 0;
  if (typeof state.tradeDraft.to.cash !== "number") state.tradeDraft.to.cash = 0;
  if (typeof state.tradeDraft.validationError !== "string") {
    state.tradeDraft.validationError = null;
  }
  state.activeTradeId = state.activeTradeId ?? null;
  BOARD_TILES.forEach((tile) => {
    if (tile.type === "property") {
      if (typeof state.structures[tile.id] !== "number") {
        state.structures[tile.id] = 0;
      }
    }
    if (tile.type === "property" || tile.type === "rail" || tile.type === "utility") {
      if (typeof state.mortgages[tile.id] !== "boolean") {
        state.mortgages[tile.id] = false;
      }
    }
  });
  if (!state.debtContext) {
    state.debtContext = { active: false, amountOwed: 0, creditor: null };
  }
}

function shortId() {
  return Math.random().toString(36).slice(2, 8);
}
