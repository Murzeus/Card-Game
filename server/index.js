import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Game Constants
const MAX_PLAYERS = 3;
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['♥', '♦', '♣', '♠'];

// Game State
let lobbyPlayers = [];
let gameState = null;

let turnTimers = {};
const TURN_TIMEOUT_MS = 45000; // 30s to make a move

// Helper Functions
const shuffleDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck.sort(() => Math.random() - 0.5);
};

const dealCards = (deck, playerCount) => {
  const hands = Array(playerCount).fill().map(() => []);
  while (deck.length > 0) {
    for (let i = 0; i < playerCount && deck.length > 0; i++) {
      hands[i].push(deck.pop());
    }
  }
  return hands;
};

const getCardRank = (card) => card.slice(0, -1);

const isValidPlay = (playedCards, topCard) => {
  if (!topCard) return true;
  const playedRank = getCardRank(playedCards[0]);
  const topRank = getCardRank(topCard);

  if (playedCards.length === 3 && playedCards.every(c => getCardRank(c) === '9')) {
    return true;
  }

  if (playedCards.length === 1) {
    return RANKS.indexOf(playedRank) >= RANKS.indexOf(topRank);
  }

  if (playedCards.length === 3) {
    const allSameRank = playedCards.every(c => getCardRank(c) === playedRank);
    return allSameRank && playedRank === topRank;
  }

  if (playedCards.length === 4) {
    return playedCards.every(c => getCardRank(c) === playedRank);
  }

  return false;
};

function startTurnTimer(currentPlayerId) {
  // Clear all existing timers
  Object.values(turnTimers).forEach(clearTimeout);
  turnTimers = {};

  const totalTurnTimeMs = TURN_TIMEOUT_MS;
  const serverEndTime = Date.now() + totalTurnTimeMs;

  // Tell clients a new turn began. Clients will use totalTurnTimeMs to count down locally.
  io.emit('turn_started', {
    playerId: currentPlayerId,
    totalTurnTimeMs, 
    serverEndTime     
  });

  // Server-side enforcement still uses the real timeout
  turnTimers[currentPlayerId] = setTimeout(() => {
    const player = gameState?.players.find(p => p.id === currentPlayerId);
    if (player && player.hand.length > 0) {
      io.emit('game_canceled', { reason: `${player.name} took too long` });
      gameState = null;
    }
  }, totalTurnTimeMs);
}

io.on('connection', (socket) => {
  const playerId = socket.handshake.auth.playerId;
  console.log(`⚡: ${socket.id} connected as player ${playerId}`);

  let existingLobbyPlayer = lobbyPlayers.find(p => p.id === playerId);
  let existingGamePlayer = gameState?.players.find(p => p.id === playerId);

  if (existingLobbyPlayer) {
    existingLobbyPlayer.socketId = socket.id;
    console.log(`🔄 Reconnected to lobby: ${existingLobbyPlayer.name}`);
    socket.emit('players_updated', lobbyPlayers);
  }
  if (existingGamePlayer) {
    existingGamePlayer.socketId = socket.id;
    console.log(`🔄 Reconnected to game: ${existingGamePlayer.name}`);
    socket.emit('current_state', gameState);
  }

  socket.on('join_lobby', ({ playerName }) => {
    try {
      if (!playerName?.trim()) throw new Error('Player name is required');
      if (lobbyPlayers.length >= MAX_PLAYERS) throw new Error('Lobby is full');
      if (lobbyPlayers.some(p => p.id === playerId)) throw new Error('Already joined');

      const newPlayer = {
        id: playerId,
        name: playerName.trim(),
        socketId: socket.id
      };

      lobbyPlayers.push(newPlayer);
      io.emit('players_updated', lobbyPlayers);
      console.log(`🎮 ${newPlayer.name} joined lobby`);
    } catch (error) {
      console.error('Join error:', error.message);
      socket.emit('lobby_error', error.message);
    }
  });

  socket.on('leave_lobby', () => {
    const leftPlayer = lobbyPlayers.find(p => p.id === playerId);
    if (leftPlayer) {
      lobbyPlayers = lobbyPlayers.filter(p => p.id !== playerId);
      io.emit('players_updated', lobbyPlayers);
      console.log(`🚪 ${leftPlayer.name} left lobby`);
    }
  });

  socket.on('leave_game', () => {
    if (!gameState) return;
    const leavingPlayer = gameState.players.find(p => p.id === playerId);
    if (!leavingPlayer) return;

    if (leavingPlayer.hand.length > 0) {
      io.emit('game_canceled', { reason: `${leavingPlayer.name} left the game` });
      gameState = null;
    } else {
      gameState.players = gameState.players.filter(p => p.id !== playerId);
      io.emit('game_updated', gameState);
    }
  });

  socket.on('start_game', () => {
    if (lobbyPlayers.length === MAX_PLAYERS && !gameState) {
      const deck = shuffleDeck();
      const hands = dealCards(deck, MAX_PLAYERS);

      gameState = {
        players: lobbyPlayers.map((player, index) => ({
          id: player.id,
          name: player.name,
          hand: hands[index],
          socketId: player.socketId
        })),
        mainPile: [{ card: '9♥', isFixed: true }],
        sidePile: [],
        drawPile: deck,
        currentPlayer: null,
        status: 'starting'
      };

      const nineHeartsPlayer = gameState.players.find(p =>
        p.hand.includes('9♥')
      );

      if (nineHeartsPlayer) {
        nineHeartsPlayer.hand = nineHeartsPlayer.hand.filter(c => c !== '9♥');
        const playerIndex = gameState.players.findIndex(p => p.id === nineHeartsPlayer.id);
        gameState.currentPlayer = gameState.players[(playerIndex + 1) % MAX_PLAYERS].id;
        gameState.status = 'playing';
        startTurnTimer(gameState.currentPlayer);
      }

      io.emit('game_started', gameState);
      console.log('🕹️ Game started!', {
        players: gameState.players.map(p => ({ name: p.name, cards: p.hand.length })),
        drawPile: gameState.drawPile.length
      });
    }
  });

  socket.on('play_card', ({ card }) => {
    if (!gameState || gameState.status !== 'playing') return;
    if (gameState.currentPlayer !== playerId) {
      socket.emit('game_error', "Not your turn!");
      return;
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    const playedCards = Array.isArray(card) ? card : [card];

    if (!playedCards.every(c => player.hand.includes(c))) {
      socket.emit('game_error', "You don't have those cards!");
      return;
    }

    const topCard = gameState.mainPile.length > 0
      ? gameState.mainPile[gameState.mainPile.length - 1].card
      : null;

    if (isValidPlay(playedCards, topCard)) {
      player.hand = player.hand.filter(c => !playedCards.includes(c));

      if (playedCards.length === 3 && playedCards.every(c => getCardRank(c) === '9')) {
        gameState.sidePile.push(...playedCards);
      } else {
        gameState.mainPile.push(...playedCards.map(c => ({ card: c })));
      }

      if (player.hand.length === 0) {
        io.emit('player_won', { playerId: player.id, playerName: player.name });
        // Find the winner's position in the list before removal
        const winnerIndex = gameState.players.findIndex(p => p.id === player.id);
        // Remove the winner
        gameState.players = gameState.players.filter(p => p.id !== player.id);

        if (gameState.players.length === 1) {
          const loser = gameState.players[0];
          io.emit('game_ended', { loserId: loser.id, loserName: loser.name });
          gameState = null;
          return;
        }

        const nextIndex = winnerIndex % gameState.players.length;
        gameState.currentPlayer = gameState.players[nextIndex].id;
        startTurnTimer(gameState.currentPlayer);
        io.emit('game_updated', gameState);
        return;
      }

      if (playedCards.length === 4) {
        socket.emit('ask_continue_or_pass');
      } else {
        const currentIndex = gameState.players.findIndex(p => p.id === playerId);
        gameState.currentPlayer = gameState.players[(currentIndex + 1) % gameState.players.length].id;
        startTurnTimer(gameState.currentPlayer);
      }

      io.emit('game_updated', gameState);
    } else {
      socket.emit('game_error', "Invalid play!");
    }
  });

  socket.on('player_decision', ({ decision }) => {
    if (!gameState) return;
    const currentIndex = gameState.players.findIndex(p => p.id === playerId);
    if (currentIndex === -1) return;

    if (decision === 'pass') {
      gameState.currentPlayer = gameState.players[(currentIndex + 1) % gameState.players.length].id;
      startTurnTimer(gameState.currentPlayer);
    } else if (decision === 'continue') {
    // Still same player, but reset timer
    startTurnTimer(playerId);
    }
    io.emit('game_updated', gameState);
  });

  socket.on('draw_cards', ({ action }) => {
    if (!gameState || gameState.status !== 'playing') return;
    if (gameState.currentPlayer !== playerId) {
      socket.emit('game_error', "Not your turn!");
      return;
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    if (action === 'draw3') {
      if (gameState.mainPile.length > 1) {
        const pileExcludingTop = gameState.mainPile.slice(1);
        if (pileExcludingTop.length <= 3) {
          player.hand.push(...pileExcludingTop.map(c => c.card));
          gameState.mainPile = [gameState.mainPile[0]];
        } else {
          const top3 = pileExcludingTop.slice(-3);
          player.hand.push(...top3.map(c => c.card));
          gameState.mainPile.splice(gameState.mainPile.length - 3, 3);
        }
      } else {
        socket.emit('game_error', "Not enough cards to draw");
        return;
      }
    } else if (action === 'stealPile' && gameState.mainPile.length > 1) {
      const stolenCards = gameState.mainPile.slice(1).map(c => c.card);
      player.hand.push(...stolenCards);
      gameState.mainPile = [gameState.mainPile[0]];
    } else {
      socket.emit('game_error', "Cannot perform that action");
      return;
    }

    const currentIndex = gameState.players.findIndex(p => p.id === playerId);
    gameState.currentPlayer = gameState.players[(currentIndex + 1) % gameState.players.length].id;
    startTurnTimer(gameState.currentPlayer);

    io.emit('game_updated', gameState);
  });

  socket.on('request_state', () => {
    if (gameState) {
      socket.emit('current_state', gameState);
    }
  });
  //admin clear lobby
  socket.on("clear_lobby", () => {
    lobbyPlayers = [];
    io.emit("players_updated", lobbyPlayers);
    console.log("Lobby cleared");
});

  socket.on('disconnect', () => {
    console.log(`💨 Player ${playerId} disconnected`);
    const inGame = gameState?.players.find(p => p.id === playerId);
    if (inGame && inGame.hand.length > 0) {
      io.emit('game_canceled', { reason: `${inGame.name} disconnected` });
      gameState = null;
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    players: lobbyPlayers.length,
    gameState: gameState ? {
      status: gameState.status,
      players: gameState.players.length,
      currentPlayer: gameState.currentPlayer
    } : null
  });
});

const PORT = process.env.PORT || 3000;;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
