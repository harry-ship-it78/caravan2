// Card creation and deck utilities

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function colorForSuit(suit) {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function createDeck() {
  const cards = [];
  let counter = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        id: `${rank}-${suit}-${counter++}`,
        rank,
        suit,
        color: colorForSuit(suit)
      });
    }
  }
  return cards;
}

export function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createShuffledDeck() {
  return shuffleDeck(createDeck());
}

export function dealCards(deck, count) {
  const arr = [...deck];
  const hand = [];
  for (let i = 0; i < count && arr.length > 0; i++) {
    hand.push(arr.pop());
  }
  return [hand, arr];
}

export function drawOne(deck) {
  if (deck.length === 0) return [null, deck];
  const arr = [...deck];
  const card = arr.pop();
  return [card, arr];
}