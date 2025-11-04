import { BOARD_TILES } from "./board.js";

const TOTAL_TILES = BOARD_TILES.length;
const DEFAULT_CONFIG = {
  salary: 200,
  bail: 50,
  maxPlayers: 6,
  startCash: 1500,
  logLimit: 40,
  evenBuild: true,
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
    pendingTrade: null,
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
      tradeCounter: 0,
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
    case "MORTGAGE_PROPERTY":
      return handleMortgageProperty(state, intent.payload || {});
    case "UNMORTGAGE_PROPERTY":
      return handleUnmortgageProperty(state, intent.payload || {});
    case "OPEN_TRADE":
      return handleOpenTrade(state, intent.payload || {});
    case "PROPOSE_TRADE":
      return handleProposeTrade(state, intent.payload || {});
    case "COUNTER_TRADE":
      return handleCounterTrade(state, intent.payload || {});
    case "ACCEPT_TRADE":
      return handleAcceptTrade(state);
    case "DECLINE_TRADE":
      return handleDeclineTrade(state);
    case "CANCEL_TRADE":
      return handleCancelTrade(state);
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
  getPendingTrade: (state) => state.pendingTrade,
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

  base.config.evenBuild = payload.evenBuild ?? true;
  base.pendingTrade = null;
  base.debtContext = {
    active: false,
    amountOwed: 0,
    creditor: null,
  };
  base.meta.tradeCounter = 0;

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

function handleOpenTrade(state, payload) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const partnerId = payload?.partnerId;
  const partner = findPlayerById(next, partnerId);
  if (!partner || partner.bankrupt || partner.id === player.id) return next;
  next.pendingTrade = {
    id: createTradeId(next),
    from: player.id,
    to: partner.id,
    offer: { cash: 0, properties: [] },
    request: { cash: 0, properties: [] },
    status: "proposed",
    awaiting: partner.id,
  };
  pushLog(next, `${player.name} opens a trade discussion with ${partner.name}.`);
  return next;
}

function handleProposeTrade(state, payload) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const trade = next.pendingTrade;
  if (!trade || trade.from !== player.id) return next;
  const offer = normalizeTradeSide(next, trade.from, payload?.offer);
  const request = normalizeTradeSide(next, trade.to, payload?.request);
  trade.offer = offer;
  trade.request = request;
  trade.status = "proposed";
  trade.awaiting = trade.to;
  const partner = findPlayerById(next, trade.to);
  if (partner) {
    pushLog(next, `${player.name} proposes a trade with ${partner.name}.`);
  }
  return next;
}

function handleCounterTrade(state, payload) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player || player.bankrupt) return next;
  const trade = next.pendingTrade;
  if (!trade || trade.to !== player.id) return next;
  const offer = normalizeTradeSide(next, trade.from, payload?.offer);
  const request = normalizeTradeSide(next, trade.to, payload?.request);
  trade.offer = offer;
  trade.request = request;
  trade.status = "countered";
  trade.awaiting = trade.from;
  const initiator = findPlayerById(next, trade.from);
  if (initiator) {
    pushLog(next, `${player.name} counters the trade proposal from ${initiator.name}.`);
  }
  return next;
}

function handleDeclineTrade(state) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player) return next;
  const trade = next.pendingTrade;
  if (!trade) return next;
  if (trade.awaiting !== player.id && trade.from !== player.id && trade.to !== player.id) return next;
  const otherId = trade.from === player.id ? trade.to : trade.from;
  const other = findPlayerById(next, otherId);
  if (other) {
    pushLog(next, `${player.name} declines the trade with ${other.name}.`);
  }
  next.pendingTrade = null;
  return next;
}

function handleCancelTrade(state) {
  const next = cloneState(state);
  const player = getCurrentPlayer(next);
  if (!player) return next;
  const trade = next.pendingTrade;
  if (!trade || trade.from !== player.id) return next;
  const partner = findPlayerById(next, trade.to);
  if (partner) {
    pushLog(next, `${player.name} cancels the trade with ${partner.name}.`);
  }
  next.pendingTrade = null;
  return next;
}

function handleAcceptTrade(state) {
  const next = cloneState(state);
  const responder = getCurrentPlayer(next);
  if (!responder || responder.bankrupt) return next;
  const trade = next.pendingTrade;
  if (!trade || trade.awaiting !== responder.id) return next;

  const initiator = findPlayerById(next, trade.from);
  const partner = findPlayerById(next, trade.to);
  if (!initiator || !partner || initiator.bankrupt || partner.bankrupt) {
    next.pendingTrade = null;
    return next;
  }

  const offer = normalizeTradeSide(next, trade.from, trade.offer);
  const request = normalizeTradeSide(next, trade.to, trade.request);

  if (offer.properties.length !== trade.offer.properties.length || request.properties.length !== trade.request.properties.length) {
    // underlying ownership changed; invalidate trade
    next.pendingTrade = null;
    pushLog(next, `Trade canceled because terms are no longer valid.`);
    return next;
  }

  const fromCashAfter = initiator.cash - offer.cash + request.cash;
  const toCashAfter = partner.cash - request.cash + offer.cash;
  if (fromCashAfter < 0 || toCashAfter < 0) {
    pushLog(next, `Trade rejected: insufficient funds to complete the exchange.`);
    return next;
  }

  // final validation that properties still owned
  const offerValid = offer.properties.every((tileId) => next.tileOwnership[tileId] === initiator.id);
  const requestValid = request.properties.every((tileId) => next.tileOwnership[tileId] === partner.id);
  if (!offerValid || !requestValid) {
    next.pendingTrade = null;
    pushLog(next, `Trade canceled because property ownership changed.`);
    return next;
  }

  initiator.cash = fromCashAfter;
  partner.cash = toCashAfter;

  offer.properties.forEach((tileId) => {
    transferPropertyOwnership(next, initiator, partner, tileId);
  });
  request.properties.forEach((tileId) => {
    transferPropertyOwnership(next, partner, initiator, tileId);
  });

  next.pendingTrade = null;
  const offerDesc = describeTradeSide(next, offer);
  const requestDesc = describeTradeSide(next, request);
  pushLog(next, `${responder.name} accepts the trade. ${initiator.name} gives ${offerDesc}; ${partner.name} gives ${requestDesc}.`);

  updateDebtAfterAction(next, initiator);
  updateDebtAfterAction(next, partner);
  return next;
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
  const rentValue = rentTable[houses] ?? rentTable[rentTable.length - 1] ?? 0;
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

function createTradeId(state) {
  if (!state.meta) {
    state.meta = {};
  }
  state.meta.tradeCounter = (state.meta.tradeCounter || 0) + 1;
  return `trade-${state.meta.tradeCounter}`;
}

function normalizeTradeSide(state, ownerId, side) {
  const result = {
    cash: 0,
    properties: [],
  };
  if (!side) return result;
  const cashValue = Number(side.cash);
  if (Number.isFinite(cashValue) && cashValue > 0) {
    result.cash = Math.max(0, Math.floor(cashValue));
  }
  const props = Array.isArray(side.properties) ? side.properties : [];
  const unique = new Set();
  props.forEach((value) => {
    const tileId = typeof value === "number" ? value : parseInt(value, 10);
    if (!Number.isInteger(tileId)) return;
    if (state.tileOwnership?.[tileId] !== ownerId) return;
    const tile = getMortgageableTile(tileId);
    if (!tile) return;
    unique.add(tileId);
  });
  result.properties = Array.from(unique.values());
  return result;
}

function describeTradeSide(state, side) {
  const parts = [];
  if (side.cash > 0) {
    parts.push(`$${side.cash}`);
  }
  if (side.properties.length) {
    const names = side.properties.map((tileId) => getTileName(tileId));
    parts.push(names.join(", "));
  }
  if (!parts.length) {
    return "nothing";
  }
  return parts.join(" + ");
}

function getTileName(tileId) {
  const tile = BOARD_TILES.find((t) => t.id === tileId);
  return tile ? tile.name : `Tile ${tileId}`;
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
  state.pendingTrade = null;

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
