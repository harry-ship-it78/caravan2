import React from 'react';

export default function DebugPanel({ game }) {
  if (!game) return null;
  return (
    <div className="debug">
      <details>
        <summary>Game State</summary>
        <pre>{JSON.stringify({
          turn: game.turn,
          deck: game.deck.length,
          playerHand: game.players.player.hand.map(c => c.rank + c.suit[0]),
          aiHand: game.players.ai.hand.length,
          message: game.message,
          moveCount: game.moveCount
        }, null, 2)}</pre>
      </details>
      <details>
        <summary>Move Log ({game.moveLog.length})</summary>
        <ol>
          {game.moveLog.map((m, i) => (
            <li key={i}>
              #{i+1} {m.actor} played {m.cardRank} on {m.target} pile {m.pileIndex+1} {m.targetVisibleIndex!=null ? `at idx ${m.targetVisibleIndex}` : '' }
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}