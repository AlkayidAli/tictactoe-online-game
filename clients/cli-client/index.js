import readlineSync from 'readline-sync';
import { io } from 'socket.io-client';

const ROOM_SERVICE_WS = process.env.ROOM_SERVICE_WS || 'ws://localhost:3002';

function printBoard(board) {
  const rows = [0,3,6].map(i => board.slice(i, i+3).map(c => c || ' ').join(' | '));
  console.log('\n' + rows.join('\n---------\n') + '\n');
}

function printIndexGuide() {
  const indices = [
    ['0','1','2'],
    ['3','4','5'],
    ['6','7','8']
  ];
  console.log('Positions guide:');
  console.log(indices.map(r => r.join(' | ')).join('\n---------\n'));
}

async function main() {
  console.log('Distributed Tic-Tac-Toe CLI');
  const username = readlineSync.question('Enter username (must be registered): ');
  const roomId = readlineSync.question('Enter roomId (create via POST /rooms): ');
  if (!roomId) {
    console.log('RoomId is required.');
    process.exit(1);
  }

  const socket = io(ROOM_SERVICE_WS, { transports: ['websocket'] });

  socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
  });

  socket.on('connect', () => {
    console.log('Connected to Room Service');
    socket.emit('join_room', { roomId, username });
  });

  socket.on('error', (payload) => {
    console.error('Error:', payload);
  });

  socket.on('player_joined', ({ roomId, players }) => {
    console.log('Players in room', roomId, ':', players.join(', '));
  });

  socket.on('game_start', ({ roomId, players, symbols, nextTurnSymbol }) => {
    console.log('Game start in room', roomId);
    console.log('Players:', players.join(', '));
    console.log('Symbols:', JSON.stringify(symbols));
    console.log('Next turn:', nextTurnSymbol);
    printIndexGuide();
  });

  socket.on('state_update', ({ roomId, board, nextTurnSymbol, winner, draw }) => {
    console.log('\nState update:');
    printBoard(board);
    printIndexGuide();
    console.log('Next turn:', nextTurnSymbol);
    if (winner) console.log('Winner:', winner);
    if (draw) console.log('Draw:', draw);
  });

  socket.on('game_over', ({ roomId, winner, draw }) => {
    console.log('\nGame over!');
    if (winner) console.log('Winner:', winner);
    else if (draw) console.log('It\'s a draw.');
    process.exit(0);
  });

  // Input loop
  while (true) {
    const posStr = readlineSync.question('Enter your move position (0..8), or q to quit: ');
    if (posStr.toLowerCase() === 'q') {
      process.exit(0);
    }
    const position = Number(posStr);
    if (Number.isNaN(position) || position < 0 || position > 8) {
      console.log('Invalid position.');
      continue;
    }
    socket.emit('move', { roomId, position, player: username });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
