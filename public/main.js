const suits = ['♠️', '♥️', '♦️', '♣️'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const claimedSeats = new Set();
let localSeat = null;
let pot = 0;

const playerChips = {
  seat1: 1000,
  seat2: 1000,
  seat3: 1000,
  seat4: 1000,
  seat5: 1000,
  seat6: 1000
};

// Connect to WebSocket server
const socket = new WebSocket('wss://your-app-name.onrender.com'); // Replace with your Render URL

// Handle incoming WebSocket messages
socket.onmessage = function (event) {
  const data = JSON.parse(event.data);

  if (data.type === 'seatClaimed') {
    claimedSeats.add(data.seatId);
    document.getElementById(data.seatId).style.backgroundColor = '#ffd700'; // Highlight claimed seat
  }

  if (data.type === 'chipsUpdated') {
    document.getElementById(`chips${data.seatId}`).textContent = `$${data.chips}`;
  }
};

// Function to claim a seat
window.claimSeat = function (seatId) {
  if (claimedSeats.has(seatId)) {
    alert(`${seatId} is already taken.`);
    return;
  }
  if (localSeat) {
    alert(`You are already seated at ${localSeat}.`);
    return;
  }

  localSeat = seatId;
  socket.send(JSON.stringify({ type: 'claimSeat', seatId }));
};

// Function to update chips
window.updateChips = function (seatId, chips) {
  socket.send(JSON.stringify({ type: 'updateChips', seatId, chips }));
};

// Function to get a deck of cards
function getDeck() {
  const deck = [];
  suits.forEach(s => values.forEach(v => deck.push(`${v}${s}`)));
  return deck;
}

// Function to shuffle the deck
function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// Function to update the chip display
function updateChips() {
  for (let i = 1; i <= 6; i++) {
    document.getElementById(`chips${i}`).textContent = `$${playerChips[`seat${i}`]}`;
  }
}

// Function to log game actions
function logAction(text) {
  const log = document.createElement('div');
  log.textContent = `${text} (Pot: $${pot})`;
  log.style.color = '#d4ffcb';
  document.body.appendChild(log);
}

// Function to handle player actions (call, raise, fold)
function playerAction(action) {
  const seat = localSeat;
  if (!seat) return;

  if (action === 'call') {
    const callAmount = 20;
    if (playerChips[seat] >= callAmount) {
      playerChips[seat] -= callAmount;
      pot += callAmount;
      logAction(`${seat} calls $${callAmount}`);
      socket.send(JSON.stringify({ type: 'updateChips', seatId: seat, chips: playerChips[seat] }));
    }
  } else if (action === 'raise') {
    const raiseBy = parseInt(document.getElementById('raise-amount').value);
    if (raiseBy > 0 && playerChips[seat] >= raiseBy) {
      playerChips[seat] -= raiseBy;
      pot += raiseBy;
      logAction(`${seat} raises $${raiseBy}`);
      socket.send(JSON.stringify({ type: 'updateChips', seatId: seat, chips: playerChips[seat] }));
    }
  } else if (action === 'fold') {
    logAction(`${seat} folds`);
  }
  updateChips();
}

// Function to deal cards to players
function dealCards() {
  if (!localSeat) {
    alert("Set your seat using setLocalSeat('seatX') before dealing.");
    return;
  }

  const deck = getDeck();
  shuffle(deck);

  document.querySelectorAll('.card-emoji').forEach(el => el.remove());
  ['flop1', 'flop2', 'flop3', 'turn', 'river'].forEach(id => {
    document.getElementById(id).textContent = '🂠';
  });

  const hands = {};
  for (let i = 1; i <= 6; i++) {
    const seat = `seat${i}`;
    const c1 = deck.pop();
    const c2 = deck.pop();
    hands[seat] = [c1, c2];

    const offset1 = (seat === localSeat) ? -25 : 0;
    const offset2 = (seat === localSeat) ? 25 : 0;

    dealToPlayer(seat, c1, i * 400 + 100, offset1);
    dealToPlayer(seat, c2, i * 400 + 500, offset2);
  }
}

// Function to deal cards to a specific player
function dealToPlayer(seatId, cardText, delay, xOffset = 0) {
  const card = document.createElement('div');
  card.className = 'card-emoji';
  card.textContent = '🂠';
  document.getElementById('table').appendChild(card);

  card.style.left = '270px';
  card.style.top = '170px';

  const seat = document.getElementById(seatId);
  const x = seat.offsetLeft + 30 + xOffset;
  const y = seat.offsetTop + 60;

  setTimeout(() => {
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
  }, delay);

  setTimeout(() => {
    if (seatId === localSeat) {
      card.textContent = cardText;
      card.classList.add('flipped');
    } else {
      card.textContent = '🂠';
    }
  }, delay + 500);
}