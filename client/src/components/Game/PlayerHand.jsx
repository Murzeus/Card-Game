// components/Game/PlayerHand.jsx
import React, { useState } from 'react';
import { Card } from './Card';

export function PlayerHand({ cards = [], isActive, onPlayCard }) {
  const [selectedIndices, setSelectedIndices] = useState([]);

  function toggleCardSelection(index) {
    if (!isActive) return;
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }

  function handlePlaySelected() {
    if (selectedIndices.length === 0) return;
    const played = selectedIndices.map((i) => cards[i]);
    setSelectedIndices([]);
    onPlayCard?.(played);
  }

  return (
    <div className="player-hand">
      <h3>Your Cards ({cards.length})</h3>
      <div className="cards">
        {cards.map((card, index) => {
          const isSelected = selectedIndices.includes(index);
          return (
            <div
              key={`card-${index}`}
              className={`card ${isActive ? 'playable' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleCardSelection(index)}
              title={card}
              role={isActive ? 'button' : 'img'}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(e) => {
                if (!isActive) return;
                if (e.key === 'Enter' || e.key === ' ') toggleCardSelection(index);
              }}
            >
              <Card card={card} />
            </div>
          );
        })}
      </div>

      {isActive && (
        <div className="game-controls">
          <button onClick={handlePlaySelected} disabled={selectedIndices.length === 0}>
            Play Selected Cards
          </button>
        </div>
      )}
    </div>
  );
}
