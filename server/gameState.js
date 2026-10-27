const fs = require('fs');
const path = require('path');

const questionsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'questions.json'), 'utf8')
);
const charactersData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'characters.json'), 'utf8')
);

class GameState {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId, pin) {
    if (pin !== '280628') {
      return { success: false, message: 'PIN Host salah!' };
    }

    const roomCode = this.generateRoomCode();
    const room = {
      code: roomCode,
      hostSocketId,
      status: 'WAITING', // WAITING | PLAYING | FINISHED
      players: new Map(),
      lockedCharacters: new Map(), // characterId -> socketId
      pendingEssays: new Map(), // socketId -> { playerId, playerName, character, essayText }
      questions: questionsData,
      createdAt: Date.now()
    };

    this.rooms.set(roomCode, room);
    return { success: true, roomCode };
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode?.toUpperCase());
  }

  setHostSocket(roomCode, socketId) {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    room.hostSocketId = socketId;
    return true;
  }

  joinRoom(roomCode, socketId, playerName) {
    const room = this.getRoom(roomCode);
    if (!room) {
      return { success: false, message: 'Kode Room tidak ditemukan!' };
    }
    if (room.status !== 'WAITING') {
      return { success: false, message: 'Permainan di room ini sudah berlangsung!' };
    }
    if (room.players.size >= 30) {
      return { success: false, message: 'Room sudah penuh (maksimal 30 pemain)!' };
    }

    const player = {
      id: socketId,
      name: playerName.trim(),
      gender: null,
      character: null,
      score: 0,
      hearts: 3, // Awal permainan 3 hati
      lifelinesLeft: 3,
      currentQuestionIndex: 0,
      isDead: false,
      isEliminated: false,
      finished: false,
      activeMathChallenge: null,
      usedHelpOnCurrentQuestion: false,
      reviveUsed: false // Kesempatan kembali hanya 1 kali
    };

    room.players.set(socketId, player);
    return { success: true, roomCode: room.code, player };
  }

  setGender(roomCode, socketId, gender) {
    const room = this.getRoom(roomCode);
    if (!room || !room.players.has(socketId)) return false;
    room.players.get(socketId).gender = gender;
    return true;
  }

  lockCharacter(roomCode, socketId, characterId) {
    const room = this.getRoom(roomCode);
    if (!room || !room.players.has(socketId)) {
      return { success: false, message: 'Room atau pemain tidak ditemukan' };
    }

    // Check if character is already locked by someone else
    const currentOwner = room.lockedCharacters.get(characterId);
    if (currentOwner && currentOwner !== socketId) {
      return { success: false, message: 'Karakter ini sudah dipilih oleh pemain lain!' };
    }

    // Release any previously locked character by this socket
    for (const [charId, ownerId] of room.lockedCharacters.entries()) {
      if (ownerId === socketId) {
        room.lockedCharacters.delete(charId);
      }
    }

    // Find character details
    const allChars = [...charactersData.male, ...charactersData.female];
    const charObj = allChars.find((c) => c.id === characterId);
    if (!charObj) {
      return { success: false, message: 'Karakter tidak valid' };
    }

    room.lockedCharacters.set(characterId, socketId);
    const player = room.players.get(socketId);
    player.character = charObj;

    return {
      success: true,
      character: charObj,
      lockedList: Array.from(room.lockedCharacters.keys())
    };
  }

  getLockedCharacters(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) return [];
    return Array.from(room.lockedCharacters.keys());
  }

  getPlayerList(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) return [];
    return Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      gender: p.gender,
      character: p.character,
      score: p.score,
      hearts: p.hearts,
      isDead: p.isDead,
      isEliminated: p.isEliminated,
      finished: p.finished
    }));
  }

  startGame(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    room.status = 'PLAYING';
    return true;
  }

  getPlayerQuestion(roomCode, socketId) {
    const room = this.getRoom(roomCode);
    if (!room || !room.players.has(socketId)) return null;

    const player = room.players.get(socketId);
    if (player.isEliminated) {
      return { isEliminated: true, score: player.score };
    }
    if (player.isDead) {
      return { isDead: true, canRevive: !player.reviveUsed };
    }
    if (player.currentQuestionIndex >= room.questions.length) {
      player.finished = true;
      return { finished: true };
    }

    const q = room.questions[player.currentQuestionIndex];
    player.usedHelpOnCurrentQuestion = false;

    // Return question without revealing correctIndex to client
    return {
      index: player.currentQuestionIndex,
      total: room.questions.length,
      id: q.id,
      question: q.question,
      options: q.options
    };
  }

  submitAnswer(roomCode, socketId, chosenIndex, remainingTimeSec) {
    const room = this.getRoom(roomCode);
    if (!room || !room.players.has(socketId)) return null;

    const player = room.players.get(socketId);
    if (player.isDead || player.isEliminated || player.finished) return null;

    const q = room.questions[player.currentQuestionIndex];
    const isCorrect = chosenIndex === q.correctIndex;

    let pointsEarned = 0;
    if (isCorrect) {
      // Speed bonus: Max 1000 points (500 base + remaining time up to 500)
      const speedScore = Math.max(0, Math.floor((remainingTimeSec / 60) * 500));
      pointsEarned = 500 + speedScore;
      player.score += pointsEarned;
    } else {
      // Wrong answer: Lose 1 heart
      player.hearts = Math.max(0, player.hearts - 1);
      if (player.hearts === 0) {
        player.isDead = true;
        // Jika sudah pernah menggunakan kesempatan kembali, langsung gugur permanen
        if (player.reviveUsed) {
          player.isEliminated = true;
        }
      }
    }

    // Move to next question if still alive
    if (!player.isDead) {
      player.currentQuestionIndex++;
      if (player.currentQuestionIndex >= room.questions.length) {
        player.finished = true;
      }
    }

    return {
      isCorrect,
      correctIndex: q.correctIndex,
      pointsEarned,
      newScore: player.score,
      hearts: player.hearts,
      isDead: player.isDead,
      isEliminated: player.isEliminated,
      finished: player.finished,
      canRevive: !player.reviveUsed
    };
  }

  requestMathChallenge(roomCode, socketId) {
    const room = this.getRoom(roomCode);
    if (!room || !room.players.has(socketId)) return null;

    const player = room.players.get(socketId);
    if (player.lifelinesLeft <= 0 || player.usedHelpOnCurrentQuestion) {
      return { success: false, message: 'Bantuan tidak dapat digunakan!' };
    }

    const a = Math.floor(Math.random() * 8) + 2; // 2..9
    const b = Math.floor(Math.random() * 8) + 2; // 2..9
    player.activeMathChallenge = { a, b, answer: a * b };

    return {
      success: true,
      question: `${a} × ${b} = ?`
    };
  }

  verifyMathChallenge(roomCode, socketId, playerAnswer) {
    const room = this.getRoom(roomCode);
    if (!room || !room.players.has(socketId)) return null;

    const player = room.players.get(socketId);
    if (!player.activeMathChallenge || player.lifelinesLeft <= 0) {
      return { success: false, message: 'Tantangan tidak valid!' };
    }

    const isMathCorrect = parseInt(playerAnswer, 10) === player.activeMathChallenge.answer;
    player.lifelinesLeft--;
    player.usedHelpOnCurrentQuestion = true;
    player.activeMathChallenge = null;

    if (!isMathCorrect) {
      return {
        success: false,
        lifelinesLeft: player.lifelinesLeft,
        message: 'Jawaban matematika salah! Token bantuan hangus.'
      };
    }

    // Correct! Eliminate 2 wrong options from current question
    const q = room.questions[player.currentQuestionIndex];
    const wrongIndices = [0, 1, 2, 3].filter((idx) => idx !== q.correctIndex);
    // Shuffle wrong indices and take 2
    wrongIndices.sort(() => Math.random() - 0.5);
    const eliminateIndices = wrongIndices.slice(0, 2);

    return {
      success: true,
      lifelinesLeft: player.lifelinesLeft,
      eliminateIndices
    };
  }

  handleDeathChoice(roomCode, socketId, choice, essayText) {
    const room = this.getRoom(roomCode);
    if (!room || !room.players.has(socketId)) return null;

    const player = room.players.get(socketId);

    if (choice === 'GIVE_UP') {
      player.isEliminated = true;
      return { status: 'ELIMINATED' };
    }

    if (choice === 'REVIVE_REQUEST') {
      if (player.reviveUsed) {
        return { error: 'Kesempatan kembali hanya dapat digunakan 1 kali selama permainan!' };
      }
      player.reviveUsed = true; // Tandai kesempatan kembali sudah dipakai

      // Poin tetap utuh (tidak ada pengurangan poin)
      const essaySubmission = {
        playerId: socketId,
        playerName: player.name,
        character: player.character,
        score: player.score,
        essayText: (essayText || '').trim(),
        submittedAt: Date.now()
      };

      room.pendingEssays.set(socketId, essaySubmission);
      return { status: 'WAITING_HOST_APPROVAL', newScore: player.score, essay: essaySubmission };
    }

    return null;
  }

  reviewEssay(roomCode, playerId, isApproved) {
    const room = this.getRoom(roomCode);
    if (!room || !room.players.has(playerId)) return null;

    const player = room.players.get(playerId);
    room.pendingEssays.delete(playerId);

    if (isApproved) {
      player.isDead = false;
      player.hearts = 1; // Hidup kembali hanya dengan 1 hati
      player.currentQuestionIndex++; // Continue to next question
      if (player.currentQuestionIndex >= room.questions.length) {
        player.finished = true;
      }
      return { status: 'REVIVED', player };
    } else {
      player.isEliminated = true;
      return { status: 'ELIMINATED', player };
    }
  }

  getLeaderboard(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) return [];

    const list = Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      character: p.character,
      score: p.score,
      hearts: p.hearts,
      isDead: p.isDead,
      isEliminated: p.isEliminated,
      finished: p.finished
    }));

    // Sort descending by score
    list.sort((a, b) => b.score - a.score);
    return list;
  }

  removePlayer(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.has(socketId)) {
        room.players.delete(socketId);
        // Release locked character if any
        for (const [charId, ownerId] of room.lockedCharacters.entries()) {
          if (ownerId === socketId) {
            room.lockedCharacters.delete(charId);
          }
        }
        room.pendingEssays.delete(socketId);
        return { roomCode: room.code };
      }
    }
    return null;
  }
}

module.exports = new GameState();
