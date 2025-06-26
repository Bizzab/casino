const claimedSeats = new Set();
let localSeat = null;
let pot = 0;

const playerChips = {
  seat1: 1000,
  seat2: 1000,
  seat3: 1000,
  seat4: 1000,
  seat5: 1000,
  seat6: 1000,
};

// Connect to WebSocket server
const socket = new WebSocket('wss://casino-vaqj.onrender.com'); // Use your Render URL

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'seatClaimed') {
    claimedSeats.add(data.seatId);
    const seatEl = document.getElementById(data.seatId);
    if (seatEl) seatEl.style.backgroundColor = '#ffd700'; // Highlight claimed seat
  }

  if (data.type === 'chipsUpdated') {
    const chipsEl = document.getElementById(`chips${data.seatId.replace('seat', '')}`);
    if (chipsEl) chipsEl.textContent = `$${data.chips}`;
  }

  if (data.type === 'yourHand') {
    showPlayerHand(data.hand);
  }

  if (data.type === 'cardsDealt') {
    // Optionally, show a message or animation
  }
};

// Claim seat function (expose globally)
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

// Update chips function (send to server)
window.updateChips = function (seatId, chips) {
  socket.send(JSON.stringify({ type: 'updateChips', seatId, chips }));
};

// Update chips display locally
function updateChipsDisplay() {
  for (let i = 1; i <= 6; i++) {
    const chipsEl = document.getElementById(`chips${i}`);
    if (chipsEl) chipsEl.textContent = `$${playerChips[`seat${i}`]}`;
  }
}

// Log game actions to page
function logAction(text) {
  const log = document.createElement('div');
  log.textContent = `${text} (Pot: $${pot})`;
  log.style.color = '#d4ffcb';
  document.body.appendChild(log);
}

// Handle player actions: call, raise, fold
window.playerAction = function (action) {
  if (!localSeat) return;

  if (action === 'call') {
    const callAmount = 20;
    if (playerChips[localSeat] >= callAmount) {
      playerChips[localSeat] -= callAmount;
      pot += callAmount;
      logAction(`${localSeat} calls $${callAmount}`);
      socket.send(JSON.stringify({ type: 'updateChips', seatId: localSeat, chips: playerChips[localSeat] }));
    }
  } else if (action === 'raise') {
    const raiseBy = parseInt(document.getElementById('raise-amount').value, 10);
    if (raiseBy > 0 && playerChips[localSeat] >= raiseBy) {
      playerChips[localSeat] -= raiseBy;
      pot += raiseBy;
      logAction(`${localSeat} raises $${raiseBy}`);
      socket.send(JSON.stringify({ type: 'updateChips', seatId: localSeat, chips: playerChips[localSeat] }));
    }
  } else if (action === 'fold') {
    logAction(`${localSeat} folds`);
  }
  updateChipsDisplay();
};

// Deal cards to players (request from server)
window.dealCards = function () {
  if (!localSeat) {
    alert("Set your seat using claimSeat('seatX') before dealing.");
    return;
  }
  socket.send(JSON.stringify({ type: 'dealCards' }));
};

// Show player's hand
function showPlayerHand(hand) {
  // Remove old cards
  document.querySelectorAll('.card-emoji').forEach(el => el.remove());

  // Show new cards for local seat
  const seat = document.getElementById(localSeat);
  if (!seat) return;

  hand.forEach((cardText, idx) => {
    const card = document.createElement('div');
    card.className = 'card-emoji';
    card.textContent = '🂠'; // Start face down
    document.getElementById('table').appendChild(card);

    // Start at center of table
    card.style.left = '270px';
    card.style.top = '170px';

    // Calculate destination
    const x = seat.offsetLeft + 30 + (idx === 0 ? -25 : 25);
    const y = seat.offsetTop + 60;

    // Animate movement
    setTimeout(() => {
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
    }, 100 + idx * 400);

    // Flip to reveal after movement
    setTimeout(() => {
      card.textContent = cardText;
      card.classList.add('flipped');
    }, 600 + idx * 400);
  });
}

// Initial update of chips display on page load
updateChipsDisplay();
