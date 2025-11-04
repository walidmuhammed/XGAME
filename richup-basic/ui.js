import { BOARD_TILES, renderDiceOverlay } from "./board.js";
import { selectors, canBuildHere, canSellHere, canMortgageHere, canUnmortgageHere } from "./rules.js";

export function createUI({ elements, boardApi, onIntent, getState }) {
  const uiState = {
    selectedTileId: null,
    lastCardId: null,
    debtModalOpen: false,
    diceTimeout: null,
    chatMessages: [],
    lastChatLogId: 0,
    toastTimeout: null,
    tradePickerOpen: false,
    tradeComposerOpen: false,
    tradeInboundOpen: false,
    inboundThreadId: null,
    composerMode: "create",
    composerThreadId: null,
    lastInboundThreadId: null,
    inboundCanCancel: false,
    tradeComposerJustOpened: false,
    activePropTileId: null,
  };

  const tileData = BOARD_TILES;
  const groupPalette = {
    coral: "#f08fb8",
    amber: "#f7b733",
    verdant: "#52e0a1",
    azure: "#5caee3",
    sunset: "#f7a36d",
    crimson: "#ff6f7c",
    indigo: "#6574ff",
    aurora: "#b482ff",
  };
  const quickColors = ["#E74C3C", "#3498DB", "#F1C40F", "#2ECC71", "#9B59B6", "#E67E22"];
  let propCardFrame = null;

  if (elements.mortgageBtn) {
    elements.mortgageBtn.addEventListener("click", () => {
      if (uiState.selectedTileId != null) {
        onIntent({ type: "MORTGAGE_PROPERTY", payload: { tileId: uiState.selectedTileId } });
      }
    });
  }
  if (elements.unmortgageBtn) {
    elements.unmortgageBtn.addEventListener("click", () => {
      if (uiState.selectedTileId != null) {
        onIntent({ type: "UNMORTGAGE_PROPERTY", payload: { tileId: uiState.selectedTileId } });
      }
    });
  }
  if (elements.appearanceBtn) {
    elements.appearanceBtn.addEventListener("click", () => openAppearanceModal());
  }
  if (elements.tradeCreate) {
    elements.tradeCreate.addEventListener("click", () => {
      openTradePicker();
      onIntent({ type: "OPEN_TRADE_PICKER" });
    });
  }
  if (elements.tradeThreads) {
    elements.tradeThreads.addEventListener("click", handleTradeThreadClick);
  }
  if (elements.tradePickList) {
    elements.tradePickList.addEventListener("click", handleTradePickClick);
  }
  if (elements.tradePickModal) {
    elements.tradePickModal.addEventListener("click", (event) => {
      if (event.target.dataset.tradeClose !== undefined || event.target === elements.tradePickModal) {
        closeTradePicker();
        onIntent({ type: "CLOSE_TRADE_UI" });
      }
    });
  }
  if (elements.tcFromCash) {
    elements.tcFromCash.addEventListener("input", (event) => {
      onIntent({ type: "TRADE_SET_CASH", payload: { side: "from", value: Number(event.target.value) || 0 } });
    });
  }
  if (elements.tcToCash) {
    elements.tcToCash.addEventListener("input", (event) => {
      onIntent({ type: "TRADE_SET_CASH", payload: { side: "to", value: Number(event.target.value) || 0 } });
    });
  }
  if (elements.tcFromList) {
    elements.tcFromList.addEventListener("click", (event) => handleComposerChipToggle(event, "from"));
  }
  if (elements.tcToList) {
    elements.tcToList.addEventListener("click", (event) => handleComposerChipToggle(event, "to"));
  }
  if (elements.tcFromCards) {
    elements.tcFromCards.addEventListener("click", (event) => handleComposerCardToggle(event, "from"));
  }
  if (elements.tcToCards) {
    elements.tcToCards.addEventListener("click", (event) => handleComposerCardToggle(event, "to"));
  }
  if (elements.tcSend) {
    elements.tcSend.addEventListener("click", () => {
      const draft = selectors.getTradeDraft(getState());
      const wasCounter = Boolean(draft?.threadId);
      onIntent({ type: "TRADE_SEND" });
      showToast(wasCounter ? "Counter sent" : "Trade sent");
    });
  }
  if (elements.tcClose) {
    elements.tcClose.addEventListener("click", () => {
      closeTradeComposer();
      onIntent({ type: "CLOSE_TRADE_UI" });
    });
  }
  if (elements.tradeComposerModal) {
    elements.tradeComposerModal.addEventListener("click", (event) => {
      if (event.target.dataset.tradeClose !== undefined || event.target === elements.tradeComposerModal) {
        closeTradeComposer();
        onIntent({ type: "CLOSE_TRADE_UI" });
      }
    });
  }
  if (elements.tradeInboundModal) {
    elements.tradeInboundModal.addEventListener("click", (event) => {
      if (event.target.dataset.tradeClose !== undefined || event.target === elements.tradeInboundModal) {
        closeTradeInbound();
      }
    });
  }
  if (elements.tradeInboundAccept) {
    elements.tradeInboundAccept.addEventListener("click", () => handleTradeDecision("TRADE_ACCEPT"));
  }
  if (elements.tradeInboundDecline) {
    elements.tradeInboundDecline.addEventListener("click", () => handleTradeDeclineOrCancel());
  }
  if (elements.tradeInboundCounter) {
    elements.tradeInboundCounter.addEventListener("click", () => handleTradeCounterRequest());
  }
  if (elements.tradeInboundClose) {
    elements.tradeInboundClose.addEventListener("click", () => closeTradeInbound());
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (uiState.tradeComposerOpen) {
        closeTradeComposer();
        onIntent({ type: "CLOSE_TRADE_UI" });
      } else if (uiState.tradePickerOpen) {
        closeTradePicker();
        onIntent({ type: "CLOSE_TRADE_UI" });
      } else if (uiState.tradeInboundOpen) {
        closeTradeInbound();
      } else if (uiState.activePropTileId != null) {
        closePropertyCard();
      }
    }
  });
  document.addEventListener("mousedown", (event) => {
    if (!elements.propCard || elements.propCard.classList.contains("hidden")) return;
    if (elements.propCard.contains(event.target)) return;
    if (event.target.closest("[data-tile]")) return;
    closePropertyCard();
  });
  if (elements.debtAutoBtn) {
    elements.debtAutoBtn.addEventListener("click", () => onIntent({ type: "AUTO_LIQUIDATE" }));
  }
  if (elements.debtDoneBtn) {
    elements.debtDoneBtn.addEventListener("click", () => onIntent({ type: "END_DEBT_RESOLUTION" }));
  }
  if (elements.debtSurrenderBtn) {
    elements.debtSurrenderBtn.addEventListener("click", () => onIntent({ type: "END_DEBT_RESOLUTION", payload: { surrender: true } }));
  }
  if (elements.debtSellList) {
    elements.debtSellList.addEventListener("click", (event) => handleDebtListClick(event, "SELL_HOUSE"));
  }
  if (elements.debtMortgageList) {
    elements.debtMortgageList.addEventListener("click", (event) => handleDebtMortgageClick(event));
  }
  if (elements.debtTradeList) {
    elements.debtTradeList.addEventListener("click", (event) => handleDebtTradeClick(event));
  }
  elements.newGameBtn.addEventListener("click", () => openSetupModal());
  elements.cancelSetupBtn.addEventListener("click", () => closeSetupModal());
  elements.playerCount.addEventListener("change", () => rebuildPlayerConfig());
  elements.winOkBtn.addEventListener("click", () => {
    closeWinModal();
    openSetupModal();
  });
  elements.cardOkBtn.addEventListener("click", () => hideCardModal());
  if (elements.evenBuildToggle) {
    elements.evenBuildToggle.addEventListener("change", (event) => {
      onIntent({ type: "TOGGLE_EVEN_BUILD", payload: { value: event.target.checked } });
    });
  }
  if (elements.doubleSetToggle) {
    elements.doubleSetToggle.addEventListener("change", (event) => {
      onIntent({ type: "TOGGLE_DOUBLE_SET", payload: { value: event.target.checked } });
    });
  }
  if (elements.shareUrl) {
    elements.shareUrl.value = window.location.href;
  }
  if (elements.shareCopy) {
    elements.shareCopy.addEventListener("click", async () => {
      const url = elements.shareUrl ? elements.shareUrl.value : window.location.href;
      const copied = await copyToClipboard(url);
      if (copied) {
        showToast("Link copied!");
      } else {
        showToast("Copy not available");
      }
    });
  }
  if (elements.chatForm) {
    elements.chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      sendChatMessage();
    });
  } else if (elements.chatSend) {
    elements.chatSend.addEventListener("click", () => sendChatMessage());
  }
  if (elements.appearanceSave) {
    elements.appearanceSave.addEventListener("click", () => saveAppearance());
  }
  if (elements.appearanceCancel) {
    elements.appearanceCancel.addEventListener("click", () => closeAppearanceModal());
  }

  boardApi.onTileSelect((tile, index) => {
    uiState.selectedTileId = index;
    boardApi.setSelectedTile(index);
    renderTileDetail();
    openPropertyCard(index, getState());
  });

  window.addEventListener(
    "resize",
    () => schedulePropCardReposition(),
    { passive: true }
  );
  window.addEventListener(
    "orientationchange",
    () => schedulePropCardReposition(),
    { passive: true }
  );

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
    renderDock(state);
    renderPlayers(state);
    renderMyProperties(state);
    renderTileDetail(state);
    renderFinanceControls(state);
    renderTrades(state);
    renderTradePicker(state);
    renderTradeComposer(state);
    renderTradeInbound(state);
    renderDebtModal(state);
    renderLog(state);
    renderChat();
    maybeShowCard(state);
    maybeShowWinner(state);
  }

  function renderHeader(state) {
    const player = selectors.getCurrentPlayer(state);

    if (elements.currentPlayer) {
      if (player) {
        elements.currentPlayer.innerHTML = `
          <span class="player-avatar" style="background:${player.color}"></span>
          <span>${escapeHtml(player.name)}</span>
          <span>— $${player.cash}</span>
        `;
      } else {
        elements.currentPlayer.textContent = "Waiting for players";
      }
    }

    if (elements.maxPlayersLabel) {
      elements.maxPlayersLabel.textContent = state.config?.maxPlayers ?? "—";
    }

    if (elements.evenBuildToggle) {
      const evenOn = Boolean(state.config?.evenBuild);
      elements.evenBuildToggle.checked = evenOn;
      elements.evenBuildToggle.setAttribute("aria-label", `Even-Build rule ${evenOn ? "on" : "off"}`);
    }
    if (elements.evenBuildStatus) {
      const evenOn = Boolean(state.config?.evenBuild);
      elements.evenBuildStatus.textContent = evenOn ? "ON" : "OFF";
      elements.evenBuildStatus.classList.toggle("off", !evenOn);
    }
    if (elements.doubleSetToggle) {
      elements.doubleSetToggle.checked = Boolean(state.config?.doubleSetRent);
    }
    if (elements.appearanceBtn) {
      elements.appearanceBtn.disabled = !player;
    }

    if (elements.diceResult) {
      let hint = "";
      if (player) {
        if (player.bankrupt) {
          hint = `${player.name} is bankrupt.`;
        } else if (player.inJail) {
          const attempts = Math.max(0, player.jailTurns);
          hint = `${player.name} is in Jail (attempt ${attempts} of 3).`;
        } else if (state.turn.pendingPurchase != null) {
          const tile = tileData.find((t) => t.id === state.turn.pendingPurchase);
          if (tile) {
            hint = `${player.name} can buy ${tile.name} for $${tile.price}.`;
          }
        } else if (state.turn.allowExtraRoll) {
          hint = "Roll again for doubles.";
        }
      }

      if (state.turn.lastRoll && Array.isArray(state.turn.lastRoll.dice)) {
        const [d1, d2] = state.turn.lastRoll.dice;
        elements.diceResult.textContent = `🎲 ${d1} + ${d2} = ${state.turn.lastRoll.total}`;
      } else if (hint) {
        elements.diceResult.textContent = hint;
      } else {
        elements.diceResult.textContent = "Roll to start";
      }
    }


    if (player) {
      uiState.selectedTileId ??= player.position;
      boardApi.setSelectedTile(uiState.selectedTileId);
    }
  }

  function renderDock(state) {
    if (!elements.dockButtons) return;
    const container = elements.dockButtons;
    container.innerHTML = "";

    const player = selectors.getCurrentPlayer(state);
    const hasWinner = selectors.hasWinner(state);

    if (!player || hasWinner) {
      return;
    }

    const debtActive = Boolean(state.debtContext?.active);
    const canRoll = state.turn.phase === "idle" && !player.bankrupt && !debtActive;
    const canBuy = selectors.canBuyCurrentTile(state) && !debtActive && !player.bankrupt;
    const canEnd =
      !player.bankrupt &&
      !debtActive &&
      (state.turn.phase === "resolved" || state.turn.allowExtraRoll || state.turn.mustEnd);
    const canPayBail =
      player.inJail && !player.bankrupt && state.turn.phase === "idle" && player.cash >= state.config.bail && !debtActive;
    const canUseCard = player.inJail && player.heldCards.some((card) => card.kind === "leaveJail");

    const tileId = uiState.selectedTileId ?? player.position;
    const tile = tileData.find((t) => t.id === tileId);
    const ownerId = tile ? state.tileOwnership?.[tileId] ?? state.tileOwnership?.[String(tileId)] : null;
    const ownsTile =
      tile && tile.type === "property" && ownerId === player.id && !player.bankrupt && !debtActive;
    let buildTooltip = "";
    let sellTooltip = "";
    let canBuild = false;
    let canSell = false;

    if (ownsTile) {
      canBuild = canBuildHere(state, player.id, tileId);
      canSell = canSellHere(state, player.id, tileId);
      const evenBlockedBuild =
        !canBuild && state.config?.evenBuild && canBuildHere(overrideEvenBuild(state, false), player.id, tileId);
      const evenBlockedSell =
        !canSell && state.config?.evenBuild && canSellHere(overrideEvenBuild(state, false), player.id, tileId);
      if (debtActive && !canBuild) {
        buildTooltip = "Resolve debt before building.";
      } else if (evenBlockedBuild) {
        buildTooltip = "Even-Build: add houses evenly across the group.";
      }
      if (evenBlockedSell) {
        sellTooltip = "Even-Build: remove houses evenly across the group.";
      }
    }

    const activePlayers = selectors
      .getActivePlayers(state)
      .filter((p) => p.id !== player.id && !p.bankrupt);
    const canTrade = !debtActive && activePlayers.length > 0;

    const buyTile = state.turn.pendingPurchase != null ? tileData.find((t) => t.id === state.turn.pendingPurchase) : null;
    let buyTitle = "";
    if (!canBuy) {
      if (!buyTile) {
        buyTitle = "No property available to buy.";
      } else if (debtActive) {
        buyTitle = "Resolve debt before buying.";
      } else if (player && buyTile.price > player.cash) {
        buyTitle = "Not enough cash.";
      }
    }

    const actions = [
      {
        key: "roll",
        label: "Roll",
        variant: "primary",
        disabled: !canRoll,
        onClick: () => onIntent({ type: "ROLL_DICE" }),
      },
      {
        key: "buy",
        label: "Buy",
        disabled: !canBuy,
        title: buyTitle,
        onClick: () => onIntent({ type: "BUY_PROPERTY" }),
      },
      {
        key: "end",
        label: "End",
        disabled: !canEnd,
        onClick: () => onIntent({ type: "END_TURN" }),
      },
      {
        key: "payBail",
        label: "Pay Bail",
        disabled: !canPayBail,
        onClick: () => onIntent({ type: "PAY_BAIL" }),
      },
      {
        key: "useCard",
        label: "Use Card",
        disabled: !canUseCard,
        onClick: () => onIntent({ type: "USE_LEAVE_JAIL_CARD" }),
      },
    ];

    if (ownsTile) {
      actions.push({
        key: "build",
        label: "Build +",
        disabled: !canBuild,
        title: buildTooltip,
        onClick: () => onIntent({ type: "BUILD_HOUSE", payload: { tileId } }),
      });
      actions.push({
        key: "sell",
        label: "Sell −",
        disabled: !canSell,
        title: sellTooltip,
        onClick: () => onIntent({ type: "SELL_HOUSE", payload: { tileId } }),
      });
    }

    actions.push({
      key: "trade",
      label: "Trade",
      disabled: !canTrade,
      title: canTrade ? "Open trade builder" : "Need another active player",
      onClick: () => {
        openTradePicker();
        onIntent({ type: "OPEN_TRADE_PICKER" });
      },
    });

    actions.forEach((action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const classNames = ["btn"];
      if (action.variant !== "primary") {
        classNames.push("ghost");
      }
      btn.className = classNames.join(" ");
      btn.textContent = action.label;
      btn.disabled = Boolean(action.disabled);
      if (action.title) {
        btn.title = action.title;
      } else {
        btn.removeAttribute("title");
      }
      if (!btn.disabled && typeof action.onClick === "function") {
        btn.addEventListener("click", action.onClick);
      }
      container.appendChild(btn);
    });
  }

  function renderPlayers(state) {
    if (!elements.playerList) return;
    elements.playerList.innerHTML = "";
    state.players.forEach((player, index) => {
      const li = document.createElement("li");
      li.className = "player-row";
      if (state.turn.currentIndex === index && !player.bankrupt) {
        li.classList.add("active");
      }
      if (player.bankrupt) {
        li.classList.add("bankrupt");
      }

      const meta = document.createElement("div");
      meta.className = "player-meta";

      const avatar = document.createElement("span");
      avatar.className = "player-avatar";
      avatar.style.background = player.color || "#fff";
      meta.appendChild(avatar);

      const name = document.createElement("span");
      name.className = "player-name";
      name.textContent = player.name;
      meta.appendChild(name);

      if (state.turn.currentIndex === index && !player.bankrupt) {
        const badge = document.createElement("span");
        badge.className = "player-chip";
        badge.textContent = "👑";
        meta.appendChild(badge);
      } else if (player.bankrupt) {
        const badge = document.createElement("span");
        badge.className = "player-chip";
        badge.textContent = "💤";
        meta.appendChild(badge);
      }

      const cash = document.createElement("span");
      cash.className = "player-cash";
      cash.textContent = player.bankrupt ? "Bankrupt" : `$${player.cash}`;

      li.appendChild(meta);
      li.appendChild(cash);
      li.addEventListener("click", () => {
        uiState.selectedTileId = player.position;
        boardApi.setSelectedTile(uiState.selectedTileId);
        renderTileDetail(state);
      });
      elements.playerList.appendChild(li);
    });
  }

  function renderLog(state) {
    if (!elements.logList) return;
    elements.logList.innerHTML = "";
    if (state.log.length && state.log[state.log.length - 1].id < uiState.lastChatLogId) {
      uiState.lastChatLogId = 0;
    }
    state.log
      .slice()
      .reverse()
      .forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = entry.text;
        elements.logList.appendChild(li);
      });

    const newLogs = state.log.filter((entry) => entry.id > uiState.lastChatLogId);
    if (newLogs.length) {
      newLogs.forEach((entry) => {
        pushChatMessage({
          id: entry.id,
          author: "System",
          kind: "system",
          text: entry.text,
          timestamp: entry.timestamp,
        });
      });
      uiState.lastChatLogId = newLogs[newLogs.length - 1].id;
    }
  }

  function renderTileDetail(state = getState()) {
    const tileId = uiState.selectedTileId;
    const tile = tileData.find((t) => t.id === tileId);
    renderStructurePanel(state, tile);
    if (!tile) {
      elements.tileDetail.textContent = "Select a tile";
      closePropertyCard();
      return;
    }
    const ownerId = state.tileOwnership?.[tileId];
    const owner = state.players.find((p) => p.id === ownerId);
    const lines = [];
    lines.push(`<strong>${escapeHtml(tile.name)}</strong>`);
    lines.push(`<span class="detail-type">${formatTileType(tile.type)}</span>`);
    if (owner) {
      lines.push(`Owner: <span style="color:${owner.color}">${escapeHtml(owner.name)}</span>`);
    } else if (tile.price > 0) {
      lines.push("Owner: Bank");
    }
    if (tile.price) {
      lines.push(`Price: $${tile.price}`);
    }
    if (tile.type === "property") {
      const houses = selectors.getHouseCount(state, tileId);
      lines.push(`Group: ${formatGroupName(tile.group)}`);
      lines.push(`Structures: ${houses === 5 ? "Hotel" : `${houses} house${houses === 1 ? "" : "s"}`}`);
      const mortgages = selectors.getMortgages(state) || {};
      const isMortgaged = Boolean(mortgages[tileId]);
      const unmortgageCost = Math.ceil((tile.mortgage || 0) * 1.1);
      lines.push(
        `Mortgage: ${isMortgaged ? `Mortgaged (pay $${unmortgageCost} to clear)` : `Clear (value $${tile.mortgage})`}`
      );
    } else if (tile.type === "rail") {
      lines.push(`Rent: ${tile.rent.join(" / ")}`);
      const mortgages = selectors.getMortgages(state) || {};
      const isMortgaged = Boolean(mortgages[tileId]);
      lines.push(`Mortgage: ${isMortgaged ? "Mortgaged" : `Clear (value $${tile.mortgage})`}`);
    } else if (tile.type === "utility") {
      lines.push("Rent: 4× or 10× dice");
      const mortgages = selectors.getMortgages(state) || {};
      const isMortgaged = Boolean(mortgages[tileId]);
      lines.push(`Mortgage: ${isMortgaged ? "Mortgaged" : `Clear (value $${tile.mortgage})`}`);
    } else if (tile.type === "tax") {
      lines.push(`Pay: $${tile.tax}`);
    }
    elements.tileDetail.innerHTML = lines.map((line) => `<div>${line}</div>`).join("");
    updatePropertyCard(state);
  }

  function openPropertyCard(tileId, state = getState()) {
    if (!elements.propCard) return;
    const tile = tileData.find((t) => t.id === tileId);
    if (!tile) {
      closePropertyCard();
      return;
    }

    uiState.activePropTileId = tileId;
    elements.propCard.innerHTML = buildPropertyCardContent(tile, state);
    elements.propCard.classList.remove("hidden");
    positionPropertyCard(tileId);
  }

  function updatePropertyCard(state = getState()) {
    if (uiState.activePropTileId == null) return;
    openPropertyCard(uiState.activePropTileId, state);
  }

  function closePropertyCard() {
    if (!elements.propCard) return;
    if (propCardFrame) {
      cancelAnimationFrame(propCardFrame);
      propCardFrame = null;
    }
    elements.propCard.classList.add("hidden");
    elements.propCard.innerHTML = "";
    uiState.activePropTileId = null;
  }

  function schedulePropCardReposition() {
    if (propCardFrame) return;
    propCardFrame = requestAnimationFrame(() => {
      propCardFrame = null;
      if (uiState.activePropTileId != null) {
        updatePropertyCard(getState());
      }
    });
  }

  function showDice(dieOne, dieTwo, duration = 1200) {
    if (!elements.diceOverlay) return;
    elements.diceOverlay.innerHTML = "";
    renderDiceOverlay(elements.diceOverlay, dieOne, dieTwo);
    elements.diceOverlay.classList.remove("hidden");
    clearTimeout(uiState.diceTimeout);
    uiState.diceTimeout = window.setTimeout(() => {
      elements.diceOverlay.classList.add("hidden");
      elements.diceOverlay.innerHTML = "";
    }, duration);
  }

  function buildPropertyCardContent(tile, state) {
    const ownership = state.tileOwnership || {};
    const ownerId = ownership[tile.id] ?? ownership[String(tile.id)];
    const owner = state.players?.find((p) => p.id === ownerId);
    const structures = state.structures?.[tile.id] ?? 0;
    const mortgages = state.mortgages || {};
    const isMortgaged = Boolean(mortgages[tile.id]);
    const rents = Array.isArray(tile.rents) ? tile.rents : [];
    const rentLabels = ["with rent", "with one house", "with two houses", "with three houses", "with four houses", "with a hotel"];

    const swatch = tile.group ? `<span class="prop-swatch" style="background:${getGroupColor(tile.group)}"></span>` : "";
    const header = `
      <div class="prop-header">
        ${swatch}
        <h3>${escapeHtml(tile.name)}</h3>
      </div>
    `;

    let body = "";
    if (tile.type === "property") {
      const rows = rents.map((rent, idx) => {
        const label = rentLabels[idx] || `Level ${idx}`;
        return `<div class="prop-row"><span class="when">${label}</span><span class="amt">$${rent}</span></div>`;
      });
      body = `<div class="rent-table">${rows.join("")}</div>`;
    } else if (tile.type === "rail") {
      const railRent = Array.isArray(tile.rent) ? tile.rent : [];
      const rows = [1, 2, 3, 4].map((count, idx) => {
        const rent = railRent[idx] ?? railRent[railRent.length - 1] ?? 0;
        return `<div class="prop-row"><span class="when">owns ${count} rail${count === 1 ? "" : "s"}</span><span class="amt">$${rent}</span></div>`;
      });
      body = `<div class="rent-table">${rows.join("")}</div>`;
    } else if (tile.type === "utility") {
      body = `
        <div class="rent-table">
          <div class="prop-row"><span class="when">owns one utility</span><span class="amt">4× dice</span></div>
          <div class="prop-row"><span class="when">owns both utilities</span><span class="amt">10× dice</span></div>
        </div>
      `;
    } else if (tile.type === "tax") {
      body = `<div class="prop-row"><span class="when">Tax due</span><span class="amt">$${tile.tax}</span></div>`;
    } else if (tile.type === "surprise" || tile.type === "treasure") {
      body = `<div class="prop-row"><span class="when">Draw a card</span><span class="amt">${tile.type === "surprise" ? "Surprise" : "Treasure"}</span></div>`;
    } else {
      body = `<div class="prop-row"><span class="when">Tile type</span><span class="amt">${formatTileType(tile.type)}</span></div>`;
    }

    const ownerLine = owner
      ? `<div class="owner"><span class="prop-swatch" style="background:${owner.color}"></span><span>${escapeHtml(owner.name)}</span></div>`
      : `<div class="owner"><span class="prop-swatch" style="background:#444"></span><span>Bank</span></div>`;
    const structureLine =
      tile.type === "property"
        ? `<div class="prop-row"><span class="when">Structures</span><span class="amt">${structures === 5 ? "Hotel" : `${structures} house${structures === 1 ? "" : "s"}`}</span></div>`
        : "";
    const footer = `
      <div class="prop-footer">
        ${ownerLine}
        <div class="prop-row"><span class="when">Price</span><span class="amt">${tile.price ? `$${tile.price}` : "—"}</span></div>
        ${tile.houseCost ? `<div class="prop-row"><span class="when">House cost</span><span class="amt">$${tile.houseCost}</span></div>` : ""}
        ${tile.mortgage ? `<div class="prop-row"><span class="when">Mortgage</span><span class="amt">${isMortgaged ? "Mortgaged" : `$${tile.mortgage}`}</span></div>` : ""}
        ${structureLine}
      </div>
    `;

    return `${header}${body}${footer}`;
  }

  function positionPropertyCard(tileId) {
    if (!elements.propCard) return;
    const card = elements.propCard;
    const anchor = boardApi.getTileScreenPos ? boardApi.getTileScreenPos(tileId) : null;
    if (!anchor) return;
    const stageRect = elements.stage ? elements.stage.getBoundingClientRect() : document.body.getBoundingClientRect();

    card.style.left = "0px";
    card.style.top = "0px";
    card.classList.remove("hidden");

    const cardRect = card.getBoundingClientRect();
    const margin = 12;
    const placements = [
      {
        top: anchor.y - cardRect.height - margin,
        left: anchor.x - cardRect.width / 2,
      },
      {
        top: anchor.y + margin,
        left: anchor.x - cardRect.width / 2,
      },
      {
        top: anchor.y - cardRect.height / 2,
        left: anchor.x + margin,
      },
      {
        top: anchor.y - cardRect.height / 2,
        left: anchor.x - cardRect.width - margin,
      },
    ];

    let chosen = placements.find(
      (pos) =>
        pos.left >= stageRect.left + margin &&
        pos.left + cardRect.width <= stageRect.right - margin &&
        pos.top >= stageRect.top + margin &&
        pos.top + cardRect.height <= stageRect.bottom - margin
    );

    if (!chosen) {
      chosen = placements[0];
      chosen.left = Math.min(
        Math.max(chosen.left, stageRect.left + margin),
        stageRect.right - cardRect.width - margin
      );
      chosen.top = Math.min(
        Math.max(chosen.top, stageRect.top + margin),
        stageRect.bottom - cardRect.height - margin
      );
    }

    card.style.left = `${Math.round(chosen.left)}px`;
    card.style.top = `${Math.round(chosen.top)}px`;
  }

  function renderFinanceControls(state) {
    if (!elements.financePanel) return;
    const tileId = uiState.selectedTileId;
    const tile = tileData.find((t) => t.id === tileId);
    const player = selectors.getCurrentPlayer(state);
    const isMortgageable = tile && isMortgageableTile(tile);
    const isOwner = isMortgageable && player && state.tileOwnership?.[tileId] === player.id;

    if (!isMortgageable || !isOwner) {
      elements.financePanel.classList.add("hidden");
      if (elements.mortgageBtn) elements.mortgageBtn.disabled = true;
      if (elements.unmortgageBtn) elements.unmortgageBtn.disabled = true;
      return;
    }

    elements.financePanel.classList.remove("hidden");
    const mortgages = selectors.getMortgages(state) || {};
    const isMortgaged = Boolean(mortgages[tileId]);
    const canMortgage = !isMortgaged && canMortgageHere(state, player.id, tileId);
    const canUnmortgage = isMortgaged && canUnmortgageHere(state, player.id, tileId);

    if (elements.mortgageBtn) {
      elements.mortgageBtn.disabled = !canMortgage;
      let mortgageTip = `Mortgage for $${tile.mortgage}`;
      if (!canMortgage) {
        if (isMortgaged) {
          mortgageTip = "Already mortgaged";
        } else if ((state.structures?.[tileId] ?? 0) > 0) {
          mortgageTip = "Sell houses first";
        } else if (groupHasHousesUI(state, tile.group)) {
          mortgageTip = "Group still has houses";
        } else {
          mortgageTip = "Cannot mortgage right now";
        }
      }
      elements.mortgageBtn.title = mortgageTip;
    }

    if (elements.unmortgageBtn) {
      elements.unmortgageBtn.disabled = !canUnmortgage;
      const unmortgageCost = Math.ceil((tile.mortgage || 0) * 1.1);
      let unmortgageTip = `Pay $${unmortgageCost} to unmortgage`;
      if (!canUnmortgage) {
        if (!isMortgaged) {
          unmortgageTip = "Property is not mortgaged";
        } else if (!player || player.cash < unmortgageCost) {
          unmortgageTip = `Need $${unmortgageCost}`;
        } else {
          unmortgageTip = "Cannot unmortgage right now";
        }
      }
      elements.unmortgageBtn.title = unmortgageTip;
    }
  }

  function renderStructurePanel(state, tile) {
    if (!elements.structureIcons || !elements.structureInfo) return;
    if (!tile || tile.type !== "property") {
      elements.structureIcons.innerHTML = `<span class="structure-empty">—</span>`;
      elements.structureInfo.innerHTML = `<div>Structures N/A</div>`;
      return;
    }
    const houses = selectors.getHouseCount(state, tile.id);
    elements.structureIcons.innerHTML = structureIconsMarkup(houses);
    const rents = Array.isArray(tile.rents) ? tile.rents : [];
    const currentRent = rents[houses] ?? 0;
    const nextRent = houses < 5 ? rents[houses + 1] ?? null : null;
    const buildCost = tile.houseCost || 0;
    const refund = Math.floor(buildCost / 2);
    const buildLine = houses < 5 ? `Build: $${buildCost}${nextRent != null ? ` → Rent $${nextRent}` : ""}` : "Build: Max";
    const sellLine = `Sell: +$${refund}`;
    elements.structureInfo.innerHTML = `
      <div>Rent: $${currentRent}</div>
      <div>${buildLine}</div>
      <div>${sellLine}</div>
    `;
  }

  function groupHasHousesUI(state, group) {
    if (!group) return false;
    return tileData
      .filter((t) => t.type === "property" && t.group === group)
      .some((t) => selectors.getHouseCount(state, t.id) > 0);
  }

  function isMortgageableTile(tile) {
    return tile.type === "property" || tile.type === "rail" || tile.type === "utility";
  }

  function openTradePicker() {
    uiState.tradePickerOpen = true;
    uiState.tradeComposerOpen = false;
    uiState.tradeInboundOpen = false;
  }

  function closeTradePicker() {
    uiState.tradePickerOpen = false;
  }

  function closeTradeComposer() {
    uiState.tradeComposerOpen = false;
    uiState.composerThreadId = null;
    uiState.tradeComposerJustOpened = false;
  }

  function closeTradeInbound() {
    uiState.tradeInboundOpen = false;
    uiState.inboundThreadId = null;
    uiState.inboundCanCancel = false;
  }

  function handleTradeThreadClick(event) {
    const row = event.target.closest(".trade-row[data-trade-id]");
    if (!row) return;
    const tradeId = row.dataset.tradeId;
    const state = getState();
    const thread = selectors.getTradeById(state, tradeId);
    if (!thread) return;
    uiState.inboundThreadId = thread.id;
    uiState.tradeInboundOpen = true;
    uiState.tradePickerOpen = false;
    uiState.tradeComposerOpen = false;
    uiState.lastInboundThreadId = thread.id;
    renderTradeInbound(state);
  }

  function handleTradePickClick(event) {
    const row = event.target.closest(".pick-row[data-partner-id]");
    if (!row) return;
    const partnerId = row.dataset.partnerId;
    closeTradePicker();
    uiState.tradeComposerOpen = true;
    uiState.tradeComposerJustOpened = true;
    uiState.composerThreadId = null;
    onIntent({ type: "OPEN_TRADE_COMPOSER", payload: { partnerId } });
  }

  function handleComposerChipToggle(event, side) {
    const chip = event.target.closest(".chip[data-tile-id]");
    if (!chip) return;
    const tileId = Number(chip.dataset.tileId);
    if (!Number.isInteger(tileId)) return;
    onIntent({ type: "TRADE_TOGGLE_PROP", payload: { side, tileId } });
  }

  function handleComposerCardToggle(event, side) {
    const chip = event.target.closest(".chip[data-card]");
    if (!chip) return;
    onIntent({ type: "TRADE_TOGGLE_CARD", payload: { side, card: chip.dataset.card } });
  }

  function handleTradeDecision(intentType) {
    if (!uiState.inboundThreadId) return;
    onIntent({ type: intentType, payload: { tradeId: uiState.inboundThreadId } });
    if (intentType === "TRADE_ACCEPT") {
      showToast("Trade accepted");
    } else if (intentType === "TRADE_DECLINE") {
      showToast("Trade declined");
    }
    closeTradeInbound();
  }

  function handleTradeCounterRequest() {
    if (!uiState.inboundThreadId) return;
    onIntent({ type: "TRADE_COUNTER", payload: { tradeId: uiState.inboundThreadId } });
    closeTradeInbound();
    uiState.tradeComposerOpen = true;
    uiState.tradeComposerJustOpened = true;
  }

  function handleTradeDeclineOrCancel() {
    if (!uiState.inboundThreadId) return;
    if (uiState.inboundCanCancel) {
      onIntent({ type: "TRADE_CANCEL", payload: { tradeId: uiState.inboundThreadId } });
      showToast("Trade cancelled");
      closeTradeInbound();
      return;
    }
    handleTradeDecision("TRADE_DECLINE");
  }

  function renderTrades(state) {
    if (!elements.tradeThreads) return;
    const threads = selectors.getTrades(state);
    elements.tradeThreads.innerHTML = "";
    const player = selectors.getCurrentPlayer(state);
    if (elements.tradeCreate) {
      const availablePartners = selectors.getActivePlayers(state).filter((p) => p.id !== (player?.id ?? null));
      elements.tradeCreate.disabled = !player || player.bankrupt || !availablePartners.length;
    }

    if (!threads.length) {
      const empty = document.createElement("li");
      empty.className = "trade-row empty";
      empty.textContent = "No trades yet";
      elements.tradeThreads.appendChild(empty);
    } else {
      threads.forEach((thread) => {
        const li = document.createElement("li");
        li.className = "trade-row";
        li.dataset.tradeId = thread.id;

        const summary = document.createElement("div");
        summary.className = "trade-summary";

        const idRow = document.createElement("div");
        idRow.className = "trade-id";
        idRow.textContent = `#${thread.id}`;

        const names = `${getPlayerLabel(state, thread.initiatorId)} ↔ ${getPlayerLabel(state, thread.partnerId)}`;
        const details = document.createElement("div");
        details.textContent = names;

        const exchange = document.createElement("div");
        exchange.textContent = summarizeTrade(state, thread.current);

        summary.appendChild(idRow);
        summary.appendChild(details);
        summary.appendChild(exchange);

        const status = document.createElement("span");
        status.className = `trade-status ${thread.status}`;
        status.textContent = tradeStatusLabel(thread.status);

        li.appendChild(summary);
        li.appendChild(status);
        elements.tradeThreads.appendChild(li);
      });
    }

    if (player) {
      const inbound = threads.find((thread) => needsResponse(thread, player.id));
      if (inbound && uiState.lastInboundThreadId !== inbound.id) {
        uiState.inboundThreadId = inbound.id;
        uiState.tradeInboundOpen = true;
        uiState.lastInboundThreadId = inbound.id;
      }
    }
  }

  function renderTradePicker(state) {
    if (!elements.tradePickModal) return;
    const shouldOpen = uiState.tradePickerOpen;
    if (!shouldOpen) {
      elements.tradePickModal.classList.add("hidden");
      elements.tradePickModal.setAttribute("aria-hidden", "true");
      return;
    }

    const player = selectors.getCurrentPlayer(state);
    const partners = selectors.getActivePlayers(state).filter((p) => p.id !== (player?.id ?? null));
    if (!partners.length) {
      elements.tradePickList.innerHTML = "<li class=\"pick-row\">No partners available</li>";
    } else {
      elements.tradePickList.innerHTML = "";
      partners.forEach((partner) => {
        const li = document.createElement("li");
        li.className = "pick-row";
        li.dataset.partnerId = partner.id;
        li.innerHTML = `
          <span class="player-info">
            <span class="mini-avatar" style="background:${partner.color}"></span>
            <span>${escapeHtml(partner.name)}</span>
          </span>
          <span class="player-cash">$${partner.cash}</span>
        `;
        elements.tradePickList.appendChild(li);
      });
    }
    elements.tradePickModal.classList.remove("hidden");
    elements.tradePickModal.setAttribute("aria-hidden", "false");
  }

  function renderTradeComposer(state) {
    if (!elements.tradeComposerModal) return;
    const draft = selectors.getTradeDraft(state);
    const fromPlayer = selectors.getPlayerById(state, draft?.from?.playerId);
    const toPlayer = selectors.getPlayerById(state, draft?.to?.playerId);

    if (draft.active && !uiState.tradeComposerOpen) {
      uiState.tradeComposerOpen = true;
      uiState.composerThreadId = draft.threadId || null;
      uiState.tradePickerOpen = false;
      uiState.tradeInboundOpen = false;
      uiState.tradeComposerJustOpened = true;
    }

    if (!uiState.tradeComposerOpen || !draft.active || !fromPlayer || !toPlayer) {
      closeTradeComposer();
      elements.tradeComposerModal.classList.add("hidden");
      elements.tradeComposerModal.setAttribute("aria-hidden", "true");
      return;
    }

    elements.tradeComposerModal.classList.remove("hidden");
    elements.tradeComposerModal.setAttribute("aria-hidden", "false");

    const title = draft.threadId ? "Counter trade" : "Create a trade";
    const titleEl = elements.tradeComposerModal.querySelector("#trade-composer-title");
    if (titleEl) titleEl.textContent = title;

    renderComposerPlayer(elements.tradeComposerModal.querySelector("#tc-from-header"), fromPlayer);
    renderComposerPlayer(elements.tradeComposerModal.querySelector("#tc-to-header"), toPlayer);

    updateCashSlider(elements.tcFromCash, elements.tcFromCashPill, draft.from.cash, fromPlayer.cash);
    updateCashSlider(elements.tcToCash, elements.tcToCashPill, draft.to.cash, toPlayer.cash);

    buildPropertyChips(elements.tcFromList, state, fromPlayer.id, new Set(draft.from.properties), "from");
    buildPropertyChips(elements.tcToList, state, toPlayer.id, new Set(draft.to.properties), "to");
    buildCardChips(elements.tcFromCards, fromPlayer, draft.from.cards, "from");
    buildCardChips(elements.tcToCards, toPlayer, draft.to.cards, "to");

    if (elements.tcError) {
      const errorKey = draft.validationError;
      if (errorKey) {
        elements.tcError.textContent = tradeErrorMessage(errorKey);
        elements.tcError.classList.remove("hidden");
      } else {
        elements.tcError.textContent = "";
        elements.tcError.classList.add("hidden");
      }
    }

    if (uiState.tradeComposerJustOpened) {
      uiState.tradeComposerJustOpened = false;
      if (elements.tcFromCash) {
        elements.tcFromCash.focus();
      } else if (elements.tcSend) {
        elements.tcSend.focus();
      }
    }
  }

  function renderTradeInbound(state) {
    if (!elements.tradeInboundModal) return;
    const threadId = uiState.inboundThreadId;
    const thread = threadId ? selectors.getTradeById(state, threadId) : null;
    if (!uiState.tradeInboundOpen || !thread) {
      closeTradeInbound();
      elements.tradeInboundModal.classList.add("hidden");
      elements.tradeInboundModal.setAttribute("aria-hidden", "true");
      return;
    }

    if (thread.status === "accepted" || thread.status === "declined" || thread.status === "cancelled") {
      closeTradeInbound();
      elements.tradeInboundModal.classList.add("hidden");
      elements.tradeInboundModal.setAttribute("aria-hidden", "true");
      return;
    }

    const current = selectors.getCurrentPlayer(state);
    const awaiting = current && needsResponse(thread, current.id);
    const isInitiator = current && current.id === thread.initiatorId;
    const canCancel = isInitiator && !awaiting && (thread.status === "pending" || thread.status === "countered");
    uiState.inboundCanCancel = Boolean(canCancel);
    const body = elements.tradeInboundBody;
    body.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "inbound-offer";
    wrapper.appendChild(buildInboundColumn(state, thread.current.from, "They give"));
    wrapper.appendChild(buildInboundColumn(state, thread.current.to, "You give"));
    body.appendChild(wrapper);

    const evaluation = assessTradeSnapshot(state, thread.current);
    const issue = evaluation.issues[0] || null;
    const noteTarget = elements.tradeInboundNote;
    let noteMessage = "";
    if (issue) {
      noteMessage = tradeIssueMessage(state, issue);
    } else if (!awaiting) {
      noteMessage = "Waiting for the other player to respond.";
    }
    if (noteTarget) {
      if (noteMessage) {
        noteTarget.textContent = noteMessage;
        noteTarget.classList.remove("hidden");
      } else {
        noteTarget.textContent = "";
        noteTarget.classList.add("hidden");
      }
    }

    const title = elements.tradeInboundModal.querySelector("#trade-inbound-title");
    if (title) {
      title.textContent = awaiting ? "Incoming trade" : "Trade overview";
    }

    if (elements.tradeInboundAccept) {
      elements.tradeInboundAccept.disabled = !awaiting || !evaluation.valid;
    }
    if (elements.tradeInboundCounter) {
      elements.tradeInboundCounter.disabled = !awaiting;
    }
    if (elements.tradeInboundDecline) {
      elements.tradeInboundDecline.textContent = awaiting ? "Decline" : "Cancel";
      elements.tradeInboundDecline.disabled = !(awaiting || canCancel);
    }

    if (!awaiting) {
      elements.tradeInboundModal.classList.add("readonly");
    } else {
      elements.tradeInboundModal.classList.remove("readonly");
    }

    elements.tradeInboundModal.classList.remove("hidden");
    elements.tradeInboundModal.setAttribute("aria-hidden", "false");
  }

  function renderMyProperties(state) {
    if (!elements.myProps) return;
    const player = selectors.getCurrentPlayer(state);
    elements.myProps.innerHTML = "";
    if (!player) return;

    const owned = player.owned
      .map((id) => BOARD_TILES.find((tile) => tile.id === id))
      .filter((tile) => tile && (tile.type === "property" || tile.type === "rail" || tile.type === "utility"));

    if (!owned.length) {
      const empty = document.createElement("div");
      empty.className = "chip small";
      empty.textContent = "No properties";
      elements.myProps.appendChild(empty);
      return;
    }

    owned.forEach((tile) => {
      const chip = document.createElement("span");
      chip.className = "chip small";
      chip.textContent = `${tile.name} — $${tile.price || 0}`;
      elements.myProps.appendChild(chip);
    });
  }

  function renderComposerPlayer(container, player) {
    if (!container || !player) return;
    container.innerHTML = `
      <span class="mini-avatar" style="background:${player.color}"></span>
      <span>${escapeHtml(player.name)}</span>
      <span class="player-cash">$${player.cash}</span>
    `;
  }

  function updateCashSlider(input, pill, value, max) {
    if (!input || !pill) return;
    const clampedMax = Math.max(0, Number(max) || 0);
    input.max = clampedMax;
    const safeValue = Math.max(0, Math.min(clampedMax, Number(value) || 0));
    input.value = safeValue;
    pill.textContent = `${safeValue} $`;
    const percent = clampedMax > 0 ? (safeValue / clampedMax) * 100 : 0;
    pill.style.setProperty("--percent", `${percent}%`);
  }

  function buildPropertyChips(container, state, ownerId, selectedSet, side) {
    if (!container) return;
    container.innerHTML = "";
    const tiles = BOARD_TILES.filter((tile) =>
      (tile.type === "property" || tile.type === "rail" || tile.type === "utility") &&
      state.tileOwnership?.[tile.id] === ownerId
    );
    if (!tiles.length) {
      const empty = document.createElement("span");
      empty.className = "chip small disabled";
      empty.textContent = "No assets";
      container.appendChild(empty);
      return;
    }
    tiles.forEach((tile) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.dataset.tileId = tile.id;
      chip.innerHTML = `
        <span class="chip-icon" aria-hidden="true">🏷</span>
        <span>${escapeHtml(tile.name)}</span>
        <span class="chip-price">$${tile.price || 0}</span>
      `;
      if (selectedSet.has(tile.id)) {
        chip.classList.add("selected");
      }
      container.appendChild(chip);
    });
  }

  function buildCardChips(container, player, selectedCards, side) {
    if (!container) return;
    container.innerHTML = "";
    const hasCard = getLeaveCardCount(player) > 0;
    if (!hasCard) {
      const empty = document.createElement("span");
      empty.className = "chip small disabled";
      empty.textContent = "No cards";
      container.appendChild(empty);
      return;
    }
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.dataset.card = "leaveJail";
    chip.innerHTML = `
      <span class="chip-icon" aria-hidden="true">🔑</span>
      <span>Get out of jail</span>
    `;
    if (selectedCards.includes("leaveJail")) {
      chip.classList.add("selected");
    }
    container.appendChild(chip);
  }

  function getLeaveCardCount(player) {
    if (!player || !Array.isArray(player.heldCards)) return 0;
    return player.heldCards.filter((card) => card.kind === "leaveJail").length;
  }

  function buildInboundColumn(state, side, title) {
    const column = document.createElement("div");
    column.className = "inbound-column";
    const heading = document.createElement("h3");
    heading.textContent = title;
    column.appendChild(heading);

    const player = selectors.getPlayerById(state, side.playerId);
    if (player) {
      const info = document.createElement("div");
      info.className = "composer-player";
      info.innerHTML = `
        <span class="mini-avatar" style="background:${player.color}"></span>
        <span>${escapeHtml(player.name)}</span>
      `;
      column.appendChild(info);
    }

    const summary = document.createElement("div");
    summary.className = "inbound-summary";
    summary.textContent = describeContribution(state, side);
    column.appendChild(summary);

    const chipGrid = document.createElement("div");
    chipGrid.className = "chip-grid";
    side.properties.forEach((tileId) => {
      const tile = BOARD_TILES.find((t) => t.id === tileId);
      if (!tile) return;
      const chip = document.createElement("span");
      chip.className = "chip small";
      chip.textContent = `${tile.name} ($${tile.price || 0})`;
      chipGrid.appendChild(chip);
    });
    if (!side.properties.length) {
      const empty = document.createElement("span");
      empty.className = "chip small disabled";
      empty.textContent = "No properties";
      chipGrid.appendChild(empty);
    }
    column.appendChild(chipGrid);
    return column;
  }

  function getPlayerLabel(state, playerId) {
    const player = selectors.getPlayerById(state, playerId);
    return player ? player.name : "Unknown";
  }

  function summarizeTrade(state, snapshot) {
    if (!snapshot) return "—";
    const left = describeContribution(state, snapshot.from);
    const right = describeContribution(state, snapshot.to);
    return `${left} ⇄ ${right}`;
  }

  function describeContribution(state, side) {
    const parts = [];
    if (side.cash > 0) {
      parts.push(`$${side.cash}`);
    }
    if (side.properties?.length) {
      const names = side.properties
        .map((id) => BOARD_TILES.find((tile) => tile.id === id))
        .filter(Boolean)
        .map((tile) => tile.name);
      const [first, second, ...rest] = names;
      if (first) parts.push(first);
      if (second) parts.push(second);
      if (rest.length) parts.push(`+${rest.length} more`);
    }
    if (side.cards?.includes("leaveJail")) {
      parts.push("Jail card");
    }
    if (!parts.length) {
      return "Nothing";
    }
    return parts.join(" & ");
  }

  function tradeStatusLabel(status) {
    switch (status) {
      case "pending":
        return "Pending";
      case "countered":
        return "Countered";
      case "accepted":
        return "Accepted";
      case "declined":
        return "Declined";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  }

  function needsResponse(thread, playerId) {
    if (!thread) return false;
    if (thread.status !== "pending" && thread.status !== "countered") return false;
    return thread.current?.to?.playerId === playerId;
  }

  function assessTradeSnapshot(state, snapshot) {
    const issues = [];
    if (!snapshot) {
      issues.push({ reason: "missing" });
      return { valid: false, issues };
    }
    assessTradeSide(state, snapshot.from, issues);
    assessTradeSide(state, snapshot.to, issues);
    return { valid: issues.length === 0, issues };
  }

  function assessTradeSide(state, side, issues) {
    if (!side) {
      issues.push({ reason: "missing" });
      return;
    }
    const player = selectors.getPlayerById(state, side.playerId);
    if (!player || player.bankrupt) {
      issues.push({ reason: "player", playerId: side.playerId });
      return;
    }
    const ownership = state.tileOwnership || {};
    if (Array.isArray(side.properties)) {
      side.properties.forEach((tileId) => {
        if (ownership[tileId] !== player.id) {
          issues.push({ reason: "ownership", playerId: player.id, tileId });
        }
      });
    }
    const cash = Math.max(0, Number(side.cash) || 0);
    if (cash > player.cash) {
      issues.push({ reason: "cash", playerId: player.id });
    }
    if (Array.isArray(side.cards) && side.cards.includes("leaveJail") && getLeaveCardCount(player) < 1) {
      issues.push({ reason: "card_missing", playerId: player.id });
    }
  }

  function tradeIssueMessage(state, issue) {
    switch (issue?.reason) {
      case "ownership": {
        const tile = BOARD_TILES.find((t) => t.id === issue.tileId);
        const tileName = tile ? tile.name : "An asset";
        return `${tileName} changed hands. Please update the offer.`;
      }
      case "cash": {
        const player = selectors.getPlayerById(state, issue.playerId);
        const name = player ? player.name : "A player";
        return `${name} no longer has enough cash for this offer.`;
      }
      case "card_missing": {
        const player = selectors.getPlayerById(state, issue.playerId);
        const name = player ? player.name : "Player";
        return `${name} no longer holds a Get out of Jail card.`;
      }
      case "player":
        return "One of the players is unavailable for trading.";
      case "missing":
      default:
        return "Offer data is outdated. Please refresh the trade.";
    }
  }

  function tradeErrorMessage(code) {
    switch (code) {
      case "ownership":
      case "duplicate_prop":
      case "prop":
        return "This offer includes assets that changed ownership.";
      case "cash":
      case "cash_exceeds":
        return "Cash amount exceeds the player’s available funds.";
      case "card_missing":
      case "cards":
        return "Card selection is no longer available.";
      case "invalid_players":
      case "player":
        return "Selected player cannot trade right now.";
      case "shape":
      case "inactive":
        return "Trade data is incomplete. Please try again.";
      default:
        return "Unable to send the trade. Please review and adjust.";
    }
  }


  function renderDebtModal(state) {
    if (!elements.debtModal) return;
    const debt = state.debtContext || { active: false };
    if (debt.active && !uiState.debtModalOpen) {
      uiState.debtModalOpen = true;
    } else if (!debt.active && uiState.debtModalOpen) {
      uiState.debtModalOpen = false;
    }

    if (!uiState.debtModalOpen) {
      elements.debtModal.classList.add("hidden");
      elements.debtModal.setAttribute("aria-hidden", "true");
      return;
    }

    elements.debtModal.classList.remove("hidden");
    elements.debtModal.setAttribute("aria-hidden", "false");

    const player = selectors.getCurrentPlayer(state);
    if (!player) return;

    const creditorName = debt.creditor && debt.creditor !== "bank"
      ? (state.players.find((p) => p.id === debt.creditor)?.name || "Unknown")
      : "Bank";
    if (elements.debtSummary) {
      elements.debtSummary.textContent = `You owe $${Math.max(0, Math.ceil(debt.amountOwed || -player.cash))} to ${creditorName}.`;
    }

    if (elements.debtSellList) {
      elements.debtSellList.innerHTML = "";
      const sellable = player.owned
        .map((id) => BOARD_TILES.find((tile) => tile.id === id && tile.type === "property"))
        .filter((tile) => tile && selectors.getHouseCount(state, tile.id) > 0);
      if (!sellable.length) {
        elements.debtSellList.innerHTML = "<div>No houses to sell</div>";
      } else {
        sellable.forEach((tile) => {
          const houses = selectors.getHouseCount(state, tile.id);
          const btn = document.createElement("button");
          btn.dataset.tileId = tile.id;
          btn.textContent = `${tile.name} (${houses} house${houses === 1 ? "" : "s"})`;
          elements.debtSellList.appendChild(btn);
        });
      }
    }

    if (elements.debtMortgageList) {
      elements.debtMortgageList.innerHTML = "";
      const mortgageable = player.owned
        .map((id) => BOARD_TILES.find((tile) => tile.id === id && isMortgageableTile(tile)))
        .filter(Boolean);
      if (!mortgageable.length) {
        elements.debtMortgageList.innerHTML = "<div>No finance options</div>";
      } else {
        mortgageable.forEach((tile) => {
          const isMortgaged = Boolean(state.mortgages?.[tile.id]);
          const btn = document.createElement("button");
          btn.dataset.tileId = tile.id;
          btn.dataset.action = isMortgaged ? "unmortgage" : "mortgage";
          btn.textContent = isMortgaged
            ? `Unmortgage ${tile.name} ($${Math.ceil((tile.mortgage || 0) * 1.1)})`
            : `Mortgage ${tile.name} (+$${tile.mortgage})`;
          const canAct = isMortgaged
            ? canUnmortgageHere(state, player.id, tile.id)
            : canMortgageHere(state, player.id, tile.id);
          btn.disabled = !canAct;
          elements.debtMortgageList.appendChild(btn);
        });
      }
    }

    if (elements.debtTradeList) {
      elements.debtTradeList.innerHTML = "";
      const partners = selectors.getActivePlayers(state).filter((p) => p.id !== player.id);
      if (!partners.length) {
        elements.debtTradeList.innerHTML = "<div>No partners available</div>";
      } else {
        partners.forEach((p) => {
          const btn = document.createElement("button");
          btn.dataset.partnerId = p.id;
          btn.textContent = `${p.name} — $${p.cash}`;
          elements.debtTradeList.appendChild(btn);
        });
      }
    }
  }

  function renderChat() {
    if (!elements.chatList) return;
    elements.chatList.innerHTML = "";
    const recent = uiState.chatMessages.slice(-80);
    if (!recent.length) {
      const empty = document.createElement("li");
      empty.className = "chat-empty";
      empty.textContent = "No messages yet";
      elements.chatList.appendChild(empty);
      return;
    }
    recent.forEach((message) => {
      const item = document.createElement("li");
      item.className = `chat-item ${message.kind === "you" ? "you" : "system"}`;
      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.textContent = message.text;
      const meta = document.createElement("span");
      meta.className = "chat-meta";
      meta.textContent = message.author;
      item.appendChild(bubble);
      item.appendChild(meta);
      elements.chatList.appendChild(item);
    });
    const body = elements.chatList.parentElement;
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }

  function pushChatMessage(message) {
    uiState.chatMessages.push({
      id: message.id ?? Date.now(),
      author: message.author || "System",
      kind: message.kind || "system",
      text: message.text || "",
      timestamp: message.timestamp || Date.now(),
    });
    if (uiState.chatMessages.length > 120) {
      uiState.chatMessages.splice(0, uiState.chatMessages.length - 120);
    }
    renderChat();
  }

  function sendChatMessage() {
    if (!elements.chatInput) return;
    const raw = elements.chatInput.value.trim();
    if (!raw) return;
    pushChatMessage({ id: Date.now(), author: "You", kind: "you", text: raw, timestamp: Date.now() });
    elements.chatInput.value = "";
  }

  function openAppearanceModal() {
    if (!elements.appearanceModal) return;
    const player = selectors.getCurrentPlayer(getState());
    if (!player) return;
    if (elements.appearanceName) {
      elements.appearanceName.value = player.name || "";
    }
    if (elements.appearanceColor) {
      elements.appearanceColor.value = sanitizeColorInput(player.color);
    }
    elements.appearanceModal.classList.remove("hidden");
    elements.appearanceModal.setAttribute("aria-hidden", "false");
  }

  function closeAppearanceModal() {
    if (!elements.appearanceModal) return;
    elements.appearanceModal.classList.add("hidden");
    elements.appearanceModal.setAttribute("aria-hidden", "true");
  }

  function saveAppearance() {
    const player = selectors.getCurrentPlayer(getState());
    if (!player) {
      closeAppearanceModal();
      return;
    }
    const nameValue = elements.appearanceName ? elements.appearanceName.value.trim() : player.name;
    const colorValue = elements.appearanceColor ? sanitizeColorInput(elements.appearanceColor.value) : player.color;
    onIntent({ type: "UPDATE_APPEARANCE", payload: { name: nameValue || player.name, color: colorValue } });
    closeAppearanceModal();
    showToast("Appearance updated");
  }

  function sanitizeColorInput(value) {
    if (typeof value !== "string") return "#ffffff";
    if (/^#[0-9a-f]{6}$/i.test(value)) return value;
    if (/^#[0-9a-f]{3}$/i.test(value)) {
      const chars = value.slice(1).split("");
      return `#${chars.map((c) => c + c).join("")}`;
    }
    return "#ffffff";
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      // fall through to legacy path
    }
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    try {
      const ok = document.execCommand("copy");
      document.body.removeChild(temp);
      return ok;
    } catch (err) {
      document.body.removeChild(temp);
      return false;
    }
  }

  function showToast(message) {
    if (!elements.toastRoot) return;
    const item = document.createElement("div");
    item.className = "toast-item";
    item.textContent = message;
    elements.toastRoot.appendChild(item);
    requestAnimationFrame(() => item.classList.add("visible"));
    setTimeout(() => {
      item.classList.remove("visible");
      setTimeout(() => {
        if (item.parentElement) {
          item.parentElement.removeChild(item);
        }
      }, 300);
    }, 2200);

    const maxToasts = 3;
    while (elements.toastRoot.children.length > maxToasts) {
      elements.toastRoot.removeChild(elements.toastRoot.firstChild);
    }
  }

  function handleDebtListClick(event, intentType) {
    const button = event.target.closest("button[data-tile-id]");
    if (!button) return;
    const tileId = parseInt(button.dataset.tileId, 10);
    if (!Number.isInteger(tileId)) return;
    onIntent({ type: intentType, payload: { tileId } });
  }

  function handleDebtMortgageClick(event) {
    const button = event.target.closest("button[data-tile-id]");
    if (!button) return;
    const tileId = parseInt(button.dataset.tileId, 10);
    if (!Number.isInteger(tileId)) return;
    const action = button.dataset.action;
    if (action === "mortgage") {
      onIntent({ type: "MORTGAGE_PROPERTY", payload: { tileId } });
    } else if (action === "unmortgage") {
      onIntent({ type: "UNMORTGAGE_PROPERTY", payload: { tileId } });
    }
  }

  function handleDebtTradeClick(event) {
    const button = event.target.closest("button[data-partner-id]");
    if (!button) return;
    const partnerId = button.dataset.partnerId;
    if (!partnerId) return;
    openTradePicker();
    onIntent({ type: "OPEN_TRADE_PICKER" });
    uiState.tradePickerOpen = false;
    uiState.tradeComposerOpen = true;
    onIntent({ type: "OPEN_TRADE_COMPOSER", payload: { partnerId } });
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

  function overrideEvenBuild(state, value) {
    return {
      ...state,
      config: {
        ...state.config,
        evenBuild: value,
      },
    };
  }

  function structureIconsMarkup(houses) {
    if (houses === 5) {
      return `<span class="hotel-icon" aria-label="Hotel"></span><span class="structure-label">Hotel</span>`;
    }
    if (houses <= 0) {
      return `<span class="structure-empty">0</span><span class="structure-label">No houses</span>`;
    }
    let icons = "";
    for (let i = 0; i < houses; i += 1) {
      icons += '<span class="house-icon" aria-hidden="true"></span>';
    }
    return `${icons}<span class="structure-label">${houses} house${houses === 1 ? "" : "s"}</span>`;
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

  function formatGroupName(group) {
    if (!group) return "—";
    return group.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getGroupColor(group) {
    if (!group) return "#4a4860";
    return groupPalette[group.toLowerCase()] || "#4a4860";
  }

  function quickStart(count = 4) {
    const capped = Math.max(2, Math.min(count, 6));
    const players = Array.from({ length: capped }).map((_, idx) => ({
      name: `Player ${idx + 1}`,
      color: quickColors[idx % quickColors.length],
    }));
    onIntent({ type: "NEW_GAME", payload: { players } });
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
    resetChat() {
      uiState.chatMessages = [];
      uiState.lastChatLogId = 0;
      renderChat();
    },
    resetTradeUI() {
      closeTradePicker();
      closeTradeComposer();
      closeTradeInbound();
      onIntent({ type: "CLOSE_TRADE_UI" });
    },
    showDice,
    quickStart,
    closePropertyCard,
  };
}
