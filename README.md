# Distributed Tic-Tac-Toe

Two-player Tic-Tac-Toe built with a microservices architecture and real-time communication.

This repository contains:

- services/
  - user-service (Node/Express) — port 3001
  - room-service (Express + Socket.IO) — port 3002
  - game-service (Node/Express) — port 3003
- clients/
  - cli-client (Node + socket.io-client)
  - web-mobile-client (SvelteKit; buildable for mobile via Capacitor)

## Ports

- User Service: 3001
- Room Service: 3002 (WebSocket + REST)
- Game Service: 3003
- Web client (dev): 5173

## Run Order

1. User Service
2. Game Service
3. Room Service
4. Web or CLI client

## Architecture

User Service Game Service
(3001) (3003)
^ ^
| |
| |
+---- Room Service (3002; Socket.IO) ----+
^ |
| |
Web/CLI/Mobile <----------+

## Services

### User Service (port 3001)

- Stack: Node.js, Express
- Storage: In-memory Map (no persistence)
- Endpoints:
  - POST /register { username }
  - POST /login { username }
  - GET /users/:username
  - GET /health -> { ok: true }

Run locally (PowerShell):

```
cd "services/user-service"
npm install
npm start
```

Quick checks (PowerShell examples):

```
# Health
powershell -NoProfile -Command "Invoke-RestMethod -Uri http://localhost:3001/health | ConvertTo-Json"

# Register
powershell -NoProfile -Command "Invoke-RestMethod -Uri http://localhost:3001/register -Method Post -Body (@{ username = 'alice' } | ConvertTo-Json) -ContentType 'application/json' | ConvertTo-Json"

# Login
powershell -NoProfile -Command "Invoke-RestMethod -Uri http://localhost:3001/login -Method Post -Body (@{ username = 'alice' } | ConvertTo-Json) -ContentType 'application/json' | ConvertTo-Json"
```

### Game Rules Service (port 3003)

- Stack: Node.js, Express
- Responsibility: Validate Tic-Tac-Toe rules and advance board state
- Endpoint:
  - POST /move
    - Input:
      - board: string[9] — each entry '', 'X', or 'O'
      - position: number (0..8)
      - symbol: 'X' | 'O'
      - expectedTurn: 'X' | 'O'
    - Output:
      - board: string[9]
      - nextTurnSymbol: 'X' | 'O' | null
      - winner: 'X' | 'O' | null
      - draw: boolean
  - GET /health -> { ok: true }

Run locally (PowerShell):

```
cd "services/game-service"
npm install
npm start
```

Quick checks (PowerShell examples):

```
# Health
powershell -NoProfile -Command "Invoke-RestMethod -Uri http://localhost:3003/health | ConvertTo-Json"

# First move: X at position 0
powershell -NoProfile -Command "Invoke-RestMethod -Uri http://localhost:3003/move -Method Post -Body (@{ board = @('','','','','','','','',''); position = 0; symbol = 'X'; expectedTurn = 'X' } | ConvertTo-Json) -ContentType 'application/json' | ConvertTo-Json"

# Winning move example: X completes top row
powershell -NoProfile -Command "Invoke-RestMethod -Uri http://localhost:3003/move -Method Post -Body (@{ board = @('X','X','','O','O','','','',''); position = 2; symbol = 'X'; expectedTurn = 'X' } | ConvertTo-Json) -ContentType 'application/json' | ConvertTo-Json"
```

### Room Service (port 3002)

- Stack: Express + Socket.IO
- HTTP:
  - POST /rooms { roomId? } -> { roomId }
  - GET /health -> { ok: true }
- WebSocket events (Socket.IO):
  - Client -> Server:
    - "join_room": { roomId, username }
    - "move": { roomId, position, player }
  - Server -> Client:
    - "player_joined": { roomId, players }
    - "game_start": { roomId, players, symbols: { [username]: "X"|"O" }, nextTurnSymbol }
    - "state_update": { roomId, board, nextTurnSymbol, winner, draw }
    - "game_over": { roomId, winner, draw }
- Inter-service calls:
  - Validate users via User Service: GET http://localhost:3001/users/:username
  - Validate and apply moves via Game Service: POST http://localhost:3003/move

Run locally (PowerShell):

```
cd "services/room-service"
npm install
npm start
```

Quick checks (PowerShell examples):

```
# Health
powershell -NoProfile -Command "Invoke-RestMethod -Uri http://localhost:3002/health | ConvertTo-Json"

# Create a room
powershell -NoProfile -Command "Invoke-RestMethod -Uri http://localhost:3002/rooms -Method Post -Body (@{ roomId = '' } | ConvertTo-Json) -ContentType 'application/json' | ConvertTo-Json"
```

## Clients (upcoming)

### CLI Client

- Node script using socket.io-client and readline.
- Connects to ws://localhost:3002, join/create room, and play from terminal.

### Web/Mobile Client

- SvelteKit app using socket.io-client.
- Pages: Login/Join room and Tic-Tac-Toe board.
- Mobile via Capacitor with adapter-static build.

## Game Rules

- 3x3 board
- Two players "X" and "O"
- X moves first; turns alternate
- Win with 3 in a row; draw if board is full without a winner

## Demo Checklist

- Start 3 services in separate terminals
- Web (or CLI) clients connect to Room Service
- Register/login via User Service (register once)
- Create room and join from two clients
- Make moves; see state_update in real-time
- Demonstrate win/draw

## Notes

- In-memory data stores; no persistence
- Minimal error handling; extend as needed
