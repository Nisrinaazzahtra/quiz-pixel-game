const gameState = require('./gameState');
const fs = require('fs');
const path = require('path');

const charactersData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'characters.json'), 'utf8')
);

function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    // -------------------------------------------------------------
    // HOST EVENTS
    // -------------------------------------------------------------
    socket.on('createRoom', ({ pin }, callback) => {
      const res = gameState.createRoom(socket.id, pin);
      if (!res.success) {
        return callback(res);
      }
      socket.join(res.roomCode);
      socket.roomCode = res.roomCode;
      socket.isHost = true;
      callback({ success: true, roomCode: res.roomCode });
    });

    socket.on('hostJoin', ({ roomCode }, callback) => {
      const room = gameState.getRoom(roomCode);
      if (!room) {
        if (callback) callback({ success: false, message: 'Room tidak ditemukan!' });
        return;
      }

      // Re-bind host socket to this room
      gameState.setHostSocket(room.code, socket.id);
      socket.join(room.code);
      socket.roomCode = room.code;
      socket.isHost = true;

      // Immediately send current player list to host
      const currentPlayers = gameState.getPlayerList(room.code);
      socket.emit('playersUpdate', currentPlayers);

      if (callback) callback({ success: true, players: currentPlayers });
    });

    socket.on('startGame', ({ roomCode }, callback) => {
      const room = gameState.getRoom(roomCode);
      if (!room) {
        if (callback) callback({ success: false, message: 'Room tidak ditemukan!' });
        return;
      }

      if (room.hostSocketId !== socket.id) {
        if (callback) callback({ success: false, message: 'Hanya host yang dapat memulai permainan!' });
        return;
      }

      gameState.startGame(roomCode);
      io.to(roomCode).emit('gameStarted');
      io.to(roomCode).emit('leaderboardUpdate', gameState.getLeaderboard(roomCode));
      if (callback) callback({ success: true });
    });

    socket.on('reviewEssay', ({ roomCode, playerId, isApproved }) => {
      const room = gameState.getRoom(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      const result = gameState.reviewEssay(roomCode, playerId, isApproved);
      if (!result) return;

      if (result.status === 'REVIVED') {
        io.to(playerId).emit('essayResult', {
          approved: true,
          hearts: 1,
          newScore: result.player.score,
          message: 'Host menyetujui jawaban essay kamu! Kamu hidup kembali dengan 1 hati.'
        });
      } else {
        io.to(playerId).emit('essayResult', {
          approved: false,
          message: 'Host menolak jawaban essay kamu. Kamu telah gugur.'
        });
      }

      // Update Host with new list of pending essays & leaderboard
      const pendingList = Array.from(room.pendingEssays.values());
      socket.emit('pendingEssaysUpdate', pendingList);
      io.to(roomCode).emit('leaderboardUpdate', gameState.getLeaderboard(roomCode));
    });

    // -------------------------------------------------------------
    // PLAYER EVENTS
    // -------------------------------------------------------------
    socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
      const res = gameState.joinRoom(roomCode, socket.id, playerName);
      if (!res.success) {
        return callback(res);
      }

      socket.join(res.roomCode);
      socket.roomCode = res.roomCode;
      socket.isPlayer = true;

      // Notify Host of new player
      const room = gameState.getRoom(res.roomCode);
      io.to(room.hostSocketId).emit('playersUpdate', gameState.getPlayerList(res.roomCode));

      callback({
        success: true,
        roomCode: res.roomCode,
        player: res.player
      });
    });

    socket.on('getCharacters', ({ roomCode }, callback) => {
      const locked = gameState.getLockedCharacters(roomCode);
      callback({
        characters: charactersData,
        lockedList: locked
      });
    });

    socket.on('lockCharacter', ({ roomCode, characterId }, callback) => {
      const res = gameState.lockCharacter(roomCode, socket.id, characterId);
      if (!res.success) {
        return callback(res);
      }

      // Broadcast locked character list to all players in the room
      io.to(roomCode).emit('characterLockedUpdate', {
        lockedList: res.lockedList,
        characterId,
        playerId: socket.id
      });

      // Update Host view
      const room = gameState.getRoom(roomCode);
      if (room) {
        io.to(room.hostSocketId).emit('playersUpdate', gameState.getPlayerList(roomCode));
      }

      callback({ success: true, character: res.character });
    });

    socket.on('getQuestion', ({ roomCode }, callback) => {
      const q = gameState.getPlayerQuestion(roomCode, socket.id);
      callback(q);
    });

    socket.on('submitAnswer', ({ roomCode, chosenIndex, remainingTimeSec }, callback) => {
      const res = gameState.submitAnswer(roomCode, socket.id, chosenIndex, remainingTimeSec);
      if (!res) return callback({ error: 'Tidak dapat mengirim jawaban' });

      // Notify room / host about score & heart updates
      io.to(roomCode).emit('leaderboardUpdate', gameState.getLeaderboard(roomCode));

      const room = gameState.getRoom(roomCode);
      if (room) {
        io.to(room.hostSocketId).emit('playersUpdate', gameState.getPlayerList(roomCode));
      }

      callback(res);
    });

    socket.on('requestMathHelp', ({ roomCode }, callback) => {
      const res = gameState.requestMathChallenge(roomCode, socket.id);
      callback(res);
    });

    socket.on('submitMathHelp', ({ roomCode, answer }, callback) => {
      const res = gameState.verifyMathChallenge(roomCode, socket.id, answer);
      callback(res);
    });

    socket.on('submitDeathChoice', ({ roomCode, choice, essayText }, callback) => {
      const res = gameState.handleDeathChoice(roomCode, socket.id, choice, essayText);
      if (!res) return callback({ error: 'Gagal memproses pilihan' });

      const room = gameState.getRoom(roomCode);
      if (room) {
        io.to(room.hostSocketId).emit('playersUpdate', gameState.getPlayerList(roomCode));
        io.to(roomCode).emit('leaderboardUpdate', gameState.getLeaderboard(roomCode));

        if (choice === 'REVIVE_REQUEST' && res.essay) {
          // Send pending essay to Host
          const pendingList = Array.from(room.pendingEssays.values());
          io.to(room.hostSocketId).emit('pendingEssaysUpdate', pendingList);
        }
      }

      callback(res);
    });

    // -------------------------------------------------------------
    // DISCONNECT
    // -------------------------------------------------------------
    socket.on('disconnect', () => {
      const res = gameState.removePlayer(socket.id);
      if (res && res.roomCode) {
        const room = gameState.getRoom(res.roomCode);
        if (room) {
          io.to(room.hostSocketId).emit('playersUpdate', gameState.getPlayerList(res.roomCode));
          io.to(res.roomCode).emit('characterLockedUpdate', {
            lockedList: gameState.getLockedCharacters(res.roomCode)
          });
          io.to(res.roomCode).emit('leaderboardUpdate', gameState.getLeaderboard(res.roomCode));
        }
      }
    });
  });
}

module.exports = { initSocketHandlers };
