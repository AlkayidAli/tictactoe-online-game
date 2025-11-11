import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const LINES = [
  [0,1,2], [3,4,5], [6,7,8], // rows
  [0,3,6], [1,4,7], [2,5,8], // cols
  [0,4,8], [2,4,6]           // diagonals
];

function winnerFromBoard(board) {
  for (const [a,b,c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every(cell => cell === 'X' || cell === 'O');
}

function validateBoard(board) {
  return Array.isArray(board) && board.length === 9 && board.every(v => v === '' || v === 'X' || v === 'O');
}

// POST /move
// Input: { board: ["", "X", ...x9], position: number 0..8, symbol: "X"|"O", expectedTurn: "X"|"O" }
// Output: { board, nextTurnSymbol: "X"|"O"|null, winner: "X"|"O"|null, draw: boolean }
app.post('/move', (req, res) => {
  const { board, position, symbol, expectedTurn } = req.body || {};

  if (!validateBoard(board)) {
    return res.status(400).json({ error: 'invalid board; must be 9-length array of "", "X", "O"' });
  }
  if (typeof position !== 'number' || position < 0 || position > 8) {
    return res.status(400).json({ error: 'invalid position; must be integer 0..8' });
  }
  if (symbol !== 'X' && symbol !== 'O') {
    return res.status(400).json({ error: 'invalid symbol; must be "X" or "O"' });
  }
  if (expectedTurn !== 'X' && expectedTurn !== 'O') {
    return res.status(400).json({ error: 'invalid expectedTurn; must be "X" or "O"' });
  }
  if (expectedTurn !== symbol) {
    return res.status(400).json({ error: 'not your turn' });
  }

  // Disallow moves after game is over
  const preWinner = winnerFromBoard(board);
  if (preWinner) {
    return res.status(400).json({ error: 'game already won', winner: preWinner });
  }
  if (isBoardFull(board)) {
    return res.status(400).json({ error: 'board full - game is a draw', draw: true });
  }

  if (board[position] !== '') {
    return res.status(400).json({ error: 'position already taken' });
  }

  const nextBoard = board.slice();
  nextBoard[position] = symbol;

  const winner = winnerFromBoard(nextBoard);
  const draw = !winner && isBoardFull(nextBoard);
  const nextTurnSymbol = winner || draw ? null : (symbol === 'X' ? 'O' : 'X');

  return res.json({ board: nextBoard, nextTurnSymbol, winner, draw });
});

// Export for potential testing
export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Game Service listening on port ${PORT}`);
  });
}
