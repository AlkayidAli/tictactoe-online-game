import express from 'express';
import cors from 'cors';

// In-memory user store: Map<username, { username, createdAt, stats: { wins, losses, draws, gamesPlayed } }>
const users = new Map();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Register a user
// POST /register { username }
app.post('/register', (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'username required' });
  }
  if (users.has(username)) {
    return res.status(409).json({ error: 'username already exists' });
  }
  const user = { 
    username, 
    createdAt: new Date().toISOString(),
    stats: {
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0
    }
  };
  users.set(username, user);
  res.status(201).json(user);
});

// Login (basic validation that user exists)
// POST /login { username }
app.post('/login', (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'username required' });
  }
  if (!users.has(username)) {
    return res.status(404).json({ error: 'user not found' });
  }
  res.json({ ok: true, user: users.get(username) });
});

// Get user by username
// GET /users/:username
app.get('/users/:username', (req, res) => {
  const { username } = req.params;
  if (!users.has(username)) {
    return res.status(404).json({ error: 'user not found' });
  }
  res.json(users.get(username));
});

// Get leaderboard (top players by wins)
// GET /leaderboard?limit=10
app.get('/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const leaderboard = Array.from(users.values())
    .sort((a, b) => {
      // Sort by wins desc, then by win rate desc
      if (b.stats.wins !== a.stats.wins) {
        return b.stats.wins - a.stats.wins;
      }
      const aWinRate = a.stats.gamesPlayed > 0 ? a.stats.wins / a.stats.gamesPlayed : 0;
      const bWinRate = b.stats.gamesPlayed > 0 ? b.stats.wins / b.stats.gamesPlayed : 0;
      return bWinRate - aWinRate;
    })
    .slice(0, limit)
    .map((user, index) => ({
      rank: index + 1,
      username: user.username,
      stats: user.stats,
      winRate: user.stats.gamesPlayed > 0 
        ? ((user.stats.wins / user.stats.gamesPlayed) * 100).toFixed(1)
        : '0.0'
    }));
  res.json(leaderboard);
});

// Update user stats after game
// POST /users/:username/stats { result: 'win' | 'loss' | 'draw' }
app.post('/users/:username/stats', (req, res) => {
  const { username } = req.params;
  const { result } = req.body || {};
  
  if (!users.has(username)) {
    return res.status(404).json({ error: 'user not found' });
  }
  
  if (!['win', 'loss', 'draw'].includes(result)) {
    return res.status(400).json({ error: 'result must be win, loss, or draw' });
  }
  
  const user = users.get(username);
  user.stats.gamesPlayed++;
  if (result === 'win') user.stats.wins++;
  else if (result === 'loss') user.stats.losses++;
  else if (result === 'draw') user.stats.draws++;
  
  users.set(username, user);
  res.json(user);
});

// Export for potential reuse/testing
export { app, users };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`User Service listening on port ${PORT}`);
  });
}
