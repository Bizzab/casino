const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Start the HTTP server
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ server });

// Game state
const claimedSeats = new Set();
const playerChips = {
  seat1: 1000,
  seat2: 1000,
  seat3: 1000,
  seat4: 1000,
  seat5: 1000,
  seat6: 1000,
};

// Handle WebSocket connections
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'claimSeat') {
      if (!claimedSeats.has(data.seatId)) {
        claimedSeats.add(data.seatId);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'seatClaimed', seatId: data.seatId }));
          }
        });
      }
    }
  });
});