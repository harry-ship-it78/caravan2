// Rules and scoring aligned to the stacked layout Pile expects.

export function isNumericOrAce(card) {
  if (!card) return false;
  if (card.rank === 'A') return true;
  const n = Number(card.rank);
  return Number.isFinite(n);
}

export function isFaceCard(card) {
  if (!card) return false;
  return card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';
}

export function getCardValue(card) {
  if (!card) return 0;
  if (card.rank === 'A') return 1;
  const n = Number(card.rank);
  return Number.isFinite(n) ? n : 0;
}

export function formatSuitGlyph(suit) {
  switch (suit) {
    case 'Hearts': return '♥';
    case 'Diamonds': return '♦';
    case 'Clubs': return '♣';
    case 'Spades': return '♠';
    default: return '?';
  }
}

// High-level legality used by App and UI
export function canPlaceCardOnTarget(card, pileCards, actorSide, targetSide) {
  if (!card) return false;
  const cards = pileCards || [];

  if (isNumericOrAce(card)) {
    // Can always place numbers/aces on the pile container
    return true;
  }

  // Faces require an existing target card
  if (cards.length === 0) return false;

  // King must target a numeric/ace that isn't removed
  if (card.rank === 'K') {
    return cards.some((c) => isNumericOrAce(c) && !c.removed);
  }

  // J/Q allowed if there is at least one target card
  return true;
}

export function canPlaceCardOnTargetWithReason(card, pileCards, actorSide, targetSide) {
  if (!card) return { ok: false, reason: 'No card.' };
  const cards = pileCards || [];

  if (isNumericOrAce(card)) {
    return { ok: true };
  }

  if (cards.length === 0) {
    return { ok: false, reason: 'Face cards must target an existing card.' };
  }

  if (card.rank === 'K') {
    const hasValidTarget = cards.some(c => isNumericOrAce(c) && !c.removed);
    if (!hasValidTarget) {
      return { ok: false, reason: 'King must target a non-removed number or Ace.' };
    }
  }

  return { ok: true };
}

// Score a single pile by your simplified rules:
// - Sum non-removed numeric/ace values
// - Each K doubles the most recent numeric/ace value (if any)
function computePileScore(cards) {
  const arr = Array.isArray(cards) ? cards : [];
  let values = [];
  let lastNumIndex = -1;

  for (const c of arr) {
    if (isNumericOrAce(c)) {
      if (!c.removed) {
        values.push(getCardValue(c));
        lastNumIndex = values.length - 1;
      } else {
        values.push(0);
      }
    } else if (c.rank === 'K') {
      if (lastNumIndex >= 0) {
        values[lastNumIndex] = values[lastNumIndex] * 2;
      }
    }
    // J/Q effects are handled at placement time or visual only (Q)
  }

  return values.reduce((a, b) => a + b, 0);
}

// Pile view for the stacked Pile component
export function computePileView(cards) {
  const visibleOrder = Array.isArray(cards) ? cards : [];
  const total = computePileScore(visibleOrder);
  // For display only: mark "reversed" if a Queen has been played anywhere
  const reversed = visibleOrder.some(c => c.rank === 'Q');
  return { visibleOrder, total, reversed };
}

// Totals across all piles
export function computePlayerTotals(piles) {
  const perPile = (piles || []).map((p) => computePileScore((p && p.cards) || []));
  const total = perPile.reduce((a, b) => a + b, 0);
  return { perPile, total };
}