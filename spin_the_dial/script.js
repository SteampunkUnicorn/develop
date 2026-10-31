const spinButton = document.querySelector(".spin-button");
const resetButton = document.querySelector(".reset-button");
const status = document.querySelector(".game-status");
const dialElements = document.querySelectorAll(".dial");
const combinationSlots = document.querySelectorAll(".combination-slot");
const spinCountDisplay = document.querySelector(".spin-count-number");

const safe = document.querySelector(".safe");
const rewardPanel = document.querySelector(".reward-panel");
const rewardTitle = document.querySelector(".reward-title");
const rewardArt = document.querySelector(".reward-art");
const rewardMessage = document.querySelector(".reward-message");
const rewardSpins = document.querySelector(".reward-spins");
const rewardRating = document.querySelector(".reward-rating");

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

  spinCount++;

  spinCountDisplay.textContent = spinCount;

  spinButton.disabled = true;

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
      dial.matched = true;

      dial.element.classList.add("matched");

      // Reveal the matched number in the combination display
      const slot = combinationSlots[index];

      slot.querySelector(".slot-number").textContent = target;
      slot.classList.add("matched");

      messages.push(`Dial ${index + 1} matched!`);
    }
  });

  const remaining = dials.filter((dial) => !dial.matched).length;

  const matched = dials.length - remaining;

  if (remaining === 0) {
    messages.push("SUCCESS! Safe unlocked!");

    status.textContent = messages.join(" ");

    spinButton.textContent = "UNLOCKED";
    spinButton.disabled = true;

    // Start the winning animation
    safe.classList.add("unlocked");

    // Show the reward after the door starts opening
    setTimeout(() => {
      showReward();
      resetButton.hidden = false;
    }, 1200);
  } else {
    status.textContent = [
      ...messages,
      `${matched} matched. ${remaining} remaining.`,
    ].join(" ");

    spinButton.disabled = false;
  }
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

// Initialize the game
function initGame() {
  generateCombination();

  createDials();

  spinButton.addEventListener("click", spinGame);

  resetButton.addEventListener("click", resetGame);
}

initGame();
