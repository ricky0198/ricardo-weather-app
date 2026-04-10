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

// Piece shapes (each rotation state)
const PIECES = [
  // I
  [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  // O
  [
    [[2,2],[2,2]],
    [[2,2],[2,2]],
    [[2,2],[2,2]],
    [[2,2],[2,2]],
  ],
  // T
  [
    [[0,3,0],[3,3,3],[0,0,0]],
    [[0,3,0],[0,3,3],[0,3,0]],
    [[0,0,0],[3,3,3],[0,3,0]],
    [[0,3,0],[3,3,0],[0,3,0]],
  ],
  // S
  [
    [[0,4,4],[4,4,0],[0,0,0]],
    [[0,4,0],[0,4,4],[0,0,4]],
    [[0,0,0],[0,4,4],[4,4,0]],
    [[4,0,0],[4,4,0],[0,4,0]],
  ],
  // Z
  [
    [[5,5,0],[0,5,5],[0,0,0]],
    [[0,0,5],[0,5,5],[0,5,0]],
    [[0,0,0],[5,5,0],[0,5,5]],
    [[0,5,0],[5,5,0],[5,0,0]],
  ],
  // J
  [
    [[6,0,0],[6,6,6],[0,0,0]],
    [[0,6,6],[0,6,0],[0,6,0]],
    [[0,0,0],[6,6,6],[0,0,6]],
    [[0,6,0],[0,6,0],[6,6,0]],
  ],
  // L
  [
    [[0,0,7],[7,7,7],[0,0,0]],
    [[0,7,0],[0,7,0],[0,7,7]],
    [[0,0,0],[7,7,7],[7,0,0]],
    [[7,7,0],[0,7,0],[0,7,0]],
  ],
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
    const idx = Math.floor(Math.random() * PIECES.length);
    return { type: idx, rotation: 0 };
  }

  getShape(piece) {
    return PIECES[piece.type][piece.rotation];
  }

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
    }
  }

  collides(piece) {
    const shape = this.getShape(piece);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const newX = piece.x + c;
          const newY = piece.y + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && this.board[newY][newX] !== 0) return true;
        }
      }
    }
    return false;
  }

  merge() {
    const shape = this.getShape(this.piece);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const y = this.piece.y + r;
          const x = this.piece.x + c;
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            this.board[y][x] = shape[r][c];
          }
        }
      }
    }
  }

  clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((cell) => cell !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++; // recheck this row
      }
    }
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800];
      this.score += (points[cleared] || 800) * this.level;
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10) + 1;
      this.updateStats();
    }
  }

  moveLeft() {
    if (this.gameOver) return;
    this.piece.x--;
    if (this.collides(this.piece)) this.piece.x++;
  }

  moveRight() {
    if (this.gameOver) return;
    this.piece.x++;
    if (this.collides(this.piece)) this.piece.x--;
  }

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
  }

  hardDrop() {
    if (this.gameOver) return;
    while (!this.collides(this.piece)) {
      this.piece.y++;
    }
    this.piece.y--;
    this.merge();
    this.clearLines();
    this.spawnPiece();
    this.dropCounter = 0;
  }

  rotate() {
    if (this.gameOver) return;
    const oldRotation = this.piece.rotation;
    this.piece.rotation = (this.piece.rotation + 1) % 4;
    // Wall kick: try shifting left/right if rotation causes collision
    if (this.collides(this.piece)) {
      this.piece.x++;
      if (this.collides(this.piece)) {
        this.piece.x -= 2;
        if (this.collides(this.piece)) {
          this.piece.x++;
          this.piece.rotation = oldRotation;
        }
      }
    }
  }

  updateStats() {
    this.scoreEl.textContent = this.score;
    this.linesEl.textContent = this.lines;
    this.levelEl.textContent = this.level;
  }

  getDropInterval() {
    return Math.max(50, 1000 - (this.level - 1) * 80);
  }

  update(dt) {
    if (this.gameOver) return;
    this.dropCounter += dt;
    if (this.dropCounter >= this.getDropInterval()) {
      this.moveDown();
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }

    // Draw board
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c] !== 0) {
          this.drawBlock(ctx, c, r, COLORS[this.board[r][c]], BLOCK);
        }
      }
    }

    // Draw ghost piece
    if (this.piece && !this.gameOver) {
      const ghost = { ...this.piece };
      while (!this.collides(ghost)) ghost.y++;
      ghost.y--;
      const shape = this.getShape(ghost);
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0 && ghost.y + r >= 0) {
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.fillRect(
              (ghost.x + c) * BLOCK + 1,
              (ghost.y + r) * BLOCK + 1,
              BLOCK - 2,
              BLOCK - 2
            );
          }
        }
      }
    }

    // Draw current piece
    if (this.piece && !this.gameOver) {
      const shape = this.getShape(this.piece);
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0 && this.piece.y + r >= 0) {
            this.drawBlock(ctx, this.piece.x + c, this.piece.y + r, COLORS[shape[r][c]], BLOCK);
          }
        }
      }
    }

    // Draw next piece
    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    const nextShape = this.getShape(this.nextPiece);
    const offsetX = (4 - nextShape[0].length) / 2;
    const offsetY = (4 - nextShape.length) / 2;
    for (let r = 0; r < nextShape.length; r++) {
      for (let c = 0; c < nextShape[r].length; c++) {
        if (nextShape[r][c] !== 0) {
          this.drawBlock(
            this.nextCtx,
            offsetX + c,
            offsetY + r,
            COLORS[nextShape[r][c]],
            NEXT_BLOCK
          );
        }
      }
    }
  }

  drawBlock(ctx, x, y, color, size) {
    const px = x * size;
    const py = y * size;
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(px + 1, py + 1, size - 2, 3);
    ctx.fillRect(px + 1, py + 1, 3, size - 2);
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(px + size - 3, py + 1, 2, size - 2);
    ctx.fillRect(px + 1, py + size - 3, size - 2, 2);
  }
}

// ── Game Manager ──
const game1 = new TetrisGame("board-p1", "next-p1", "score-p1", "lines-p1", "level-p1");
const game2 = new TetrisGame("board-p2", "next-p2", "score-p2", "lines-p2", "level-p2");
const winnerBanner = document.getElementById("winner-banner");

let running = false;
let animFrameId = null;

function gameLoop(time) {
  if (!running) return;
  const dt = time - (game1.lastTime || time);
  game1.lastTime = time;
  game2.lastTime = time;

  game1.update(dt);
  game2.update(dt);

  game1.draw();
  game2.draw();

  // Check if both players are done
  if (game1.gameOver && game2.gameOver) {
    running = false;
    showWinner();
  } else if (game1.gameOver || game2.gameOver) {
    // One player out — other keeps going, or we can end immediately
    // Let the surviving player keep playing for a bit, or declare winner now
    if (game1.gameOver && !game2.gameOver) {
      // game2 still playing
    } else if (game2.gameOver && !game1.gameOver) {
      // game1 still playing
    }
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

function showWinner() {
  let msg;
  if (game1.score > game2.score) {
    msg = "🏆 Player 1 Wins!";
  } else if (game2.score > game1.score) {
    msg = "🏆 Player 2 Wins!";
  } else {
    msg = "🤝 It's a Tie!";
  }
  winnerBanner.textContent = msg;
  winnerBanner.classList.add("visible");
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
  updateButtons();
}

function pauseGame() {
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
  const startBtn = document.getElementById("btn-start");
  const pauseBtn = document.getElementById("btn-pause");
  startBtn.textContent = "Start";
  pauseBtn.textContent = running ? "Pause" : "Resume";
}

document.getElementById("btn-start").addEventListener("click", startGame);
document.getElementById("btn-pause").addEventListener("click", pauseGame);
document.getElementById("btn-reset").addEventListener("click", resetGame);

// ── Keyboard Controls ──
document.addEventListener("keydown", (e) => {
  if (!running) return;

  // Player 1: W A S D + Q (hard drop)
  switch (e.key.toLowerCase()) {
    case "a": game1.moveLeft(); break;
    case "d": game1.moveRight(); break;
    case "s": game1.moveDown(); break;
    case "w": game1.rotate(); break;
    case "q": game1.hardDrop(); break;
  }

  // Player 2: Arrow keys + / (hard drop)
  switch (e.key) {
    case "ArrowLeft":  e.preventDefault(); game2.moveLeft(); break;
    case "ArrowRight": e.preventDefault(); game2.moveRight(); break;
    case "ArrowDown":  e.preventDefault(); game2.moveDown(); break;
    case "ArrowUp":    e.preventDefault(); game2.rotate(); break;
    case "/":          e.preventDefault(); game2.hardDrop(); break;
  }
});

// Initial draw
game1.draw();
game2.draw();
