// components/Game/Card.jsx

import sprite from '../../assets/deck_classic_light_2color_0.png';

import {
  SPRITE_WIDTH,
  SPRITE_HEIGHT,
  TILE_WIDTH,
  TILE_HEIGHT,
  CELL_WIDTH,
  CELL_HEIGHT,
  OFFSET_X,
  OFFSET_Y,
  COLS,
  ROWS,
  SPRITE_RANKS_ORDER,
  SPRITE_SUITS_ORDER
} from './cardConstants';


/**
 * card: string like "Q♠" or "10♥"
 */
export function Card({ card }) {
  if (!card) return null;

  // parse rank and suit
  const rank = card.slice(0, -1);    // '10' or 'Q' etc
  const suit = card.slice(-1);       // '♥', '♦', '♣', '♠'

  // determine column and row indices according to configured orders
  let col = SPRITE_RANKS_ORDER.indexOf(rank);
  let row = SPRITE_SUITS_ORDER.indexOf(suit);

  // Fallbacks (so it still renders if mapping isn't perfect)
  if (col === -1) col = 0;
  if (row === -1) row = 0;

  const tileX = OFFSET_X + col * CELL_WIDTH;
  const tileY = OFFSET_Y + row * CELL_HEIGHT;

  const style = {
    width: `${TILE_WIDTH}px`,
    height: `${TILE_HEIGHT}px`,
    display: 'block',
    backgroundImage: `url(${sprite})`,
    // use native sprite pixel coordinates (no scaling)
    backgroundSize: `${SPRITE_WIDTH}px ${SPRITE_HEIGHT}px`,
    backgroundPosition: `-${tileX}px -${tileY}px`,
    backgroundRepeat: 'no-repeat',
    pointerEvents: 'none', // let the wrapper (.card) handle clicks
  };

  // Helpful debug line you can uncomment while tuning:
  // console.log({ card, rank, suit, col, row, tileX, tileY });

  return <div className="card-sprite" style={style} aria-label={card} />;
}
