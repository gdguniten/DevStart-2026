// Find the HTML elements used in this checkpoint.
const stage = document.querySelector("#game-stage");
const dino = document.querySelector("#dino");
const startButton = document.querySelector("#start-button");
const statusText = document.querySelector("#status");

// Remember whether the game is active and where the dinosaur is in its jump.
let running = false;
let jumping = false;
let jumpVelocity = 0;
let jumpHeight = 0;
let lastTime = 0;

// Gravity pulls down. Jump power gives the dinosaur its first upward push.
const gravity = 2100;
const jumpPower = 760;

// Reset the jump values and ask the browser to draw the first frame.
function startGame() {
  running = true;
  jumping = false;
  jumpVelocity = 0;
  jumpHeight = 0;
  lastTime = performance.now();
  dino.style.bottom = "42px";
  statusText.textContent = "Run started. Press Space or ↑ to jump.";
  stage.focus();
  requestAnimationFrame(gameLoop);
}

// Ignore the input if the game has not started or a jump is already happening.
function jump() {
  if (!running || jumping) return;

  jumping = true;
  jumpVelocity = jumpPower;
}

// requestAnimationFrame supplies `now` before the browser draws each frame.
function gameLoop(now) {
  if (!running) return;

  // Convert the time between frames from milliseconds to seconds.
  const deltaTime = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;

  if (jumping) {
    // Move up using velocity, then reduce that velocity using gravity.
    jumpHeight += jumpVelocity * deltaTime;
    jumpVelocity -= gravity * deltaTime;

    // Stop the jump when the dinosaur reaches the ground again.
    if (jumpHeight <= 0) {
      jumpHeight = 0;
      jumpVelocity = 0;
      jumping = false;
    }

    // The ground is 42px tall. Add the current jump height to that base
    // position, then turn the number into a CSS value such as "122px".
    dino.style.bottom = `${42 + jumpHeight}px`;
  }

  // Continue the animation on the next browser frame.
  requestAnimationFrame(gameLoop);
}

// Start the game when the button is selected.
startButton.addEventListener("click", startGame);

// Space and Arrow Up both call the same jump function.
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    // Prevent Space from scrolling the page.
    event.preventDefault();
    jump();
  }
});
