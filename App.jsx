import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createShuffledDeck, dealCards, drawOne } from './game/cardUtils.js';
import {
  canPlaceCardOnTarget,
  canPlaceCardOnTargetWithReason,
  computePileView,
  computePlayerTotals,
  findTopNonRemovedCardIndex,
  isFaceCard,
  isNumericOrAce
} from './game/rules.js';
import Hand from './components/Hand.jsx';
import Pile from './components/Pile.jsx';
import Scoreboard from './components/Scoreboard.jsx';
import Rules from './components/Rules.jsx';
import DebugPanel from './components/DebugPanel.jsx';

const initialGame = () => {
  const deck = createShuffledDeck();
  const [playerHand, deckAfterP] = dealCards(deck, 5);
  const [aiHand, deckAfterAI] = dealCards(deckAfterP, 5);
  return {
    deck: deckAfterAI,
    players: {
      player: { hand: playerHand, piles: [{ cards: [] }, { cards: [] }, { cards: [] }] },
      ai: { hand: aiHand, piles: [{ cards: [] }, { cards: [] }, { cards: [] }] }
    },
    turn: 'player',
    aiEnabled: true,
    gameOver: false,
    winner: null,
    message: null,
    moveCount: 0,
    moveLog: []
  };
};

export default function App() {
  const [game, setGame] = useState(initialGame);

  const gameRef = useRef(game);
  useEffect(() => { gameRef.current = game; }, [game]);

  const aiTimerRef = useRef(null);
  const aiMoveTokenRef = useRef(0);

  const resetGame = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = null;
    aiMoveTokenRef.current++;
    setGame(initialGame());
  }, []);

  const playerTotals = useMemo(
    () => computePlayerTotals(game.players.player.piles),
    [game.players.player.piles]
  );
  const aiTotals = useMemo(
    () => computePlayerTotals(game.players.ai.piles),
    [game.players.ai.piles]
  );

  const isInRange = useCallback((t) => t >= 21 && t <= 26, []);
  const playerAllInRange = useMemo(() => playerTotals.perPile.every(isInRange), [playerTotals.perPile, isInRange]);
  const aiAllInRange = useMemo(() => aiTotals.perPile.every(isInRange), [aiTotals.perPile, isInRange]);

  const decideWinnerIfAny = useCallback(() => {
    if (!playerAllInRange && !aiAllInRange) return null;
    if (playerAllInRange && !aiAllInRange) return 'player';
    if (aiAllInRange && !playerAllInRange) return 'ai';
    if (playerTotals.total > aiTotals.total) return 'player';
    if (aiTotals.total > playerTotals.total) return 'ai';
    return 'tie';
  }, [playerAllInRange, aiAllInRange, playerTotals.total, aiTotals.total]);

  useEffect(() => {
    if (game.gameOver) return;
    const w = decideWinnerIfAny();
    if (w) setGame((g) => ({ ...g, gameOver: true, winner: w }));
  }, [decideWinnerIfAny, game.gameOver]);

  useEffect(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = null;
    aiMoveTokenRef.current++;
  }, [game.aiEnabled]);

  const placeCard = useCallback((actorSide, targetSide, cardId, pileIndex, targetVisibleIndex = null) => {
    setGame((g) => {
      if (g.gameOver) return g;

      const actor = g.players[actorSide];
      const target = g.players[targetSide];

      const handIndex = actor.hand.findIndex((c) => c.id === cardId);
      if (handIndex < 0) return g;

      const card = actor.hand[handIndex];
      const pileCards = target.piles[pileIndex].cards;

      const validation = canPlaceCardOnTargetWithReason(card, pileCards, actorSide, targetSide);
      if (!validation.ok) {
        return { ...g, message: validation.reason || 'Invalid move.' };
      }

      let newRaw = [...pileCards];

      if (isNumericOrAce(card)) {
        newRaw.push(card);
      } else {
        if (pileCards.length > 0 && targetVisibleIndex === null) {
          return { ...g, message: 'Choose a specific card to place J/Q/K onto.' };
        }
        if (targetVisibleIndex === null) {
          if (card.rank === 'K') {
            return { ...g, message: 'King must be placed on a number or Ace.' };
          }
          newRaw.push(card);
        } else {
          const insertAt = targetVisibleIndex + 1;
          const targetCard = newRaw[targetVisibleIndex];

          if (card.rank === 'K') {
            const valid = targetCard && isNumericOrAce(targetCard) && !targetCard.removed;
            if (!valid) {
              return { ...g, message: 'King must be placed on a number or Ace that is not removed.' };
            }
          }
          newRaw.splice(insertAt, 0, card);

          if (card.rank === 'J' && targetCard) {
            newRaw[targetVisibleIndex] = { ...targetCard, removed: true };
          }
        }
      }

      const [drawn, newDeck] = drawOne(g.deck);
      const newActorHand = [...actor.hand];
      newActorHand.splice(handIndex, 1);
      if (drawn) newActorHand.push(drawn);

      const newPlayers = {
        player: { ...g.players.player },
        ai: { ...g.players.ai }
      };

      newPlayers[actorSide] = { ...newPlayers[actorSide], hand: newActorHand };
      newPlayers[targetSide] = {
        ...newPlayers[targetSide],
        piles: newPlayers[targetSide].piles.map((p, idx) =>
          idx === pileIndex ? { ...p, cards: newRaw } : p
        )
      };

      const nextTurn = actorSide === 'player' ? 'ai' : 'player';

      const moveEntry = {
        actor: actorSide, target: targetSide, cardRank: card.rank,
        pileIndex, targetVisibleIndex,
        aiEnabledAtMove: g.aiEnabled, prevTurn: g.turn, nextTurn,
        time: Date.now()
      };

      return {
        ...g,
        players: newPlayers,
        deck: newDeck,
        turn: nextTurn,
        moveCount: g.moveCount + 1,
        message: null,
        moveLog: [...g.moveLog, moveEntry]
      };
    });
  }, []);

  const onSelectPlayerHandCard = useCallback((cardId) => {
    // Card selection removed - drag/drop only
  }, []);

  // Remove tap-to-place functionality - drag/drop only

  const canDropOnTargetPileContainer = useCallback(
    (targetSide, pileIndex, payload) => {
      if (!payload || payload.source !== 'hand') return false;
      const actor = payload.owner;
      if (actor !== 'player' && actor !== 'ai') return false;
      if (actor !== game.turn) return false;
      const card = game.players[actor].hand.find((c) => c.id === payload.cardId);
      if (!card) return false;
      if (!isNumericOrAce(card)) return false;
      return canPlaceCardOnTarget(card, game.players[targetSide].piles[pileIndex].cards, actor, targetSide);
    },
    [game.players, game.turn]
  );

  const canDropOnTargetPileCard = useCallback(
    (targetSide, pileIndex, targetVisibleIndex, payload) => {
      if (!payload || payload.source !== 'hand') return false;
      const actor = payload.owner;
      if (actor !== 'player' && actor !== 'ai') return false;
      if (actor !== game.turn) return false;
      const card = game.players[actor].hand.find((c) => c.id === payload.cardId);
      if (!card || !isFaceCard(card)) return false;

      if (!canPlaceCardOnTarget(card, game.players[targetSide].piles[pileIndex].cards, actor, targetSide)) {
        return false;
      }

      const pileCards = game.players[targetSide].piles[pileIndex].cards;
      const topNonRemovedIndex = findTopNonRemovedCardIndex(pileCards);
      
      // Face cards can only target the top non-removed card
      if (targetVisibleIndex !== topNonRemovedIndex) {
        return false;
      }

      if (card.rank === 'K') {
        const targetCard = pileCards[targetVisibleIndex];
        const isValidTarget = targetCard && isNumericOrAce(targetCard) && !targetCard.removed;
        if (!isValidTarget) return false;
      }
      return true;
    },
    [game.players, game.turn]
  );

  const onDropToPlayerPileContainer = useCallback(
    (pileIndex, data) => {
      if (game.gameOver) return;
      try {
        const payload = JSON.parse(data);
        if (payload.source !== 'hand') return;
        const actor = payload.owner;
        if (actor !== game.turn) return;
        const card = game.players[actor].hand.find((c) => c.id === payload.cardId);
        if (!card) return;
        if (!isNumericOrAce(card)) {
          setGame((g) => ({ ...g, message: 'Picture cards (J/Q/K) must be dropped onto a specific card.' }));
          return;
        }
        placeCard(actor, 'player', payload.cardId, pileIndex, null);
      } catch {}
    },
    [game.gameOver, game.turn, game.players, placeCard]
  );

  const onDropToAiPileContainer = useCallback(
    (pileIndex, data) => {
      if (game.gameOver) return;
      try {
        const payload = JSON.parse(data);
        if (payload.source !== 'hand') return;
        const actor = payload.owner;
        if (actor !== game.turn) return;
        const card = game.players[actor].hand.find((c) => c.id === payload.cardId);
        if (!card) return;
        if (!isNumericOrAce(card)) {
          setGame((g) => ({ ...g, message: 'Picture cards (J/Q/K) must be dropped onto a specific card.' }));
          return;
        }
        placeCard(actor, 'ai', payload.cardId, pileIndex, null);
      } catch {}
    },
    [game.gameOver, game.turn, game.players, placeCard]
  );

  const onDropToPlayerPileCard = useCallback(
    (pileIndex, targetVisibleIndex, data) => {
      if (game.gameOver) return;
      try {
        const payload = JSON.parse(data);
        if (payload.source !== 'hand') return;
        const actor = payload.owner;
        if (actor !== game.turn) return;
        const card = game.players[actor].hand.find((c) => c.id === payload.cardId);
        if (!card || !isFaceCard(card)) return;
        placeCard(actor, 'player', payload.cardId, pileIndex, targetVisibleIndex);
      } catch {}
    },
    [game.gameOver, game.turn, game.players, placeCard]
  );

  const onDropToAiPileCard = useCallback(
    (pileIndex, targetVisibleIndex, data) => {
      if (game.gameOver) return;
      try {
        const payload = JSON.parse(data);
        if (payload.source !== 'hand') return;
        const actor = payload.owner;
        if (actor !== game.turn) return;
        const card = game.players[actor].hand.find((c) => c.id === payload.cardId);
        if (!card || !isFaceCard(card)) return;
        placeCard(actor, 'ai', payload.cardId, pileIndex, targetVisibleIndex);
      } catch {}
    },
    [game.gameOver, game.turn, game.players, placeCard]
  );

  useEffect(() => {
    if (!game.aiEnabled || game.gameOver || game.turn !== 'ai') return;

    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }

    const localToken = ++aiMoveTokenRef.current;
    const scheduledMoveCount = game.moveCount;
    const thinkMs = 600 + Math.floor(Math.random() * 600);

    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;

      const g = gameRef.current;
      if (!g || g.gameOver || !g.aiEnabled || g.turn !== 'ai') return;
      if (aiMoveTokenRef.current !== localToken) return;
      if (g.moveCount !== scheduledMoveCount) return;

      const ai = g.players.ai;

      const moves = [];
      ai.hand.forEach((card) => {
        for (let i = 0; i < 3; i++) {
          const pile = g.players.ai.piles[i];
          const can = canPlaceCardOnTarget(card, pile.cards, 'ai', 'ai');
          if (can) {
            if (isFaceCard(card) && pile.cards.length > 0) {
              const targetIdx = findTopNonRemovedCardIndex(pile.cards);
              if (targetIdx !== -1) {
                moves.push({ actor: 'ai', target: 'ai', cardId: card.id, pileIndex: i, tvi: targetIdx });
              }
            } else if (isNumericOrAce(card)) {
              moves.push({ actor: 'ai', target: 'ai', cardId: card.id, pileIndex: i, tvi: null });
            }
          }
        }
        for (let i = 0; i < 3; i++) {
          const pile = g.players.player.piles[i];
          const can = canPlaceCardOnTarget(card, pile.cards, 'ai', 'player');
          if (can && isFaceCard(card) && pile.cards.length > 0) {
            const targetIdx = findTopNonRemovedCardIndex(pile.cards);
            if (targetIdx !== -1) {
              moves.push({ actor: 'ai', target: 'player', cardId: card.id, pileIndex: i, tvi: targetIdx });
            }
          }
        }
      });

      if (moves.length === 0) {
        setGame((state) => ({ ...state, turn: 'player', message: 'Opponent skipped (no valid moves).' }));
        return;
      }

      const pick = moves[Math.floor(Math.random() * moves.length)];

      const g2 = gameRef.current;
      if (!g2 || g2.gameOver || !g2.aiEnabled || g2.turn !== 'ai') return;
      if (aiMoveTokenRef.current !== localToken) return;
      if (g2.moveCount !== scheduledMoveCount) return;

      placeCard(pick.actor, pick.target, pick.cardId, pick.pileIndex, pick.tvi);
    }, thinkMs);

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [game.turn, game.aiEnabled, game.gameOver, game.moveCount, placeCard]);

  const playerPerPileViews = useMemo(
    () => game.players.player.piles.map((p) => computePileView(p.cards)),
    [game.players.player.piles]
  );

  const aiPerPileViews = useMemo(
    () => game.players.ai.piles.map((p) => computePileView(p.cards)),
    [game.players.ai.piles]
  );

  const pilesDroppable =
    !game.gameOver && (game.turn === 'player' || (!game.aiEnabled && game.turn === 'ai'));

  return (
    <div className="app">
      <header className="topbar">
        <h1>Caravan Card Game by Harry</h1>
        <div className="controls">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={game.aiEnabled}
              onChange={(e) => setGame((g) => ({ ...g, aiEnabled: e.target.checked }))}
            />
            Enable AI
          </label>
          <button className="btn" onClick={resetGame}>Restart</button>
          <details className="rules-details">
            <summary>Rules</summary>
            <Rules />
          </details>
          <details className="rules-details">
            <summary>Debug</summary>
            <DebugPanel game={game} />
          </details>
        </div>
      </header>

      <main className="board">
        <section className="side ai-side">
          <h2>
            Opponent Side {game.turn === 'ai' && (game.aiEnabled ? '• Thinking…' : '• Your move')}
          </h2>
          <Scoreboard title="Opponent Totals" perPile={aiTotals.perPile} total={aiTotals.total} />
          <div className="piles">
            {game.players.ai.piles.map((pile, idx) => (
              <Pile
                key={`ai-pile-${idx}`}
                owner="ai"
                pileIndex={idx}
                pile={pile}
                pileView={aiPerPileViews[idx]}
                onDropContainer={(data) => onDropToAiPileContainer(idx, data)}
                isDropAllowedContainer={pilesDroppable}
                onCanDropContainer={(payload) => canDropOnTargetPileContainer('ai', idx, payload)}
                onDropCard={(targetVisibleIndex, data) => onDropToAiPileCard(idx, targetVisibleIndex, data)}
                isDropAllowedCard={pilesDroppable}
                onCanDropCard={(targetVisibleIndex, payload) => canDropOnTargetPileCard('ai', idx, targetVisibleIndex, payload)}
              />
            ))}
          </div>
        </section>

        <hr className="divider" />

        <section className="side player-side">
          <h2>Your Side {game.turn === 'player' ? '• Your move' : ''}</h2>
          <Scoreboard title="Your Totals" perPile={playerTotals.perPile} total={playerTotals.total} />
          <div className="piles">
            {game.players.player.piles.map((pile, idx) => (
              <Pile
                key={`player-pile-${idx}`}
                owner="player"
                pileIndex={idx}
                pile={pile}
                pileView={playerPerPileViews[idx]}
                onDropContainer={(data) => onDropToPlayerPileContainer(idx, data)}
                isDropAllowedContainer={pilesDroppable}
                onCanDropContainer={(payload) => canDropOnTargetPileContainer('player', idx, payload)}
                onDropCard={(targetVisibleIndex, data) => onDropToPlayerPileCard(idx, targetVisibleIndex, data)}
                isDropAllowedCard={pilesDroppable}
                onCanDropCard={(targetVisibleIndex, payload) => canDropOnTargetPileCard('player', idx, targetVisibleIndex, payload)}
              />
            ))}
          </div>
          <Hand
            owner="player"
            label="Your Hand"
            cards={game.players.player.hand}
            disabled={game.turn !== 'player' || game.gameOver}
            onSelectCard={onSelectPlayerHandCard}
          />
        </section>
      </main>

      <footer className="bottombar">
        <div>Deck: {game.deck.length} cards remaining</div>
        {game.message && <div className="message">{game.message}</div>}
      </footer>
    </div>
  );
}