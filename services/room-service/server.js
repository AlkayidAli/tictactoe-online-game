import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import fetch from 'node-fetch';
import cors from 'cors';

const PORT = process.env.PORT || 3002;
const USER_SERVICE_BASE = process.env.USER_SERVICE_BASE || 'http://localhost:3001';
const GAME_SERVICE_BASE = process.env.GAME_SERVICE_BASE || 'http://localhost:3003';

// In-memory room state
// rooms: Map<roomId, { players: string[], symbols: Record<string,string>, board: string[9], nextTurnSymbol: 'X'|'O', winner: string|null, draw: boolean }>
const rooms = new Map();

function createRoom(roomId) {
  if (!roomId) {
    roomId = crypto.randomUUID().slice(0, 8);
  }
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      players: [],
      symbols: {},
      board: Array(9).fill(''),
      nextTurnSymbol: 'X',
      winner: null,
      draw: false
    });
  }
  return roomId;
}

async function validateUser(username) {
  const res = await fetch(`${USER_SERVICE_BASE}/users/${encodeURIComponent(username)}`);
  if (!res.ok) return false;
  return await res.json();
}

async function applyMove(room, position, player) {
  const symbol = room.symbols[player];
  if (!symbol) {
    throw new Error('player has no symbol assigned');
  }
  const payload = {
    board: room.board,
    position,
    symbol,
    expectedTurn: room.nextTurnSymbol
  };
  const res = await fetch(`${GAME_SERVICE_BASE}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'invalid move');
  }
  const data = await res.json();
  room.board = data.board;
  room.nextTurnSymbol = data.nextTurnSymbol;
  room.winner = data.winner;
  room.draw = data.draw;
  return data;
}

// Express + Socket.IO setup
const app = express();
app.use(cors());
app.use(express.json());

// Basic HTTP endpoints
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/rooms', (req, res) => {
  const { roomId } = req.body || {};
  const id = createRoom(roomId);
  res.status(201).json({ roomId: id });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*'}
});

io.on('connection', (socket) => {
  socket.on('join_room', async ({ roomId, username }) => {
    try {
      if (!roomId || !username) {
        socket.emit('error', { error: 'roomId and username required' });
        return;
      }
      if (!rooms.has(roomId)) {
        createRoom(roomId);
      }
      const room = rooms.get(roomId);
      // Validate user exists
      const user = await validateUser(username);
      if (!user) {
        socket.emit('error', { error: 'user not found' });
        return;
      }
      // Join room first
      socket.join(roomId);
      
      if (!room.players.includes(username)) {
        if (room.players.length >= 2) {
          socket.emit('error', { error: 'room full' });
          return;
        }
        room.players.push(username);
      }
      
      io.to(roomId).emit('player_joined', { roomId, players: room.players });
      
      console.log(`[DEBUG] Room ${roomId}: players=${room.players.length}, symbols=${Object.keys(room.symbols).length}, username=${username}`);
      
      // Assign symbols if starting
      if (room.players.length === 2 && Object.keys(room.symbols).length < 2) {
        console.log('[DEBUG] First time both players joined - assigning symbols');
        room.symbols[room.players[0]] = 'X';
        room.symbols[room.players[1]] = 'O';
        console.log('Emitting game_start to room', roomId, 'with symbols:', room.symbols);
        io.to(roomId).emit('game_start', {
          roomId,
          players: room.players,
          symbols: room.symbols,
          nextTurnSymbol: room.nextTurnSymbol
        });
        console.log('game_start emitted');
        // Broadcast initial board state
        io.to(roomId).emit('state_update', {
          roomId,
          board: room.board,
          nextTurnSymbol: room.nextTurnSymbol,
          winner: room.winner,
          draw: room.draw
        });
        // Notify whose turn
        const currentPlayer = Object.entries(room.symbols).find(([_p, sym]) => sym === room.nextTurnSymbol)?.[0];
        if (currentPlayer) {
          io.to(roomId).emit('your_turn', { roomId, symbol: room.nextTurnSymbol, player: currentPlayer });
        }
      } else if (Object.keys(room.symbols).length === 2) {
        console.log(`[DEBUG] Game already started - sending game_start to ${username} with symbols:`, room.symbols);
        // Game already started - send game_start to this specific player so they know their symbol
        socket.emit('game_start', {
          roomId,
          players: room.players,
          symbols: room.symbols,
          nextTurnSymbol: room.nextTurnSymbol
        });
        // Send current board state
        socket.emit('state_update', {
          roomId,
          board: room.board,
          nextTurnSymbol: room.nextTurnSymbol,
          winner: room.winner,
          draw: room.draw
        });
      } else {
        console.log('[DEBUG] Waiting for second player - sending state_update only');
        // Send snapshot to the newly joined player only if game hasn't started
        socket.emit('state_update', {
          roomId,
          board: room.board,
          nextTurnSymbol: room.nextTurnSymbol,
          winner: room.winner,
          draw: room.draw
        });
      }
    } catch (err) {
      socket.emit('error', { error: err.message });
    }
  });

  socket.on('move', async ({ roomId, position, player }) => {
    try {
      if (!rooms.has(roomId)) {
        socket.emit('error', { error: 'room not found' });
        return;
      }
      const room = rooms.get(roomId);
      if (!room.players.includes(player)) {
        socket.emit('error', { error: 'player not in room' });
        return;
      }
      // Enforce turn-based play
      const playerSymbol = room.symbols[player];
      if (!playerSymbol) {
        socket.emit('error', { error: 'player has no assigned symbol' });
        return;
      }
      if (room.winner || room.draw) {
        socket.emit('error', { error: 'game already finished' });
        return;
      }
      if (playerSymbol !== room.nextTurnSymbol) {
        socket.emit('error', { error: 'not your turn' });
        return;
      }
      if (typeof position !== 'number' || position < 0 || position > 8) {
        socket.emit('error', { error: 'invalid position' });
        return;
      }
      if (room.board[position] !== '') {
        socket.emit('error', { error: 'position already taken' });
        return;
      }
      const result = await applyMove(room, position, player);
      io.to(roomId).emit('state_update', {
        roomId,
        board: room.board,
        nextTurnSymbol: room.nextTurnSymbol,
        winner: room.winner,
        draw: room.draw
      });
      // Announce next turn
      if (!room.winner && !room.draw) {
        const nextPlayer = Object.entries(room.symbols).find(([_p, sym]) => sym === room.nextTurnSymbol)?.[0];
        if (nextPlayer) {
          io.to(roomId).emit('your_turn', { roomId, symbol: room.nextTurnSymbol, player: nextPlayer });
        }
      }
      if (room.winner || room.draw) {
        io.to(roomId).emit('game_over', { roomId, winner: room.winner, draw: room.draw });
      }
    } catch (err) {
      socket.emit('error', { error: err.message });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Room Service listening on port ${PORT}`);
});
