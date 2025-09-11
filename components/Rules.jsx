import React from 'react';

export default function Rules() {
  return (
    <div className="rules">
      <p>Goal: Get all three of your caravans (piles) to a score between 21 and 26.</p>
      <ul>
        <li>Number cards and Aces (A=1) are placed on a pile’s container.</li>
        <li>Face cards (J/Q/K) must target a specific card in a pile.</li>
        <li>Jack (J): Removes the targeted card from scoring but leaves it visible.</li>
        <li>Queen (Q): Special effect placeholder (in this simplified version it does not change scoring).</li>
        <li>King (K): Doubles the value of the targeted number/Ace (only if that card isn’t removed).</li>
        <li>You draw a card after you play one. Turns alternate between you and the opponent.</li>
      </ul>
      <p>Mobile: Tap a card in your hand to select it, then tap a pile (numbers) or a specific card (faces).</p>
    </div>
  );
}