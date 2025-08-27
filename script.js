(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const highscoreEl = document.getElementById('highscore');
  const startPauseBtn = document.getElementById('startPause');
  const resetBtn = document.getElementById('reset');
  const speedSel = document.getElementById('speed');
  const gridSel = document.getElementById('grid');

  const btnUp = document.getElementById('btn-up');
  const btnDown = document.getElementById('btn-down');
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');

  // Game state
  let gridSize = parseInt(gridSel.value, 10); // cells in one row/col
  let cell = canvas.width / gridSize;
  let snake, dir, food, score, playing, tickMs, lastTick, moveQueue;

  function loadHighscore() {
    const hs = localStorage.getItem('snake_highscore');
    return hs ? parseInt(hs, 10) : 0;
  }
  function saveHighscore(v) {
    localStorage.setItem('snake_highscore', String(v));
  }
  function updateHighscore() {
    const hs = loadHighscore();
    highscoreEl.textContent = hs;
  }

  function resetState() {
    gridSize = parseInt(gridSel.value, 10);
    cell = canvas.width / gridSize;
    tickMs = parseInt(speedSel.value, 10);
    snake = [{x: Math.floor(gridSize/2), y: Math.floor(gridSize/2)}];
    dir = {x: 1, y: 0};
    score = 0;
    scoreEl.textContent = score;
    moveQueue = [];
    spawnFood();
  }

  function spawnFood() {
    while (true) {
      const f = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize)
      };
      if (!snake.some(s => s.x === f.x && s.y === f.y)) {
        food = f;
        return;
      }
    }
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  function draw() {
    // Background grid
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Subtle grid lines
    ctx.strokeStyle = '#172036';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i=1; i<gridSize; i++) {
      const p = i*cell;
      ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height);
      ctx.moveTo(0, p); ctx.lineTo(canvas.width, p);
    }
    ctx.stroke();

    // Food
    const fx = food.x * cell, fy = food.y * cell;
    drawRoundedRect(fx+3, fy+3, cell-6, cell-6, Math.min(10, cell/3));
    const grad = ctx.createLinearGradient(fx, fy, fx+cell, fy+cell);
    grad.addColorStop(0, '#22c55e');
    grad.addColorStop(1, '#86efac');
    ctx.fillStyle = grad;
    ctx.fill();

    // Snake
    snake.forEach((seg, i) => {
      const x = seg.x*cell, y = seg.y*cell;
      const radius = Math.min(10, cell/3);
      drawRoundedRect(x+2, y+2, cell-4, cell-4, radius);
      // head glow
      if (i === 0) {
        const g = ctx.createRadialGradient(x+cell/2, y+cell/2, 2, x+cell/2, y+cell/2, cell);
        g.addColorStop(0, '#0ea5e9');
        g.addColorStop(1, 'rgba(14,165,233,0)');
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.fillStyle = i === 0 ? '#38bdf8' : '#1d4ed8';
      ctx.fill();
    });
  }

  function step(ts) {
    if (!playing) return;
    if (!lastTick) lastTick = ts;
    if (ts - lastTick >= tickMs) {
      lastTick = ts;
      // apply queued turn if any
      if (moveQueue.length) {
        dir = moveQueue.shift();
      }
      const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

      // Wrap around edges to make it beginner-friendly
      head.x = (head.x + gridSize) % gridSize;
      head.y = (head.y + gridSize) % gridSize;

      // Self collision?
      if (snake.some((s, idx) => idx !== 0 && s.x === head.x && s.y === head.y)) {
        gameOver();
        return;
      }

      snake.unshift(head);

      // Eat?
      if (head.x === food.x && head.y === food.y) {
        score += 1;
        scoreEl.textContent = score;
        spawnFood();
        // slightly increase speed every 5 points (min 50ms)
        if (score % 5 === 0) {
          tickMs = Math.max(50, tickMs - 5);
        }
      } else {
        snake.pop();
      }
      draw();
    }
    requestAnimationFrame(step);
  }

  function gameOver() {
    playing = false;
    startPauseBtn.textContent = 'Start';
    // Update highscore
    const hs = loadHighscore();
    if (score > hs) {
      saveHighscore(score);
    }
    updateHighscore();

    // Overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width/2, canvas.height/2 - 10);
    ctx.font = '500 18px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('Trykk Start for å spille igjen', canvas.width/2, canvas.height/2 + 18);
    ctx.restore();
  }

  // Controls
  function scheduleTurn(nx, ny) {
    // Prevent reversing directly
    const last = moveQueue.length ? moveQueue[moveQueue.length-1] : dir;
    if (last.x + nx === 0 && last.y + ny === 0) return;
    moveQueue.push({x: nx, y: ny});
  }

  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp': scheduleTurn(0, -1); break;
      case 'ArrowDown': scheduleTurn(0, 1); break;
      case 'ArrowLeft': scheduleTurn(-1, 0); break;
      case 'ArrowRight': scheduleTurn(1, 0); break;
      case ' ': toggleStartPause(); break;
    }
  }, {passive: true});

  // On-screen buttons
  btnUp.addEventListener('click', () => scheduleTurn(0, -1));
  btnDown.addEventListener('click', () => scheduleTurn(0, 1));
  btnLeft.addEventListener('click', () => scheduleTurn(-1, 0));
  btnRight.addEventListener('click', () => scheduleTurn(1, 0));

  // Touch swipe controls
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    touchStart = {x: t.clientX, y: t.clientY};
  }, {passive: false});
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax > 20 || ay > 20) {
      if (ax > ay) {
        scheduleTurn(dx > 0 ? 1 : -1, 0);
      } else {
        scheduleTurn(0, dy > 0 ? 1 : -1);
      }
    }
    touchStart = null;
  }, {passive: false});

  function toggleStartPause() {
    if (!playing) {
      // If game over state, reset the screen (keep snake)
      playing = true;
      startPauseBtn.textContent = 'Pause';
      lastTick = 0;
      requestAnimationFrame(step);
    } else {
      playing = false;
      startPauseBtn.textContent = 'Start';
    }
  }

  startPauseBtn.addEventListener('click', toggleStartPause);
  resetBtn.addEventListener('click', () => {
    resetState();
    draw();
    playing = false;
    startPauseBtn.textContent = 'Start';
  });

  speedSel.addEventListener('change', () => {
    tickMs = parseInt(speedSel.value, 10);
  });
  gridSel.addEventListener('change', () => {
    // Recompute cell size keeping canvas fixed
    gridSize = parseInt(gridSel.value, 10);
    cell = canvas.width / gridSize;
    // Recreate state to match new grid cleanly
    resetState();
    draw();
  });

  // Init
  updateHighscore();
  resetState();
  draw();
})();