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
let messages = [];

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

  messages.push(`Dial ${index + 1} matched!`);
}

// Handle the shared completion state after a spin or manual guess.
function updateGameProgress() {
  const remaining = dials.filter((dial) => !dial.matched).length;
  const matched = dials.length - remaining;

  if (remaining === 0) {
    messages.push("SUCCESS! Safe unlocked!");
    status.textContent = messages.join(" ");

    spinButton.textContent = "UNLOCKED";
    spinButton.disabled = true;

    showReward();
    safe.classList.add("unlocked");
    showResetWhenDone();
    return;
  }

  status.textContent = [
    ...messages,
    `${matched} matched. ${remaining} remaining.`,
  ].join(" ");

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

// A valid manual guess counts as one attempt, whether it is right or wrong.
function testDialGuess(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const index = Number(form.dataset.guess);
  const input = form.querySelector(".guess-input");
  const guess = Number(input.value);
  const dial = dials[index];
  const max = [5, 10, 15][index];

  resetButton.hidden = false;

  // Don't allow guesses on an already matched dial
  if (dial.matched) return;

  // Empty submission does not count as an attempt
  if (input.value.trim() === "") {
    status.textContent = "Please enter a number to test!";
    showInvalidGuess(input);
    return;
  }

  // Count every non-empty guess
  spinCount++;
  spinCountDisplay.textContent = spinCount;

  // Check whether the number is valid
  if (!Number.isInteger(guess) || guess < 1 || guess > max) {
    status.textContent = `Invalid number! Enter a whole number between 1 and ${max}.`;
    showInvalidGuess(input);
    return;
  }

  // Check whether the guess matches the target
  if (guess === targetCombination[index]) {
    markDialMatched(dial, index, guess);
    updateGameProgress();
  } else {
    status.textContent = "Incorrect guess! Try another number.";
    showInvalidGuess(input);
  }
}

// Handle the game
async function spinGame() {
  const exhaustedDial = dials.find(
    (dial) => !dial.matched && dial.availableNumbers.length === 0,
  );

  if (exhaustedDial) {
    status.textContent = "No numbers remaining. Play again!";
    spinButton.disabled = true;
    resetButton.hidden = false;
    return;
  }
  const unmatchedDials = dials.filter((dial) => !dial.matched);

  if (unmatchedDials.length === 0) return;

  // Show reset button when gameplay begins
  resetButton.hidden = false;

  spinCount++;

  spinCountDisplay.textContent = spinCount;

  spinButton.disabled = true;
  guessForms.forEach((form) => {
    form.querySelector(".guess-input").disabled = true;
    form.querySelector(".guess-button").disabled = true;
  });

  status.textContent = "Cracking the safe...";

  unmatchedDials.forEach(spinDial);

  await new Promise((resolve) => {
    setTimeout(resolve, SPIN_DURATION);
  });

  // Check for matching numbers
  unmatchedDials.forEach((dial) => {
    const index = dials.indexOf(dial);
    const target = targetCombination[index];

    if (dial.number === target) {
      markDialMatched(dial, index, target);
    }
  });

  updateGameProgress();

  dials.forEach((dial) => {
    if (!dial.matched && !spinButton.disabled) {
      const form = dial.element.querySelector(".dial-guess");
      form.querySelector(".guess-input").disabled = false;
      form.querySelector(".guess-button").disabled = false;
    }
  });
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
  // Generate a new combination
  generateCombination();

  // Clear previous messages
  messages = [];

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

  status.textContent = "Find the combination.";

  // Reset spin count
  spinCount = 0;
  spinCountDisplay.textContent = spinCount;

  // Hide reward panel
  safe.classList.remove("unlocked");
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

// Initialize the game
function initGame() {
  generateCombination();

  createDials();

  spinButton.addEventListener("click", spinGame);

  guessForms.forEach((form) => {
    form.addEventListener("submit", testDialGuess);
  });

  resetButton.addEventListener("click", resetGame);
}

initGame();
