// src/components/Lobby/PlayerList.jsx
export function PlayerList({ players, currentPlayer }) {
  return (
    <div className="player-list">
      <h3>Players:</h3>
      <ul>
        {players.map((player) => {
          const name = typeof player === 'string' ? player : player.name;
          const isReady = typeof player === 'object' && player.ready;
          return (
            <li key={name} className={name === currentPlayer ? 'you' : ''}>
              {name}
              {isReady && ' ✓'}
            </li>
          );
        })}
      </ul>
    </div>
  );
}