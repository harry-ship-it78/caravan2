import React, { useCallback, useMemo, useState } from 'react';
import { formatSuitGlyph, getCardValue, isFaceCard, isNumericOrAce } from '../game/rules.js';

export default function Pile({
  owner,
  pileIndex,
  pile,
  pileView,
  // container drop (numeric only)
  onDropContainer,
  isDropAllowedContainer,
  onCanDropContainer,
  // card drop (face only)
  onDropCard,
  isDropAllowedCard,
  onCanDropCard
}) {
  const { reversed, visibleOrder, total } = pileView;

  // Separate hover vs drag states (hover shows viewed group; drag shows outline only)
  const [hoverIdx, setHoverIdx] = useState(null);
  const [dragTargetIdx, setDragTargetIdx] = useState(null);

  // Visual constants (keep in sync with CSS)
  const CARD_H = 133; // .card.small height

  // Corner box in CSS: .card.small .corner { height: 29px; }
  // Make the vertical step a bit larger than the corner so the suit glyph is fully visible.
  const CORNER_H = 29;
  const GAP_BUFFER = 7;           // tweak this if you want slightly more/less
  const SPINE_STEP = CORNER_H + GAP_BUFFER; // 36px

  // Picture cards: down-right offsets from their base layer
  const FACE_ANCHOR_X = 40;
  const FACE_ANCHOR_Y = 12;
  const FACE_STEP_DX  = 22;
  const FACE_STEP_DY  = 8;

  // Group the pile into layers: one numeric/ace base followed by its picture cards
  const layers = useMemo(() => {
    const L = [];
    let current = null;
    for (let i = 0; i < visibleOrder.length; i++) {
      const c = visibleOrder[i];
      if (isNumericOrAce(c)) {
        current = { baseIndex: i, faces: [] };
        L.push(current);
      } else {
        if (!current) {
          current = { baseIndex: null, faces: [] }; // face before any number
          L.push(current);
        }
        current.faces.push(i);
      }
    }
    return L;
  }, [visibleOrder]);

  // Which indices belong to the same visual "group" when hovered
  const viewedGroup = useMemo(() => {
    const idx = hoverIdx; // hover-only
    if (idx == null || idx < 0 || idx >= visibleOrder.length) return new Set();

    // Find the layer containing idx
    let layerFound = null;
    for (const layer of layers) {
      if (layer.baseIndex === idx || layer.faces.includes(idx)) {
        layerFound = layer;
        break;
      }
    }
    if (!layerFound) return new Set([idx]);

    const group = new Set();
    if (layerFound.baseIndex != null) group.add(layerFound.baseIndex);
    layerFound.faces.forEach(i => group.add(i));
    return group;
  }, [hoverIdx, layers, visibleOrder.length]);

  // Compute absolute positions (FO:NV-style tight stack):
  // - Numbers/Aces: left-aligned spine, stepping down by SPINE_STEP (heavy overlap).
  // - Faces: attach down-right to that layer and step further for multiple faces.
  const positions = useMemo(() => {
    const pos = visibleOrder.map(() => ({ top: 0, left: 0 }));
    let maxBottom = 0;

    layers.forEach((layer, li) => {
      const baseY = li * SPINE_STEP;

      if (layer.baseIndex != null) {
        pos[layer.baseIndex] = { top: baseY, left: 0 };
        maxBottom = Math.max(maxBottom, baseY + CARD_H);
      }

      layer.faces.forEach((cardIdx, k) => {
        const left = FACE_ANCHOR_X + k * FACE_STEP_DX;
        const top  = baseY + FACE_ANCHOR_Y + k * FACE_STEP_DY;
        pos[cardIdx] = { top, left };
        maxBottom = Math.max(maxBottom, top + CARD_H);
      });

      if (layer.baseIndex == null && layer.faces.length > 0) {
        const top = baseY + FACE_ANCHOR_Y;
        maxBottom = Math.max(maxBottom, top + CARD_H);
      }
    });

    const height = Math.max(maxBottom, CARD_H);
    return { pos, height };
  }, [visibleOrder, layers, SPINE_STEP]);

  // Container drag-n-drop
  const handleContainerDragOver = useCallback(
    (e) => {
      if (!isDropAllowedContainer) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    [isDropAllowedContainer]
  );

  const handleContainerDrop = useCallback(
    (e) => {
      if (!isDropAllowedContainer) return;
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!raw) return;
      try {
        const payload = JSON.parse(raw);
        if (onCanDropContainer && !onCanDropContainer(payload)) return;
      } catch { /* ignore */ }
      onDropContainer(raw);
    },
    [isDropAllowedContainer, onDropContainer, onCanDropContainer]
  );

  // Card-target drag handlers (faces only)
  const handleCardDragOver = useCallback(
    (e, idx) => {
      if (!isDropAllowedCard) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragTargetIdx(idx); // outline only
    },
    [isDropAllowedCard]
  );

  const handleCardDragLeave = useCallback(() => {
    setDragTargetIdx(null);
  }, []);

  const handleCardDrop = useCallback(
    (e, idx) => {
      if (!isDropAllowedCard) return;
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!raw) return;
      try {
        const payload = JSON.parse(raw);
        if (onCanDropCard && !onCanDropCard(idx, payload)) return;
      } catch { /* ignore */ }
      onDropCard(idx, raw);
      setDragTargetIdx(null);
    },
    [isDropAllowedCard, onDropCard, onCanDropCard]
  );

  const clearHover = () => setHoverIdx(null);

  return (
    <div
      className="pile"
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
    >
      <div className="pile-header">
        <div className="pile-title">{owner === 'player' ? 'Your' : 'Opponent'} Pile {pileIndex + 1}</div>
        <div className="pile-score">Score: {total}</div>
        {reversed && <div className="pile-reversed" title="Reversed by Queen">↕</div>}
      </div>

      <div
        className="pile-cards stacked"
        style={{ height: positions.height }}
        onPointerLeave={clearHover}
      >
        {visibleOrder.length === 0 && <div className="empty">Drop here (numbers)</div>}

        {visibleOrder.map((card, idx) => {
          const glyph = formatSuitGlyph(card.suit);
          const value = getCardValue(card);
          const isFace = isFaceCard(card);

          const classes = ['card', 'small', card.color];
          if (isFace) classes.push('face');
          if (dragTargetIdx === idx) classes.push('highlight-target');
          if (viewedGroup.has(idx)) classes.push('viewed');
          if (card.removed) classes.push('removed');

          const style = {
            top: positions.pos[idx].top,
            left: positions.pos[idx].left,
            zIndex: (idx + 1) + (viewedGroup.has(idx) ? 200 : 0)
          };

          return (
            <div
              key={`${card.id}-${idx}`}
              className={classes.join(' ')}
              style={style}
              title={titleFor(card, value)}
              onPointerEnter={() => setHoverIdx(idx)}
              onPointerLeave={() => setHoverIdx(null)}
              onDragOver={(e) => handleCardDragOver(e, idx)}
              onDragLeave={handleCardDragLeave}
              onDrop={(e) => handleCardDrop(e, idx)}
            >
              <div className="corner tl">
                <div className="rank">{card.rank}</div>
                <div className="suit">{glyph}</div>
              </div>
              <div className="center small">{glyph}</div>
              <div className="corner br">
                <div className="rank">{card.rank}</div>
                <div className="suit">{glyph}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function titleFor(card, value) {
  if (card.rank === 'A') return 'Ace = 1';
  if (card.rank === 'J') return 'Jack: removes targeted card (kept visible, no score)';
  if (card.rank === 'Q') return 'Queen: reverses direction (visual order unchanged)';
  if (card.rank === 'K') return 'King: doubles the number directly beneath';
  return `Value ${value}`;
}