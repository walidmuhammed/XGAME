import { BOARD_TILES } from "./board.js";
import { selectors } from "./rules.js";

export function createUI({ elements, boardApi, onIntent, getState }) {
  const uiState = {
    selectedTileId: null,
    lastCardId: null,
  };

  const tileData = BOARD_TILES;

  elements.rollBtn.addEventListener("click", () => onIntent({ type: "ROLL_DICE" }));
  elements.buyBtn.addEventListener("click", () => onIntent({ type: "BUY_PROPERTY" }));
  elements.endBtn.addEventListener("click", () => onIntent({ type: "END_TURN" }));
  elements.payBailBtn.addEventListener("click", () => onIntent({ type: "PAY_BAIL" }));
  elements.useCardBtn.addEventListener("click", () => onIntent({ type: "USE_LEAVE_JAIL_CARD" }));
  elements.newGameBtn.addEventListener("click", () => openSetupModal());
  elements.cancelSetupBtn.addEventListener("click", () => closeSetupModal());
  elements.playerCount.addEventListener("change", () => rebuildPlayerConfig());
  elements.winOkBtn.addEventListener("click", () => {
    closeWinModal();
    openSetupModal();
  });
  elements.cardOkBtn.addEventListener("click", () => hideCardModal());

  boardApi.onTileSelect((tile, index) => {
    uiState.selectedTileId = index;
    boardApi.setSelectedTile(index);
    renderTileDetail();
  });

  elements.setupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = readSetupForm();
    if (formData.players.length < 2) {
      return;
    }
    closeSetupModal();
    onIntent({ type: "NEW_GAME", payload: { players: formData.players, seed: formData.seed } });
  });

  function refresh() {
    const state = getState();
    renderHeader(state);
    renderButtons(state);
    renderPlayers(state);
    renderLog(state);
    renderTileDetail(state);
    maybeShowCard(state);
    maybeShowWinner(state);
  }

  function renderHeader(state) {
    const player = selectors.getCurrentPlayer(state);
    if (player) {
      elements.currentPlayer.innerHTML = `
        <span class="badge" style="background:${player.color}"></span>
        ${escapeHtml(player.name)} — $${player.cash}
      `;
    } else {
      elements.currentPlayer.textContent = "No active player";
    }

    if (elements.turnInfo) {
      let info = "";
      if (player) {
        if (player.bankrupt) {
          info = `${player.name} is bankrupt.`;
        } else if (player.inJail) {
          const attempts = Math.max(0, player.jailTurns);
          info = `${player.name} is in Jail (attempt ${attempts} of 3).`;
        } else if (state.turn.pendingPurchase != null) {
          const tile = tileData.find((t) => t.id === state.turn.pendingPurchase);
          if (tile) {
            info = `${player.name} can buy ${tile.name} for $${tile.price}.`;
          }
        } else if (state.turn.allowExtraRoll) {
          info = "Roll again for doubles.";
        }
      }
      elements.turnInfo.textContent = info;
    }

    if (state.turn.lastRoll) {
      const [d1, d2] = state.turn.lastRoll.dice;
      elements.diceResult.textContent = `🎲 ${d1} + ${d2} = ${state.turn.lastRoll.total}`;
    } else {
      elements.diceResult.textContent = "Roll to start";
    }

    if (player) {
      uiState.selectedTileId ??= player.position;
      boardApi.setSelectedTile(uiState.selectedTileId);
    }
  }

  function renderButtons(state) {
    const player = selectors.getCurrentPlayer(state);
    const hasWinner = selectors.hasWinner(state);
    const canRoll = !hasWinner && player && !player.bankrupt && state.turn.phase === "idle";
    const canBuy = !hasWinner && selectors.canBuyCurrentTile(state);
    const canEnd = !hasWinner && player && !player.bankrupt && (state.turn.phase === "resolved" || state.turn.allowExtraRoll || state.turn.mustEnd);
    const canPayBail = !hasWinner && player && player.inJail && !player.bankrupt && state.turn.phase === "idle" && player.cash >= state.config.bail;
    const canUseCard = !hasWinner && player && player.inJail && player.heldCards.some((card) => card.kind === "leaveJail");

    elements.rollBtn.disabled = !canRoll;
    elements.buyBtn.disabled = !canBuy;
    elements.endBtn.disabled = !canEnd;
    elements.payBailBtn.disabled = !canPayBail;
    elements.useCardBtn.disabled = !canUseCard;
  }

  function renderPlayers(state) {
    elements.playerList.innerHTML = "";
    state.players.forEach((player, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="player-name">
          <span class="badge" style="background:${player.color}"></span>
          ${escapeHtml(player.name)}
        </span>
        <span class="player-cash">$${player.cash}${player.bankrupt ? " (out)" : ""}</span>
      `;
      if (state.turn.currentIndex === index && !player.bankrupt) {
        li.classList.add("active");
      }
      li.addEventListener("click", () => {
        uiState.selectedTileId = player.position;
        boardApi.setSelectedTile(uiState.selectedTileId);
        renderTileDetail(state);
      });
      elements.playerList.appendChild(li);
    });
  }

  function renderLog(state) {
    elements.logList.innerHTML = "";
    state.log.slice().reverse().forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = entry.text;
      elements.logList.appendChild(li);
    });
  }

  function renderTileDetail(state = getState()) {
    const tileId = uiState.selectedTileId;
    const tile = tileData.find((t) => t.id === tileId);
    if (!tile) {
      elements.tileDetail.textContent = "Select a tile";
      return;
    }
    const ownerId = state.tileOwnership?.[tileId];
    const owner = state.players.find((p) => p.id === ownerId);
    const lines = [];
    lines.push(`<strong>${escapeHtml(tile.name)}</strong>`);
    lines.push(`<span class="detail-type">${formatTileType(tile.type)}</span>`);
    if (tile.price) {
      lines.push(`Price: $${tile.price}`);
    }
    if (tile.type === "property") {
      lines.push(`Base rent: $${tile.baseRent}`);
    }
    if (tile.type === "rail") {
      lines.push(`Rent: ${tile.rent.join(" / ")}`);
    }
    if (tile.type === "utility") {
      lines.push("Rent: 4× or 10× dice");
    }
    if (tile.type === "tax") {
      lines.push(`Pay: $${tile.tax}`);
    }
    if (owner) {
      lines.push(`Owner: <span style="color:${owner.color}">${escapeHtml(owner.name)}</span>`);
    } else if (tile.type === "property" || tile.type === "rail" || tile.type === "utility") {
      lines.push("Owner: Bank");
    }
    elements.tileDetail.innerHTML = lines.map((line) => `<div>${line}</div>`).join("");
  }

  function maybeShowCard(state) {
    const card = state.turn.pendingCard;
    if (card && uiState.lastCardId !== card.id) {
      elements.cardTitle.textContent = card.deck === "surprise" ? "Surprise Card" : "Treasure Card";
      elements.cardText.textContent = card.text;
      elements.cardModal.classList.remove("hidden");
      elements.cardModal.setAttribute("aria-hidden", "false");
      uiState.lastCardId = card.id;
    } else if (!card) {
      hideCardModal();
    }
  }

  function maybeShowWinner(state) {
    if (!state.meta.winner) {
      closeWinModal();
      return;
    }
    const winner = state.players.find((p) => p.id === state.meta.winner);
    if (!winner) return;
    elements.winText.textContent = `${winner.name} wins with $${winner.cash}!`;
    elements.winModal.classList.remove("hidden");
    elements.winModal.setAttribute("aria-hidden", "false");
  }

  function openSetupModal() {
    rebuildPlayerConfig();
    elements.setupModal.classList.remove("hidden");
    elements.setupModal.setAttribute("aria-hidden", "false");
  }

  function closeSetupModal() {
    elements.setupModal.classList.add("hidden");
    elements.setupModal.setAttribute("aria-hidden", "true");
  }

  function hideCardModal() {
    elements.cardModal.classList.add("hidden");
    elements.cardModal.setAttribute("aria-hidden", "true");
    const current = getState().turn?.pendingCard;
    uiState.lastCardId = current ? current.id : null;
  }

  function closeWinModal() {
    elements.winModal.classList.add("hidden");
    elements.winModal.setAttribute("aria-hidden", "true");
  }

  function rebuildPlayerConfig() {
    const count = clampPlayerCount(parseInt(elements.playerCount.value, 10) || 3);
    elements.playerCount.value = String(count);
    elements.playerConfig.innerHTML = "";
    const defaults = ["#E74C3C", "#3498DB", "#27AE60", "#9B59B6", "#F1C40F", "#1ABC9C"];
    for (let i = 0; i < count; i += 1) {
      const row = document.createElement("div");
      row.className = "player-config-row";
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.name = `player-name-${i}`;
      nameInput.value = `Player ${i + 1}`;
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.name = `player-color-${i}`;
      colorInput.value = defaults[i % defaults.length];
      row.appendChild(nameInput);
      row.appendChild(colorInput);
      elements.playerConfig.appendChild(row);
    }
  }

  function readSetupForm() {
    const count = clampPlayerCount(parseInt(elements.playerCount.value, 10) || 3);
    const rows = Array.from(elements.playerConfig.children).slice(0, count);
    const players = rows.map((row, index) => {
      const [nameInput, colorInput] = row.querySelectorAll("input");
      return {
        name: nameInput.value.trim() || `Player ${index + 1}`,
        color: colorInput.value,
      };
    });
    const seedField = elements.setupForm.querySelector("#seed-input");
    return {
      players,
      seed: seedField ? seedField.value.trim() || undefined : undefined,
    };
  }

  function renderSetupExtras() {
    if (!elements.setupForm.querySelector("#seed-input")) {
      const seedRow = document.createElement("div");
      seedRow.className = "form-row";
      seedRow.innerHTML = `
        <label for="seed-input">Seed (optional)</label>
        <input type="text" id="seed-input" placeholder="Type to replay a setup">
      `;
      elements.setupForm.insertBefore(seedRow, elements.playerConfig);
    }
  }

  function clampPlayerCount(value) {
    if (Number.isNaN(value)) return 3;
    return Math.min(6, Math.max(2, value));
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return char;
      }
    });
  }

  function formatTileType(type) {
    switch (type) {
      case "start":
        return "Start";
      case "property":
        return "Property";
      case "rail":
        return "Rail";
      case "utility":
        return "Utility";
      case "tax":
        return "Tax";
      case "jail":
        return "Jail";
      case "gotojail":
        return "Go To Jail";
      case "free":
        return "Free Park";
      case "surprise":
        return "Surprise";
      case "treasure":
        return "Treasure";
      default:
        return type;
    }
  }

  renderSetupExtras();
  rebuildPlayerConfig();

  return {
    refresh,
    openSetup: openSetupModal,
    closeSetup: closeSetupModal,
    setSelectedTile(tileId) {
      uiState.selectedTileId = tileId;
      boardApi.setSelectedTile(tileId);
      renderTileDetail();
    },
    resetCardTracker() {
      uiState.lastCardId = null;
    },
  };
}
