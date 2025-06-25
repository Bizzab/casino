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

const aiProfiles = {
  seat2: 'balanced',
  seat3: 'aggressive',
  seat4: 'cautious',
  seat5: 'balanced',
  seat6: 'aggressive'
};

const profileSettings = {
  aggressive: { bluffChance: 0.4, callThreshold: 0.3, raiseFactor: 1.6 },
  balanced:   { bluffChance: 0.2, callThreshold: 0.45, raiseFactor: 1.0 },
  cautious:   { bluffChance: 0.05, callThreshold: 0.6, raiseFactor: 0.6 }
};

const playerMemory = {
  raisesSeen: 0,
  lastAggressor: null
};

window.claimSeat = function(seatId) {
  if (claimedSeats.has(seatId)) {
    alert(`${seatId} is already taken.`);
    return;
  }
  if (localSeat) {
    alert(`You are already seated at ${localSeat}.`);
    return;
  }

  localSeat = seatId;
  claimedSeats.add(seatId);
  document.getElementById(seatId).style.backgroundColor = '#ffd700';
  document.getElementById('seat-selection').style.display = 'none'; // Hides the UI
  logAction(`You sat at ${seatId}`);
};

function setLocalSeat(seatId) {
  localSeat = seatId;
}

function getDeck() {
  const deck = [];
  suits.forEach(s => values.forEach(v => deck.push(`${v}${s}`)));
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function updateChips() {
  for (let i = 1; i <= 6; i++) {
    document.getElementById(`chips${i}`).textContent = `$${playerChips[`seat${i}`]}`;
  }
}

function logAction(text) {
  const log = document.createElement('div');
  log.textContent = `${text} (Pot: $${pot})`;
  log.style.color = '#d4ffcb';
  document.body.appendChild(log);
}

function playerAction(action) {
  const seat = localSeat;
  if (!seat) return;

  if (action === 'call') {
    const callAmount = 20;
    if (playerChips[seat] >= callAmount) {
      playerChips[seat] -= callAmount;
      pot += callAmount;
      logAction(`${seat} calls $${callAmount}`);
    }
  } else if (action === 'raise') {
    const raiseBy = parseInt(document.getElementById('raise-amount').value);
    if (raiseBy > 0 && playerChips[seat] >= raiseBy) {
      playerChips[seat] -= raiseBy;
      pot += raiseBy;
      playerMemory.raisesSeen++;
      playerMemory.lastAggressor = seat;
      logAction(`${seat} raises $${raiseBy}`);
    }
  } else if (action === 'fold') {
    logAction(`${seat} folds`);
  }
  updateChips();
}

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

function evaluatePreflopHand(card1, card2) {
  const value = c => c.slice(0, -1);
  const suit = c => c.slice(-1);
  const v1 = value(card1),
        v2 = value(card2);
  const suited = suit(card1) === suit(card2);
  const pair = v1 === v2;
  const high = ['A', 'K', 'Q', 'J', '10'];
  if (pair) return high.includes(v1) ? 0.9 : 0.6;
  if (high.includes(v1) && high.includes(v2)) return suited ? 0.7 : 0.6;
  if (suited) return 0.5;
  return 0.3;
}

function aiRiskFactor(seatId) {
  const stack = playerChips[seatId];
  if (stack > 800) return 1.0;
  if (stack > 400) return 0.8;
  if (stack > 200) return 0.6;
  return 1.4;
}

function aiDecide(seatId, card1, card2) {
  const profile = profileSettings[aiProfiles[seatId]];
  const strength = evaluatePreflopHand(card1, card2) * aiRiskFactor(seatId);
  const bluff = Math.random() < profile.bluffChance;
  const scared = playerMemory.raisesSeen >= 2 && Math.random() < 0.5;

  if (scared && strength < 0.7) {
    logAction(`${seatId} suspects bluff and folds`);
    return;
  }

  if (strength < profile.callThreshold) {
    logAction(`${seatId} folds`);
    return;
  }

  if (bluff) {
    const bluffAmt = 30 + Math.floor(Math.random() * 100);
    if (playerChips[seatId] >= bluffAmt) {
      playerChips[seatId] -= bluffAmt;
      pot += bluffAmt;
      playerMemory.raisesSeen++;
      playerMemory.lastAggressor = seatId;
      logAction(`${seatId} bluffs $${bluffAmt}`);
    }
  } else if (strength > 0.8) {
    const raiseAmt = Math.floor(20 * profile.raiseFactor + Math.random() * 40);
    if (playerChips[seatId] >= raiseAmt) {
      playerChips[seatId] -= raiseAmt;
      pot += raiseAmt;
      playerMemory.raisesSeen++;
      playerMemory.lastAggressor = seatId;
      logAction(`${seatId} raises $${raiseAmt}`);
    }
  } else {
    const callAmt = 20;
    if (playerChips[seatId] >= callAmt) {
      playerChips[seatId] -= callAmt;
      pot += callAmt;
      logAction(`${seatId} calls $${callAmt}`);
    }
  }

  updateChips();
}

function dealCommunity(deck) {
  deck.pop(); // burn

  setTimeout(() => {
    document.getElementById('flop1').textContent = deck.pop();
    document.getElementById('flop2').textContent = deck.pop();
    document.getElementById('flop3').textContent = deck.pop();
    logAction('Flop dealt');
  }, 500);

  setTimeout(() => {
    deck.pop(); // burn
    document.getElementById('turn').textContent = deck.pop();
    logAction('Turn dealt');
  }, 1500);

  setTimeout(() => {
    deck.pop(); // burn
    document.getElementById('river').textContent = deck.pop();
    logAction('River dealt');
  }, 2500);
}

function startBettingRound() {
  pot = 0;
  playerMemory.raisesSeen = 0;
  playerMemory.lastAggressor = null;
  playerChips.seat1 -= 10;
  playerChips.seat2 -= 20;
  pot += 30;
  updateChips();
  logAction(`seat1 posts small blind, seat2 posts big blind`);
}

function runAiTurns(hands) {
  for (let i = 2; i <= 6; i++) {
    const seat = `seat${i}`;
    const [c1, c2] = hands[seat];
    setTimeout(() => aiDecide(seat, c1, c2), i * 800);
  }
}

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

  setTimeout(() => {
  startBettingRound();
  runBettingRound(hands, () => {
    dealFlop(deck);
    runBettingRound(hands, () => {
      dealTurn(deck);
      runBettingRound(hands, () => {
        dealRiver(deck);
        revealAllHands(hands);
        announceWinner(hands);
      });
    });
  });
}, 4000);
}

function revealAllHands(hands) {
  for (let seat in hands) {
    if (seat !== localSeat) {
      const [c1, c2] = hands[seat];
      dealToPlayer(seat, c1, 3000 + Math.random() * 300, -15);
      dealToPlayer(seat, c2, 3100 + Math.random() * 300, 15);
    }
  }
}

function runBettingRound(hands, callback) {
  runAiTurns(hands); // AI plays
  setTimeout(() => {
    callback(); // Continue game after AI actions
  }, 5000); // ~time to complete AI turns
}

function dealFlop(deck) {
  deck.pop();
  document.getElementById('flop1').textContent = deck.pop();
  document.getElementById('flop2').textContent = deck.pop();
  document.getElementById('flop3').textContent = deck.pop();
  logAction('Flop dealt');
}
function dealTurn(deck) {
  deck.pop();
  document.getElementById('turn').textContent = deck.pop();
  logAction('Turn dealt');
}
function dealRiver(deck) {
  deck.pop();
  document.getElementById('river').textContent = deck.pop();
  logAction('River dealt');
}