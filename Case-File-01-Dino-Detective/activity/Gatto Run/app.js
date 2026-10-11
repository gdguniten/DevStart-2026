
/* =========================================
   1. SELECT HTML ELEMENTS
========================================= */

// Find the HTML elements that JavaScript needs.
const stage = document.querySelector("#game-stage");
const dino = document.querySelector("#dino");
const kitten = document.querySelector("#kitten");
const obstacle = document.querySelector("#obstacle");
const obstacle2 = document.querySelector("#obstacle2");
const startButton = document.querySelector("#start-button");
const scoreText = document.querySelector("#score");
const statusText = document.querySelector("#status");


/* =========================================
   2. GAME VARIABLES
========================================= */

// Game state
let running = false;
let jumping = false;

// Dinosaur jumping physics
let jumpVelocity = 0;
let jumpHeight = 0;

// Horizontal positions of both obstacles
let obstacleX = 0;
let obstacle2X = 0;

// Game speed and score
let speed = 400;
let score = 0;

// Animation timing
let lastTime = 0;
let animationId = null;


/* =========================================
   3. GAME SETTINGS
========================================= */

const gravity = 2100;
const jumpPower = 760;
const groundHeight = 42;

// Random gap between obstacles (in pixels)
function randomGap() {
  return Math.floor(Math.random() * 301) + 300;
}


/* =========================================
   4. RESET AND START GAME
========================================= */

function startGame() {
  // Cancel the previously scheduled animation frame.
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Reset game state.
  running = false;
  jumping = false;

  jumpVelocity = 0;
  jumpHeight = 0;

  score = 0;
  speed = 400;

  // Reset obstacle positions.
  obstacleX = stage.clientWidth + 80;

  // Place the second obstacle further to the right.
  obstacle2X =
    obstacleX + obstacle.offsetWidth + randomGap();

  // Reset dinosaur position.
  dino.style.bottom = `${groundHeight}px`;
  kitten.style.bottom = `${groundHeight}px`;

  // Update obstacle positions.
  obstacle.style.left = `${obstacleX}px`;
  obstacle2.style.left = `${obstacle2X}px`;

  // Reset the scoreboard and instructions.
  scoreText.textContent = "0";

  statusText.textContent =
    "Run started. Press Space or ↑ to jump.";

  startButton.textContent = "Restart game";

  // Start a fresh game loop.
  running = true;
  lastTime = performance.now();

  stage.focus();

  animationId = requestAnimationFrame(gameLoop);
}


/* =========================================
   5. DINO JUMP FUNCTION
========================================= */

function jump() {
  // Do not jump if the game is stopped
  // or the dinosaur is already jumping.
  if (!running || jumping) {
    return;
  }

  jumping = true;
  jumpVelocity = jumpPower;
}


/* =========================================
   6. COLLISION DETECTION
========================================= */

function rectanglesOverlap(first, second) {
  // Reduce the collision boxes slightly
  // to make collisions more forgiving.
  const padding = 12;

  return (
    first.right - padding > second.left + padding &&
    first.left + padding < second.right - padding &&
    first.bottom - padding > second.top + padding &&
    first.top + padding < second.bottom - padding
  );
}


/* =========================================
   7. END GAME
========================================= */

function endGame() {
  running = false;
  jumping = false;
  animationId = null;

  statusText.textContent =
    `Game over! Final score: ${Math.floor(score)}. ` +
    "Select Restart game to try again.";
}


/* =========================================
   8. MAIN GAME LOOP
========================================= */

function gameLoop(now) {
  // Stop if the game is no longer running.
  if (!running) {
    animationId = null;
    return;
  }

  // Calculate elapsed time in seconds.
  const deltaTime = Math.min(
    (now - lastTime) / 1000,
    0.04
  );

  lastTime = now;


  /* -----------------------------------------
     A. UPDATE DINO JUMPING
  ----------------------------------------- */

  if (jumping) {
    // Update the dinosaur's height.
    jumpHeight += jumpVelocity * deltaTime;

    // Apply gravity to the vertical velocity.
    jumpVelocity -= gravity * deltaTime;

    // Stop the jump when the dinosaur lands.
    if (jumpHeight <= 0) {
      jumpHeight = 0;
      jumpVelocity = 0;
      jumping = false;
    }

    // Update the dinosaur's vertical position.
    dino.style.bottom =
      `${groundHeight + jumpHeight}px`;

    kitten.style.bottom =
      `${groundHeight + jumpHeight}px`;
  }


  /* -----------------------------------------
     B. MOVE BOTH OBSTACLES
  ----------------------------------------- */

  // Move both obstacles towards the left.
  obstacleX -= speed * deltaTime;
  obstacle2X -= speed * deltaTime;


  /* -----------------------------------------
     C. RANDOMLY REPOSITION OBSTACLE 1
  ----------------------------------------- */

  if (obstacleX + obstacle.offsetWidth < 0) {
    // Place obstacle 1 beyond obstacle 2,
    // with a random gap between them.
    obstacleX =
      Math.max(
        stage.clientWidth,
        obstacle2X + obstacle2.offsetWidth
      ) + randomGap();

    // Increase difficulty.
    speed += 14;
  }


  /* -----------------------------------------
     D. RANDOMLY REPOSITION OBSTACLE 2
  ----------------------------------------- */

  if (obstacle2X + obstacle2.offsetWidth < 0) {
    // Place obstacle 2 beyond obstacle 1,
    // with a random gap between them.
    obstacle2X =
      Math.max(
        stage.clientWidth,
        obstacleX + obstacle.offsetWidth
      ) + randomGap();

    // Increase difficulty.
    speed += 14;
  }


  /* -----------------------------------------
     E. UPDATE OBSTACLE POSITIONS
  ----------------------------------------- */

  obstacle.style.left = `${obstacleX}px`;
  obstacle2.style.left = `${obstacle2X}px`;


  /* -----------------------------------------
     F. UPDATE SCORE
  ----------------------------------------- */

  // Increase the score according to elapsed time.
  score += deltaTime * 10;

  // Display the whole-number score.
  scoreText.textContent = String(Math.floor(score));


  /* -----------------------------------------
     G. CHECK COLLISION WITH OBSTACLE 1
  ----------------------------------------- */

  const dinoRect = dino.getBoundingClientRect();

  const obstacle1Rect =
    obstacle.getBoundingClientRect();

  if (rectanglesOverlap(dinoRect, obstacle1Rect)) {
    endGame();
    return;
  }


  /* -----------------------------------------
     H. CHECK COLLISION WITH OBSTACLE 2
  ----------------------------------------- */

  const obstacle2Rect =
    obstacle2.getBoundingClientRect();

  if (rectanglesOverlap(dinoRect, obstacle2Rect)) {
    endGame();
    return;
  }


  /* -----------------------------------------
     I. REQUEST THE NEXT ANIMATION FRAME
  ----------------------------------------- */

  animationId = requestAnimationFrame(gameLoop);
}


/* =========================================
   9. EVENT LISTENERS
========================================= */

// Start or restart the game when the button is clicked.
startButton.addEventListener("click", startGame);


// Allow the dinosaur to jump using Space or Up Arrow.
document.addEventListener("keydown", (event) => {
  if (
    event.code === "Space" ||
    event.code === "ArrowUp"
  ) {
    event.preventDefault();
    jump();
  }
});


// Allow jumping by clicking or tapping the game stage.
stage.addEventListener("pointerdown", jump);
