import React from 'react';
import { formatSuitGlyph, getCardValue } from '../game/rules.js';

export default function Hand({
  owner,
  cards,
  disabled,
  label = 'Hand',
  onSelectCard,
  selectedCardId
}) {
  const onDragStart = (e, card) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    const payload = { source: 'hand', owner, cardId: card.id };
    const json = JSON.stringify(payload);
    e.dataTransfer.setData('application/json', json);
    e.dataTransfer.setData('text/plain', json);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = (card) => {
    if (disabled) return;
    if (!onSelectCard) return;
    onSelectCard(card.id);
  };

  return (
    <div className={`hand ${disabled ? 'disabled' : ''}`}>
      <h3>{label}</h3>
      <div className="cards" role="list" aria-label={`${label} (${owner})`}>
        {cards.map((card) => {
          const glyph = formatSuitGlyph(card.suit);
          const value = getCardValue(card);
          const selected = selectedCardId === card.id;
          const title =
            card.rank === 'A'
              ? `A${glyph} (Ace=1)`
              : ['J', 'Q', 'K'].includes(card.rank)
              ? `${card.rank}${glyph} (${card.rank === 'J' ? 'Jack' : card.rank === 'Q' ? 'Queen' : 'King'})`
              : `${card.rank}${glyph} (${value})`;

          return (
            <button
              key={card.id}
              className={`card draggable ${card.color} ${selected ? 'selected' : ''}`}
              draggable={!disabled}
              onDragStart={(e) => onDragStart(e, card)}
              onClick={() => handleClick(card)}
              aria-pressed={selected}
              aria-label={title}
              title={title}
              type="button"
            >
              <div className="corner tl">
                <div className="rank">{card.rank}</div>
                <div className="suit">{glyph}</div>
              </div>
              <div className="center" aria-hidden="true">{glyph}</div>
              <div className="corner br">
                <div className="rank">{card.rank}</div>
                <div className="suit">{glyph}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}