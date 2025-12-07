# Tic-Tac-Toe Web Client

Real-time multiplayer Tic-Tac-Toe web client built with SvelteKit and Socket.IO.

## Features

- Real-time gameplay with Socket.IO
- Turn-based logic with strict enforcement
- Responsive design (desktop, tablet, mobile)
- Room creation and sharing
- Modern dark theme UI

## Quick Start

**Prerequisites:** Node.js v18+, all microservices running

```bash
cd clients/web-client
npm install
npm run dev
```

Open http://localhost:5173

## How to Play

1. Enter username (auto-registers if new)
2. Create new room or join existing with Room ID
3. Share Room ID with opponent
4. Click cells on your turn
5. Win by getting 3 in a row or draw when board is full

## Tech Stack

- **SvelteKit** - Frontend framework with Svelte 5 runes
- **Socket.IO** - Real-time bidirectional communication
- **TypeScript** - Type safety
- **Vite** - Build tool

## Configuration

Default service endpoints (edit in `src/routes/+page.svelte`):

| Service      | URL                   | Protocol         |
| ------------ | --------------------- | ---------------- |
| User Service | http://localhost:3001 | HTTP             |
| Room Service | http://localhost:3002 | HTTP + WebSocket |
| Game Service | http://localhost:3003 | HTTP             |

## Project Structure

```
src/
├── routes/
│   ├── +layout.svelte   # Layout with global styles
│   └── +page.svelte     # Main game page
├── app.css              # Global styles
└── app.html             # HTML template
```

## Troubleshooting

**Connection Issues**

- Ensure all services are running on ports 3001, 3002, 3003
- Check `/health` endpoints
- Verify firewall settings

**Socket.IO Not Connecting**

- Check browser console (F12)
- Ensure Room Service is running on port 3002
- Refresh page or clear cache

**Game Not Starting**

- Verify both players joined same room
- Ensure unique usernames
- Create new room if issue persists

## Build Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run check    # Type checking
```
