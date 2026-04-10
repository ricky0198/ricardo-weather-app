// ── Tetris Constants ──
const COLS = 10;
const ROWS = 20;
const BLOCK = 24;
const NEXT_BLOCK = 16;

const COLORS = [
  null,
  "#00f0f0", // I - cyan
  "#f0f000", // O - yellow
  "#a000f0", // T - purple
  "#00f000", // S - green
  "#f00000", // Z - red
  "#0000f0", // J - blue
  "#f0a000", // L - orange
];

const PIECES = [
  [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],[[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],[[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]],
  [[[2,2],[2,2]],[[2,2],[2,2]],[[2,2],[2,2]],[[2,2],[2,2]]],
  [[[0,3,0],[3,3,3],[0,0,0]],[[0,3,0],[0,3,3],[0,3,0]],[[0,0,0],[3,3,3],[0,3,0]],[[0,3,0],[3,3,0],[0,3,0]]],
  [[[0,4,4],[4,4,0],[0,0,0]],[[0,4,0],[0,4,4],[0,0,4]],[[0,0,0],[0,4,4],[4,4,0]],[[4,0,0],[4,4,0],[0,4,0]]],
  [[[5,5,0],[0,5,5],[0,0,0]],[[0,0,5],[0,5,5],[0,5,0]],[[0,0,0],[5,5,0],[0,5,5]],[[0,5,0],[5,5,0],[5,0,0]]],
  [[[6,0,0],[6,6,6],[0,0,0]],[[0,6,6],[0,6,0],[0,6,0]],[[0,0,0],[6,6,6],[0,0,6]],[[0,6,0],[0,6,0],[6,6,0]]],
  [[[0,0,7],[7,7,7],[0,0,0]],[[0,7,0],[0,7,0],[0,7,7]],[[0,0,0],[7,7,7],[7,0,0]],[[7,7,0],[0,7,0],[0,7,0]]],
];

// ── Tetris Game Class ──
class TetrisGame {
  constructor(canvasId, nextCanvasId, scoreId, linesId, levelId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = COLS * BLOCK;
    this.canvas.height = ROWS * BLOCK;
    this.nextCanvas = document.getElementById(nextCanvasId);
    this.nextCtx = this.nextCanvas.getContext("2d");
    this.nextCanvas.width = 4 * NEXT_BLOCK;
    this.nextCanvas.height = 4 * NEXT_BLOCK;
    this.scoreEl = document.getElementById(scoreId);
    this.linesEl = document.getElementById(linesId);
    this.levelEl = document.getElementById(levelId);
    this.overlayEl = this.canvas.parentElement.querySelector(".game-over-overlay");
    this.onStateChange = null; // callback for multiplayer sync
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.gameOver = false;
    this.piece = null;
    this.nextPiece = this.randomPiece();
    this.spawnPiece();
    this.dropCounter = 0;
    this.lastTime = 0;
    if (this.overlayEl) this.overlayEl.style.display = "none";
    this.updateStats();
  }

  randomPiece() {
    return { type: Math.floor(Math.random() * PIECES.length), rotation: 0 };
  }

  getShape(piece) { return PIECES[piece.type][piece.rotation]; }

  spawnPiece() {
    this.piece = {
      ...this.nextPiece,
      x: Math.floor(COLS / 2) - Math.ceil(this.getShape(this.nextPiece)[0].length / 2),
      y: 0,
    };
    this.nextPiece = this.randomPiece();
    if (this.collides(this.piece)) {
      this.gameOver = true;
      if (this.overlayEl) this.overlayEl.style.display = "flex";
      this.notifyState();
    }
  }

  collides(piece) {
    const shape = this.getShape(piece);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c] !== 0) {
          const nx = piece.x + c, ny = piece.y + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && this.board[ny][nx] !== 0) return true;
        }
    return false;
  }

  merge() {
    const shape = this.getShape(this.piece);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c] !== 0) {
          const y = this.piece.y + r, x = this.piece.x + c;
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) this.board[y][x] = shape[r][c];
        }
  }

  clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every(cell => cell !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      this.score += ([0, 100, 300, 500, 800][cleared] || 800) * this.level;
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10) + 1;
      this.updateStats();
    }
  }

  moveLeft()  { if (this.gameOver) return; this.piece.x--; if (this.collides(this.piece)) this.piece.x++; else this.notifyState(); }
  moveRight() { if (this.gameOver) return; this.piece.x++; if (this.collides(this.piece)) this.piece.x--; else this.notifyState(); }

  moveDown() {
    if (this.gameOver) return;
    this.piece.y++;
    if (this.collides(this.piece)) {
      this.piece.y--;
      this.merge();
      this.clearLines();
      this.spawnPiece();
    }
    this.dropCounter = 0;
    this.notifyState();
  }

  hardDrop() {
    if (this.gameOver) return;
    while (!this.collides(this.piece)) this.piece.y++;
    this.piece.y--;
    this.merge();
    this.clearLines();
    this.spawnPiece();
    this.dropCounter = 0;
    this.notifyState();
  }

  rotate() {
    if (this.gameOver) return;
    const old = this.piece.rotation;
    this.piece.rotation = (this.piece.rotation + 1) % 4;
    if (this.collides(this.piece)) {
      this.piece.x++;
      if (this.collides(this.piece)) {
        this.piece.x -= 2;
        if (this.collides(this.piece)) { this.piece.x++; this.piece.rotation = old; return; }
      }
    }
    this.notifyState();
  }

  updateStats() {
    this.scoreEl.textContent = this.score;
    this.linesEl.textContent = this.lines;
    this.levelEl.textContent = this.level;
  }

  getDropInterval() { return Math.max(50, 1000 - (this.level - 1) * 80); }

  update(dt) {
    if (this.gameOver) return;
    this.dropCounter += dt;
    if (this.dropCounter >= this.getDropInterval()) this.moveDown();
  }

  // Get serializable state for network sync
  getState() {
    return {
      board: this.board,
      piece: this.piece,
      nextPiece: this.nextPiece,
      score: this.score,
      lines: this.lines,
      level: this.level,
      gameOver: this.gameOver,
    };
  }

  // Apply remote state (for opponent's board)
  applyState(state) {
    this.board = state.board;
    this.piece = state.piece;
    this.nextPiece = state.nextPiece;
    this.score = state.score;
    this.lines = state.lines;
    this.level = state.level;
    this.gameOver = state.gameOver;
    if (this.gameOver && this.overlayEl) this.overlayEl.style.display = "flex";
    if (!this.gameOver && this.overlayEl) this.overlayEl.style.display = "none";
    this.updateStats();
    this.draw();
  }

  notifyState() {
    if (this.onStateChange) this.onStateChange(this.getState());
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r*BLOCK); ctx.lineTo(COLS*BLOCK, r*BLOCK); ctx.stroke(); }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c*BLOCK, 0); ctx.lineTo(c*BLOCK, ROWS*BLOCK); ctx.stroke(); }

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (this.board[r][c] !== 0) this.drawBlock(ctx, c, r, COLORS[this.board[r][c]], BLOCK);

    if (this.piece && !this.gameOver) {
      const ghost = { ...this.piece };
      while (!this.collides(ghost)) ghost.y++;
      ghost.y--;
      const gs = this.getShape(ghost);
      for (let r = 0; r < gs.length; r++)
        for (let c = 0; c < gs[r].length; c++)
          if (gs[r][c] !== 0 && ghost.y+r >= 0) {
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.fillRect((ghost.x+c)*BLOCK+1, (ghost.y+r)*BLOCK+1, BLOCK-2, BLOCK-2);
          }

      const ps = this.getShape(this.piece);
      for (let r = 0; r < ps.length; r++)
        for (let c = 0; c < ps[r].length; c++)
          if (ps[r][c] !== 0 && this.piece.y+r >= 0)
            this.drawBlock(ctx, this.piece.x+c, this.piece.y+r, COLORS[ps[r][c]], BLOCK);
    }

    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    const ns = this.getShape(this.nextPiece);
    const ox = (4 - ns[0].length) / 2, oy = (4 - ns.length) / 2;
    for (let r = 0; r < ns.length; r++)
      for (let c = 0; c < ns[r].length; c++)
        if (ns[r][c] !== 0) this.drawBlock(this.nextCtx, ox+c, oy+r, COLORS[ns[r][c]], NEXT_BLOCK);
  }

  drawBlock(ctx, x, y, color, size) {
    const px = x*size, py = y*size;
    ctx.fillStyle = color;
    ctx.fillRect(px+1, py+1, size-2, size-2);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(px+1, py+1, size-2, 3);
    ctx.fillRect(px+1, py+1, 3, size-2);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(px+size-3, py+1, 2, size-2);
    ctx.fillRect(px+1, py+size-3, size-2, 2);
  }
}

// ── Game Instances ──
const game1 = new TetrisGame("board-p1", "next-p1", "score-p1", "lines-p1", "level-p1");
const game2 = new TetrisGame("board-p2", "next-p2", "score-p2", "lines-p2", "level-p2");
const winnerBanner = document.getElementById("winner-banner");

// ── Game Mode ──
let gameMode = "local"; // "local" or "online"
let running = false;
let animFrameId = null;

// ── Multiplayer State ──
let peer = null;
let conn = null;
let isHost = false;
let myGame = null;    // the game I control
let theirGame = null; // the game showing opponent

// ── DOM refs for multiplayer ──
const modeLocalBtn  = document.getElementById("mode-local");
const modeOnlineBtn = document.getElementById("mode-online");
const onlinePanel   = document.getElementById("online-panel");
const connStatus    = document.getElementById("connection-status");
const p1Label       = document.getElementById("p1-label");
const p2Label       = document.getElementById("p2-label");
const p1Controls    = document.getElementById("p1-controls");
const p2Controls    = document.getElementById("p2-controls");

// ── Mode Switching ──
modeLocalBtn.addEventListener("click", () => {
  gameMode = "local";
  modeLocalBtn.classList.add("active");
  modeOnlineBtn.classList.remove("active");
  onlinePanel.classList.add("hidden");
  disconnectPeer();
  setLocalMode();
  resetGame();
});

modeOnlineBtn.addEventListener("click", () => {
  gameMode = "online";
  modeOnlineBtn.classList.add("active");
  modeLocalBtn.classList.remove("active");
  onlinePanel.classList.remove("hidden");
  setOnlineLabels();
  resetGame();
});

function setLocalMode() {
  p1Label.textContent = "Player 1";
  p2Label.textContent = "Player 2";
  p1Controls.innerHTML = '<kbd>A</kbd> <kbd>D</kbd> Move &nbsp; <kbd>S</kbd> Down<br/><kbd>W</kbd> Rotate &nbsp; <kbd>Q</kbd> Drop';
  p2Controls.innerHTML = '<kbd>←</kbd> <kbd>→</kbd> Move &nbsp; <kbd>↓</kbd> Down<br/><kbd>↑</kbd> Rotate &nbsp; <kbd>/</kbd> Drop';
  myGame = null;
  theirGame = null;
  game1.onStateChange = null;
  game2.onStateChange = null;
}

function setOnlineLabels() {
  p1Label.textContent = "You";
  p2Label.textContent = "Opponent";
  p1Controls.innerHTML = '<kbd>←</kbd> <kbd>→</kbd> Move &nbsp; <kbd>↓</kbd> Down<br/><kbd>↑</kbd> Rotate &nbsp; <kbd>Space</kbd> Drop';
  p2Controls.innerHTML = 'Waiting for connection...';
}

// ── Connection Status Helpers ──
function showStatus(msg, type) {
  connStatus.classList.remove("hidden", "waiting", "connected", "error");
  connStatus.classList.add(type);
  connStatus.innerHTML = msg;
}

function hideStatus() {
  connStatus.classList.add("hidden");
}

// ── PeerJS Multiplayer ──
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function disconnectPeer() {
  if (conn) { conn.close(); conn = null; }
  if (peer) { peer.destroy(); peer = null; }
  hideStatus();
}

function setupConnection(connection) {
  conn = connection;
  conn.on("open", () => {
    showStatus("✅ Connected! Click <strong>Start</strong> to play.", "connected");
    p2Controls.innerHTML = '<em>Playing remotely</em>';
    myGame = game1;
    theirGame = game2;
    myGame.onStateChange = (state) => {
      if (conn && conn.open) conn.send(JSON.stringify({ type: "state", state }));
    };
  });

  conn.on("data", (raw) => {
    const msg = JSON.parse(raw);
    if (msg.type === "state" && theirGame) {
      theirGame.applyState(msg.state);
      checkOnlineWinner();
    } else if (msg.type === "start") {
      startOnlineGame();
    }
  });

  conn.on("close", () => {
    showStatus("❌ Opponent disconnected.", "error");
    conn = null;
  });

  conn.on("error", (err) => {
    showStatus("❌ Connection error: " + err.message, "error");
  });
}

document.getElementById("btn-host").addEventListener("click", () => {
  disconnectPeer();
  const roomCode = generateRoomCode();
  const peerId = "tetris-" + roomCode.toLowerCase();
  isHost = true;

  peer = new Peer(peerId, { debug: 0 });

  peer.on("open", () => {
    showStatus(
      'Share this code with your opponent:<div class="room-code-display">' + roomCode + '</div>Waiting for them to join...',
      "waiting"
    );
  });

  peer.on("connection", (connection) => {
    setupConnection(connection);
  });

  peer.on("error", (err) => {
    if (err.type === "unavailable-id") {
      showStatus("❌ Room code taken. Try again.", "error");
    } else {
      showStatus("❌ Error: " + err.message, "error");
    }
  });
});

document.getElementById("btn-join").addEventListener("click", () => {
  const code = document.getElementById("room-code-input").value.trim().toUpperCase();
  if (code.length < 4) { showStatus("Enter a valid room code.", "error"); return; }

  disconnectPeer();
  isHost = false;
  peer = new Peer(undefined, { debug: 0 });

  peer.on("open", () => {
    showStatus("Connecting to room <strong>" + code + "</strong>...", "waiting");
    const peerId = "tetris-" + code.toLowerCase();
    const connection = peer.connect(peerId, { reliable: true });
    setupConnection(connection);

    connection.on("error", (err) => {
      showStatus("❌ Could not connect: " + err.message, "error");
    });
  });

  peer.on("error", (err) => {
    showStatus("❌ Error: " + err.message, "error");
  });
});

// ── Game Loop ──
function gameLoop(time) {
  if (!running) return;
  const dt = time - (game1.lastTime || time);
  game1.lastTime = time;
  game2.lastTime = time;

  if (gameMode === "local") {
    game1.update(dt);
    game2.update(dt);
    game1.draw();
    game2.draw();
    if (game1.gameOver && game2.gameOver) { running = false; showWinner(); }
  } else {
    // Online: only update my game
    if (myGame) {
      myGame.update(dt);
      myGame.draw();
    }
    checkOnlineWinner();
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

function checkOnlineWinner() {
  if (gameMode !== "online" || !myGame || !theirGame) return;
  if (myGame.gameOver && theirGame.gameOver) {
    running = false;
    showWinner();
  }
}

function showWinner() {
  let msg;
  if (gameMode === "online") {
    if (myGame.score > theirGame.score) msg = "🏆 You Win!";
    else if (theirGame.score > myGame.score) msg = "😢 Opponent Wins!";
    else msg = "🤝 It's a Tie!";
  } else {
    if (game1.score > game2.score) msg = "🏆 Player 1 Wins!";
    else if (game2.score > game1.score) msg = "🏆 Player 2 Wins!";
    else msg = "🤝 It's a Tie!";
  }
  winnerBanner.textContent = msg;
  winnerBanner.classList.add("visible");
}

function startOnlineGame() {
  if (myGame) myGame.reset();
  if (theirGame) theirGame.reset();
  winnerBanner.classList.remove("visible");
  running = true;
  game1.lastTime = 0;
  game2.lastTime = 0;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
  game1.reset();
  game2.reset();
  winnerBanner.classList.remove("visible");
  running = true;
  game1.lastTime = 0;
  game2.lastTime = 0;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(gameLoop);

  // In online mode, tell opponent to start too
  if (gameMode === "online" && conn && conn.open) {
    conn.send(JSON.stringify({ type: "start" }));
  }
  updateButtons();
}

function pauseGame() {
  if (gameMode === "online") return; // no pausing online
  running = !running;
  if (running) {
    game1.lastTime = 0;
    game2.lastTime = 0;
    animFrameId = requestAnimationFrame(gameLoop);
  }
  updateButtons();
}

function resetGame() {
  running = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  game1.reset();
  game2.reset();
  game1.draw();
  game2.draw();
  winnerBanner.classList.remove("visible");
  updateButtons();
}

function updateButtons() {
  document.getElementById("btn-pause").textContent = running ? "Pause" : "Resume";
}

document.getElementById("btn-start").addEventListener("click", startGame);
document.getElementById("btn-pause").addEventListener("click", pauseGame);
document.getElementById("btn-reset").addEventListener("click", resetGame);

// ── Keyboard Controls ──
document.addEventListener("keydown", (e) => {
  if (!running) return;

  if (gameMode === "online") {
    // Online: arrow keys + space control your board
    if (!myGame) return;
    switch (e.key) {
      case "ArrowLeft":  e.preventDefault(); myGame.moveLeft(); break;
      case "ArrowRight": e.preventDefault(); myGame.moveRight(); break;
      case "ArrowDown":  e.preventDefault(); myGame.moveDown(); break;
      case "ArrowUp":    e.preventDefault(); myGame.rotate(); break;
      case " ":          e.preventDefault(); myGame.hardDrop(); break;
    }
  } else {
    // Local: P1 = WASD+Q, P2 = Arrows+/
    switch (e.key.toLowerCase()) {
      case "a": game1.moveLeft(); break;
      case "d": game1.moveRight(); break;
      case "s": game1.moveDown(); break;
      case "w": game1.rotate(); break;
      case "q": game1.hardDrop(); break;
    }
    switch (e.key) {
      case "ArrowLeft":  e.preventDefault(); game2.moveLeft(); break;
      case "ArrowRight": e.preventDefault(); game2.moveRight(); break;
      case "ArrowDown":  e.preventDefault(); game2.moveDown(); break;
      case "ArrowUp":    e.preventDefault(); game2.rotate(); break;
      case "/":          e.preventDefault(); game2.hardDrop(); break;
    }
  }
});

// Initial draw
game1.draw();
game2.draw();
