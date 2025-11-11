import express from 'express';
import cors from 'cors';

// In-memory user store: Map<username, { username, createdAt }>
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
  const user = { username, createdAt: new Date().toISOString() };
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

// Export for potential reuse/testing
export { app, users };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`User Service listening on port ${PORT}`);
  });
}
