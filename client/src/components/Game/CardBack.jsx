import React, { useState, useEffect } from 'react';
import cardBackSprite from '../../assets/deck_classic_backs.png';  // Import the card back sprite

// Define constants for the card grid and offsets
const SPRITE_WIDTH = 447;  // Full width of the card back sprite (7 cards horizontally)
const SPRITE_HEIGHT = 256; // Full height of the card back sprite (4 cards vertically)
const TILE_WIDTH = 40;     // Width of each card back slice
const TILE_HEIGHT = 60;    // Height of each card back slice
const CELL_WIDTH = 64;     // Width of each cell (may include gaps)
const CELL_HEIGHT = 64;    // Height of each cell (may include gaps)
const OFFSET_X = 12;       // Horizontal offset
const OFFSET_Y = 2;        // Vertical offset
const COLS = 7;            // Number of columns (7 cards)
const ROWS = 4;            // Number of rows (4 cards)

// Generate all possible positions in the grid
const cardBacks = [];
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    cardBacks.push({ row, col });
  }
}

export const CardBack = () => {
  const [cardBack, setCardBack] = useState(null);

  useEffect(() => {
    // Randomly pick a card back from the grid
    const randomCard = cardBacks[Math.floor(Math.random() * cardBacks.length)];
    setCardBack(randomCard);
  }, []);

  if (!cardBack) return null;

  // Extract the row and column for the randomly selected card back
  const { row, col } = cardBack;

  // Calculate the background position for the slice
  const backgroundPositionX = -(col * CELL_WIDTH + OFFSET_X);
  const backgroundPositionY = -(row * CELL_HEIGHT + OFFSET_Y);

  const cardBackStyle = {
    width: `${TILE_WIDTH}px`,
    height: `${TILE_HEIGHT}px`,
    backgroundImage: `url(${cardBackSprite})`,  // Use the imported sprite for card backs
    backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
    backgroundSize: `${SPRITE_WIDTH}px ${SPRITE_HEIGHT}px`,  // Size of the full sprite sheet
    backgroundRepeat: 'no-repeat',
    marginRight: '10px', // Space between the card and name
  };

  return <div className="card-back" style={cardBackStyle}></div>;
};
