import { BOARD_TILES } from "./board.js";
import { selectors, canBuildHere, canSellHere } from "./rules.js";

export function createUI({ elements, boardApi, onIntent, getState }) {
  const uiState = {
    selectedTileId: null,
    lastCardId: null,
    tradeModalOpen: false,
    tradePartnerId: null,
    debtModalOpen: false,
  };

  const tileData = BOARD_TILES;

  elements.rollBtn.addEventListener("click", () => onIntent({ type: "ROLL_DICE" }));
  elements.buyBtn.addEventListener("click", () => onIntent({ type: "BUY_PROPERTY" }));
  elements.endBtn.addEventListener("click", () => onIntent({ type: "END_TURN" }));
  elements.payBailBtn.addEventListener("click", () => onIntent({ type: "PAY_BAIL" }));
  elements.useCardBtn.addEventListener("click", () => onIntent({ type: "USE_LEAVE_JAIL_CARD" }));
  if (elements.buildBtn) {
    elements.buildBtn.addEventListener("click", () => {
      if (uiState.selectedTileId != null) {
        onIntent({ type: "BUILD_HOUSE", payload: { tileId: uiState.selectedTileId } });
      }
    });
  }
  if (elements.sellBtn) {
    elements.sellBtn.addEventListener("click", () => {
      if (uiState.selectedTileId != null) {
        onIntent({ type: "SELL_HOUSE", payload: { tileId: uiState.selectedTileId } });
      }
    });
  }
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
  if (elements.tradeBtn) {
    elements.tradeBtn.addEventListener("click", () => openTradeModal());
  }
  if (elements.tradePartnerSelect) {
    elements.tradePartnerSelect.addEventListener("change", (event) => {
      uiState.tradePartnerId = event.target.value || null;
      if (uiState.tradePartnerId) {
        onIntent({ type: "OPEN_TRADE", payload: { partnerId: uiState.tradePartnerId } });
      }
      renderTradeModal(getState());
    });
  }
  if (elements.tradeProposeBtn) {
    elements.tradeProposeBtn.addEventListener("click", () => submitTradeProposal("PROPOSE_TRADE"));
  }
  if (elements.tradeCounterBtn) {
    elements.tradeCounterBtn.addEventListener("click", () => submitTradeProposal("COUNTER_TRADE"));
  }
  if (elements.tradeAcceptBtn) {
    elements.tradeAcceptBtn.addEventListener("click", () => {
      onIntent({ type: "ACCEPT_TRADE" });
      closeTradeModal();
    });
  }
  if (elements.tradeDeclineBtn) {
    elements.tradeDeclineBtn.addEventListener("click", () => {
      onIntent({ type: "DECLINE_TRADE" });
      closeTradeModal();
    });
  }
  if (elements.tradeCancelBtn) {
    elements.tradeCancelBtn.addEventListener("click", () => {
      onIntent({ type: "CANCEL_TRADE" });
      closeTradeModal();
    });
  }
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
    renderFinanceControls(state);
    renderTradeModal(state);
    renderDebtModal(state);
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

    if (elements.evenBuildToggle) {
      elements.evenBuildToggle.checked = Boolean(state.config?.evenBuild);
      elements.evenBuildToggle.setAttribute(
        "aria-label",
        `Even-Build rule ${state.config?.evenBuild ? "on" : "off"}`
      );
    }
    if (elements.evenBuildStatus) {
      const isOn = Boolean(state.config?.evenBuild);
      elements.evenBuildStatus.textContent = isOn ? "ON" : "OFF";
      elements.evenBuildStatus.classList.toggle("off", !isOn);
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
    const debtActive = Boolean(state.debtContext?.active);
    const tradePending = Boolean(state.pendingTrade);
    const canRoll = !hasWinner && player && !player.bankrupt && state.turn.phase === "idle" && !debtActive && !tradePending;
    const canBuy = !hasWinner && selectors.canBuyCurrentTile(state) && !debtActive;
    const canEnd =
      !hasWinner &&
      player &&
      !player.bankrupt &&
      !debtActive &&
      !tradePending &&
      (state.turn.phase === "resolved" || state.turn.allowExtraRoll || state.turn.mustEnd);
    const canPayBail = !hasWinner && player && player.inJail && !player.bankrupt && state.turn.phase === "idle" && player.cash >= state.config.bail;
    const canUseCard = !hasWinner && player && player.inJail && player.heldCards.some((card) => card.kind === "leaveJail");

    elements.rollBtn.disabled = !canRoll;
    elements.buyBtn.disabled = !canBuy;
    elements.endBtn.disabled = !canEnd;
    elements.payBailBtn.disabled = !canPayBail;
    elements.useCardBtn.disabled = !canUseCard;

    renderBuildSellControls(state, player);

    if (elements.tradeBtn) {
      const activePlayers = selectors.getActivePlayers(state).filter((p) => p.id !== (player?.id ?? null));
      const canTrade = !hasWinner && player && !player.bankrupt && activePlayers.length > 0;
      elements.tradeBtn.disabled = !canTrade;
      elements.tradeBtn.title = canTrade ? "Open trade builder" : "Trading unavailable";
    }
  }

  function renderBuildSellControls(state, player) {
    if (!elements.buildBtn || !elements.sellBtn) return;
    const tileId = uiState.selectedTileId;
    const tile = tileData.find((t) => t.id === tileId);
    const isProperty = tile && tile.type === "property";
    const playerId = player?.id ?? null;
    const ownerId = isProperty ? state.tileOwnership?.[tileId] ?? state.tileOwnership?.[String(tileId)] : null;
    const canInteract = Boolean(isProperty && playerId && ownerId === playerId && !player.bankrupt);

    const buildClassTarget = elements.buildBtn.classList;
    const sellClassTarget = elements.sellBtn.classList;
    const hideControls = !isProperty || !canInteract;
    buildClassTarget.toggle("hidden", hideControls);
    sellClassTarget.toggle("hidden", hideControls);

    if (hideControls) {
      elements.buildBtn.disabled = true;
      elements.sellBtn.disabled = true;
      elements.buildBtn.removeAttribute("title");
      elements.sellBtn.removeAttribute("title");
      return;
    }

    const debtActive = Boolean(state.debtContext?.active);
    const canBuild = canBuildHere(state, playerId, tileId);
    const canSell = canSellHere(state, playerId, tileId);
    elements.buildBtn.disabled = !canBuild || debtActive;
    elements.sellBtn.disabled = !canSell;

    const evenBlockedBuild =
      !canBuild && state.config?.evenBuild && canBuildHere(overrideEvenBuild(state, false), playerId, tileId);
    const evenBlockedSell =
      !canSell && state.config?.evenBuild && canSellHere(overrideEvenBuild(state, false), playerId, tileId);

    if (elements.buildBtn.disabled && debtActive) {
      elements.buildBtn.title = "Resolve debt before building.";
    } else if (evenBlockedBuild) {
      elements.buildBtn.title = "Even-Build: add houses evenly across the group.";
    } else {
      elements.buildBtn.removeAttribute("title");
    }

    if (evenBlockedSell) {
      elements.sellBtn.title = "Even-Build: remove houses evenly across the group.";
    } else {
      elements.sellBtn.removeAttribute("title");
    }
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
    renderStructurePanel(state, tile);
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
    if (owner) {
      lines.push(`Owner: <span style="color:${owner.color}">${escapeHtml(owner.name)}</span>`);
    } else if (tile.type === "property" || tile.type === "rail" || tile.type === "utility") {
      lines.push("Owner: Bank");
    }
    elements.tileDetail.innerHTML = lines.map((line) => `<div>${line}</div>`).join("");
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

  function openTradeModal(partnerId) {
    const state = getState();
    const player = selectors.getCurrentPlayer(state);
    const partners = selectors.getActivePlayers(state).filter((p) => p.id !== (player?.id ?? null));
    if (!partners.length) return;
    const targetPartner = partnerId || uiState.tradePartnerId || partners[0].id;
    uiState.tradePartnerId = targetPartner;
    uiState.tradeModalOpen = true;
    if (elements.tradeModal) {
      elements.tradeModal.classList.remove("hidden");
      elements.tradeModal.setAttribute("aria-hidden", "false");
    }
    if (targetPartner) {
      onIntent({ type: "OPEN_TRADE", payload: { partnerId: targetPartner } });
    }
    renderTradeModal(getState());
  }

  function closeTradeModal() {
    uiState.tradeModalOpen = false;
    if (elements.tradeModal) {
      elements.tradeModal.classList.add("hidden");
      elements.tradeModal.setAttribute("aria-hidden", "true");
    }
  }

  function populateTradePartners(state) {
    if (!elements.tradePartnerSelect) return;
    const player = selectors.getCurrentPlayer(state);
    const partners = selectors.getActivePlayers(state).filter((p) => p.id !== (player?.id ?? null));
    elements.tradePartnerSelect.innerHTML = "";
    const fragment = document.createDocumentFragment();
    if (!partners.length) {
      const option = document.createElement("option");
      option.textContent = "No partners available";
      option.value = "";
      fragment.appendChild(option);
      uiState.tradePartnerId = null;
    } else {
      partners.forEach((partner) => {
        const option = document.createElement("option");
        option.value = partner.id;
        option.textContent = `${partner.name} — $${partner.cash}`;
        fragment.appendChild(option);
      });
      if (!uiState.tradePartnerId || !partners.some((p) => p.id === uiState.tradePartnerId)) {
        uiState.tradePartnerId = partners[0].id;
      }
    }
    elements.tradePartnerSelect.appendChild(fragment);
    elements.tradePartnerSelect.value = uiState.tradePartnerId || "";
  }

  function renderTradeModal(state) {
    if (!elements.tradeModal) return;
    const player = selectors.getCurrentPlayer(state);
    if (!player) {
      closeTradeModal();
      return;
    }

    const trade = state.pendingTrade;
    if (trade && !uiState.tradeModalOpen && (trade.awaiting === player.id || trade.from === player.id)) {
      uiState.tradePartnerId = trade.from === player.id ? trade.to : trade.from;
      uiState.tradeModalOpen = true;
    }

    if (!uiState.tradeModalOpen) {
      elements.tradeModal.classList.add("hidden");
      elements.tradeModal.setAttribute("aria-hidden", "true");
      return;
    }

    elements.tradeModal.classList.remove("hidden");
    elements.tradeModal.setAttribute("aria-hidden", "false");

    populateTradePartners(state);

    const partnerId = uiState.tradePartnerId;
    const partner = state.players.find((p) => p.id === partnerId) || null;

    if (!partner) {
      if (elements.tradeStatus) {
        elements.tradeStatus.textContent = "Select a partner to begin.";
      }
      if (elements.tradeOfferProperties) elements.tradeOfferProperties.innerHTML = "";
      if (elements.tradeRequestProperties) elements.tradeRequestProperties.innerHTML = "";
      if (elements.tradeOfferCash) elements.tradeOfferCash.value = 0;
      if (elements.tradeRequestCash) elements.tradeRequestCash.value = 0;
      return;
    }

    if (trade && trade.to !== partner.id && trade.from === player.id) {
      // ensure trade matches selected partner; open new negotiation if needed
      onIntent({ type: "OPEN_TRADE", payload: { partnerId: partner.id } });
      return;
    }

    const offer = trade?.offer || { cash: 0, properties: [] };
    const request = trade?.request || { cash: 0, properties: [] };

    if (elements.tradeOfferCash) {
      elements.tradeOfferCash.value = offer.cash ?? 0;
    }
    if (elements.tradeRequestCash) {
      elements.tradeRequestCash.value = request.cash ?? 0;
    }

    if (elements.tradeOfferProperties) {
      const playerTiles = tileData.filter(
        (tile) => isMortgageableTile(tile) && state.tileOwnership?.[tile.id] === player.id
      );
      buildTradePropertyList(elements.tradeOfferProperties, playerTiles, new Set(offer.properties), state);
    }

    if (elements.tradeRequestProperties) {
      const partnerTiles = tileData.filter(
        (tile) => isMortgageableTile(tile) && state.tileOwnership?.[tile.id] === partner.id
      );
      buildTradePropertyList(elements.tradeRequestProperties, partnerTiles, new Set(request.properties), state);
    }

    if (elements.tradeStatus) {
      if (!trade) {
        elements.tradeStatus.textContent = "Drafting proposal.";
      } else if (trade.awaiting === player.id) {
        elements.tradeStatus.textContent = "Awaiting your response.";
      } else if (trade.awaiting === partner.id) {
        elements.tradeStatus.textContent = "Waiting for partner.";
      } else {
        elements.tradeStatus.textContent = "Negotiating.";
      }
    }

    const isInitiator = trade ? trade.from === player.id : true;
    const awaitingMe = trade ? trade.awaiting === player.id : false;
    const isPartner = trade ? trade.to === player.id : false;

    if (elements.tradeProposeBtn) {
      elements.tradeProposeBtn.disabled = !isInitiator;
    }
    if (elements.tradeCounterBtn) {
      elements.tradeCounterBtn.disabled = !(trade && isPartner);
    }
    if (elements.tradeAcceptBtn) {
      elements.tradeAcceptBtn.disabled = !awaitingMe;
    }
    if (elements.tradeDeclineBtn) {
      elements.tradeDeclineBtn.disabled = !awaitingMe;
    }
    if (elements.tradeCancelBtn) {
      elements.tradeCancelBtn.disabled = !(trade && isInitiator);
    }
  }

  function buildTradePropertyList(container, tiles, selectedIds, state) {
    container.innerHTML = "";
    if (!tiles.length) {
      const empty = document.createElement("div");
      empty.className = "trade-empty";
      empty.textContent = "No properties";
      container.appendChild(empty);
      return;
    }
    tiles.forEach((tile) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = tile.id;
      input.checked = selectedIds.has(tile.id);
      label.appendChild(input);

      const nameSpan = document.createElement("span");
      nameSpan.textContent = tile.name;
      label.appendChild(nameSpan);

      if (state.mortgages?.[tile.id]) {
        const badge = document.createElement("span");
        badge.className = "mortgaged-tag";
        badge.textContent = "M";
        label.appendChild(badge);
      }

      const houses = selectors.getHouseCount(state, tile.id);
      if (houses > 0) {
        const info = document.createElement("span");
        info.className = "trade-house-info";
        info.textContent = ` (${houses} house${houses === 1 ? "" : "s"})`;
        label.appendChild(info);
      }

      container.appendChild(label);
    });
  }

  function collectTradeSide(container, cashInput) {
    const properties = [];
    if (container) {
      container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        if (checkbox.checked) {
          const id = parseInt(checkbox.value, 10);
          if (Number.isInteger(id)) {
            properties.push(id);
          }
        }
      });
    }
    const cashValue = cashInput ? Math.max(0, Math.floor(Number(cashInput.value) || 0)) : 0;
    return { cash: cashValue, properties };
  }

  function submitTradeProposal(kind) {
    if (!uiState.tradePartnerId) return;
    const offer = collectTradeSide(elements.tradeOfferProperties, elements.tradeOfferCash);
    const request = collectTradeSide(elements.tradeRequestProperties, elements.tradeRequestCash);
    const payload = { offer, request };
    if (kind === "PROPOSE_TRADE") {
      payload.to = uiState.tradePartnerId;
    }
    onIntent({ type: kind, payload });
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
    openTradeModal(partnerId);
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
