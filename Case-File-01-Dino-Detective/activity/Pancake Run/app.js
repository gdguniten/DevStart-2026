const stage = document.querySelector("#game-stage");
const cat = document.querySelector("#cat");
const startButton = document.querySelector("#start-button");
const muteButton = document.querySelector("#mute-button");
const overlay = document.querySelector("#start-overlay");
const overlayTitle = document.querySelector("#overlay-title");
const statusText = document.querySelector("#status");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const hillsFar = document.querySelector(".hills-far");
const hillsNear = document.querySelector(".hills-near");

const GROUND = 42;
const GRAVITY = 2100;
const JUMP_POWER = 760;
const BASE_SPEED = 360;
const MAX_SPEED = 680;
const DIVE_SPEED = -950;

let running = false;
let jumping = false;
let ducking = false;
let jumpVelocity = 0;
let jumpHeight = 0;
let lastTime = 0;
let speed = BASE_SPEED;
let score = 0;
let spawnTimer = 0;
let pawTimer = 0;
let hillFarX = 0;
let hillNearX = 0;
let skyMode = "";
let obstacles = [];

let best = 0;
let muted = false;

try {
  best = Number(localStorage.getItem("pancakeRunBest")) || 0;
  muted = localStorage.getItem("pancakeRunMuted") === "1";
} catch (error) {
  best = 0;
  muted = false;
}

bestEl.textContent = String(best);

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let masterGain = null;

function ensureAudio() {
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 0.12;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone({ startFreq, endFreq, type = "sine", duration = 0.12, when = 0 }) {
  const ctx = ensureAudio();
  if (!ctx || muted) return;

  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
  gain.gain.setValueAtTime(1, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

const sfx = {
  jump() {
    tone({ startFreq: 420, endFreq: 700, duration: 0.11 });
  },
  duck() {
    tone({ startFreq: 190, endFreq: 140, type: "triangle", duration: 0.07 });
  },
  pop() {
    tone({ startFreq: 520, endFreq: 680, type: "triangle", duration: 0.07 });
  },
  start() {
    tone({ startFreq: 523, duration: 0.09 });
    tone({ startFreq: 659, duration: 0.12, when: 0.1 });
  },
  gameOver() {
    tone({ startFreq: 500, endFreq: 110, duration: 0.5 });
    tone({ startFreq: 250, endFreq: 90, type: "triangle", duration: 0.45, when: 0.06 });
  },
};

function renderMute() {
  muteButton.textContent = muted ? "Sound: off" : "Sound: on";
  muteButton.setAttribute("aria-pressed", String(muted));
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.12;
}

renderMute();

const PANCAKE_SVG = `
<svg viewBox="0 0 80 64" aria-hidden="true" focusable="false">
  <ellipse cx="40" cy="54" rx="30" ry="9" fill="#e0b076" />
  <ellipse cx="40" cy="47" rx="32" ry="10" fill="#ffe8b5" />
  <ellipse cx="40" cy="36" rx="28" ry="8" fill="#e0b076" />
  <ellipse cx="40" cy="29" rx="31" ry="10" fill="#ffe8b5" />
  <ellipse cx="40" cy="19" rx="26" ry="8" fill="#e0b076" />
  <ellipse cx="40" cy="13" rx="29" ry="9" fill="#ffe8b5" />
  <ellipse cx="40" cy="8" rx="24" ry="6" fill="#f2a7be" />
  <circle cx="22" cy="13" r="4" fill="#f2a7be" />
  <circle cx="40" cy="15" r="4.5" fill="#f2a7be" />
  <circle cx="58" cy="13" r="4" fill="#f2a7be" />
  <rect x="33" y="0" width="14" height="7" rx="3" fill="#fff7cf" />
</svg>`;

const BEE_SVG = `
<svg viewBox="0 0 80 56" aria-hidden="true" focusable="false">
  <g class="bee-wing"><ellipse cx="34" cy="14" rx="12" ry="7" fill="#c7e0ff" opacity="0.9" transform="rotate(-18 34 14)" /></g>
  <g class="bee-wing"><ellipse cx="48" cy="12" rx="12" ry="7" fill="#cfcfff" opacity="0.9" transform="rotate(12 48 12)" /></g>
  <path d="M22 28 L11 23 L13 34 Z" fill="#5b4a66" />
  <ellipse cx="42" cy="32" rx="24" ry="15" fill="#fff7cf" />
  <path d="M32 19 C36 24 36 40 32 45 L40 45 C36 40 36 24 40 19 Z" fill="#5b4a66" />
  <path d="M48 19 C52 24 52 40 48 45 L55 45 C51 40 51 24 54 19 Z" fill="#5b4a66" />
  <circle cx="60" cy="28" r="4" fill="#fffdf7" />
  <circle cx="61" cy="28.5" r="2" fill="#5b4a66" />
  <path d="M62 36 c3 1.5 6 1 8 -1" stroke="#5b4a66" stroke-width="2" stroke-linecap="round" fill="none" />
  <path d="M58 18 C60 12 66 10 70 12" stroke="#5b4a66" stroke-width="2" stroke-linecap="round" fill="none" />
  <circle cx="71" cy="12" r="2.5" fill="#5b4a66" />
</svg>`;

function startGame() {
  if (running) return;

  obstacles.forEach((obstacle) => obstacle.el.remove());
  obstacles = [];
  score = 0;
  speed = BASE_SPEED;
  spawnTimer = 1.1;
  pawTimer = 0;
  jumping = false;
  ducking = false;
  jumpVelocity = 0;
  jumpHeight = 0;
  running = true;
  lastTime = performance.now();
  scoreEl.textContent = "0";
  stage.classList.remove("sky-dusk", "sky-night");
  skyMode = "";
  cat.style.bottom = `${GROUND}px`;
  cat.classList.add("running");
  cat.classList.remove("jumping", "ducking", "crashed");
  overlay.classList.add("is-hidden");
  statusText.textContent = "Run! Space/↑ to jump, ↓/Shift to duck.";
  sfx.start();
  stage.focus();
  requestAnimationFrame(gameLoop);
}

function jump() {
  if (!running || jumping) return;

  jumping = true;
  jumpVelocity = JUMP_POWER;
  cat.classList.add("jumping");
  sfx.jump();
}

function setDucking(value) {
  ducking = value;
  cat.classList.toggle("ducking", ducking);
}

function spawnObstacle() {
  const roll = Math.random();
  const el = document.createElement("div");
  let width;
  let height;
  let bottom;
  let isBee = false;

  if (roll < 0.5) {
    const tall = Math.random() < 0.4;
    width = tall ? 80 : 66;
    height = tall ? 72 : 56;
    bottom = GROUND;
    el.className = "obstacle obstacle-pancake";
    el.innerHTML = PANCAKE_SVG;
  } else {
    isBee = true;
    width = 82;
    height = 54;
    const band = roll < 0.7 ? 0 : roll < 0.9 ? 1 : 2;
    // Low bees: jump. Mid bees: duck (or thread an apex jump). High: run under.
    if (band === 0) bottom = 72 + Math.random() * 26;
    else if (band === 1) bottom = 112 + Math.random() * 16;
    else bottom = 150 + Math.random() * 15;
    el.className = "obstacle obstacle-bee";
    el.innerHTML = BEE_SVG;
  }

  el.setAttribute("aria-hidden", "true");
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.left = "0px";
  el.style.bottom = `${bottom}px`;
  stage.appendChild(el);

  obstacles.push({
    el,
    x: stage.clientWidth + 40,
    w: width,
    h: height,
    bottom,
    phase: Math.random() * Math.PI * 2,
    bee: isBee,
  });
}

function spawnPaw() {
  if (document.querySelectorAll(".paw").length > 12) return;

  const stageRect = stage.getBoundingClientRect();
  const catRect = cat.getBoundingClientRect();
  const paw = document.createElement("div");
  paw.className = "paw";
  paw.style.left = `${catRect.left - stageRect.left + 10 + (Math.random() * 10 - 5)}px`;
  paw.style.bottom = `${GROUND + 2 + (Math.random() * 4 - 2)}px`;
  stage.appendChild(paw);
  window.setTimeout(() => paw.remove(), 650);
}

function endGame() {
  running = false;
  ducking = false;
  cat.classList.remove("running", "jumping", "ducking");
  cat.classList.add("crashed");
  sfx.gameOver();

  const finalScore = Math.floor(score);
  if (finalScore > best) {
    best = finalScore;
    try {
      localStorage.setItem("pancakeRunBest", String(best));
    } catch (error) {
      // best still updates for this session
    }
    bestEl.textContent = String(best);
  }

  overlayTitle.textContent = "Mrrp... catastrophe!";
  startButton.setAttribute("aria-label", "Retry game");
  overlay.classList.remove("is-hidden");
  statusText.textContent = `You scored ${finalScore}. Space/↑ to try again.`;
}

function collides(catRect, obstacle) {
  const rect = obstacle.el.getBoundingClientRect();
  const padX = obstacle.bee ? 10 : 9;
  const padY = obstacle.bee ? 8 : 9;
  return (
    catRect.left < rect.right - padX &&
    catRect.right > rect.left + padX &&
    catRect.top < rect.bottom - padY &&
    catRect.bottom > rect.top + padY
  );
}

function gameLoop(now) {
  if (!running) return;

  const deltaTime = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
  score += deltaTime * 12;
  speed = Math.min(BASE_SPEED + score * 1.4, MAX_SPEED);
  scoreEl.textContent = String(Math.floor(score));

  const nextSky = score >= 350 ? "sky-night" : score >= 120 ? "sky-dusk" : "";
  if (nextSky !== skyMode) {
    stage.classList.remove("sky-dusk", "sky-night");
    if (nextSky) stage.classList.add(nextSky);
    skyMode = nextSky;
  }

  hillFarX = (hillFarX + speed * deltaTime * 0.35) % 160;
  hillNearX = (hillNearX + speed * deltaTime * 0.7) % 180;
  hillsFar.style.backgroundPositionX = `${-hillFarX}px`;
  hillsNear.style.backgroundPositionX = `${-hillNearX}px`;

  if (jumping) {
    jumpHeight += jumpVelocity * deltaTime;
    jumpVelocity -= GRAVITY * deltaTime;

    if (jumpHeight <= 0) {
      jumpHeight = 0;
      jumpVelocity = 0;
      jumping = false;
      cat.classList.remove("jumping");
    }

    cat.style.bottom = `${GROUND + jumpHeight}px`;
  } else {
    pawTimer -= deltaTime;
    if (pawTimer <= 0) {
      pawTimer = 0.15;
      spawnPaw();
    }
  }

  spawnTimer -= deltaTime;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = 0.75 + Math.random() * 0.7;
  }

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    obstacle.x -= speed * deltaTime;
    const bob = obstacle.bee ? Math.sin((now / 1000) * 4 + obstacle.phase) * 7 : 0;
    obstacle.el.style.transform = `translate3d(${obstacle.x}px, ${bob}px, 0)`;

    if (obstacle.x < -obstacle.w - 60) {
      obstacle.el.remove();
      obstacles.splice(i, 1);
      sfx.pop();
    }
  }

  // Slightly inset hitboxes so near-misses feel fair.
  const catRect = cat.getBoundingClientRect();
  const safeCat = {
    left: catRect.left + 14,
    right: catRect.right - 8,
    top: catRect.top + 10,
    bottom: catRect.bottom - 6,
  };

  if (obstacles.some((obstacle) => collides(safeCat, obstacle))) {
    endGame();
    return;
  }

  requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", startGame);

muteButton.addEventListener("click", () => {
  muted = !muted;
  ensureAudio();
  renderMute();
  try {
    localStorage.setItem("pancakeRunMuted", muted ? "1" : "0");
  } catch (error) {
    // mute still applies for this session
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target === startButton || event.target === muteButton) {
    if (event.code === "Enter" || event.code === "Space") return;
  }

  if (event.code === "ArrowDown" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
    if (event.code === "ArrowDown") event.preventDefault();
    if (!running || event.repeat) return;
    if (jumping) jumpVelocity = Math.min(jumpVelocity, DIVE_SPEED);
    if (!ducking) {
      setDucking(true);
      sfx.duck();
    }
    return;
  }

  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "Enter") {
    if (event.code !== "Enter") event.preventDefault();
    if (!running) startGame();
    else jump();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowDown" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
    setDucking(false);
  }
});
