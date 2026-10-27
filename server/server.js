const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const { initSocketHandlers } = require('./socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Serve public static folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// Fallback routes for easy navigation
app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'host', 'index.html'));
});

app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'player', 'index.html'));
});

// Initialize real-time handlers
initSocketHandlers(io);

// Helper to get local network IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('====================================================');
  console.log('PIXEL MULTIPLAYER QUIZ SERVER RUNNING!');
  console.log(`Local Host URL:      http://localhost:${PORT}`);
  console.log(`Classroom Player URL: http://${localIp}:${PORT}`);
  console.log('====================================================');
});
