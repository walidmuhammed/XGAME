import { BOARD_TILES } from "./board.js";

const TOTAL_TILES = BOARD_TILES.length;
const DEFAULT_CONFIG = {
  salary: 200,
  bail: 50,
  maxPlayers: 6,
  startCash: 1500,
  logLimit: 40,
  evenBuild: true,
  doubleSetRent: false,
};

const MORTGAGE_INTEREST_RATE = 0.1;

const SURPRISE_CARDS = [
  { id: "surprise-cash--100", deck: "surprise", kind: "cash", amount: -100, text: "Pay inspection fees (−100)" },
  { id: "surprise-cash-100", deck: "surprise", kind: "cash", amount: 100, text: "Tax refund (+100)" },
  { id: "surprise-move-start", deck: "surprise", kind: "moveTo", tile: 0, text: "Advance to START" },
  { id: "surprise-jail", deck: "surprise", kind: "jail", text: "Go directly to Jail" },
  { id: "surprise-leave", deck: "surprise", kind: "leaveJail", text: "Keep this card: Get out of Jail free", keep: true },
  { id: "surprise-move-back-3", deck: "surprise", kind: "moveSteps", steps: -3, text: "Go back 3 tiles" },
];

const TREASURE_CARDS = [
  { id: "treasure-cash-50", deck: "treasure", kind: "cash", amount: 50, text: "Community prize (+50)" },
  { id: "treasure-cash--50", deck: "treasure", kind: "cash", amount: -50, text: "Donation (−50)" },
  { id: "treasure-cash-each", deck: "treasure", kind: "cashEach", amount: 25, text: "Collect 25 from each player" },
  { id: "treasure-move-start", deck: "treasure", kind: "moveTo", tile: 0, text: "Advance to START" },
  { id: "treasure-leave", deck: "treasure", kind: "leaveJail", text: "Keep this card: Get out of Jail free", keep: true },
  { id: "treasure-cash-200", deck: "treasure", kind: "cash", amount: 200, text: "Jackpot (+200)" },
];

const CARD_LOOKUP = [...SURPRISE_CARDS, ...TREASURE_CARDS].reduce((acc, card) => {
  acc[card.id] = card;
  return acc;
}, {});

export function createInitialState(config = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  return {
    players: [],
    tileOwnership: createEmptyOwnership(),
    structures: createEmptyStructures(),
    mortgages: createEmptyMortgages(),
    turn: createInitialTurn(),
    decks: {
      surprise: { draw: [], discard: [] },
      treasure: { draw: [], discard: [] },
    },
    log: [],
    config: mergedConfig,
    trades: [],
    activeTradeId: null,
    tradeDraft: createEmptyTradeDraft(),
    debtContext: {
      active: false,
      amountOwed: 0,
      creditor: null,
    },
    meta: {
      winner: null,
      rngSeed: null,
      seed: null,
      logCounter: 0,
    },
  };
}

export function stepTurn(state, intent) {
  switch (intent?.type) {
    case "NEW_GAME":
      return startNewGame(state, intent.payload || {});
    case "ROLL_DICE":
      return handleRoll(state, intent.payload);
    case "BUY_PROPERTY":
      return handleBuy(state);
    case "END_TURN":
      return handleEndTurn(state);
    case "PAY_BAIL":
      return handlePayBail(state);
    case "USE_LEAVE_JAIL_CARD":
      return handleUseLeaveJail(state);
    case "BUILD_HOUSE":
      return handleBuildHouse(state, intent.payload || {});
    case "SELL_HOUSE":
      return handleSellHouse(state, intent.payload || {});
    case "TOGGLE_EVEN_BUILD":
      return handleToggleEvenBuild(state, intent.payload || {});
    case "TOGGLE_DOUBLE_SET":
      return handleToggleDoubleSet(state, intent.payload || {});
    case "MORTGAGE_PROPERTY":
      return handleMortgageProperty(state, intent.payload || {});
    case "UNMORTGAGE_PROPERTY":
      return handleUnmortgageProperty(state, intent.payload || {});
    case "OPEN_TRADE_PICKER":
      return handleOpenTradePicker(state);
    case "OPEN_TRADE_COMPOSER":
      return handleOpenTradeComposer(state, intent.payload || {});
    case "CLOSE_TRADE_UI":
      return handleCloseTradeUI(state);
    case "TRADE_SET_CASH":
      return handleTradeSetCash(state, intent.payload || {});
    case "TRADE_TOGGLE_PROP":
      return handleTradeToggleProp(state, intent.payload || {});
    case "TRADE_TOGGLE_CARD":
      return handleTradeToggleCard(state, intent.payload || {});
    case "TRADE_SEND":
      return handleTradeSend(state);
    case "TRADE_ACCEPT":
      return handleTradeAccept(state, intent.payload || {});
    case "TRADE_DECLINE":
      return handleTradeDecline(state, intent.payload || {});
    case "TRADE_COUNTER":
      return handleTradeCounter(state, intent.payload || {});
    case "TRADE_CANCEL":
      return handleTradeCancel(state, intent.payload || {});
    case "UPDATE_APPEARANCE":
      return handleUpdateAppearance(state, intent.payload || {});
    case "BEGIN_DEBT_RESOLUTION":
      return handleBeginDebtResolution(state, intent.payload || {});
    case "AUTO_LIQUIDATE":
      return handleAutoLiquidate(state);
    case "END_DEBT_RESOLUTION":
      return handleEndDebtResolution(state, intent.payload || {});
    default:
      return cloneState(state);
  }
}

export const selectors = {
  getCurrentPlayer,
  getActivePlayers,
  getTile: (state, tileId) => BOARD_TILES.find((t) => t.id === tileId),
  canBuyCurrentTile,
  getPendingCard: (state) => state.turn.pendingCard,
  getMovementPath: (state) => state.turn.movement,
  getChainMovements: (state) => state.turn.chainMovements || [],
  getOwnership: (state) => state.tileOwnership,
  getHouseCount: (state, tileId) => state.structures?.[tileId] ?? 0,
  getConfig: (state) => state.config,
  getMortgages: (state) => state.mortgages,
  getTrades: (state) => state.trades || [],
  getTradeById: (state, id) => (state.trades || []).find((thread) => thread.id === id) || null,
  getTradeDraft: (state) => state.tradeDraft || createEmptyTradeDraft(),
  getActiveTradeId: (state) => state.activeTradeId || null,
  getPlayerById: (state, id) => state.players.find((p) => p.id === id) || null,
  getOwnedProperties: (state, playerId) =>
    Object.keys(state.tileOwnership || {})
      .filter((key) => state.tileOwnership[key] === playerId)
      .map((key) => Number(key)),
  getDebtContext: (state) => state.debtContext,
  hasWinner: (state) => Boolean(state.meta.winner),
};

function startNewGame(prevState, payload) {
  const base = createInitialState(prevState?.config || {});
  const incomingPlayers = Array.isArray(payload.players) ? payload.players.slice(0, base.config.maxPlayers) : [];
  const playerCount = Math.max(2, Math.min(incomingPlayers.length || 0, base.config.maxPlayers));
  const fallbackNames = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6"];

  const players = [];
  for (let i = 0; i < playerCount; i += 1) {
    const raw = incomingPlayers[i] || {};
    players.push({
      id: `p${i + 1}`,
      name: (raw.name || fallbackNames[i]).trim() || fallbackNames[i],
      color: raw.color || defaultColors()[i % defaultColors().length],
      cash: base.config.startCash,
      position: 0,
      inJail: false,
      jailTurns: 0,
      owned: [],
      heldCards: [],
      bankrupt: false,
    });
  }

  base.players = players;
  base.tileOwnership = createEmptyOwnership();
  base.structures = createEmptyStructures();
  base.mortgages = createEmptyMortgages();
  base.turn = createInitialTurn();
  base.trades = [];
  base.activeTradeId = null;
  base.tradeDraft = createEmptyTradeDraft();

  if (payload.seed) {
    base.meta.seed = String(payload.seed);
    base.meta.rngSeed = seedStringToNumber(base.meta.seed);
  } else {
    base.meta.seed = null;
    base.meta.rngSeed = null;
  }

  base.decks = {
    surprise: createDeck(SURPRISE_CARDS, base),
    treasure: createDeck(TREASURE_CARDS, base),
  };

  base.config.evenBuild = payload.evenBuild ?? base.config.evenBuild ?? true;
  base.config.doubleSetRent = payload.doubleSetRent ?? base.config.doubleSetRent ?? false;
  base.debtContext = {
    active: false,
    amountOwed: 0,
    creditor: null,
  };
  pushLog(base, `New game: ${players.length} players ready.`);
  return base;
}

function handleRoll(state, payload) {
  const next = cloneState(state);
  if (next.meta.winner) return next;

  const player = getCurrentPlayer(next);
  if (!player) return next;
  if (player.bankrupt) {
    return handleEndTurn(next);
  }

  if (next.turn.phase !== "idle") {
    return next;
  }

  clearPendingTurn(next);

  const roll = resolveRoll(next, payload);
  next.turn.lastRoll = roll;
  next.turn.phase = "rolled";

  if (player.inJail) {
    return processJailRoll(next, player, roll);
  }

  if (roll.isDouble) {
    next.turn.doublesCount += 1;
  } else {
    next.turn.doublesCount = 0;
  }

  if (roll.isDouble && next.turn.doublesCount >= 3) {
    pushLog(next, `${player.name} rolls a third double and is sent to Jail.`);
    sendPlayerToJail(next, player, { dueToDoubles: true });
    next.turn.phase = "resolved";
    next.turn.allowExtraRoll = false;
    next.turn.doublesCount = 0;
    determineWinner(next);
    return next;
  }

  const path = computeMovementPath(player.position, roll.total);
  next.turn.movement = path;

  if (passesStart(player.position, roll.total)) {
    player.cash += next.config.salary;
    pushLog(next, `${player.name} collects $${next.config.salary} for passing START.`);
  }

  player.position = path[path.length - 1];
  next.turn.phase = "moved";

  resolveTile(next, player, roll);

  if (roll.isDouble && !player.inJail && !player.bankrupt && !next.turn.mustEnd) {
    next.turn.allowExtraRoll = true;
  } else {
    next.turn.allowExtraRoll = false;
    if (!roll.isDouble) {
      next.turn.doublesCount = 0;
    }
  }

  determineWinner(next);
  return next;
}

function handleBuy(state) {
  const next = cloneState(state);
  if (next.meta.winner) return next;
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;

  const tileId = next.turn.pendingPurchase;
  if (typeof tileId !== "number") return next;
  const tile = BOARD_TILES.find((t) => t.id === tileId);
  if (!tile) return next;

  const owner = next.tileOwnership[tileId];
  if (owner) {
    next.turn.pendingPurchase = null;
    return next;
  }

  if (player.cash < tile.price) {
    pushLog(next, `${player.name} cannot afford ${tile.name}.`);
    next.turn.pendingPurchase = null;
    return next;
  }

  player.cash -= tile.price;
  player.owned.push(tileId);
  next.tileOwnership[tileId] = player.id;
  ensureMortgages(next);
  next.mortgages[tileId] = false;
  pushLog(next, `${player.name} buys ${tile.name} for $${tile.price}.`);
  updateDebtAfterAction(next, player);

  next.turn.pendingPurchase = null;
  determineWinner(next);
  return next;
}

function handleEndTurn(state) {
  const next = cloneState(state);
  if (next.meta.winner) {
    next.turn.phase = "ended";
    return next;
  }

  const player = getCurrentPlayer(next);
  if (!player) return next;

  if (next.turn.allowExtraRoll && !player.bankrupt && !player.inJail && !next.turn.mustEnd) {
    next.turn.allowExtraRoll = false;
    next.turn.phase = "idle";
    next.turn.movement = [];
    next.turn.chainMovements = [];
    next.turn.pendingPurchase = null;
    next.turn.pendingCard = null;
    pushLog(next, `${player.name} takes another roll for doubles.`);
    return next;
  }

  const nextIndex = findNextActivePlayerIndex(next, next.turn.currentIndex);
  next.turn.currentIndex = nextIndex;
  next.turn.doublesCount = 0;
  next.turn.phase = next.meta.winner ? "ended" : "idle";
  next.turn.lastRoll = null;
  next.turn.movement = [];
  next.turn.chainMovements = [];
  next.turn.pendingPurchase = null;
  next.turn.pendingCard = null;
  next.turn.allowExtraRoll = false;
  next.turn.mustEnd = false;
  next.turn.debtLocked = Boolean(next.debtContext?.active);

  const upcoming = getCurrentPlayer(next);
  if (upcoming) {
    pushLog(next, `It is now ${upcoming.name}'s turn.`);
  }

  if (next.meta.winner) {
    next.turn.phase = "ended";
  }
  return next;
}

function handlePayBail(state) {
  const next = cloneState(state);
  if (next.meta.winner) return next;
  const player = getCurrentPlayer(next);
  if (!player || !player.inJail) return next;
  if (next.turn.phase !== "idle") return next;

  player.cash -= next.config.bail;
  pushLog(next, `${player.name} pays $${next.config.bail} to leave Jail.`);
  player.inJail = false;
  player.jailTurns = 0;
  if (player.cash < 0) {
    activateDebtContext(next, player, "bank");
  } else {
    updateDebtAfterAction(next, player);
  }
  return next;
}

function handleUseLeaveJail(state) {
  const next = cloneState(state);
  if (next.meta.winner) return next;
  const player = getCurrentPlayer(next);
  if (!player || !player.inJail) return next;
  if (next.turn.phase !== "idle") return next;

  const cardIndex = player.heldCards.findIndex((card) => card.kind === "leaveJail");
  if (cardIndex < 0) return next;
  const [card] = player.heldCards.splice(cardIndex, 1);

  const deck = next.decks[card.deck];
  if (deck) {
    const original = CARD_LOOKUP[card.id];
    if (original) {
      deck.discard.push({ ...original });
    }
  }

  pushLog(next, `${player.name} uses a Get out of Jail card.`);
  player.inJail = false;
  player.jailTurns = 0;
  return next;
}

function handleBuildHouse(state, payload) {
  const next = cloneState(state);
  if (!next.structures) {
    next.structures = createEmptyStructures();
  }
  if (next.meta.winner) return next;
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const tileId = typeof payload.tileId === "number" ? payload.tileId : null;
  if (tileId === null) return next;
  const tile = BOARD_TILES.find((t) => t.id === tileId && t.type === "property");
  if (!tile) return next;

  if (!canBuildHere(next, player.id, tileId)) {
    return next;
  }

  const cost = tile.houseCost;
  player.cash -= cost;
  next.structures[tileId] = (next.structures?.[tileId] ?? 0) + 1;
  const isHotel = next.structures[tileId] === 5;
  const label = isHotel ? "a hotel" : "a house";
  pushLog(next, `${player.name} builds ${label} on ${tile.name} (cost $${cost}).`);
  updateDebtAfterAction(next, player);
  return next;
}

function handleSellHouse(state, payload) {
  const next = cloneState(state);
  if (!next.structures) {
    next.structures = createEmptyStructures();
  }
  if (next.meta.winner) return next;
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const tileId = typeof payload.tileId === "number" ? payload.tileId : null;
  if (tileId === null) return next;
  const tile = BOARD_TILES.find((t) => t.id === tileId && t.type === "property");
  if (!tile) return next;

  if (!canSellHere(next, player.id, tileId)) {
    return next;
  }

  const current = next.structures?.[tileId] ?? 0;
  const wasHotel = current === 5;
  const refund = Math.floor(tile.houseCost / 2);
  next.structures[tileId] = Math.max(0, current - 1);
  player.cash += refund;
  const label = wasHotel ? "a hotel" : "a house";
  pushLog(next, `${player.name} sells ${label} on ${tile.name} (refund $${refund}).`);
  updateDebtAfterAction(next, player);
  return next;
}

function handleToggleEvenBuild(state, payload) {
  const next = cloneState(state);
  const desired = typeof payload.value === "boolean" ? payload.value : !next.config.evenBuild;
  if (next.config.evenBuild === desired) {
    return next;
  }
  next.config.evenBuild = desired;
  pushLog(next, `Even-Build rule ${desired ? "enabled" : "disabled"}.`);
  return next;
}

function handleToggleDoubleSet(state, payload) {
  const next = cloneState(state);
  const desired =
    typeof payload.value === "boolean" ? payload.value : !Boolean(next.config?.doubleSetRent);
  if (next.config.doubleSetRent === desired) {
    return next;
  }
  next.config.doubleSetRent = desired;
  pushLog(next, `Double-set rent ${desired ? "enabled" : "disabled"}.`);
  return next;
}

function handleUpdateAppearance(state, payload) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const previousName = player.name;
  const previousColor = player.color;
  const rawName = typeof payload.name === "string" ? payload.name.trim() : player.name;
  if (rawName) {
    player.name = rawName.slice(0, 24);
  }
  const rawColor = typeof payload.color === "string" ? payload.color.trim() : player.color;
  if (/^#[0-9a-f]{6}$/i.test(rawColor)) {
    player.color = rawColor.toUpperCase();
  }
  const displayName = player.name || previousName;
  if (displayName !== previousName || player.color !== previousColor) {
    pushLog(next, `${displayName} refreshes their appearance.`);
  }
  return next;
}

function handleOpenTradePicker(state) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const draft = createEmptyTradeDraft();
  draft.from.playerId = player.id;
  next.tradeDraft = draft;
  next.activeTradeId = null;
  return next;
}

function handleOpenTradeComposer(state, payload) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;

  const tradeId = payload?.tradeId ? String(payload.tradeId) : null;
  if (tradeId) {
    return prepareDraftForThread(next, tradeId, player.id);
  }

  const partnerId = payload?.partnerId ? String(payload.partnerId) : null;
  const partner = findPlayerById(next, partnerId);
  if (!partner || partner.bankrupt || partner.id === player.id) return next;

  const draft = createDraftForPlayers(player.id, partner.id);
  draft.active = true;
  sanitizeDraftForPlayers(next, draft);
  next.tradeDraft = draft;
  next.activeTradeId = null;
  return next;
}

function handleCloseTradeUI(state) {
  const next = cloneState(state);
  next.tradeDraft = createEmptyTradeDraft();
  next.activeTradeId = null;
  return next;
}

function handleTradeSetCash(state, payload) {
  const side = payload?.side;
  if (side !== "from" && side !== "to") return cloneState(state);
  const rawValue = Number(payload?.value);
  if (!Number.isFinite(rawValue)) return cloneState(state);
  const next = cloneState(state);
  const draft = next.tradeDraft || createEmptyTradeDraft();
  if (!draft.active) return next;
  const target = draft[side];
  const player = findPlayerById(next, target.playerId);
  if (!player || player.bankrupt) return next;
  const value = Math.max(0, Math.min(Math.floor(rawValue), player.cash));
  target.cash = value;
  draft.validationError = null;
  next.tradeDraft = draft;
  return next;
}

function handleTradeToggleProp(state, payload) {
  const side = payload?.side;
  if (side !== "from" && side !== "to") return cloneState(state);
  const tileId = Number(payload?.tileId);
  if (!Number.isInteger(tileId)) return cloneState(state);
  const next = cloneState(state);
  const draft = next.tradeDraft || createEmptyTradeDraft();
  if (!draft.active) return next;
  const target = draft[side];
  const ownerId = state.tileOwnership?.[tileId];
  if (ownerId !== target.playerId) return next;
  const tile = BOARD_TILES.find((t) => t.id === tileId);
  if (!tile || (tile.type !== "property" && tile.type !== "rail" && tile.type !== "utility")) return next;

  const set = new Set(target.properties);
  if (set.has(tileId)) {
    set.delete(tileId);
  } else {
    set.add(tileId);
  }
  target.properties = Array.from(set.values());
  draft.validationError = null;
  next.tradeDraft = draft;
  return next;
}

function handleTradeToggleCard(state, payload) {
  const side = payload?.side;
  if (side !== "from" && side !== "to") return cloneState(state);
  const card = payload?.card;
  if (card !== "leaveJail") return cloneState(state);
  const next = cloneState(state);
  const draft = next.tradeDraft || createEmptyTradeDraft();
  if (!draft.active) return next;
  const target = draft[side];
  const player = findPlayerById(next, target.playerId);
  if (!player || player.bankrupt) return next;

  const maxCards = countLeaveJailCards(player);
  const hasCard = target.cards.includes("leaveJail");
  if (hasCard) {
    target.cards = [];
  } else if (maxCards > 0) {
    target.cards = ["leaveJail"];
  }
  draft.validationError = null;
  next.tradeDraft = draft;
  return next;
}

function handleTradeSend(state) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const draft = next.tradeDraft;
  if (!draft?.active) return next;
  if (draft.from.playerId !== player.id) {
    return next;
  }

  const partnerId = draft.to?.playerId ? String(draft.to.playerId) : null;
  const partner = findPlayerById(next, partnerId);
  if (!partner || partner.bankrupt || partner.id === player.id) {
    return next;
  }

  draft.validationError = null;

  const validation = validateDraft(next, draft);
  if (!validation.valid) {
    next.tradeDraft.validationError = validation.reason || "invalid";
    return next;
  }

  const snapshot = createSnapshotFromDraft(draft);
  const timestamp = Date.now();
  const isCounter = Boolean(draft.threadId);

  if (!isCounter) {
    const threadId = shortId();
    const thread = {
      id: threadId,
      initiatorId: draft.from.playerId,
      partnerId: draft.to.playerId,
      status: "pending",
      round: 1,
      current: cloneSnapshot(snapshot),
      log: [
        {
          by: player.id,
          type: "proposed",
          at: timestamp,
          snapshot: cloneSnapshot(snapshot),
        },
      ],
    };
    next.trades = [thread, ...(next.trades || [])];
    next.activeTradeId = threadId;
    pushLog(next, `${player.name} creates a trade with ${getPlayerName(next, draft.to.playerId)}.`);
  } else {
    const thread = findTradeThread(next, draft.threadId);
    if (!thread || thread.status === "accepted" || thread.status === "declined" || thread.status === "cancelled") {
      return next;
    }
    if (thread.current?.to?.playerId && thread.current.to.playerId !== player.id) {
      return next;
    }
    thread.current = cloneSnapshot(snapshot);
    thread.status = "countered";
    thread.round = (thread.round || 0) + 1;
    thread.log = thread.log || [];
    thread.log.push({
      by: player.id,
      type: "countered",
      at: timestamp,
      snapshot: cloneSnapshot(snapshot),
    });
    next.activeTradeId = thread.id;
    pushLog(next, `${player.name} counters a trade with ${getPlayerName(next, draft.to.playerId)}.`);
  }

  next.tradeDraft = createEmptyTradeDraft();
  return next;
}

function handleTradeAccept(state, payload) {
  const tradeId = payload?.tradeId ? String(payload.tradeId) : null;
  if (!tradeId) return cloneState(state);
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const thread = findTradeThread(next, tradeId);
  if (!thread || (thread.status !== "pending" && thread.status !== "countered")) return next;

  if (thread.current.to.playerId !== player.id) return next;

  const validation = validateSnapshot(next, thread.current);
  if (!validation.valid) {
    return next;
  }

  if (!canPlayersAffordSnapshot(next, thread.current)) {
    return next;
  }

  applyTradeSnapshot(next, thread.current);
  thread.status = "accepted";
  const timestamp = Date.now();
  thread.log = thread.log || [];
  thread.log.push({
    by: player.id,
    type: "accepted",
    at: timestamp,
    snapshot: cloneSnapshot(thread.current),
  });
  next.activeTradeId = null;
  next.tradeDraft = createEmptyTradeDraft();

  const otherName = getPlayerName(next, thread.current.from.playerId);
  pushLog(next, `${player.name} accepts the trade with ${otherName}.`);
  return next;
}

function handleTradeDecline(state, payload) {
  const tradeId = payload?.tradeId ? String(payload.tradeId) : null;
  if (!tradeId) return cloneState(state);
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player) return next;
  const thread = findTradeThread(next, tradeId);
  if (!thread || (thread.status !== "pending" && thread.status !== "countered")) return next;

  if (thread.current.to.playerId !== player.id) return next;

  thread.status = "declined";
  const timestamp = Date.now();
  thread.log = thread.log || [];
  thread.log.push({
    by: player.id,
    type: "declined",
    at: timestamp,
    snapshot: cloneSnapshot(thread.current),
  });
  next.activeTradeId = null;
  next.tradeDraft = createEmptyTradeDraft();
  pushLog(next, `${player.name} declines the trade with ${getPlayerName(next, thread.current.from.playerId)}.`);
  return next;
}

function handleTradeCounter(state, payload) {
  const tradeId = payload?.tradeId ? String(payload.tradeId) : null;
  if (!tradeId) return cloneState(state);
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  return prepareDraftForThread(next, tradeId, player.id);
}

function handleTradeCancel(state, payload) {
  const tradeId = payload?.tradeId ? String(payload.tradeId) : null;
  if (!tradeId) return cloneState(state);
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player) return next;
  const thread = findTradeThread(next, tradeId);
  if (!thread || (thread.status !== "pending" && thread.status !== "countered")) return next;
  if (thread.initiatorId !== player.id) return next;

  thread.status = "cancelled";
  const timestamp = Date.now();
  thread.log = thread.log || [];
  thread.log.push({
    by: player.id,
    type: "cancelled",
    at: timestamp,
    snapshot: cloneSnapshot(thread.current),
  });
  next.activeTradeId = null;
  next.tradeDraft = createEmptyTradeDraft();
  pushLog(next, `${player.name} cancels the trade with ${getPlayerName(next, thread.partnerId)}.`);
  return next;
}

function prepareDraftForThread(state, tradeId, viewerId) {
  const thread = findTradeThread(state, tradeId);
  if (
    !thread ||
    thread.status === "accepted" ||
    thread.status === "declined" ||
    thread.status === "cancelled"
  ) {
    return state;
  }
  if (viewerId !== thread.initiatorId && viewerId !== thread.partnerId) {
    return state;
  }
  const otherId = viewerId === thread.initiatorId ? thread.partnerId : thread.initiatorId;
  const snapshot = cloneSnapshot(thread.current);
  const fromSide =
    snapshot.from.playerId === viewerId
      ? cloneTradeSide(snapshot.from)
      : cloneTradeSide(snapshot.to);
  const toSide =
    snapshot.from.playerId === viewerId
      ? cloneTradeSide(snapshot.to)
      : cloneTradeSide(snapshot.from);

  const draft = createEmptyTradeDraft();
  draft.active = true;
  draft.threadId = thread.id;
  draft.partnerId = otherId;
  draft.from = normalizeTradeSide(fromSide, viewerId);
  draft.to = normalizeTradeSide(toSide, otherId);
  sanitizeDraftForPlayers(state, draft);
  state.tradeDraft = draft;
  state.activeTradeId = thread.id;
  return state;
}

function validateDraft(state, draft) {
  if (!draft || !draft.active) {
    return { valid: false, reason: "inactive" };
  }
  const fromPlayer = findPlayerById(state, draft.from.playerId);
  const toPlayer = findPlayerById(state, draft.to.playerId);
  if (!fromPlayer || !toPlayer || fromPlayer.bankrupt || toPlayer.bankrupt) {
    return { valid: false, reason: "invalid_players" };
  }
  const fromValid = validateSide(state, draft.from);
  const toValid = validateSide(state, draft.to);
  if (!fromValid.valid) return fromValid;
  if (!toValid.valid) return toValid;
  return { valid: true };
}

function validateSnapshot(state, snapshot) {
  if (!snapshot) return { valid: false, reason: "missing" };
  const fromValid = validateSide(state, snapshot.from);
  const toValid = validateSide(state, snapshot.to);
  if (!fromValid.valid) return fromValid;
  if (!toValid.valid) return toValid;
  return { valid: true };
}

function validateSide(state, side) {
  const player = findPlayerById(state, side.playerId);
  if (!player || player.bankrupt) {
    return { valid: false, reason: "player" };
  }
  if (!Array.isArray(side.properties) || !Array.isArray(side.cards)) {
    return { valid: false, reason: "shape" };
  }

  const propSet = new Set();
  for (const value of side.properties) {
    const tileId = Number(value);
    if (!Number.isInteger(tileId)) {
      return { valid: false, reason: "prop" };
    }
    if (propSet.has(tileId)) {
      return { valid: false, reason: "duplicate_prop" };
    }
    propSet.add(tileId);
    if (state.tileOwnership?.[tileId] !== side.playerId) {
      return { valid: false, reason: "ownership" };
    }
  }

  if (side.cards.length > 1) {
    return { valid: false, reason: "cards" };
  }
  if (side.cards.includes("leaveJail") && countLeaveJailCards(player) < 1) {
    return { valid: false, reason: "card_missing" };
  }
  if (side.cash < 0 || !Number.isFinite(side.cash)) {
    return { valid: false, reason: "cash" };
  }
  if (side.cash > player.cash) {
    return { valid: false, reason: "cash_exceeds" };
  }
  return { valid: true };
}

function createSnapshotFromDraft(draft) {
  return {
    from: cloneTradeSide(draft.from),
    to: cloneTradeSide(draft.to),
  };
}

function cloneSnapshot(snapshot) {
  return {
    from: cloneTradeSide(snapshot.from),
    to: cloneTradeSide(snapshot.to),
  };
}

function cloneTradeSide(side) {
  return {
    playerId: side.playerId,
    cash: Number(side.cash) || 0,
    properties: Array.from(side.properties || [], (value) => Number(value)),
    cards: Array.from(side.cards || []),
  };
}

function normalizeTradeSide(side, playerId) {
  const normalized = cloneTradeSide(side);
  normalized.playerId = playerId;
  const set = new Set();
  normalized.properties = normalized.properties.filter((value) => {
    if (!Number.isInteger(value)) return false;
    if (set.has(value)) return false;
    set.add(value);
    return true;
  });
  normalized.cards = normalized.cards.includes("leaveJail") ? ["leaveJail"] : [];
  normalized.cash = Math.max(0, Math.floor(Number(normalized.cash) || 0));
  return normalized;
}

function sanitizeDraftForPlayers(state, draft) {
  if (!draft) return;
  sanitizeDraftSide(state, draft.from);
  sanitizeDraftSide(state, draft.to);
  draft.validationError = null;
}

function sanitizeDraftSide(state, side) {
  if (!side) return;
  const player = findPlayerById(state, side.playerId);
  if (!player || player.bankrupt) {
    side.cash = 0;
    side.properties = [];
    side.cards = [];
    return;
  }

  const owned = state.tileOwnership || {};
  side.properties = side.properties.filter((tileId) => owned[tileId] === side.playerId);

  const maxCash = Math.max(0, Math.floor(player.cash));
  side.cash = Math.min(Math.max(0, Number(side.cash) || 0), maxCash);

  side.cards = Array.isArray(side.cards) ? side.cards : [];
  if (side.cards.includes("leaveJail")) {
    side.cards = countLeaveJailCards(player) > 0 ? ["leaveJail"] : [];
  } else {
    side.cards = [];
  }
}

function findTradeThread(state, tradeId) {
  if (!tradeId || !Array.isArray(state.trades)) return null;
  return state.trades.find((thread) => String(thread.id) === tradeId) || null;
}

function getPlayerName(state, playerId) {
  const player = findPlayerById(state, playerId);
  return player ? player.name : "Unknown";
}

function countLeaveJailCards(player) {
  if (!player?.heldCards) return 0;
  return player.heldCards.filter((card) => card.kind === "leaveJail").length;
}

function canPlayersAffordSnapshot(state, snapshot) {
  const fromPlayer = findPlayerById(state, snapshot.from.playerId);
  const toPlayer = findPlayerById(state, snapshot.to.playerId);
  if (!fromPlayer || !toPlayer) return false;
  const fromAfter = fromPlayer.cash - snapshot.from.cash + snapshot.to.cash;
  const toAfter = toPlayer.cash - snapshot.to.cash + snapshot.from.cash;
  return fromAfter >= 0 && toAfter >= 0;
}

function applyTradeSnapshot(state, snapshot) {
  const fromPlayer = findPlayerById(state, snapshot.from.playerId);
  const toPlayer = findPlayerById(state, snapshot.to.playerId);
  if (!fromPlayer || !toPlayer) return;

  executeTransfer(state, fromPlayer, toPlayer, snapshot.from);
  executeTransfer(state, toPlayer, fromPlayer, snapshot.to);
}

function executeTransfer(state, giver, receiver, side) {
  giver.cash -= side.cash;
  receiver.cash += side.cash;

  side.properties.forEach((tileId) => {
    transferPropertyOwnership(state, giver, receiver, tileId);
  });

  if (side.cards.includes("leaveJail")) {
    const index = (giver.heldCards || []).findIndex((card) => card.kind === "leaveJail");
    if (index >= 0) {
      const [card] = giver.heldCards.splice(index, 1);
      receiver.heldCards = receiver.heldCards || [];
      receiver.heldCards.push(card);
    }
  }
}

function cancelTradesForPlayer(state, playerId) {
  if (!Array.isArray(state.trades)) return;
  const timestamp = Date.now();
  state.trades.forEach((thread) => {
    if (thread.status === "accepted" || thread.status === "declined" || thread.status === "cancelled") return;
    if (thread.initiatorId !== playerId && thread.partnerId !== playerId) return;
    thread.status = "cancelled";
    thread.log = thread.log || [];
    thread.log.push({
      by: playerId,
      type: "cancelled",
      at: timestamp,
      snapshot: cloneSnapshot(thread.current),
    });
  });
}

function createEmptyTradeDraft() {
  return {
    active: false,
    threadId: null,
    partnerId: null,
    validationError: null,
    from: { playerId: null, cash: 0, properties: [], cards: [] },
    to: { playerId: null, cash: 0, properties: [], cards: [] },
  };
}

function createDraftForPlayers(fromPlayerId, toPlayerId) {
  const draft = createEmptyTradeDraft();
  draft.from.playerId = fromPlayerId;
  draft.to.playerId = toPlayerId;
  draft.partnerId = toPlayerId;
  return draft;
}

function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

function handleBeginDebtResolution(state, payload) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const creditor = payload?.creditor || next.debtContext?.creditor || "bank";
  const amount = typeof payload?.amountOwed === "number" ? Math.max(0, payload.amountOwed) : Math.max(0, -player.cash);
  activateDebtContext(next, player, creditor);
  const debt = ensureDebtContext(next);
  debt.amountOwed = Math.max(debt.amountOwed, amount, Math.max(0, -player.cash));
  return next;
}

function handleAutoLiquidate(state) {
  const next = cloneState(state);
  autoLiquidate(next);
  return next;
}

function handleEndDebtResolution(state, payload = {}) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player) return next;
  if (player.cash >= 0) {
    clearDebtContext(next);
    pushLog(next, `${player.name} resolves their debt obligations.`);
    return next;
  }
  const creditor = next.debtContext?.creditor || "bank";
  if (payload.surrender) {
    pushLog(next, `${player.name} surrenders and cannot cover their debt.`);
  }
  finalizeBankruptcy(next, player, creditor);
  return next;
}

function handleMortgageProperty(state, payload) {
  const next = cloneState(state);
  ensureMortgages(next);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const tileId = typeof payload.tileId === "number" ? payload.tileId : null;
  if (tileId === null) return next;
  const tile = getMortgageableTile(tileId);
  if (!tile) return next;
  if (!canMortgageHere(next, player.id, tileId)) return next;
  applyMortgage(next, player, tile);
  updateDebtAfterAction(next, player);
  return next;
}

function handleUnmortgageProperty(state, payload) {
  const next = cloneState(state);
  ensureMortgages(next);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const tileId = typeof payload.tileId === "number" ? payload.tileId : null;
  if (tileId === null) return next;
  const tile = getMortgageableTile(tileId);
  if (!tile) return next;
  if (!canUnmortgageHere(next, player.id, tileId)) return next;
  applyUnmortgage(next, player, tile);
  updateDebtAfterAction(next, player);
  return next;
}

function processJailRoll(state, player, roll) {
  player.jailTurns += 1;

  if (roll.isDouble) {
    pushLog(state, `${player.name} rolls doubles and leaves Jail.`);
    player.inJail = false;
    player.jailTurns = 0;
    const path = computeMovementPath(player.position, roll.total);
    state.turn.movement = path;
    if (passesStart(player.position, roll.total)) {
      player.cash += state.config.salary;
      pushLog(state, `${player.name} collects $${state.config.salary} for passing START.`);
    }
    player.position = path[path.length - 1];
    state.turn.phase = "moved";
    resolveTile(state, player, roll, { fromJail: true });
    state.turn.allowExtraRoll = false;
  } else if (player.jailTurns >= 3) {
    pushLog(state, `${player.name} fails to roll doubles and pays $${state.config.bail} to leave Jail.`);
    player.cash -= state.config.bail;
    player.inJail = false;
    player.jailTurns = 0;
    const path = computeMovementPath(player.position, roll.total);
    state.turn.movement = path;
    if (passesStart(player.position, roll.total)) {
      player.cash += state.config.salary;
      pushLog(state, `${player.name} collects $${state.config.salary} for passing START.`);
    }
    player.position = path[path.length - 1];
    state.turn.phase = "moved";
    resolveTile(state, player, roll, { fromJail: true });
    state.turn.allowExtraRoll = false;
  } else {
    const attemptsLeft = 3 - player.jailTurns;
    pushLog(state, `${player.name} remains in Jail. ${attemptsLeft} attempt(s) left.`);
    state.turn.phase = "resolved";
    state.turn.mustEnd = true;
  }

  if (player.cash < 0) {
    activateDebtContext(state, player, "bank");
  } else {
    updateDebtAfterAction(state, player);
  }
  determineWinner(state);
  return state;
}

function resolveTile(state, player, roll, options = {}) {
  const tile = BOARD_TILES.find((t) => t.id === player.position);
  if (!tile) return;

  state.turn.pendingPurchase = null;
  if (!options.fromCard) {
    state.turn.pendingCard = null;
  }
  state.turn.phase = "resolved";

  switch (tile.type) {
    case "start":
      pushLog(state, `${player.name} lands on START.`);
      break;
    case "free":
      pushLog(state, `${player.name} relaxes at Free Park.`);
      break;
    case "jail":
      pushLog(state, `${player.name} is just visiting Jail.`);
      break;
    case "gotojail":
      pushLog(state, `${player.name} is sent to Jail.`);
      sendPlayerToJail(state, player);
      break;
    case "tax":
      player.cash -= tile.tax;
      pushLog(state, `${player.name} pays $${tile.tax} in taxes.`);
      if (player.cash < 0) {
        activateDebtContext(state, player, "bank");
      } else {
        updateDebtAfterAction(state, player);
      }
      break;
    case "property":
      resolveProperty(state, player, tile);
      break;
    case "rail":
      resolveRail(state, player, tile);
      break;
    case "utility":
      resolveUtility(state, player, tile, roll);
      break;
    case "surprise":
    case "treasure":
      drawAndApplyCard(state, player, tile.type);
      break;
    default:
      break;
  }

  if (!options.fromJail && state.turn.mustEnd) {
    state.turn.allowExtraRoll = false;
  }
}

function resolveProperty(state, player, tile) {
  const ownerId = state.tileOwnership[tile.id];
  if (!ownerId) {
    state.turn.pendingPurchase = tile.id;
    pushLog(state, `${tile.name} is unowned. ${player.name} may buy it for $${tile.price}.`);
    return;
  }
  if (ownerId === player.id) {
    pushLog(state, `${player.name} already owns ${tile.name}.`);
    return;
  }
  const owner = findPlayerById(state, ownerId);
  if (!owner || owner.bankrupt) {
    state.tileOwnership[tile.id] = null;
    if (state.structures) {
      state.structures[tile.id] = 0;
    }
    if (state.mortgages) {
      state.mortgages[tile.id] = false;
    }
    state.turn.pendingPurchase = tile.id;
    pushLog(state, `${tile.name} is now unowned. ${player.name} may buy it for $${tile.price}.`);
    return;
  }

  if (state.mortgages?.[tile.id]) {
    pushLog(state, `${tile.name} is mortgaged. No rent is due.`);
    return;
  }

  const houses = state.structures?.[tile.id] ?? 0;
  const rentTable = Array.isArray(tile.rents) ? tile.rents : [];
  let rentValue = rentTable[houses] ?? rentTable[rentTable.length - 1] ?? 0;
  if (
    houses === 0 &&
    tile.group &&
    state.config?.doubleSetRent &&
    ownsFullGroup(state, owner.id, tile.group)
  ) {
    rentValue *= 2;
  }
  transferCash(state, player, owner, rentValue, `${player.name} pays $${rentValue} rent to ${owner.name} for ${tile.name}.`);
}

function resolveRail(state, player, tile) {
  const ownerId = state.tileOwnership[tile.id];
  if (!ownerId) {
    state.turn.pendingPurchase = tile.id;
    pushLog(state, `${tile.name} is unowned. ${player.name} may buy it for $${tile.price}.`);
    return;
  }
  if (ownerId === player.id) {
    pushLog(state, `${player.name} controls ${tile.name}.`);
    return;
  }

  const owner = findPlayerById(state, ownerId);
  if (!owner || owner.bankrupt) {
    state.tileOwnership[tile.id] = null;
    state.turn.pendingPurchase = tile.id;
    if (state.mortgages) {
      state.mortgages[tile.id] = false;
    }
    pushLog(state, `${tile.name} becomes available to buy for $${tile.price}.`);
    return;
  }

  if (state.mortgages?.[tile.id]) {
    pushLog(state, `${tile.name} is mortgaged. No rent is due.`);
    return;
  }

  const ownedRails = owner.owned.filter((id) => {
    const ownedTile = BOARD_TILES.find((t) => t.id === id);
    return ownedTile && ownedTile.type === "rail";
  }).length;
  const rentArray = tile.rent?.length ? tile.rent : [25, 50, 100, 200];
  const rentValue = rentArray[Math.min(ownedRails, rentArray.length) - 1] || rentArray[rentArray.length - 1];

  transferCash(state, player, owner, rentValue, `${player.name} pays $${rentValue} rail rent to ${owner.name}.`);
}

function resolveUtility(state, player, tile, roll) {
  const ownerId = state.tileOwnership[tile.id];
  if (!ownerId) {
    state.turn.pendingPurchase = tile.id;
    pushLog(state, `${tile.name} is unowned. ${player.name} may buy it for $${tile.price}.`);
    return;
  }
  if (ownerId === player.id) {
    pushLog(state, `${player.name} controls ${tile.name}.`);
    return;
  }
  const owner = findPlayerById(state, ownerId);
  if (!owner || owner.bankrupt) {
    state.tileOwnership[tile.id] = null;
    state.turn.pendingPurchase = tile.id;
    if (state.mortgages) {
      state.mortgages[tile.id] = false;
    }
    pushLog(state, `${tile.name} becomes available to buy for $${tile.price}.`);
    return;
  }

  if (state.mortgages?.[tile.id]) {
    pushLog(state, `${tile.name} is mortgaged. No utility fees today.`);
    return;
  }

  const ownedUtilities = owner.owned.filter((id) => {
    const ownedTile = BOARD_TILES.find((t) => t.id === id);
    return ownedTile && ownedTile.type === "utility";
  }).length;
  const multiplier = ownedUtilities >= 2 ? 10 : 4;
  const rentValue = (roll?.total || 0) * multiplier;
  transferCash(state, player, owner, rentValue, `${player.name} pays $${rentValue} utility fees to ${owner.name}.`);
}

function drawAndApplyCard(state, player, deckName) {
  const card = drawCard(state, deckName);
  if (!card) return;
  state.turn.pendingCard = { ...card };
  pushLog(state, `${player.name} draws: ${card.text}`);
  applyCardEffect(state, player, card);
}

function applyCardEffect(state, player, card) {
  switch (card.kind) {
    case "cash":
      player.cash += card.amount;
      if (card.amount >= 0) {
        pushLog(state, `${player.name} gains $${card.amount}.`);
      } else {
        pushLog(state, `${player.name} pays $${Math.abs(card.amount)}.`);
      }
      if (player.cash < 0) {
        activateDebtContext(state, player, "bank");
      } else {
        updateDebtAfterAction(state, player);
      }
      break;
    case "cashEach":
      let totalCollected = 0;
      state.players.forEach((other) => {
        if (other.id === player.id || other.bankrupt) return;
        other.cash -= card.amount;
        totalCollected += card.amount;
        pushLog(state, `${other.name} pays $${card.amount} to ${player.name}.`);
        if (other.cash < 0) {
          activateDebtContext(state, other, player.id);
        } else {
          updateDebtAfterAction(state, other);
        }
      });
      player.cash += totalCollected;
      if (player.cash < 0) {
        activateDebtContext(state, player, "bank");
      } else {
        updateDebtAfterAction(state, player);
      }
      break;
    case "moveTo":
      movePlayerTo(state, player, card.tile, { awardSalary: true, log: card.text });
      break;
    case "moveSteps":
      movePlayerBySteps(state, player, card.steps);
      break;
    case "jail":
      sendPlayerToJail(state, player);
      break;
    case "leaveJail":
      player.heldCards.push({ id: card.id, deck: card.deck, text: card.text, kind: card.kind });
      break;
    default:
      break;
  }

  if (card.keep) {
    // keep cards stay with player until used
  } else {
    const deck = state.decks[card.deck];
    if (deck) {
      deck.discard.push({ ...CARD_LOOKUP[card.id] });
    }
  }

  determineWinner(state);
}

function movePlayerTo(state, player, targetTile, options = {}) {
  const current = player.position;
  const normalizedTarget = ((targetTile % TOTAL_TILES) + TOTAL_TILES) % TOTAL_TILES;
  const path = computeMovementPath(current, computeForwardDistance(current, normalizedTarget));
  state.turn.chainMovements = state.turn.chainMovements || [];
  if (path.length) {
    state.turn.chainMovements.push(path);
  }
  if (options.awardSalary && passesStartExact(current, normalizedTarget)) {
    player.cash += state.config.salary;
    pushLog(state, `${player.name} collects $${state.config.salary} for passing START.`);
    updateDebtAfterAction(state, player);
  }
  player.position = normalizedTarget;
  resolveTile(state, player, { total: 0, dice: [], isDouble: false }, { fromCard: true });
}

function movePlayerBySteps(state, player, steps) {
  const current = player.position;
  const total = ((current + steps) % TOTAL_TILES + TOTAL_TILES) % TOTAL_TILES;
  const path = computeMovementPath(current, steps, { allowNegative: true });
  state.turn.chainMovements = state.turn.chainMovements || [];
  if (path.length) {
    state.turn.chainMovements.push(path);
  }
  player.position = total;
  resolveTile(state, player, { total: Math.abs(steps), dice: [], isDouble: false }, { fromCard: true });
}

function drawCard(state, deckName) {
  const deck = state.decks[deckName];
  if (!deck) return null;
  if (deck.draw.length === 0) {
    deck.draw = shuffle(deck.discard.slice(), state);
    deck.discard = [];
  }
  const card = deck.draw.shift();
  return card ? { ...card } : null;
}

function sendPlayerToJail(state, player, options = {}) {
  player.inJail = true;
  player.jailTurns = 0;
  player.position = BOARD_TILES.find((t) => t.type === "jail")?.id ?? 10;
  state.turn.pendingPurchase = null;
  state.turn.allowExtraRoll = false;
  state.turn.mustEnd = true;
  if (!options.dueToDoubles) {
    state.turn.doublesCount = 0;
  }
}

function transferCash(state, fromPlayer, toPlayer, amount, message) {
  fromPlayer.cash -= amount;
  toPlayer.cash += amount;
  pushLog(state, message);
  if (fromPlayer.cash < 0) {
    const creditor = toPlayer ? toPlayer.id : "bank";
    activateDebtContext(state, fromPlayer, creditor);
  } else {
    updateDebtAfterAction(state, fromPlayer);
  }
  updateDebtAfterAction(state, toPlayer);
}

function releaseProperties(state, playerId) {
  Object.keys(state.tileOwnership).forEach((key) => {
    if (state.tileOwnership[key] === playerId) {
      state.tileOwnership[key] = null;
      if (state.structures) {
        state.structures[key] = 0;
      }
      if (state.mortgages) {
        state.mortgages[key] = false;
      }
    }
  });
  const player = findPlayerById(state, playerId);
  if (player) {
    player.owned = [];
  }
}

function releaseHeldCards(state, player) {
  player.heldCards.forEach((card) => {
    const original = CARD_LOOKUP[card.id];
    if (!original) return;
    const deck = state.decks[card.deck];
    if (deck) {
      deck.discard.push({ ...original });
    }
  });
  player.heldCards = [];
}

function determineWinner(state) {
  const active = state.players.filter((p) => !p.bankrupt);
  if (active.length === 1) {
    const winner = active[0];
    state.meta.winner = winner.id;
    state.turn.phase = "ended";
    pushLog(state, `${winner.name} wins the game!`);
  }
}

function clearPendingTurn(state) {
  state.turn.movement = [];
  state.turn.chainMovements = [];
  state.turn.pendingPurchase = null;
  state.turn.pendingCard = null;
  state.turn.allowExtraRoll = false;
  state.turn.mustEnd = false;
}

function resolveRoll(state, payload) {
  if (payload && Array.isArray(payload.dice) && payload.dice.length === 2) {
    const [d1, d2] = payload.dice;
    return {
      dice: [d1, d2],
      total: d1 + d2,
      isDouble: d1 === d2,
    };
  }
  const die1 = 1 + Math.floor(random(state) * 6);
  const die2 = 1 + Math.floor(random(state) * 6);
  return {
    dice: [die1, die2],
    total: die1 + die2,
    isDouble: die1 === die2,
  };
}

function random(state) {
  if (typeof state.meta?.rngSeed === "number") {
    const nextSeed = (state.meta.rngSeed * 1664525 + 1013904223) >>> 0;
    state.meta.rngSeed = nextSeed;
    return nextSeed / 0x100000000;
  }
  return Math.random();
}

function createDeck(baseCards, state) {
  const shuffled = shuffle(baseCards.slice(), state);
  return {
    draw: shuffled,
    discard: [],
  };
}

function shuffle(cards, state) {
  const arr = cards.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random(state) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function computeMovementPath(start, steps, options = {}) {
  const path = [];
  if (steps === 0) return path;

  if (steps > 0) {
    for (let i = 1; i <= steps; i += 1) {
      path.push((start + i) % TOTAL_TILES);
    }
  } else if (options.allowNegative) {
    for (let i = -1; i >= steps; i -= 1) {
      let pos = start + i;
      while (pos < 0) pos += TOTAL_TILES;
      path.push(pos % TOTAL_TILES);
    }
  }

  return path;
}

function passesStart(position, steps) {
  return position + steps >= TOTAL_TILES;
}

function passesStartExact(start, target) {
  if (target > start) return false;
  return start !== target;
}

function computeForwardDistance(start, target) {
  if (target >= start) {
    return target - start;
  }
  return TOTAL_TILES - start + target;
}

function getCurrentPlayer(state) {
  const index = state.turn.currentIndex ?? 0;
  return state.players[index] || null;
}

function getActivePlayers(state) {
  return state.players.filter((p) => !p.bankrupt);
}

function findPlayerById(state, id) {
  return state.players.find((p) => p.id === id) || null;
}

function findNextActivePlayerIndex(state, startIndex) {
  if (!state.players.length) return 0;
  let index = startIndex;
  for (let i = 0; i < state.players.length; i += 1) {
    index = (index + 1) % state.players.length;
    const candidate = state.players[index];
    if (candidate && !candidate.bankrupt) {
      return index;
    }
  }
  return startIndex;
}

function canBuyCurrentTile(state) {
  const player = getCurrentPlayer(state);
  if (!player || player.bankrupt) return false;
  if (typeof state.turn.pendingPurchase !== "number") return false;
  const tile = BOARD_TILES.find((t) => t.id === state.turn.pendingPurchase);
  if (!tile) return false;
  return !state.tileOwnership[tile.id] && player.cash >= tile.price;
}

export function ownsFullGroup(state, playerId, group) {
  if (!group || !playerId) return false;
  const tiles = BOARD_TILES.filter((tile) => tile.type === "property" && tile.group === group);
  if (!tiles.length) return false;
  return tiles.every((tile) => state.tileOwnership[tile.id] === playerId);
}

export function canBuildHere(state, playerId, tileId) {
  if (typeof tileId !== "number" || !playerId) return false;
  const tile = BOARD_TILES.find((t) => t.id === tileId && t.type === "property");
  if (!tile) return false;
  if (!isBuildSellPhase(state)) return false;
  if (!isPlayersTurn(state, playerId)) return false;
  if (state.tileOwnership[tileId] !== playerId) return false;
  if (!ownsFullGroup(state, playerId, tile.group)) return false;
  if (state.mortgages?.[tileId]) return false;
  if (groupHasMortgaged(state, tile.group)) return false;
  const player = findPlayerById(state, playerId);
  if (!player || player.bankrupt) return false;
  const houses = state.structures?.[tileId] ?? 0;
  if (houses >= 5) return false;
  if (player.cash < tile.houseCost) return false;
  if (!state.config.evenBuild) return true;
  return wouldKeepEven(state, tileId, +1);
}

export function canSellHere(state, playerId, tileId) {
  if (typeof tileId !== "number" || !playerId) return false;
  const tile = BOARD_TILES.find((t) => t.id === tileId && t.type === "property");
  if (!tile) return false;
  if (!isBuildSellPhase(state)) return false;
  if (!isPlayersTurn(state, playerId)) return false;
  if (state.tileOwnership[tileId] !== playerId) return false;
  if (!ownsFullGroup(state, playerId, tile.group)) return false;
  const houses = state.structures?.[tileId] ?? 0;
  if (houses <= 0) return false;
  if (!state.config.evenBuild) return true;
  return wouldKeepEven(state, tileId, -1);
}

export function canMortgageHere(state, playerId, tileId) {
  if (typeof tileId !== "number" || !playerId) return false;
  const tile = getMortgageableTile(tileId);
  if (!tile) return false;
  const player = findPlayerById(state, playerId);
  if (!player || player.bankrupt) return false;
  const debtOverride = state.debtContext?.active && getCurrentPlayer(state)?.id === playerId;
  if (!isPlayersTurn(state, playerId) && !debtOverride) return false;
  if (state.tileOwnership[tileId] !== playerId) return false;
  if (state.mortgages?.[tileId]) return false;
  if (tile.type === "property") {
    const houses = state.structures?.[tileId] ?? 0;
    if (houses > 0) return false;
    if (groupHasHouses(state, tile.group)) return false;
  }
  return true;
}

export function canUnmortgageHere(state, playerId, tileId) {
  if (typeof tileId !== "number" || !playerId) return false;
  const tile = getMortgageableTile(tileId);
  if (!tile) return false;
  const player = findPlayerById(state, playerId);
  if (!player || player.bankrupt) return false;
  const debtOverride = state.debtContext?.active && getCurrentPlayer(state)?.id === playerId;
  if (!isPlayersTurn(state, playerId) && !debtOverride) return false;
  if (state.tileOwnership[tileId] !== playerId) return false;
  if (!state.mortgages?.[tileId]) return false;
  const cost = getUnmortgageCost(tile);
  if (player.cash < cost) return false;
  return true;
}

function isPlayersTurn(state, playerId) {
  const current = getCurrentPlayer(state);
  return current ? current.id === playerId : false;
}

function isBuildSellPhase(state) {
  if (state.debtContext?.active) return true;
  if (state.turn.mustEnd) return false;
  return state.turn.phase === "idle" || state.turn.phase === "resolved";
}

function wouldKeepEven(state, tileId, delta) {
  const current = state.structures?.[tileId] ?? 0;
  const nextCount = current + delta;
  if (nextCount < 0 || nextCount > 5) return false;

  const tile = BOARD_TILES.find((t) => t.id === tileId && t.type === "property");
  if (!tile || !tile.group) return false;
  const groupTiles = BOARD_TILES.filter((t) => t.type === "property" && t.group === tile.group);
  if (!groupTiles.length) return false;

  const counts = groupTiles.map((groupTile) => {
    if (groupTile.id === tileId) {
      return nextCount;
    }
    return state.structures?.[groupTile.id] ?? 0;
  });
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  return max - min <= 1;
}

function getGroupProperties(group) {
  if (!group) return [];
  return BOARD_TILES.filter((tile) => tile.type === "property" && tile.group === group);
}

function groupHasMortgaged(state, group) {
  if (!group) return false;
  if (!state.mortgages) return false;
  return getGroupProperties(group).some((tile) => Boolean(state.mortgages[tile.id]));
}

function groupHasHouses(state, group) {
  if (!group) return false;
  if (!state.structures) return false;
  return getGroupProperties(group).some((tile) => (state.structures[tile.id] ?? 0) > 0);
}

function getMortgageableTile(tileId) {
  return BOARD_TILES.find((tile) =>
    tile.id === tileId && (tile.type === "property" || tile.type === "rail" || tile.type === "utility")
  );
}

function getUnmortgageCost(tile) {
  return Math.ceil((tile.mortgage || 0) * (1 + MORTGAGE_INTEREST_RATE));
}

function pushLog(state, message) {
  const entry = {
    id: ++state.meta.logCounter,
    text: message,
    timestamp: Date.now(),
  };
  state.log.push(entry);
  const limit = state.config.logLimit || 40;
  if (state.log.length > limit) {
    state.log.splice(0, state.log.length - limit);
  }
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function createEmptyOwnership() {
  const ownership = {};
  BOARD_TILES.forEach((tile) => {
    ownership[tile.id] = null;
  });
  return ownership;
}

function createEmptyStructures() {
  const houses = {};
  BOARD_TILES.forEach((tile) => {
    if (tile.type === "property") {
      houses[tile.id] = 0;
    }
  });
  return houses;
}

function createEmptyMortgages() {
  const mortgages = {};
  BOARD_TILES.forEach((tile) => {
    if (tile.type === "property" || tile.type === "rail" || tile.type === "utility") {
      mortgages[tile.id] = false;
    }
  });
  return mortgages;
}

function ensureStructures(state) {
  if (!state.structures) {
    state.structures = createEmptyStructures();
  }
  return state.structures;
}

function ensureMortgages(state) {
  if (!state.mortgages) {
    state.mortgages = createEmptyMortgages();
  }
  return state.mortgages;
}

function applyMortgage(state, player, tile) {
  const mortgages = ensureMortgages(state);
  mortgages[tile.id] = true;
  player.cash += tile.mortgage;
  pushLog(state, `${player.name} mortgages ${tile.name} for $${tile.mortgage}.`);
}

function applyUnmortgage(state, player, tile) {
  const mortgages = ensureMortgages(state);
  const cost = getUnmortgageCost(tile);
  player.cash -= cost;
  mortgages[tile.id] = false;
  pushLog(state, `${player.name} unmortgages ${tile.name} by paying $${cost}.`);
}

function ensureDebtContext(state) {
  if (!state.debtContext) {
    state.debtContext = {
      active: false,
      amountOwed: 0,
      creditor: null,
    };
  }
  return state.debtContext;
}

function activateDebtContext(state, player, creditor = "bank") {
  const debt = ensureDebtContext(state);
  const amount = Math.max(0, -player.cash);
  if (amount <= 0) {
    return;
  }
  debt.active = true;
  debt.amountOwed = Math.max(debt.amountOwed || 0, amount);
  debt.creditor = creditor;
  state.turn.debtLocked = true;
}

function updateDebtAfterAction(state, player) {
  const debt = ensureDebtContext(state);
  if (!debt.active) {
    return;
  }
  const remaining = Math.max(0, -player.cash);
  debt.amountOwed = remaining;
  if (remaining <= 0) {
    debt.active = false;
    debt.amountOwed = 0;
    debt.creditor = null;
    state.turn.debtLocked = false;
  }
}

function removeOwnedProperty(player, tileId) {
  const index = player.owned.indexOf(tileId);
  if (index >= 0) {
    player.owned.splice(index, 1);
  }
}

function addOwnedProperty(player, tileId) {
  if (!player.owned.includes(tileId)) {
    player.owned.push(tileId);
  }
}

function transferPropertyOwnership(state, fromPlayer, toPlayer, tileId) {
  state.tileOwnership[tileId] = toPlayer ? toPlayer.id : null;
  if (fromPlayer) {
    removeOwnedProperty(fromPlayer, tileId);
  }
  if (toPlayer) {
    addOwnedProperty(toPlayer, tileId);
  }
}


function attemptAutoSellHouse(state, player) {
  ensureStructures(state);
  const ownedProperties = player.owned
    .map((id) => BOARD_TILES.find((tile) => tile.id === id && tile.type === "property"))
    .filter(Boolean)
    .sort((a, b) => {
      const housesA = state.structures[a.id] ?? 0;
      const housesB = state.structures[b.id] ?? 0;
      if (housesA !== housesB) return housesB - housesA;
      return (b.mortgage || 0) - (a.mortgage || 0);
    });

  for (const tile of ownedProperties) {
    const houses = state.structures[tile.id] ?? 0;
    if (houses <= 0) continue;
    if (!canSellHere(state, player.id, tile.id)) continue;
    const refund = Math.floor(tile.houseCost / 2);
    state.structures[tile.id] = houses - 1;
    player.cash += refund;
    pushLog(state, `${player.name} auto-sells a house on ${tile.name} (+$${refund}).`);
    return true;
  }
  return false;
}

function attemptAutoMortgage(state, player) {
  ensureMortgages(state);
  const candidates = player.owned
    .map((id) => getMortgageableTile(id))
    .filter((tile) => tile && !state.mortgages?.[tile.id])
    .sort((a, b) => (b.mortgage || 0) - (a.mortgage || 0));

  for (const tile of candidates) {
    if (!canMortgageHere(state, player.id, tile.id)) continue;
    applyMortgage(state, player, tile);
    return true;
  }
  return false;
}

function autoLiquidate(state) {
  const player = getCurrentPlayer(state);
  if (!player || player.bankrupt) return;
  ensureStructures(state);
  ensureMortgages(state);

  let changed = true;
  while (player.cash < 0 && changed) {
    changed = false;
    if (attemptAutoSellHouse(state, player)) {
      changed = true;
      continue;
    }
    if (attemptAutoMortgage(state, player)) {
      changed = true;
    }
  }

  updateDebtAfterAction(state, player);
}

function clearDebtContext(state) {
  ensureDebtContext(state);
  state.debtContext.active = false;
  state.debtContext.amountOwed = 0;
  state.debtContext.creditor = null;
  state.turn.debtLocked = false;
}

function finalizeBankruptcy(state, player, creditorId = "bank") {
  if (!player || player.bankrupt) return;
  ensureStructures(state);
  ensureMortgages(state);

  const ownedTiles = [...player.owned];
  ownedTiles.forEach((tileId) => {
    const tile = BOARD_TILES.find((t) => t.id === tileId && t.type === "property");
    if (!tile) return;
    const houses = state.structures[tileId] ?? 0;
    if (houses > 0) {
      const refund = houses * Math.floor(tile.houseCost / 2);
      if (refund > 0) {
        player.cash += refund;
        pushLog(state, `${player.name} liquidates structures on ${tile.name} (+$${refund}).`);
      }
      state.structures[tileId] = 0;
    }
  });

  const creditor = creditorId && creditorId !== "bank" ? findPlayerById(state, creditorId) : null;

  if (creditor) {
    ownedTiles.forEach((tileId) => {
      transferPropertyOwnership(state, player, creditor, tileId);
    });
    const payment = Math.max(0, player.cash);
    if (payment > 0) {
      creditor.cash += payment;
    }
    player.cash = 0;
    pushLog(state, `${player.name} declares bankruptcy to ${creditor.name}. Assets transfer to creditor.`);
  } else {
    releaseProperties(state, player.id);
    pushLog(state, `${player.name} declares bankruptcy to the bank. Assets return to the bank.`);
    player.cash = 0;
  }

  clearDebtContext(state);
  cancelTradesForPlayer(state, player.id);
  state.tradeDraft = createEmptyTradeDraft();
  state.activeTradeId = null;

  player.bankrupt = true;
  player.position = -1;
  player.inJail = false;
  player.jailTurns = 0;
  releaseHeldCards(state, player);
  state.turn.mustEnd = true;
  determineWinner(state);
}

function createInitialTurn() {
  return {
    currentIndex: 0,
    doublesCount: 0,
    phase: "idle",
    lastRoll: null,
    movement: [],
    chainMovements: [],
    pendingPurchase: null,
    pendingCard: null,
    allowExtraRoll: false,
    mustEnd: false,
    debtLocked: false,
  };
}

function defaultColors() {
  return ["#E74C3C", "#3498DB", "#27AE60", "#9B59B6", "#F1C40F", "#1ABC9C"];
}

function seedStringToNumber(seed) {
  let hash = 0;
  const normalized = String(seed);
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}
