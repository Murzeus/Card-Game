import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { NameEntry } from './NameEntry';
import { PlayerList } from './PlayerList';
import { GameScreen } from '../Game/Gamescreen';

// Create or load a persistent playerId
function getOrCreatePlayerId() {
  let id = localStorage.getItem('playerId');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('playerId', id);
  }
  return id;
}

const playerId = getOrCreatePlayerId();

// Socket with persistent playerId in auth
const socket = io('http://localhost:3000', {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  auth: { playerId }
});

export function Lobby() {
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);

  // Load saved name when component mounts
  useEffect(() => {
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setCurrentPlayer(savedName);
      socket.connect();
    }
  }, []);

  // Auto rejoin lobby/game after connection
  useEffect(() => {
    if (isConnected && currentPlayer) {
      socket.emit('join_lobby', {
        playerName: currentPlayer,
        playerId
      });
      socket.emit('request_state');
    }
  }, [isConnected, currentPlayer]);

  // Leave handlers on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gameState) {
        socket.emit('leave_game');
      } else {
        socket.emit('leave_lobby');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  // Socket event handlers
  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server:', socket.id, 'as', playerId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('players_updated', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on('game_started', (initialGameState) => {
      setGameState(initialGameState);
    });

    socket.on('game_updated', (updatedGameState) => {
      setGameState(updatedGameState);
    });

    socket.on('current_state', (state) => {
      if (state) setGameState(state);
    });

    socket.on('game_ended', () => {
      setGameState(null);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('players_updated');
      socket.off('game_started');
      socket.off('game_updated');
      socket.off('game_ended');
      socket.off('connect_error');
      socket.off('current_state');
    };
  }, []);

  const handleJoin = (name) => {
    if (!name.trim()) return;

    localStorage.setItem('playerName', name);
    setCurrentPlayer(name);
    socket.connect();
    socket.emit('join_lobby', {
      playerName: name,
      playerId
    });
  };

  const handleLeave = () => {
    if (gameState) {
      socket.emit('leave_game');
      setGameState(null);
    } else {
      localStorage.removeItem('playerName');
      socket.emit('leave_lobby');
      socket.disconnect();
      setCurrentPlayer('');
      setPlayers([]);
    }
  };

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const canStartGame = players.length === 3 && isConnected;

  if (!currentPlayer) {
    return <NameEntry onJoin={handleJoin} />;
  }

  if (gameState) {
    return (
      <GameScreen
        socket={socket}
        playerName={currentPlayer}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <div className="lobby-container">
      <div className="connection-status">
        Status: {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      <PlayerList
        players={players.map((p) => p.name)}
        currentPlayer={currentPlayer}
      />

      <div className="lobby-actions">
        {canStartGame && (
          <button className="start-button" onClick={handleStartGame}>
            Start Game
          </button>
        )}

        <button onClick={handleLeave} className="leave-button">
          {gameState ? 'Leave Game' : 'Leave Lobby'}
        </button>
      </div>
    </div>
  );
}
