# TIC-TAC-TOE ONLINE

Distributed real-time multiplayer Tic-Tac-Toe with microservices architecture. Cross-platform: web, Android, CLI.

## Technology Stack

**Backend Services** (Node.js, Express.js, Socket.IO)

- User Service (3001): User management, statistics, leaderboard
- Room Service (3002): Room orchestration, WebSocket hub
- Game Service (3003): Game logic, move validation, win detection

**Clients**

- Web: SvelteKit 2, TypeScript, Socket.IO Client, Vite (port 5173)
- Mobile: Capacitor 6 wrapping SvelteKit (Android native)
- CLI: Node.js, Socket.IO Client, Chalk

## Architecture

```
Clients (Web/Mobile/CLI) <--WebSocket--> Room Service (3002)
                                              |
                                              +--HTTP--> User Service (3001)
                                              +--HTTP--> Game Service (3003)
```

Data flow: Client connects via WebSocket to Room Service, which coordinates with User Service (validation/stats) and Game Service (move validation) via HTTP.

## Quick Start

```bash
# Clone and install
git clone https://github.com/AlkayidAli/tictactoe-online-game.git
cd tictactoe-online-game
cd services/user-service && npm install
cd ../room-service && npm install
cd ../game-service && npm install
cd ../../clients/web-client && npm install

# Start services (Windows)
.\start-services-only.cmd

# Start web client
.\start-web-client.cmd
# Opens at http://localhost:5173
```

## API Documentation

### Service-to-Service APIs (HTTP REST)

**User Service (3001)**

| Endpoint                 | Method | Request                           | Response                             |
| ------------------------ | ------ | --------------------------------- | ------------------------------------ |
| `/register`              | POST   | `{username}`                      | `{username, stats}`                  |
| `/login`                 | POST   | `{username}`                      | `{ok, user}`                         |
| `/users/:username`       | GET    | -                                 | `{username, stats}`                  |
| `/leaderboard?limit=10`  | GET    | -                                 | `[{rank, username, stats, winRate}]` |
| `/users/:username/stats` | POST   | `{result: "win"\|"loss"\|"draw"}` | `{username, stats}`                  |

**Game Service (3003)**

| Endpoint | Method | Request                                   | Response                                |
| -------- | ------ | ----------------------------------------- | --------------------------------------- |
| `/move`  | POST   | `{board, position, symbol, expectedTurn}` | `{board, nextTurnSymbol, winner, draw}` |

**Room Service (3002)**

| Endpoint | Method | Request     | Response   |
| -------- | ------ | ----------- | ---------- |
| `/rooms` | POST   | `{roomId?}` | `{roomId}` |

### Client-Server WebSocket APIs

**Connection:** `ws://localhost:3002`

#### Client to Server Events

**join_room**

```typescript
socket.emit("join_room", {
  roomId: string, // Room to join
  username: string, // Player username
});
```

**move**

```typescript
socket.emit("move", {
  roomId: string, // Current room
  position: number, // Board position (0-8)
  player: string, // Player username
});
```

**restart_game**

```typescript
socket.emit("restart_game", {
  roomId: string, // Room to restart
});
```

#### Server to Client Events

**player_joined**

```typescript
socket.on("player_joined", (data) => {
  // data: { username: string, symbol: 'X' | 'O', players: string[] }
});
```

**game_start**

```typescript
socket.on("game_start", (data) => {
  // data: { players: string[], symbols: {}, nextTurnSymbol: 'X' }
});
```

**state_update**

```typescript
socket.on("state_update", (data) => {
  // data: { board: string[], nextTurnSymbol: 'X' | 'O' | null }
});
```

**your_turn**

```typescript
socket.on("your_turn", (data) => {
  // data: { symbol: 'X' | 'O' }
});
```

**game_over**

```typescript
socket.on("game_over", (data) => {
  // data: { winner: string | null, draw: boolean, board: string[] }
});
```

**game_restarted**

```typescript
socket.on("game_restarted", (data) => {
  // data: { board: string[], nextTurnSymbol: 'X' }
});
```

**error**

```typescript
socket.on("error", (data) => {
  // data: { error: string }
});
```

## Complete Game Flow Example

```typescript
import { io } from "socket.io-client";

// 1. Connect to Room Service
const socket = io("http://localhost:3002", { autoConnect: false });

// 2. Setup event listeners
socket.on("player_joined", (data) => {
  console.log(`${data.username} joined as ${data.symbol}`);
});

socket.on("game_start", (data) => {
  console.log("Game started!", data);
});

socket.on("state_update", (data) => {
  console.log("Board updated:", data.board);
});

socket.on("your_turn", (data) => {
  console.log(`Your turn (${data.symbol})`);
});

socket.on("game_over", (data) => {
  if (data.winner) {
    console.log(`Winner: ${data.winner}`);
  } else {
    console.log("Draw!");
  }
});

socket.on("error", (data) => {
  console.error("Error:", data.error);
});

// 3. Connect
socket.connect();

// 4. Join room
socket.emit("join_room", {
  roomId: "room-123",
  username: "player1",
});

// 5. Make moves
socket.emit("move", {
  roomId: "room-123",
  position: 4, // Center position
  player: "player1",
});

// 6. Restart game after it ends
socket.emit("restart_game", {
  roomId: "room-123",
});
```

## Project Structure

```
tictactoe-online-game/
├── services/
│   ├── user-service/
│   │   └── src/server.js
│   ├── room-service/
│   │   └── server.js
│   └── game-service/
│       └── src/server.js
├── clients/
│   ├── web-client/
│   │   ├── src/
│   │   │   ├── routes/+page.svelte
│   │   │   ├── lib/config.ts
│   │   │   └── app.css
│   │   ├── android/
│   │   ├── capacitor.config.ts
│   │   └── .env
│   └── cli-client/
│       └── index.js
├── start-services-only.cmd
├── start-web-client.cmd
├── start-cli-client.cmd
├── build-android.cmd
└── README.md
```

## Game Rules

- Board: 3x3 grid, positions 0-8
- Players: X (first) and O (second)
- Win: 3 in a row (horizontal, vertical, diagonal)
- Draw: All positions filled, no winner
- Win patterns: [0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]

## Development

**Running Services Individually**

```bash
cd services/user-service && npm start    # Port 3001
cd services/game-service && npm start    # Port 3003
cd services/room-service && npm start    # Port 3002
```

**Running All Services (Windows)**

```cmd
.\start-services-only.cmd
```

**Web Client Development**

```bash
cd clients/web-client
npm run dev  # http://localhost:5173 with hot reload
```

**Mobile Development**

```bash
cd clients/web-client
# Update .env with your local IP
npm run build
npx cap sync android
npx cap open android
# Or use: .\build-android.cmd
```

**Testing Multiplayer**

- Two browsers: Open http://localhost:5173 twice
- Browser + Mobile: Update .env with local IP, build Android app
- CLI + Web: Run `.\start-cli-client.cmd` and open browser

## Building for Production

**Web Client**

```bash
cd clients/web-client
npm run build
# Output in build/ directory
```

**Android APK**

```cmd
.\build-android.cmd
# Opens Android Studio
# Build > Build Bundle(s) / APK(s) > Build APK(s)
# APK location: clients/web-client/android/app/build/outputs/apk/
```

## Features

- Real-time multiplayer via WebSocket
- Cross-platform support (web, mobile, CLI)
- Microservices architecture
- Player statistics and leaderboard
- Game restart functionality
- Professional dark theme UI
- Responsive design

## Notes

- **Data Persistence**: In-memory storage (Map). Data lost on restart.
- **Scalability**: Single-instance. Use Redis for production.
- **Security**: No authentication. Implement JWT for production.
- **Error Handling**: Basic implementation. Extend for production.

## Future Enhancements

- Database integration (PostgreSQL/MongoDB)
- Redis for distributed sessions
- User authentication (JWT/OAuth)
- Private rooms with passwords
- Spectator mode
- Game replay system
- AI opponent
- Docker Compose deployment

## Repository

GitHub: [AlkayidAli/tictactoe-online-game](https://github.com/AlkayidAli/tictactoe-online-game)
