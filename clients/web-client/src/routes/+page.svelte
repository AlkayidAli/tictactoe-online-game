<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { io, Socket } from "socket.io-client";
  import { ENV } from "$lib/config";

  const ROOM_SERVICE_HTTP = ENV.ROOM_SERVICE;
  const USER_SERVICE_HTTP = ENV.USER_SERVICE;
  const ROOM_SERVICE_WS = ENV.ROOM_SERVICE_WS;

  // Game state
  let gameState = $state<"lobby" | "waiting" | "playing" | "finished">("lobby");
  let username = $state("");
  let roomId = $state("");
  let mySymbol = $state<"X" | "O" | null>(null);
  let currentBoard = $state<string[]>(Array(9).fill(""));
  let nextTurnSymbol = $state<"X" | "O" | null>("X");
  let winner = $state<"X" | "O" | null>(null);
  let isDraw = $state(false);
  let players = $state<string[]>([]);
  let errorMessage = $state("");
  let statusMessage = $state("");
  let isMyTurn = $state(false);
  let socket: Socket | null = null;

  // Leaderboard state
  let leaderboard = $state<any[]>([]);
  let showLeaderboard = $state(false);

  $effect(() => {
    console.log(
      "$effect running - mySymbol:",
      mySymbol,
      "nextTurnSymbol:",
      nextTurnSymbol,
      "isMyTurn:",
      isMyTurn
    );
    if (mySymbol && nextTurnSymbol) {
      isMyTurn = mySymbol === nextTurnSymbol;
      if (gameState === "playing" && !winner && !isDraw) {
        statusMessage = isMyTurn
          ? "Your turn - Click a cell to play"
          : "Waiting for opponent...";
      }
    }
  });

  async function fetchLeaderboard() {
    try {
      const res = await fetch(`${USER_SERVICE_HTTP}/leaderboard?limit=10`);
      if (res.ok) {
        leaderboard = await res.json();
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    }
  }

  onMount(() => {
    fetchLeaderboard();
  });

  async function registerUser() {
    try {
      const res = await fetch(
        `${USER_SERVICE_HTTP}/users/${encodeURIComponent(username)}`
      );
      if (res.status === 404) {
        const reg = await fetch(`${USER_SERVICE_HTTP}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        if (!reg.ok) {
          throw new Error("Failed to register user");
        }
      } else if (!res.ok) {
        throw new Error("Failed to check user");
      }
    } catch (e) {
      throw new Error("User Service unavailable. Please ensure it is running.");
    }
  }

  async function createRoom() {
    try {
      const res = await fetch(`${ROOM_SERVICE_HTTP}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      return data.roomId;
    } catch (e) {
      throw new Error("Room Service unavailable. Please ensure it is running.");
    }
  }

  function setupSocket() {
    socket = io(ROOM_SERVICE_WS, {
      transports: ["websocket"],
      autoConnect: false,
    });

    // Register all event handlers FIRST
    socket.on("connect_error", (err) => {
      errorMessage = "Connection error: " + err.message;
    });

    socket.on("error", (payload) => {
      errorMessage = payload.error || "An error occurred";
    });

    socket.on("player_joined", ({ roomId: rid, players: p }) => {
      players = p;
      statusMessage = `Players in room: ${p.join(", ")}`;
    });

    socket.on(
      "game_start",
      ({ roomId: rid, players: p, symbols, nextTurnSymbol: nextTurn }) => {
        console.log("GAME_START received:", {
          players: p,
          symbols,
          nextTurn,
          username,
        });
        gameState = "playing";
        players = p;
        mySymbol = symbols[username];
        nextTurnSymbol = nextTurn;
        console.log(
          "After game_start - mySymbol:",
          mySymbol,
          "nextTurnSymbol:",
          nextTurnSymbol
        );
        statusMessage = `Game started! You are ${mySymbol}`;
      }
    );

    socket.on(
      "state_update",
      ({
        roomId: rid,
        board,
        nextTurnSymbol: nextTurn,
        winner: w,
        draw,
      }: {
        roomId: string;
        board: string[];
        nextTurnSymbol: "X" | "O" | null;
        winner: "X" | "O" | null;
        draw: boolean;
      }) => {
        console.log("State update received:", {
          board,
          nextTurn,
          mySymbol,
          username,
        });
        currentBoard = board;
        nextTurnSymbol = nextTurn;
        winner = w;
        isDraw = draw;

        // Update whose turn it is
        isMyTurn = !w && !draw && mySymbol === nextTurn;
        console.log(
          "isMyTurn after state_update:",
          isMyTurn,
          "mySymbol:",
          mySymbol,
          "nextTurn:",
          nextTurn
        );

        if (w || draw) {
          gameState = "finished";
          if (w) {
            statusMessage =
              w === mySymbol
                ? "Victory! You won the game"
                : `${w} won the game`;
          } else if (draw) {
            statusMessage = "It's a draw";
          }
        }
      }
    );

    socket.on("your_turn", ({ roomId: rid, symbol, player }) => {
      if (player === username) {
        isMyTurn = true;
        statusMessage = "Your turn";
      }
    });

    socket.on("game_over", ({ roomId: rid, winner: w, draw }) => {
      gameState = "finished";
      winner = w;
      isDraw = draw;
      if (w) {
        statusMessage =
          w === mySymbol ? "Victory! You won the game" : `${w} won the game`;
      } else if (draw) {
        statusMessage = "It's a draw";
      }
    });

    socket.on(
      "game_restarted",
      ({ roomId: rid, board, nextTurnSymbol: nextTurn }) => {
        console.log("Game restarted");
        currentBoard = board;
        nextTurnSymbol = nextTurn;
        gameState = "playing";
        winner = null;
        isDraw = false;
        isMyTurn = mySymbol === nextTurn;
        statusMessage =
          "Game restarted! " + (isMyTurn ? "Your turn!" : "Opponent's turn");
      }
    );

    // Register connect handler LAST, after all other handlers are set up
    socket.on("connect", () => {
      console.log("Connected to Room Service");
      if (roomId && username) {
        socket!.emit("join_room", { roomId, username });
      }
    });

    // Now connect manually after all handlers are registered
    socket.connect();
  }

  async function handleJoinOrCreate(createNew: boolean) {
    errorMessage = "";
    if (!username.trim()) {
      errorMessage = "Please enter a username";
      return;
    }

    try {
      await registerUser();

      if (createNew) {
        roomId = await createRoom();
        statusMessage = `Created room: ${roomId}`;
      } else if (!roomId.trim()) {
        errorMessage = "Please enter a room ID";
        return;
      }

      gameState = "waiting";
      setupSocket();
    } catch (e: any) {
      errorMessage = e.message;
    }
  }

  function handleCellClick(position: number) {
    if (!socket) return;
    if (gameState !== "playing") return;
    if (!isMyTurn) return;
    if (currentBoard[position] !== "") return;
    if (winner || isDraw) return;

    socket.emit("move", { roomId, position, player: username });
  }

  function copyRoomId() {
    navigator.clipboard.writeText(roomId);
    statusMessage = "Room ID copied to clipboard!";
    setTimeout(() => {
      if (gameState === "waiting") {
        statusMessage = "Waiting for opponent to join...";
      }
    }, 2000);
  }

  function restartGame() {
    if (!socket || !roomId) return;
    socket.emit("restart_game", { roomId });
  }

  function resetGame() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    gameState = "lobby";
    roomId = "";
    mySymbol = null;
    currentBoard = Array(9).fill("");
    nextTurnSymbol = "X";
    winner = null;
    isDraw = false;
    players = [];
    errorMessage = "";
    statusMessage = "";
  }

  onDestroy(() => {
    if (socket) {
      socket.disconnect();
    }
  });
</script>

<div class="app">
  <header class="header">
    <div class="header-content">
      <div class="logo-section">
        <h1 class="title">TIC-TAC-TOE ONLINE</h1>
        <p class="subtitle">Real-time Multiplayer Game</p>
      </div>
      <button
        class="btn btn-secondary btn-leaderboard"
        onclick={() => (showLeaderboard = !showLeaderboard)}
      >
        {showLeaderboard ? "Close" : "Leaderboard"}
      </button>
    </div>
  </header>

  <div class="main-content">
    {#if showLeaderboard}
      <div class="leaderboard-panel">
        <h2 class="panel-title">Top Players</h2>
        {#if leaderboard.length > 0}
          <div class="leaderboard-list">
            {#each leaderboard as player}
              <div class="leaderboard-item">
                <div class="rank">#{player.rank}</div>
                <div class="player-info">
                  <div class="player-name">{player.username}</div>
                  <div class="player-stats">
                    {player.stats.wins}W / {player.stats.losses}L / {player
                      .stats.draws}D
                  </div>
                </div>
                <div class="win-rate">{player.winRate}%</div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty-state">No players yet. Be the first!</p>
        {/if}
      </div>
    {/if}

    <div class="game-container">
      {#if gameState === "lobby"}
        <div class="lobby-container">
          <div class="card lobby-card">
            <h2 class="card-title">Welcome!</h2>

            <div class="form-group">
              <label for="username">Username</label>
              <input
                id="username"
                type="text"
                class="input-field"
                bind:value={username}
                placeholder="Enter your username"
              />
            </div>

            <div class="form-group">
              <label for="roomId">Room ID (optional)</label>
              <input
                id="roomId"
                type="text"
                class="input-field"
                bind:value={roomId}
                placeholder="Leave empty to create new room"
              />
            </div>

            {#if errorMessage}
              <div class="error-message">{errorMessage}</div>
            {/if}

            <div class="button-group">
              <button
                class="btn btn-primary"
                onclick={() => handleJoinOrCreate(true)}
              >
                Create New Room
              </button>
              <button
                class="btn btn-success"
                onclick={() => handleJoinOrCreate(false)}
                disabled={!roomId.trim()}
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      {:else}
        <div class="game-container">
          <div class="game-info">
            <div class="info-card">
              <div class="info-row">
                <span class="info-label">Room ID:</span>
                <span class="info-value">
                  {roomId}
                  <button
                    class="btn-copy"
                    onclick={copyRoomId}
                    title="Copy Room ID">📋</button
                  >
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Player:</span>
                <span class="info-value">
                  {username}
                  {#if mySymbol}
                    <span
                      class="player-symbol"
                      class:symbol-x={mySymbol === "X"}
                      class:symbol-o={mySymbol === "O"}
                    >
                      ({mySymbol})
                    </span>
                  {/if}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Players:</span>
                <span class="info-value"
                  >{players.join(" vs ") || "Waiting..."}</span
                >
              </div>
            </div>

            {#if statusMessage}
              <div
                class="status-message"
                class:my-turn={statusMessage.includes("Your turn")}
              >
                {statusMessage}
              </div>
            {/if}

            {#if errorMessage}
              <div class="error-message">{errorMessage}</div>
            {/if}
          </div>

          <div class="board-container">
            <div class="board">
              {#each currentBoard as cell, i}
                <button
                  class="cell"
                  class:cell-x={cell === "X"}
                  class:cell-o={cell === "O"}
                  class:cell-clickable={gameState === "playing" &&
                    isMyTurn &&
                    cell === "" &&
                    !winner &&
                    !isDraw}
                  onclick={() => handleCellClick(i)}
                  disabled={gameState !== "playing" ||
                    !isMyTurn ||
                    cell !== "" ||
                    !!winner ||
                    isDraw}
                >
                  {#if cell === "X"}
                    <span class="symbol symbol-x">X</span>
                  {:else if cell === "O"}
                    <span class="symbol symbol-o">O</span>
                  {:else}
                    <span class="cell-number">{i}</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          <div class="game-actions">
            {#if winner || isDraw}
              <button class="btn btn-secondary" onclick={restartGame}
                >Play Again</button
              >
            {/if}
            <button class="btn btn-primary" onclick={resetGame}>New Game</button
            >
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main-content {
    flex: 1;
    display: flex;
    gap: 2rem;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
    padding: 0 2rem 2rem;
  }

  .game-container {
    flex: 1;
    min-width: 0;
  }

  .leaderboard-panel {
    width: 350px;
    background: var(--color-surface);
    border-radius: var(--border-radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    position: sticky;
    top: 2rem;
  }

  .panel-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: var(--color-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .leaderboard-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .leaderboard-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-bg);
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--color-border);
    transition: var(--transition);
  }

  .leaderboard-item:hover {
    border-color: var(--color-primary);
    transform: translateX(4px);
  }

  .rank {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
    min-width: 40px;
  }

  .player-info {
    flex: 1;
    min-width: 0;
  }

  .player-name {
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--color-text);
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-stats {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }

  .win-rate {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-success);
    min-width: 60px;
    text-align: right;
  }

  .empty-state {
    text-align: center;
    color: var(--color-text-dim);
    padding: 2rem 1rem;
  }

  .header-content {
    max-width: 1600px;
    margin: 0 auto;
    padding: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo-section {
    flex: 1;
  }

  .btn-leaderboard {
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
  }

  .header {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
  }

  .title {
    font-size: 2.5rem;
    font-weight: 800;
    background: linear-gradient(
      135deg,
      var(--color-primary),
      var(--color-secondary)
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 2px;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1rem;
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .lobby-container {
    max-width: 500px;
    margin: 0 auto;
  }

  .lobby-card {
    animation: slideIn 0.5s ease;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .card-title {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--color-text-dim);
    font-weight: 500;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .button-group .btn {
    flex: 1;
  }

  .error-message {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--color-danger);
    color: var(--color-danger);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin: 1rem 0;
  }

  .game-container {
    max-width: 800px;
    margin: 0 auto;
  }

  .game-info {
    margin-bottom: 2rem;
  }

  .info-card {
    background: var(--color-surface);
    border-radius: var(--border-radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    margin-bottom: 1rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
  }

  .info-row:not(:last-child) {
    border-bottom: 1px solid var(--color-surface-light);
  }

  .info-label {
    color: var(--color-text-dim);
    font-weight: 500;
  }

  .info-value {
    color: var(--color-text);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-copy {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background 0.3s ease;
  }

  .btn-copy:hover {
    background: var(--color-surface-light);
  }

  .player-symbol {
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .symbol-x {
    color: var(--color-x);
    background: rgba(6, 182, 212, 0.1);
  }

  .symbol-o {
    color: var(--color-o);
    background: rgba(251, 191, 36, 0.1);
  }

  .status-message {
    background: var(--color-surface);
    border: 2px solid var(--color-primary);
    color: var(--color-text);
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
    font-size: 1.125rem;
    animation: pulse 2s ease-in-out infinite;
  }

  .status-message.my-turn {
    border-color: var(--color-success);
    background: rgba(16, 185, 129, 0.1);
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  .board-container {
    display: flex;
    justify-content: center;
    margin: 2rem 0;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    max-width: 450px;
    width: 100%;
    aspect-ratio: 1;
  }

  .cell {
    background: var(--color-surface);
    border: 3px solid var(--color-surface-light);
    border-radius: 12px;
    font-size: 3rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    position: relative;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  }

  .cell-clickable {
    cursor: pointer;
    border-color: var(--color-primary);
  }

  .cell-clickable:hover {
    background: var(--color-surface-light);
    transform: scale(1.05);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
  }

  .cell-x {
    border-color: var(--color-x);
  }

  .cell-o {
    border-color: var(--color-o);
  }

  .symbol {
    animation: symbolPop 0.3s ease;
  }

  .symbol-x {
    color: var(--color-x);
  }

  .symbol-o {
    color: var(--color-o);
  }

  @keyframes symbolPop {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .cell-number {
    color: var(--color-text-dim);
    font-size: 1.5rem;
    font-weight: 500;
  }

  .cell:disabled .cell-number {
    opacity: 0.3;
  }

  .game-actions {
    text-align: center;
    margin-top: 2rem;
  }

  @media (max-width: 640px) {
    .title {
      font-size: 2rem;
    }

    .board {
      gap: 8px;
    }

    .cell {
      font-size: 2rem;
    }

    .button-group {
      flex-direction: column;
    }
  }
</style>
