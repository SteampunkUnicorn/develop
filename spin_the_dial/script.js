const spinButton = document.querySelector(".spin-button");
const resetButton = document.querySelector(".reset-button");
const status = document.querySelector(".game-status");
const dialElements = document.querySelectorAll(".dial");
const combinationSlots = document.querySelectorAll(".combination-slot");
const spinCountDisplay = document.querySelector(".spin-count-number");
const replayButton = document.querySelector(".replay-button");
const guessForms = document.querySelectorAll(".dial-guess");

const safe = document.querySelector(".safe");
const rewardPanel = document.querySelector(".reward-panel");
const rewardTitle = document.querySelector(".reward-title");
const rewardArt = document.querySelector(".reward-art");
const rewardMessage = document.querySelector(".reward-message");
const rewardSpins = document.querySelector(".reward-spins");
const rewardRating = document.querySelector(".reward-rating");
const rewardStats = document.querySelector(".reward-stats");

// Game configuration
const SPIN_DURATION = 4000;
let spinCount = 0;
const MAX_SPINS = 15;
let gameOver = false;
let isSpinning = false;
let gameSession = 0;

const dialConfig = [
  { direction: 1, rotations: 6, totalNumbers: 5 },
  { direction: -1, rotations: 8, totalNumbers: 10 },
  { direction: 1, rotations: 10, totalNumbers: 15 },
];

const rewards = [
  {
    title: "TREASURE FOUND",
    message: "You struck gold!",
    art: String.raw`
       .-""""-.
      /  GOLD  \
     |  $$$$$$  |
      \________/
    `,
  },
  {
    title: "MASTER CRACKER",
    message: "Nothing can stop you.",
    art: String.raw`
        _____
       /     \
      |  X X  |
      |   ^   |
       \ \_/ /
        |___|
    `,
  },
  {
    title: "MYSTERY SOLVED",
    message: "Some secrets are better left hidden.",
    art: String.raw`
       .-------.
      /  ?????  \
     |  ???????  |
      \_________/
    `,
  },
  {
    title: "NICE CATCH",
    message: "You've got a whale of a time ahead.",
    art:
      String.raw`
       /` +
      "`" +
      String.raw`--.
  __/ o  \
 <_  ___/
   \/
    `,
  },
  {
    title: "A WINNER!",
    message: "Take a bow. You've earned it.",
    art: String.raw`
       ___________
      '._==_==_.'
        \:::::/
         |:::|
         |:::|
        [_____]
       /_______\
    `,
  },
  {
    title: "BAD TO THE BONE",
    message: "Well, that was a little spooky.",
    art: String.raw`
       .-.
      (o.o)
       |=|
      __|__
     /     \
    `,
  },
  {
    title: "OUT OF THIS WORLD",
    message: "Houston, we have a winner!",
    art: String.raw`
         .
        / \
       /___\
      |     |
      | NASA|
      |_____|
       /   \
      /_____\
    `,
  },
  {
    title: "LUCKY YOU",
    message: "Four leaves, one lucky player.",
    art: String.raw`
         .-.
      .-(   )-.
     (   \|/   )
      '-. | .-'
         \|/
          |
    `,
  },
  {
    title: "TOP SECRET",
    message: "You've uncovered classified information.",
    art: String.raw`
      ___________
     |           |
     | TOP SECRET|
     |___________|
        |     |
        |_____|
    `,
  },
  {
    title: "JACKPOT!",
    message: "The house always wins. Except today.",
    art: String.raw`
       _______
      | 77777 |
      | 77777 |
      | 77777 |
      |_______|
        |   |
       _|___|_
    `,
  },
];

// Game state
const randomNumber = () => Math.floor(Math.random() * 15) + 1;

const mod = (number, divisor) => ((number % divisor) + divisor) % divisor;

// Generate the hidden combination
let targetCombination = [];

// Store successful matches
// Keep status updates short and restart the terminal flicker on changes.
function updateStatus(message) {
  status.textContent = message;
  status.classList.remove("status-updated");
  void status.offsetWidth;
  status.classList.add("status-updated");
}

// Short, rotating heist chatter shown while any wheel is spinning.
const spinMessages = [
  "DON'T GET CAUGHT...",
  "ACT NATURAL...",
  "KEEP IT QUIET...",
  "NOTHING TO SEE HERE...",
  "BYPASSING SECURITY...",
  "PULLING A JOB...",
  "NO WITNESSES...",
  "ALMOST IN...",
];

let lastSpinMessage = "";

function getRandomSpinMessage() {
  const choices = spinMessages.filter((message) => message !== lastSpinMessage);
  const message = choices[Math.floor(Math.random() * choices.length)];
  lastSpinMessage = message;
  return message;
}

// Track the state of each dial
const dials = Array.from(dialElements, (element, index) => ({
  element,
  ring: element.querySelector(".dial-ring"),
  number: 1,
  matched: false,
  rotation: 0,
  availableNumbers: [],
  config: dialConfig[index],
}));

// Generate a new target combination
function generateCombination() {
  targetCombination = dialConfig.map(
    ({ totalNumbers }) => Math.floor(Math.random() * totalNumbers) + 1,
  );
  console.log(targetCombination);
}

// Build the numbers on each dial
function createDials() {
  dials.forEach((dial) => {
    const { totalNumbers } = dial.config;

    dial.availableNumbers = Array.from(
      { length: totalNumbers },
      (_, i) => i + 1,
    );

    for (let i = 1; i <= totalNumbers; i++) {
      const number = document.createElement("span");

      number.classList.add("dial-number");
      number.textContent = i;

      const angle = (i - 1) * (360 / totalNumbers);

      number.style.setProperty("--angle", `${angle}deg`);

      dial.ring.appendChild(number);
    }
  });
}

// Spin an individual dial
function spinDial(dial) {
  const { direction, rotations, totalNumbers } = dial.config;

  const randomIndex = Math.floor(Math.random() * dial.availableNumbers.length);

  const nextNumber = dial.availableNumbers[randomIndex];

  // Remove the selected number from future possibilities
  dial.availableNumbers.splice(randomIndex, 1);

  // Calculate the angle for each number
  const degreesPerNumber = 360 / totalNumbers;

  const numberAngle = (nextNumber - 1) * degreesPerNumber;

  let adjustment;

  if (direction === 1) {
    adjustment = mod(-numberAngle - dial.rotation, 360);
  } else {
    adjustment = mod(dial.rotation + numberAngle, 360);
  }

  const rotationChange = direction * (rotations * 360 + adjustment);

  const finalRotation = dial.rotation + rotationChange;

  dial.ring.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0.7, 0.15, 1)`;

  dial.ring.style.transform = `rotate(${finalRotation}deg)`;

  dial.rotation = finalRotation;
  dial.number = nextNumber;
}

// Mark a dial as solved using either a spin or a manual guess.
function markDialMatched(dial, index, matchedNumber) {
  dial.matched = true;
  dial.element.classList.add("matched");

  const slot = combinationSlots[index];
  slot.querySelector(".slot-number").textContent = matchedNumber;
  slot.classList.add("matched");

  const form = dial.element.querySelector(".dial-guess");
  form.querySelector(".guess-input").disabled = true;
  form.querySelector(".guess-button").disabled = true;


}

// Shared attempt counter for spins and valid manual guesses.
function updateAttemptDisplay() {
  spinCountDisplay.textContent = `${spinCount} / ${MAX_SPINS}`;
  safe.classList.toggle("attempt-warning", spinCount >= 10 && spinCount < MAX_SPINS);
  safe.classList.toggle("attempt-danger", spinCount >= MAX_SPINS);
}

function disableGuessForms() {
  guessForms.forEach((form) => {
    form.querySelector(".guess-input").disabled = true;
    form.querySelector(".guess-button").disabled = true;
  });
}

// Called after a completed spin or valid manual guess.
function updateGameProgress() {
  const remaining = dials.filter((dial) => !dial.matched).length;
  const matched = dials.length - remaining;

  // Winning on attempt 15 still counts as a win.
  if (remaining === 0) {
    gameOver = true;
    updateStatus("ACCESS GRANTED");
    spinButton.textContent = "UNLOCKED";
    spinButton.disabled = true;
    disableGuessForms();
    showReward();
    safe.classList.add("unlocked");
    showResetWhenDone();
    return;
  }

  if (spinCount >= MAX_SPINS) {
    endGame();
    return;
  }

  updateStatus(`${matched} OF ${dials.length} DIALS UNLOCKED`);
  spinButton.disabled = false;
}

function showInvalidGuess(input) {
  input.readOnly = true;

  // Restart the animation every time
  input.classList.remove("incorrect");
  void input.offsetWidth;
  input.classList.add("incorrect");

  input.addEventListener(
    "animationend",
    () => {
      input.value = "";
      input.readOnly = false;
      input.classList.remove("incorrect");
    },
    { once: true },
  );
}

// A valid manual guess uses one of the 15 shared attempts.
function testDialGuess(event) {
  event.preventDefault();
  if (gameOver || isSpinning || spinCount >= MAX_SPINS) return;

  const form = event.currentTarget;
  const index = Number(form.dataset.guess);
  const input = form.querySelector(".guess-input");
  const dial = dials[index];
  if (!dial || dial.matched) return;

  const guess = Number(input.value);
  const max = dial.config.totalNumbers;
  if (input.value.trim() === "" || !Number.isInteger(guess) || guess < 1 || guess > max) {
    updateStatus(`ENTER A NUMBER FROM 1 TO ${max}`);
    showInvalidGuess(input);
    return;
  }

  resetButton.hidden = false;
  spinCount++;
  updateAttemptDisplay();

  if (guess === targetCombination[index]) {
    markDialMatched(dial, index, guess);
    updateGameProgress();
  } else if (spinCount >= MAX_SPINS) {
    endGame();
  } else {
    updateStatus("INCORRECT — TRY AGAIN");
    showInvalidGuess(input);
  }
}

// A click on a dial spins only that dial; the SPIN button spins all unmatched dials.
// Either action consumes one of the 15 shared attempts.
async function spinSelectedDials(selectedDials) {
  if (gameOver || isSpinning || spinCount >= MAX_SPINS) return;

  const activeDials = selectedDials.filter((dial) => !dial.matched);
  if (activeDials.length === 0) return;

  if (activeDials.some((dial) => dial.availableNumbers.length === 0)) {
    endGame("NO NUMBERS REMAINING");
    return;
  }

  const session = gameSession;
  isSpinning = true;
  resetButton.hidden = false;
  spinCount++;
  updateAttemptDisplay();
  spinButton.disabled = true;
  disableGuessForms();
  updateStatus(getRandomSpinMessage());
  activeDials.forEach(spinDial);

  await new Promise((resolve) => setTimeout(resolve, SPIN_DURATION));
  if (session !== gameSession) return;

  activeDials.forEach((dial) => {
    const index = dials.indexOf(dial);
    const target = targetCombination[index];
    if (dial.number === target) markDialMatched(dial, index, target);
  });

  isSpinning = false;
  updateGameProgress();

  if (!gameOver) {
    dials.forEach((dial) => {
      if (!dial.matched) {
        const form = dial.element.querySelector(".dial-guess");
        form.querySelector(".guess-input").disabled = false;
        form.querySelector(".guess-button").disabled = false;
      }
    });
  }
}

function spinGame() {
  const unmatchedDials = dials.filter((dial) => !dial.matched);
  // The main button still spins every unmatched dial.
  if (unmatchedDials.some((dial) => dial.availableNumbers.length === 0)) {
    if (!gameOver && !isSpinning) endGame("NO NUMBERS REMAINING");
    return;
  }
  return spinSelectedDials(unmatchedDials);
}

function handleDialClick(event, dial) {
  // Clicking inputs/buttons inside the guess form must never spin the dial.
  if (event.target.closest(".dial-guess")) return;
  spinSelectedDials([dial]);
}

function showResetWhenDone() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (reduceMotion) {
    resetButton.hidden = false; // no animation means no animationend
    return;
  }

  rewardStats.addEventListener(
    "animationend",
    () => {
      resetButton.hidden = false;
    },
    { once: true },
  );
}

// Reset the game
function resetGame() {
  lastSpinMessage = "";
  gameSession++;
  gameOver = false;
  isSpinning = false;
  // Generate a new combination
  generateCombination();


  // Reset each dial
  dials.forEach((dial) => {
    dial.number = 1;
    dial.matched = false;
    dial.rotation = 0;

    dial.element.classList.remove("matched");

    // Disable transition before resetting rotation
    dial.ring.style.transition = "none";
    dial.ring.style.transform = "rotate(0deg)";

    dial.availableNumbers = Array.from(
      { length: dial.config.totalNumbers },
      (_, i) => i + 1,
    );

    const guessForm = dial.element.querySelector(".dial-guess");
    guessForm.reset();

    const guessInput = guessForm.querySelector(".guess-input");

    guessInput.disabled = false;
    guessInput.readOnly = false;
    guessInput.classList.remove("incorrect");

    guessForm.querySelector(".guess-button").disabled = false;
  });

  // Reset the combination display
  combinationSlots.forEach((slot) => {
    slot.querySelector(".slot-number").textContent = "?";
    slot.classList.remove("matched");
  });

  // Reset buttons and status
  spinButton.textContent = "SPIN";
  spinButton.disabled = false;

  resetButton.hidden = true;

  updateStatus("FIND THE COMBINATION");

  // Reset spin count
  spinCount = 0;
  updateAttemptDisplay();

  // Hide reward panel
  safe.classList.remove("unlocked", "locked-out");
  rewardPanel.classList.remove("access-denied");
  rewardPanel.hidden = true;
}

function showReward() {
  // Select a random reward
  const reward = rewards[Math.floor(Math.random() * rewards.length)];

  // Calculate performance rating
  let rating;

  if (spinCount <= 3) {
    rating = "MASTER CRACKER";
  } else if (spinCount <= 6) {
    rating = "EXPERT CRACKER";
  } else if (spinCount <= 10) {
    rating = "SAFE CRACKER";
  } else {
    rating = "PERSISTENCE PAYS OFF";
  }

  // Populate reward panel
  rewardTitle.textContent = reward.title;
  rewardArt.textContent = reward.art;
  rewardMessage.textContent = reward.message;

  rewardSpins.textContent = `${spinCount} SPINS`;
  rewardRating.textContent = rating;

  // Reveal reward panel
  rewardPanel.hidden = false;
}
replayButton.addEventListener("click", resetGame);

function endGame(reason = "MAXIMUM ATTEMPTS EXCEEDED") {
  if (gameOver) return;
  gameOver = true;
  isSpinning = false;
  spinButton.disabled = true;
  spinButton.textContent = "LOCKED";
  disableGuessForms();
  safe.classList.add("locked-out");
  updateStatus("SECURITY LOCKOUT");

  // Reuse the reward panel as a terminal-style failure screen.
  rewardPanel.classList.add("access-denied");
  rewardTitle.textContent = "ACCESS DENIED";
  rewardArt.textContent = String.raw`
    .----------.
    |  LOCKED  |
    |    XX    |
    '----------'`;
  rewardMessage.textContent = reason;
  rewardSpins.textContent = `${spinCount} / ${MAX_SPINS} ATTEMPTS USED`;
  rewardRating.textContent = "SECURITY LOCKOUT";
  rewardPanel.hidden = false;
  resetButton.hidden = false;
}

// Initialize the game
function initGame() {
  generateCombination();

  createDials();
  updateAttemptDisplay();
  updateStatus("FIND THE COMBINATION");

  spinButton.addEventListener("click", spinGame);

  dials.forEach((dial) => {
    dial.element.addEventListener("click", (event) => handleDialClick(event, dial));
  });

  guessForms.forEach((form) => {
    form.addEventListener("submit", testDialGuess);
  });

  resetButton.addEventListener("click", resetGame);
}

initGame();
