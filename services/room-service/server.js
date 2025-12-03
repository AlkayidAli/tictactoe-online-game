import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

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
      if (!room.players.includes(username)) {
        if (room.players.length >= 2) {
          socket.emit('error', { error: 'room full' });
          return;
        }
        room.players.push(username);
      }
      // Assign symbols if starting
      if (room.players.length === 2 && Object.keys(room.symbols).length < 2) {
        room.symbols[room.players[0]] = 'X';
        room.symbols[room.players[1]] = 'O';
        io.to(roomId).emit('game_start', {
          roomId,
          players: room.players,
          symbols: room.symbols,
          nextTurnSymbol: room.nextTurnSymbol
        });
      }
      socket.join(roomId);
      io.to(roomId).emit('player_joined', { roomId, players: room.players });
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
      const result = await applyMove(room, position, player);
      io.to(roomId).emit('state_update', {
        roomId,
        board: room.board,
        nextTurnSymbol: room.nextTurnSymbol,
        winner: room.winner,
        draw: room.draw
      });
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
