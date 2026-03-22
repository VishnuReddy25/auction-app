/**
 * AuctionEngine v2 — Open Bidding
 * Everyone can bid at any time during the countdown.
 * Highest bid when timer expires wins the player.
 * No turns — pure open auction like IPL.
 */

class AuctionEngine {

  static createState({ roomId, players, items, settings }) {
    return {
      roomId,
      phase: 'waiting',       // waiting | bidding | sold | unsold | completed
      players: players.map(p => ({
        id:       p.id || p._id?.toString(),
        username: p.username,
        budget:   p.budget ?? settings?.startingBudget ?? 1000,
        isHost:   p.isHost || false,
        isActive: true,
        team:     [],          // players won
      })),
      items:            items.map((it, i) => ({ ...it, index: i, status: 'pending' })),
      currentIndex:     0,
      currentBid:       0,
      currentBidderId:  null,
      currentBidderName: null,
      bidHistory:       [],
      timerSeconds:     settings?.timerSeconds ?? 30,
      settings: {
        startingBudget: settings?.startingBudget ?? 1000,
        minIncrement:   settings?.minIncrement   ?? 5,
        timerSeconds:   settings?.timerSeconds   ?? 30,
      },
    };
  }

  static getCurrentItem(state) {
    return state.items[state.currentIndex] || null;
  }

  // Validate a bid — open bidding, anyone can bid anytime
  static validateBid(state, playerId, amount) {
    if (state.phase !== 'bidding') return { ok: false, reason: 'Auction not active' };

    const player = state.players.find(p => p.id === playerId);
    if (!player)           return { ok: false, reason: 'Player not found' };
    if (player.isHost)     return { ok: false, reason: 'Host cannot bid' };
    if (!player.isActive)  return { ok: false, reason: 'You are inactive' };
    if (amount > player.budget) return { ok: false, reason: 'Insufficient budget' };

    const item   = this.getCurrentItem(state);
    const minBid = state.currentBid > 0
      ? state.currentBid + state.settings.minIncrement
      : (item?.basePrice ?? state.settings.minIncrement);

    if (amount < minBid) return { ok: false, reason: `Min bid is ₹${minBid}L` };
    if (playerId === state.currentBidderId) return { ok: false, reason: 'You already have the highest bid' };

    return { ok: true, minBid };
  }

  // Place a bid — returns new state
  static placeBid(state, playerId, amount) {
    const v = this.validateBid(state, playerId, amount);
    if (!v.ok) return { success: false, reason: v.reason, state };

    const player   = state.players.find(p => p.id === playerId);
    const newState = {
      ...state,
      currentBid:        amount,
      currentBidderId:   playerId,
      currentBidderName: player.username,
      bidHistory: [
        ...state.bidHistory,
        { playerId, username: player.username, amount, time: Date.now() },
      ],
    };
    return { success: true, state: newState };
  }

  // Award item to highest bidder
  static closeBidding(state) {
    const item = this.getCurrentItem(state);
    if (!item) return { state, result: null };

    if (state.currentBidderId) {
      // SOLD
      const winner  = state.players.find(p => p.id === state.currentBidderId);
      const updated = state.players.map(p =>
        p.id === state.currentBidderId
          ? { ...p, budget: p.budget - state.currentBid, team: [...p.team, { ...item, boughtFor: state.currentBid }] }
          : p
      );
      const updatedItems = state.items.map((it, i) =>
        i === state.currentIndex ? { ...it, status: 'sold', soldTo: winner?.username, soldFor: state.currentBid } : it
      );
      const result = { type: 'sold', item, winner: winner?.username, price: state.currentBid, bids: state.bidHistory.length };
      return { state: { ...state, players: updated, items: updatedItems, phase: 'sold' }, result };
    } else {
      // UNSOLD
      const updatedItems = state.items.map((it, i) =>
        i === state.currentIndex ? { ...it, status: 'unsold' } : it
      );
      const result = { type: 'unsold', item, winner: null, price: 0, bids: 0 };
      return { state: { ...state, items: updatedItems, phase: 'unsold' }, result };
    }
  }

  // Move to next item
  static nextItem(state) {
    const next = state.currentIndex + 1;
    if (next >= state.items.length) {
      return { state: { ...state, phase: 'completed' }, done: true };
    }
    return {
      state: {
        ...state,
        currentIndex:      next,
        currentBid:        0,
        currentBidderId:   null,
        currentBidderName: null,
        bidHistory:        [],
        phase:             'bidding',
      },
      done: false,
    };
  }

  // Start auction
  static start(state) {
    return {
      ...state,
      phase:             'bidding',
      currentIndex:      0,
      currentBid:        0,
      currentBidderId:   null,
      currentBidderName: null,
      bidHistory:        [],
    };
  }

  static getLeaderboard(state) {
    return state.players
      .filter(p => !p.isHost)
      .map(p => ({
        id:        p.id,
        username:  p.username,
        budget:    p.budget,
        teamCount: p.team.length,
        spent:     (state.settings.startingBudget - p.budget),
        team:      p.team,
      }))
      .sort((a, b) => b.teamCount - a.teamCount || b.spent - a.spent);
  }

  // Quick bid suggestion
  static suggest(state, playerId) {
    const player  = state.players.find(p => p.id === playerId);
    if (!player) return null;
    const item      = this.getCurrentItem(state);
    const remaining = state.items.filter(i => i.status === 'pending').length;
    const minBid    = state.currentBid > 0
      ? state.currentBid + state.settings.minIncrement
      : (item?.basePrice ?? state.settings.minIncrement);
    const perItem   = player.budget / Math.max(remaining, 1);
    const suggested = Math.min(minBid + state.settings.minIncrement * 2, perItem * 0.8, player.budget);
    const snapped   = Math.max(minBid, Math.floor(suggested / state.settings.minIncrement) * state.settings.minIncrement);
    return {
      amount: snapped,
      reason: snapped > perItem ? 'Stretching budget — bid carefully' : 'Good value based on remaining budget',
    };
  }
}

module.exports = AuctionEngine;
