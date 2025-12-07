import readlineSync from 'readline-sync';
import { io } from 'socket.io-client';
import chalk from 'chalk';
import readline from 'readline';

const ROOM_SERVICE_HTTP = process.env.ROOM_SERVICE_HTTP || 'http://localhost:3002';
const USER_SERVICE_HTTP = process.env.USER_SERVICE_HTTP || 'http://localhost:3001';

// Socket.IO should connect via http(s) URL, not raw ws://
const ROOM_SERVICE_WS = process.env.ROOM_SERVICE_WS || 'http://localhost:3002';

function clearScreen() {
  console.clear();
}

function printBoard(board, showGuide = true) {
  const renderCell = (c, idx) => {
    if (c === 'X') return chalk.cyan.bold(' X ');
    if (c === 'O') return chalk.yellow.bold(' O ');
    return showGuide ? chalk.gray(` ${idx} `) : '   ';
  };
  
  console.log('\n' + chalk.bold('═══════════════════════════'));
  console.log(chalk.bold('   TIC-TAC-TOE GAME BOARD'));
  console.log(chalk.bold('═══════════════════════════\n'));
  
  const rows = [0,3,6].map(i => 
    [i, i+1, i+2].map(idx => renderCell(board[idx], idx))
  );
  const sep = chalk.gray('    ───┼───┼───');
  const lines = [
    `    ${rows[0][0]}${chalk.gray('│')}${rows[0][1]}${chalk.gray('│')}${rows[0][2]}`,
    sep,
    `    ${rows[1][0]}${chalk.gray('│')}${rows[1][1]}${chalk.gray('│')}${rows[1][2]}`,
    sep,
    `    ${rows[2][0]}${chalk.gray('│')}${rows[2][1]}${chalk.gray('│')}${rows[2][2]}`,
  ];
  console.log(lines.join('\n'));
  console.log(chalk.bold('\n═══════════════════════════\n'));
}

async function main() {
  clearScreen();
  console.log(chalk.bold.cyan('\n╔═══════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║  DISTRIBUTED TIC-TAC-TOE GAME    ║'));
  console.log(chalk.bold.cyan('╚═══════════════════════════════════╝\n'));
  
  const username = readlineSync.question('Enter username (will auto-register if missing): ');
  let mySymbol = null;
  let nextTurnSymbol = 'X';
  let currentBoard = Array(9).fill('');
  let isMyTurn = false;
  let gameStarted = false;
  let gameOver = false;

  // Ensure user exists (register on 404)
  try {
    const fetchFn = globalThis.fetch ? globalThis.fetch.bind(globalThis) : (await import('node-fetch')).default;
    const check = await fetchFn(`${USER_SERVICE_HTTP}/users/${encodeURIComponent(username)}`);
    if (check.status === 404) {
      const reg = await fetchFn(`${USER_SERVICE_HTTP}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (!reg.ok) {
        const errData = await reg.json().catch(() => ({}));
        throw new Error(errData.error || 'failed to register');
      }
      console.log(chalk.green('✓ Profile created.'));
    } else if (!check.ok) {
      throw new Error(`user check failed (${check.status})`);
    }
  } catch (e) {
    console.error(chalk.red('User check/registration error:'), e.message);
    console.error('Hint: Ensure User Service is running at', USER_SERVICE_HTTP);
    console.error('Start it: cd "services/user-service" && npm start');
    process.exit(1);
  }
  
  let roomId = readlineSync.question('Enter roomId (leave empty to create one now): ');
  if (!roomId) {
    console.log('Creating a new room via Room Service...');
    try {
      const fetchFn = globalThis.fetch ? globalThis.fetch.bind(globalThis) : (await import('node-fetch')).default;
      const res = await fetchFn(`${ROOM_SERVICE_HTTP}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      roomId = data.roomId;
      console.log(chalk.green('✓ Created roomId:'), chalk.bold(roomId));
      console.log(chalk.yellow('→ Share this roomId with your opponent!'));
    } catch (e) {
      console.error(chalk.red('Failed to create room:'), e.message);
      console.error('Hint: Ensure Room Service is running at', ROOM_SERVICE_HTTP);
      console.error('Start it: cd "services/room-service" && npm start');
      process.exit(1);
    }
  }

  const socket = io(ROOM_SERVICE_WS, { transports: ['websocket'] });

  function displayGameState() {
    clearScreen();
    console.log(chalk.bold.cyan('\n╔═══════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║  DISTRIBUTED TIC-TAC-TOE GAME    ║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════╝\n'));
    console.log(chalk.bold('Room ID:'), chalk.cyan(roomId));
    console.log(chalk.bold('Player:'), chalk.green(username), 
                mySymbol ? `(${mySymbol === 'X' ? chalk.cyan.bold('X') : chalk.yellow.bold('O')})` : '');
    printBoard(currentBoard, true);
    
    if (!gameStarted) {
      console.log(chalk.yellow('⏳ Waiting for opponent to join...'));
    } else if (gameOver) {
      // Game over state handled separately
    } else if (isMyTurn) {
      console.log(chalk.green.bold('✓ YOUR TURN!'));
      console.log(chalk.gray('Enter position (0-8) or "q" to quit'));
    } else {
      console.log(chalk.yellow('⏳ Waiting for opponent\'s move...'));
      console.log(chalk.gray('Next turn: ' + (nextTurnSymbol === 'X' ? chalk.cyan('X') : chalk.yellow('O'))));
    }
  }

  socket.on('connect_error', (err) => {
    console.error(chalk.red('Connection error:'), err.message);
  });

  socket.on('connect', () => {
    console.log(chalk.green('✓ Connected to Room Service'));
    socket.emit('join_room', { roomId, username });
  });

  socket.on('error', (payload) => {
    console.error(chalk.red('Error:'), payload.error || payload);
  });

  socket.on('player_joined', ({ roomId, players }) => {
    displayGameState();
    console.log(chalk.green('✓ Players in room:'), players.join(', '));
  });

  socket.on('game_start', ({ roomId, players, symbols, nextTurnSymbol: nextTurn }) => {
    gameStarted = true;
    mySymbol = symbols[username];
    nextTurnSymbol = nextTurn;
    isMyTurn = (mySymbol === nextTurnSymbol);
    displayGameState();
    console.log(chalk.green.bold('\n🎮 GAME STARTED! 🎮\n'));
    console.log('Players:', players.join(' vs '));
    
    // Wait a moment before prompting
    setTimeout(() => {
      if (isMyTurn) {
        promptForMove();
      }
    }, 500);
  });

  socket.on('state_update', ({ roomId, board, nextTurnSymbol: nextTurn, winner, draw }) => {
    currentBoard = board;
    nextTurnSymbol = nextTurn;
    isMyTurn = gameStarted && mySymbol === nextTurnSymbol && !winner && !draw;
    displayGameState();
    
    if (winner) {
      gameOver = true;
      console.log(chalk.green.bold('\n🎉 GAME OVER! 🎉'));
      const winnerSymbol = winner === 'X' ? chalk.cyan.bold('X') : chalk.yellow.bold('O');
      console.log(chalk.bold('Winner:'), winnerSymbol);
      if (winner === mySymbol) {
        console.log(chalk.green.bold('✨ CONGRATULATIONS! YOU WON! ✨'));
      } else {
        console.log(chalk.red('Better luck next time!'));
      }
      setTimeout(() => process.exit(0), 2000);
    } else if (draw) {
      gameOver = true;
      console.log(chalk.yellow.bold('\n🤝 GAME OVER - IT\'S A DRAW! 🤝'));
      setTimeout(() => process.exit(0), 2000);
    }
  });

  socket.on('your_turn', ({ roomId: rid, symbol, player }) => {
    if (rid === roomId && player === username) {
      isMyTurn = true;
      displayGameState();
      promptForMove();
    }
  });

  socket.on('game_over', ({ roomId, winner, draw }) => {
    gameOver = true;
    displayGameState();
    console.log(chalk.green.bold('\n🎉 GAME OVER! 🎉'));
    if (winner) {
      const winnerSymbol = winner === 'X' ? chalk.cyan.bold('X') : chalk.yellow.bold('O');
      console.log(chalk.bold('Winner:'), winnerSymbol);
      if (winner === mySymbol) {
        console.log(chalk.green.bold('✨ CONGRATULATIONS! YOU WON! ✨'));
      } else {
        console.log(chalk.red('Better luck next time!'));
      }
    } else if (draw) {
      console.log(chalk.yellow.bold('🤝 IT\'S A DRAW! 🤝'));
    }
    setTimeout(() => process.exit(0), 2000);
  });

  function promptForMove() {
    if (!isMyTurn || gameOver) return;
    
    const posStr = readlineSync.question(chalk.green.bold('\n> Your move: '));
    
    if (posStr.toLowerCase() === 'q') {
      console.log(chalk.yellow('Goodbye!'));
      process.exit(0);
    }
    
    const position = Number(posStr);
    if (Number.isNaN(position) || position < 0 || position > 8) {
      console.log(chalk.red('✗ Invalid position. Please enter 0-8.'));
      promptForMove();
      return;
    }
    
    if (currentBoard[position] !== '') {
      console.log(chalk.red('✗ Position already taken. Choose another.'));
      promptForMove();
      return;
    }
    
    // Disable turn temporarily
    isMyTurn = false;
    socket.emit('move', { roomId, position, player: username });
  }

  // Initial display
  displayGameState();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
