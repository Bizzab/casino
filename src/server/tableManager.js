const { getDeck, shuffle } = require('../utils/deck');
const WebSocket = require('ws');

const claimedSeats = new Set();
const playerChips = {
  seat1: 1000,
  seat2: 1000,
  seat3: 1000,
  seat4: 1000,
  seat5: 1000,
  seat6: 1000,
};

let deck = [];
let playerHands = {}; // { seatId: [card1, card2] }

function handleMessage(data, wss, ws) {
  if (data.type === 'claimSeat') {
    if (!claimedSeats.has(data.seatId)) {
      claimedSeats.add(data.seatId);
      broadcast(wss, { type: 'seatClaimed', seatId: data.seatId });
      console.log(`${data.seatId} claimed by ${ws._socket.remoteAddress}`);
    }
  }

  if (data.type === 'updateChips') {
    playerChips[data.seatId] = data.chips;
    broadcast(wss, { type: 'chipsUpdated', seatId: data.seatId, chips: data.chips });
    console.log(`Chips updated for ${data.seatId}: $${data.chips}`);
  }

  if (data.type === 'dealCards') {
    // Only allow if at least one seat is claimed
    if (claimedSeats.size === 0) return;

    deck = getDeck();
    shuffle(deck);
    playerHands = {};

    // Deal 2 cards to each claimed seat
    claimedSeats.forEach(seatId => {
      playerHands[seatId] = [deck.pop(), deck.pop()];
    });

    // Send each player their hand privately
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.seatId) {
        const hand = playerHands[client.seatId] || [];
        client.send(JSON.stringify({ type: 'yourHand', hand }));
      }
    });

    // Optionally, broadcast that cards have been dealt
    broadcast(wss, { type: 'cardsDealt' });
  }

  // When a client claims a seat, remember their ws <-> seatId mapping
  if (data.type === 'claimSeat') {
    ws.seatId = data.seatId;
  }
}

function broadcast(wss, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

module.exports = { handleMessage, playerChips, claimedSeats };