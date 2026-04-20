const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const highScoreEl = document.getElementById("highScore");

const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const finalScoreEl = document.getElementById("finalScore");
const finalHighScoreEl = document.getElementById("finalHighScore");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const boostBtn = document.getElementById("boostBtn");

const HIGH_SCORE_KEY = "cometRunnerHighScore";
const BASE_SPAWN_INTERVAL = 0.8;

const input = {
  left: false,
  right: false,
  boost: false
};

const player = {
  width: 56,
  height: 34,
  x: canvas.width / 2 - 28,
  y: canvas.height - 86,
  speed: 350
};

const state = {
  running: false,
  gameOver: false,
  score: 0,
  lives: 3,
  level: 1,
  highScore: Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10) || 0,
  lastTime: 0,
  spawnTimer: BASE_SPAWN_INTERVAL,
  orbTimer: 2.4,
  invulnTimer: 0,
  shakeTimer: 0,
  obstacles: [],
  orbs: [],
  stars: [],
  particles: []
};

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createStars(count) {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: random(0, canvas.width),
      y: random(0, canvas.height),
      size: random(0.8, 2.2),
      speed: random(12, 68),
      alpha: random(0.2, 0.75)
    });
  }
  return stars;
}

function resetGame() {
  state.gameOver = false;
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.spawnTimer = BASE_SPAWN_INTERVAL;
  state.orbTimer = 2.4;
  state.invulnTimer = 0;
  state.shakeTimer = 0;
  state.obstacles.length = 0;
  state.orbs.length = 0;
  state.particles.length = 0;
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - 86;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = Math.floor(state.score);
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
  highScoreEl.textContent = state.highScore;
}

function spawnObstacle() {
  const width = random(32, 66);
  const height = random(24, 54);

  state.obstacles.push({
    x: random(12, canvas.width - width - 12),
    y: -height - random(40, 180),
    width,
    height,
    speed: random(170, 250) + state.level * 16,
    driftStrength: random(20, 110),
    driftSeed: random(0, Math.PI * 2),
    rotation: random(0, Math.PI * 2)
  });
}

function spawnOrb() {
  const radius = random(9, 14);
  state.orbs.push({
    x: random(20, canvas.width - 20),
    y: -30,
    radius,
    speed: random(150, 205) + state.level * 8,
    phase: random(0, Math.PI * 2)
  });
}

function spawnImpactParticles(x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: random(-180, 180),
      vy: random(-190, 140),
      life: random(0.28, 0.72),
      maxLife: 0,
      size: random(2, 5),
      color
    });
    state.particles[state.particles.length - 1].maxLife = state.particles[state.particles.length - 1].life;
  }
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function startGame() {
  resetGame();
  startOverlay.classList.add("hidden");
  gameOverOverlay.classList.add("hidden");
  state.running = true;
  state.lastTime = performance.now();
  requestAnimationFrame(loop);
}

function endGame() {
  state.running = false;
  state.gameOver = true;

  if (Math.floor(state.score) > state.highScore) {
    state.highScore = Math.floor(state.score);
    localStorage.setItem(HIGH_SCORE_KEY, String(state.highScore));
  }

  finalScoreEl.textContent = `Score: ${Math.floor(state.score)}`;
  finalHighScoreEl.textContent = `High Score: ${state.highScore}`;
  updateHud();
  gameOverOverlay.classList.remove("hidden");
}

function updatePlayer(delta) {
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const multiplier = input.boost ? 1.65 : 1;
  player.x += direction * player.speed * multiplier * delta;
  player.x = clamp(player.x, 8, canvas.width - player.width - 8);
}

function updateStars(delta) {
  for (const star of state.stars) {
    star.y += star.speed * delta * (1 + state.level * 0.04);
    if (star.y > canvas.height + 2) {
      star.y = -3;
      star.x = random(0, canvas.width);
    }
  }
}

function updateObstacles(delta) {
  const playerHitbox = {
    x: player.x + 8,
    y: player.y + 5,
    width: player.width - 16,
    height: player.height - 9
  };

  for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = state.obstacles[i];
    obstacle.y += obstacle.speed * delta;
    obstacle.rotation += delta * 1.35;
    obstacle.x += Math.sin((obstacle.y * 0.01) + obstacle.driftSeed) * obstacle.driftStrength * delta;
    obstacle.x = clamp(obstacle.x, 0, canvas.width - obstacle.width);

    const obstacleHitbox = {
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width,
      height: obstacle.height
    };

    if (intersects(playerHitbox, obstacleHitbox) && state.invulnTimer <= 0) {
      state.obstacles.splice(i, 1);
      state.lives -= 1;
      state.invulnTimer = 1.0;
      state.shakeTimer = 0.25;
      spawnImpactParticles(player.x + player.width / 2, player.y + player.height / 2, 18, "255, 107, 107");

      if (state.lives <= 0) {
        endGame();
      }
      continue;
    }

    if (obstacle.y > canvas.height + 80) {
      state.obstacles.splice(i, 1);
      state.score += 3;
    }
  }
}

function updateOrbs(delta) {
  const playerHitbox = {
    x: player.x + 8,
    y: player.y + 4,
    width: player.width - 16,
    height: player.height - 8
  };

  for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
    const orb = state.orbs[i];
    orb.y += orb.speed * delta;
    orb.x += Math.sin((orb.y * 0.03) + orb.phase) * 26 * delta;
    orb.x = clamp(orb.x, orb.radius + 2, canvas.width - orb.radius - 2);

    const orbHitbox = {
      x: orb.x - orb.radius,
      y: orb.y - orb.radius,
      width: orb.radius * 2,
      height: orb.radius * 2
    };

    if (intersects(playerHitbox, orbHitbox)) {
      state.orbs.splice(i, 1);
      state.score += 24;
      if (state.lives < 5 && Math.random() < 0.25) {
        state.lives += 1;
      }
      spawnImpactParticles(orb.x, orb.y, 12, "255, 209, 102");
      continue;
    }

    if (orb.y > canvas.height + 40) {
      state.orbs.splice(i, 1);
    }
  }
}

function updateParticles(delta) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const particle = state.particles[i];
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 450 * delta;
    particle.life -= delta;

    if (particle.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function update(delta) {
  if (state.invulnTimer > 0) {
    state.invulnTimer -= delta;
  }

  if (state.shakeTimer > 0) {
    state.shakeTimer -= delta;
  }

  updatePlayer(delta);
  updateStars(delta);

  state.spawnTimer -= delta;
  const spawnInterval = Math.max(0.28, BASE_SPAWN_INTERVAL - (state.level - 1) * 0.03);
  if (state.spawnTimer <= 0) {
    spawnObstacle();
    state.spawnTimer += spawnInterval;
  }

  state.orbTimer -= delta;
  if (state.orbTimer <= 0) {
    spawnOrb();
    state.orbTimer = random(1.8, 3.2);
  }

  updateObstacles(delta);
  updateOrbs(delta);
  updateParticles(delta);

  state.score += delta * (9 + state.level * 0.6);
  state.level = 1 + Math.floor(state.score / 135);
  updateHud();
}

function drawStars() {
  for (const star of state.stars) {
    ctx.fillStyle = `rgba(197, 238, 255, ${star.alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(120, 193, 230, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  const shouldBlink = state.invulnTimer > 0 && Math.floor(state.invulnTimer * 12) % 2 === 0;
  if (shouldBlink) {
    ctx.globalAlpha = 0.44;
  }

  if (input.boost) {
    ctx.fillStyle = "rgba(255, 209, 102, 0.45)";
    ctx.beginPath();
    ctx.moveTo(player.x + 12, player.y + player.height - 3);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height + random(16, 24));
    ctx.lineTo(player.x + player.width - 12, player.y + player.height - 3);
    ctx.closePath();
    ctx.fill();
  }

  const gradient = ctx.createLinearGradient(player.x, player.y, player.x + player.width, player.y + player.height);
  gradient.addColorStop(0, "#38d9b5");
  gradient.addColorStop(1, "#67b7ff");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x + player.width, player.y + player.height - 4);
  ctx.lineTo(player.x + player.width / 2, player.y + player.height - 10);
  ctx.lineTo(player.x, player.y + player.height - 4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(230, 251, 255, 0.75)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(2, 28, 38, 0.85)";
  ctx.beginPath();
  ctx.arc(player.x + player.width / 2, player.y + player.height / 2 - 4, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}

function drawObstacles() {
  for (const obstacle of state.obstacles) {
    const cx = obstacle.x + obstacle.width / 2;
    const cy = obstacle.y + obstacle.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(obstacle.rotation);

    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(0, -obstacle.height / 2);
    ctx.lineTo(obstacle.width / 2, 0);
    ctx.lineTo(0, obstacle.height / 2);
    ctx.lineTo(-obstacle.width / 2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 239, 198, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

function drawOrbs() {
  for (const orb of state.orbs) {
    const glow = ctx.createRadialGradient(orb.x, orb.y, 2, orb.x, orb.y, orb.radius * 2.4);
    glow.addColorStop(0, "rgba(255, 241, 189, 0.95)");
    glow.addColorStop(1, "rgba(255, 209, 102, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = `rgba(${particle.color}, ${alpha})`;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
}

function render() {
  ctx.save();
  if (state.shakeTimer > 0) {
    const intensity = 6 * (state.shakeTimer / 0.25);
    const sx = random(-intensity, intensity);
    const sy = random(-intensity, intensity);
    ctx.translate(sx, sy);
  }

  ctx.fillStyle = "#04101c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawStars();
  drawGrid();
  drawOrbs();
  drawObstacles();
  drawPlayer();
  drawParticles();
  ctx.restore();
}

function loop(timestamp) {
  if (!state.running) {
    return;
  }

  const delta = Math.min((timestamp - state.lastTime) / 1000, 0.035);
  state.lastTime = timestamp;

  update(delta);
  render();

  if (!state.gameOver) {
    requestAnimationFrame(loop);
  }
}

function bindHoldButton(button, key) {
  const press = (event) => {
    event.preventDefault();
    input[key] = true;
  };
  const release = (event) => {
    event.preventDefault();
    input[key] = false;
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    input.left = true;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    input.right = true;
  }
  if (event.code === "Space") {
    event.preventDefault();
    input.boost = true;
  }

  if (!state.running && !state.gameOver && (event.code === "Enter" || event.code === "Space")) {
    startGame();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    input.left = false;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    input.right = false;
  }
  if (event.code === "Space") {
    input.boost = false;
  }
});

bindHoldButton(leftBtn, "left");
bindHoldButton(rightBtn, "right");
bindHoldButton(boostBtn, "boost");

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

state.stars = createStars(110);
updateHud();
render();
