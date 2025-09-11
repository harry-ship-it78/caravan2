import React from 'react';

export default function Scoreboard({ title = 'Totals', perPile = [], total = 0 }) {
  return (
    <div className="scoreboard">
      <h3>{title}</h3>
      <div className="scores">
        {perPile.map((v, i) => (
          <div key={i} className={`score s${i+1}`}>Pile {i + 1}: {v}</div>
        ))}
      </div>
      <div className="score total">Total: {total}</div>
    </div>
  );
}