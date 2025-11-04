import { BOARD_TILES } from "./board.js";

const TOTAL_TILES = BOARD_TILES.length;
const DEFAULT_CONFIG = {
  salary: 200,
  bail: 50,
  maxPlayers: 6,
  startCash: 1500,
  logLimit: 40,
};

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
    turn: createInitialTurn(),
    decks: {
      surprise: { draw: [], discard: [] },
      treasure: { draw: [], discard: [] },
    },
    log: [],
    config: mergedConfig,
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
  pushLog(next, `${player.name} buys ${tile.name} for $${tile.price}.`);

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
  checkBankruptcy(next, player);
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

  checkBankruptcy(state, player);
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
      checkBankruptcy(state, player);
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
    state.turn.pendingPurchase = tile.id;
    pushLog(state, `${tile.name} is now unowned. ${player.name} may buy it for $${tile.price}.`);
    return;
  }

  const ownsGroup = owner.owned.filter((id) => {
    const ownedTile = BOARD_TILES.find((t) => t.id === id);
    return ownedTile && ownedTile.group === tile.group;
  });
  const groupTiles = BOARD_TILES.filter((t) => t.group === tile.group);
  const rentValue = ownsGroup.length === groupTiles.length ? tile.baseRent * 2 : tile.baseRent;

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
    pushLog(state, `${tile.name} becomes available to buy for $${tile.price}.`);
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
    pushLog(state, `${tile.name} becomes available to buy for $${tile.price}.`);
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
      checkBankruptcy(state, player);
      break;
    case "cashEach":
      let totalCollected = 0;
      state.players.forEach((other) => {
        if (other.id === player.id || other.bankrupt) return;
        other.cash -= card.amount;
        totalCollected += card.amount;
        pushLog(state, `${other.name} pays $${card.amount} to ${player.name}.`);
        checkBankruptcy(state, other);
      });
      player.cash += totalCollected;
      checkBankruptcy(state, player);
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
  const fromBankrupt = checkBankruptcy(state, fromPlayer);
  if (!fromBankrupt) {
    checkBankruptcy(state, toPlayer);
  }
}

function checkBankruptcy(state, player) {
  if (player.bankrupt) return true;
  if (player.cash >= 0) return false;

  pushLog(state, `${player.name} is bankrupt and out of the game.`);
  player.bankrupt = true;
  player.cash = 0;
  player.position = -1;
  player.inJail = false;
  player.jailTurns = 0;
  releaseProperties(state, player.id);
  releaseHeldCards(state, player);
  state.turn.mustEnd = true;
  determineWinner(state);
  return true;
}

function releaseProperties(state, playerId) {
  Object.keys(state.tileOwnership).forEach((key) => {
    if (state.tileOwnership[key] === playerId) {
      state.tileOwnership[key] = null;
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
