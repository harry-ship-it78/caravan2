// Rules and helpers tuned to FO:NV-like Caravan stacking.
// Visual order never reverses; Queens flip direction rules only.

export function getCardValue(card) {
  if (card.rank === 'A') return 1; // expand later if needed (A=1/11)
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 0;
  return parseInt(card.rank, 10);
}

export function formatSuitGlyph(suit) {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    default: return '?';
  }
}

export function isNumberCard(card) {
  if (!card) return false;
  if (card.rank === 'A' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return false;
  const n = parseInt(card.rank, 10);
  return !Number.isNaN(n);
}

export function isFaceCard(card) {
  return card?.rank === 'J' || card?.rank === 'Q' || card?.rank === 'K';
}

export function isNumericOrAce(card) {
  return card?.rank === 'A' || isNumberCard(card);
}

// Find the index of the top non-removed numeric/ace card in a pile
// This is the only valid target for face cards
export function findTopNonRemovedCardIndex(pileCards) {
  if (!pileCards || pileCards.length === 0) return -1;
  
  // Search from the end (most recent) backwards to find the first non-removed numeric/ace card
  for (let i = pileCards.length - 1; i >= 0; i--) {
    const card = pileCards[i];
    if (isNumericOrAce(card) && !card.removed) {
      return i;
    }
  }
  return -1;
}

// Visible view: do NOT reverse. Track queen parity separately for UI.
export function computePileView(pileCards) {
  const qCount = pileCards.reduce((acc, c) => acc + (c.rank === 'Q' && !c.removed ? 1 : 0), 0);
  const reversed = qCount % 2 === 1; // for indicator only; layout unchanged
  const visibleOrder = [...pileCards]; // chronological play order
  const total = computePileTotalFromVisible(visibleOrder);
  return { reversed, visibleOrder, total };
}

// Total: sum non-removed numerics/aces, multiplied by consecutive Kings immediately after them
export function computePileTotalFromVisible(visibleOrder) {
  let total = 0;
  for (let i = 0; i < visibleOrder.length; i++) {
    const card = visibleOrder[i];
    if ((card.rank === 'A' || isNumberCard(card)) && !card.removed) {
      const base = getCardValue(card);
      let multiplier = 1;
      let j = i + 1;
      while (j < visibleOrder.length && visibleOrder[j].rank === 'K' && !visibleOrder[j].removed) {
        multiplier *= 2;
        j++;
      }
      total += base * multiplier;
    }
  }
  return total;
}

export function computePlayerTotals(piles) {
  const perPile = piles.map((p) => computePileView(p.cards).total);
  const total = perPile.reduce((a, b) => a + b, 0);
  return { perPile, total };
}

// Determine current direction state by scanning chronological cards.
// Queens flip direction only after direction has been established.
export function getCurrentDirectionState(pileCards) {
  let direction = 'none'; // 'none' | 'up' | 'down' | 'invalid'
  let lastNumeric = null;
  let firstNumeric = null;

  for (let i = 0; i < pileCards.length; i++) {
    const c = pileCards[i];
    if (!c) continue;
    if (c.removed) continue;

    if (isNumericOrAce(c)) {
      const val = getCardValue(c);
      if (lastNumeric == null) {
        firstNumeric = val;
        lastNumeric = val;
      } else if (direction === 'none') {
        if (val === lastNumeric) {
          direction = 'invalid'; // equal numerics should not occur
        } else if (val > lastNumeric) {
          direction = 'up';
          lastNumeric = val;
        } else {
          direction = 'down';
          lastNumeric = val;
        }
      } else {
        // direction already set; we don't validate history here, only track last numeric
        lastNumeric = val;
      }
    } else if (c.rank === 'Q') {
      if (direction === 'up') direction = 'down';
      else if (direction === 'down') direction = 'up';
      // if 'none' or 'invalid', queen has no effect on direction now
    }
  }

  // if only one numeric exists, lastNumeric holds it and direction is 'none'
  return { direction, last: lastNumeric, first: firstNumeric };
}

// Placement rule considering source/target sides with reason messages
export function canPlaceCardOnTargetWithReason(card, pileCards, sourceSide, targetSide) {
  const sameSide = sourceSide === targetSide;

  if (!sameSide) {
    // Opponent targeting: only face cards, and pile must be non-empty
    if (!isFaceCard(card)) {
      return { ok: false, reason: 'Only picture cards (J/Q/K) can be played onto opponent piles.' };
    }
    if (pileCards.length === 0) {
      return { ok: false, reason: 'Cannot play picture cards onto an empty opponent pile.' };
    }
    // Additional check: must have a valid target card
    const topIndex = findTopNonRemovedCardIndex(pileCards);
    if (topIndex === -1) {
      return { ok: false, reason: 'No valid target card (all cards are removed).' };
    }
    return { ok: true };
  }

  // Same side rules
  if (card.rank === 'J' && pileCards.length === 0) {
    return { ok: false, reason: 'Jack cannot be played onto an empty pile.' };
  }

  if (isNumericOrAce(card)) {
    const state = getCurrentDirectionState(pileCards);
    const newVal = getCardValue(card);

    if (state.direction === 'invalid') {
      return { ok: false, reason: 'Pile direction is invalid due to equal numeric cards.' };
    }
    if (state.last == null) {
      // first numeric — always ok
      return { ok: true };
    }
    if (state.direction === 'none') {
      if (newVal === state.last) {
        return { ok: false, reason: 'You must establish direction by playing a different value.' };
      }
      return { ok: true };
    }
    if (state.direction === 'up') {
      if (newVal <= state.last) {
        return { ok: false, reason: `Wrong direction: must play higher than ${state.last}.` };
      }
      return { ok: true };
    }
    if (state.direction === 'down') {
      if (newVal >= state.last) {
        return { ok: false, reason: `Wrong direction: must play lower than ${state.last}.` };
      }
      return { ok: true };
    }
  }

  // Face cards allowed (additional targeting constraints handled by UI/handlers)
  return { ok: true };
}

export function canPlaceCardOnTarget(card, pileCards, sourceSide, targetSide) {
  return canPlaceCardOnTargetWithReason(card, pileCards, sourceSide, targetSide).ok;
}