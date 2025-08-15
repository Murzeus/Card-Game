import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { PileView } from './PileView';
import { PlayerHand } from './PlayerHand';
import { CircularTimer } from './CircularTimer';
import './gameStyles.css';
import { CardBack } from './CardBack';

// Create or reuse playerId in localStorage
let playerId = localStorage.getItem('playerId');
if (!playerId) {
  playerId = crypto.randomUUID();
  localStorage.setItem('playerId', playerId);
}

// Create socket with playerId in auth
const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3000', {
  auth: { playerId },
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

export function GameScreen({ onLeave }) {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [totalTime, setTotalTime] = useState(30); // default, will update from backend

  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);

  function startLocalCountdown(endTime, turnLength) {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (turnLength) setTotalTime(turnLength);
    endTimeRef.current = endTime;

    const update = () => {
      const secs = Math.max(0, Math.floor((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(secs);
      if (secs <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    update();
    intervalRef.current = setInterval(update, 1000);
  }

  useEffect(() => {
    const onConnect = () => {
      if (isReconnecting) {
        setInfoMessage('Reconnected!');
        setTimeout(() => setInfoMessage(''), 2000);
        setIsReconnecting(false);
      }
    };

    const onDisconnect = () => {
      if (gameState) {
        setIsReconnecting(true);
        setInfoMessage('Reconnecting...');
      }
    };

    const onGameUpdated = (updatedGameState) => {
      setGameState(updatedGameState);
    };

    const onGameError = (errorMsg) => {
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    };

    const onGameCanceled = ({ reason }) => {
      if (isReconnecting) {
        console.log('Ignoring cancel during reconnect grace period');
        return;
      }
      setInfoMessage(reason || 'Game was canceled');
      setTimeout(() => {
        setInfoMessage('');
        setGameState(null);
        onLeave();
      }, 3000);
    };

    const onGameEnded = ({ reason, loserName }) => {
      if (reason) setInfoMessage(reason);
      else if (loserName) setInfoMessage(`${loserName} lost the game!`);
      else setInfoMessage('Game ended.');
      setTimeout(() => {
        setInfoMessage('');
        setGameState(null);
        onLeave();
      }, 3000);
    };

    const onPlayerWon = ({ playerName }) => {
      setInfoMessage(`${playerName} has won!`);
      setTimeout(() => setInfoMessage(''), 3000);
    };

    const onCurrentState = (state) => {
      if (state) setGameState(state);
    };

    const onAskDecision = () => {
      setAwaitingDecision(true);
    };

    const onTurnStarted = ({ endTime, totalTurnTimeMs }) => {
      const calculatedEndTime = Date.now() + totalTurnTimeMs;
      startLocalCountdown(calculatedEndTime, totalTurnTimeMs / 1000);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game_updated', onGameUpdated);
    socket.on('game_error', onGameError);
    socket.on('game_canceled', onGameCanceled);
    socket.on('game_ended', onGameEnded);
    socket.on('player_won', onPlayerWon);
    socket.on('current_state', onCurrentState);
    socket.on('ask_continue_or_pass', onAskDecision);
    socket.on('turn_started', onTurnStarted);

    socket.emit('request_state');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game_updated', onGameUpdated);
      socket.off('game_error', onGameError);
      socket.off('game_canceled', onGameCanceled);
      socket.off('game_ended', onGameEnded);
      socket.off('player_won', onPlayerWon);
      socket.off('current_state', onCurrentState);
      socket.off('ask_continue_or_pass', onAskDecision);
      socket.off('turn_started', onTurnStarted);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPlayerData = gameState?.players.find(
    (p) => p.id === gameState?.currentPlayer
  );

  const myHand = gameState?.players.find((p) => p.id === playerId)?.hand || [];
  const isMyTurn = gameState?.currentPlayer === playerId;

  function sendDecision(decision) {
    socket.emit('player_decision', { decision });
    setAwaitingDecision(false);
  }

  function handleLeave() {
    socket.emit('leave_game');
    setGameState(null);
    onLeave();
  }

  return (
    <div className="game-screen">
      {error && <div className="error-message">{error}</div>}
      {infoMessage && <div className="info-message">{infoMessage}</div>}
      {isReconnecting && (
        <div className="reconnecting-banner">Reconnecting to game...</div>
      )}

      {/* Player Info - Show Name and Cards Left */}
      <div className="players-info">
        {gameState?.players.map((player) => (
          <div key={player.id} className="player-info">
            <CardBack />
            <strong>{player.name}</strong>: {player.hand.length} cards left
          </div>
        ))}
      </div>

      <div className="game-status" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {!gameState ? (
          'Loading...'
        ) : (
          <>
            {isMyTurn
              ? 'Your turn!'
              : `${currentPlayerData?.name || 'Unknown'}'s turn`}
            {timeLeft != null && (
              <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />
            )}
          </>
        )}
      </div>

      <PileView
        mainPile={gameState?.mainPile || []}
        sidePile={gameState?.sidePile || []}
      />

      <PlayerHand
        cards={myHand}
        isActive={isMyTurn && !awaitingDecision && !isReconnecting}
        onPlayCard={(card) => socket.emit('play_card', { card })}
      />

      {awaitingDecision && isMyTurn && !isReconnecting && (
        <div className="decision-buttons">
          <button onClick={() => sendDecision('continue')}>Play Again</button>
          <button onClick={() => sendDecision('pass')}>Pass Turn</button>
        </div>
      )}

      {!awaitingDecision && isMyTurn && !isReconnecting && (
        <div className="game-controls">
          <button onClick={() => socket.emit('draw_cards', { action: 'draw3' })}>
            Draw 3 Cards
          </button>
          <button onClick={() => socket.emit('draw_cards', { action: 'stealPile' })}>
            Take All From Pile
          </button>
        </div>
      )}

      <div className="leave-game">
        <button onClick={handleLeave}>Leave Game</button>
      </div>
    </div>
  );
}
