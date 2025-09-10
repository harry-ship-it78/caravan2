// Card / Deck helpers

const SUITS = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

let nextId = 1;

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const color = (suit === 'Hearts' || suit === 'Diamonds') ? 'red' : 'black';
      deck.push({
        id: nextId++,
        rank,
        suit,
        color
      });
    }
  }
  return deck;
}

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function createShuffledDeck() {
  return shuffle(createDeck());
}

export function dealCards(deck, count) {
  const hand = deck.slice(0, count);
  const rest = deck.slice(count);
  return [hand, rest];
}

export function drawOne(deck) {
  if (!deck || deck.length === 0) return [null, deck || []];
  const [first, ...rest] = deck;
  return [first, rest];
}