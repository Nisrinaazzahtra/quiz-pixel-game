const socket = io();

// Parse room code
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('code');

if (!roomCode) {
  alert('Kode Room tidak ditemukan!');
  window.location.href = '/';
}

// State
let myPlayerName = '';
let myGender = 'male';
let myCharacter = null;
let currentScore = 0;
let currentHearts = 3; // Awal permainan 3 hati
let reviveUsed = false; // Kesempatan kembali hanya 1 kali
let lifelinesUsed = 0; // 0/3
let currentQuestion = null;
let timerInterval = null;
let remainingTime = 60;
let selectedCharId = null;
let allCharacters = { male: [], female: [] };
let lockedCharIds = new Set();

// Elements
const playerBg = document.getElementById('playerBg');
const permanentHud = document.getElementById('permanentHud');
const hudAvatarImg = document.getElementById('hudAvatarImg');
const hudPlayerName = document.getElementById('hudPlayerName');
const hudPlayerScore = document.getElementById('hudPlayerScore');
const hudHeartsRow = document.getElementById('hudHeartsRow');
const hudHelpWrapper = document.getElementById('hudHelpWrapper');
const btnRequestHelp = document.getElementById('btnRequestHelp');
const hudHelpCounter = document.getElementById('hudHelpCounter');
const hudSkullTag = document.getElementById('hudSkullTag');

// Step Sections
const stepName = document.getElementById('stepName');
const stepGender = document.getElementById('stepGender');
const stepCharSelect = document.getElementById('stepCharSelect');
const stepWaitingRoom = document.getElementById('stepWaitingRoom');
const stepQuiz = document.getElementById('stepQuiz');
const stepOutOfHearts = document.getElementById('stepOutOfHearts');
const stepEssayForm = document.getElementById('stepEssayForm');
const stepEliminated = document.getElementById('stepEliminated');
const stepFinished = document.getElementById('stepFinished');

// Name & Gender
const playerNameInput = document.getElementById('playerNameInput');
const btnSubmitName = document.getElementById('btnSubmitName');
const btnSelectMale = document.getElementById('btnSelectMale');
const btnSelectFemale = document.getElementById('btnSelectFemale');

// Character select
const charGrid = document.getElementById('charGrid');
const btnLockCharacter = document.getElementById('btnLockCharacter');
const waitingAvatarImg = document.getElementById('waitingAvatarImg');
const waitingCharName = document.getElementById('waitingCharName');

// Quiz elements
const quizTimerFill = document.getElementById('quizTimerFill');
const questionCounter = document.getElementById('questionCounter');
const timerText = document.getElementById('timerText');
const questionText = document.getElementById('questionText');
const answersList = document.getElementById('answersList');

// Math modal
const mathModal = document.getElementById('mathModal');
const mathQuestionText = document.getElementById('mathQuestionText');
const mathAnswerInput = document.getElementById('mathAnswerInput');
const mathErrorMsg = document.getElementById('mathErrorMsg');
const btnCancelMath = document.getElementById('btnCancelMath');
const btnSubmitMath = document.getElementById('btnSubmitMath');

// Death & Essay
const deathSubtitle = document.getElementById('deathSubtitle');
const btnChanceRevive = document.getElementById('btnChanceRevive');
const btnGiveUp = document.getElementById('btnGiveUp');
const essayTextInput = document.getElementById('essayTextInput');
const btnSubmitEssay = document.getElementById('btnSubmitEssay');
const essayWaitMsg = document.getElementById('essayWaitMsg');
const finalDeadScore = document.getElementById('finalDeadScore');
const finalSuccessScore = document.getElementById('finalSuccessScore');

// -------------------------------------------------------------
// STEP 1: INPUT NAMA
// -------------------------------------------------------------
btnSubmitName.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  if (!name) {
    alert('Masukkan nama kamu terlebih dahulu!');
    return;
  }
  myPlayerName = name;

  socket.emit('joinRoom', { roomCode, playerName: name }, (res) => {
    if (!res.success) {
      alert(res.message || 'Gagal bergabung ke room');
      window.location.href = '/';
      return;
    }

    stepName.style.display = 'none';
    stepGender.style.display = 'block';
  });
});

playerNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSubmitName.click();
});

// -------------------------------------------------------------
// STEP 2: PILIH GENDER
// -------------------------------------------------------------
btnSelectMale.addEventListener('click', () => {
  myGender = 'male';
  openCharSelect();
});

btnSelectFemale.addEventListener('click', () => {
  myGender = 'female';
  openCharSelect();
});

function openCharSelect() {
  stepGender.style.display = 'none';
  stepCharSelect.style.display = 'block';

  socket.emit('getCharacters', { roomCode }, (res) => {
    allCharacters = res.characters;
    lockedCharIds = new Set(res.lockedList);
    renderCharacterGrid();
  });
}

// -------------------------------------------------------------
// STEP 3: PILIH & KUNCI KARAKTER (EKSKLUSIF)
// -------------------------------------------------------------
function renderCharacterGrid() {
  charGrid.innerHTML = '';
  const list = allCharacters[myGender] || [];

  list.forEach((c) => {
    const slot = document.createElement('div');
    slot.className = 'char-slot';
    slot.dataset.id = c.id;

    if (lockedCharIds.has(c.id)) {
      slot.classList.add('locked');
    }
    if (selectedCharId === c.id) {
      slot.classList.add('selected');
    }

    slot.innerHTML = `
      <img class="char-img" src="${c.image}" alt="${c.name}" />
      <span class="char-name">${c.name}</span>
    `;

    slot.addEventListener('click', () => {
      if (slot.classList.contains('locked')) return;

      document.querySelectorAll('.char-slot').forEach((s) => s.classList.remove('selected'));
      slot.classList.add('selected');
      selectedCharId = c.id;
      btnLockCharacter.disabled = false;
    });

    charGrid.appendChild(slot);
  });
}

// Listen for characters locked by other players in real-time
socket.on('characterLockedUpdate', ({ lockedList, characterId }) => {
  lockedCharIds = new Set(lockedList);
  // Re-render or mark slot as locked
  const slot = document.querySelector(`.char-slot[data-id="${characterId}"]`);
  if (slot) {
    slot.classList.add('locked');
    if (selectedCharId === characterId && !slot.classList.contains('selected')) {
      selectedCharId = null;
      btnLockCharacter.disabled = true;
    }
  }
});

btnLockCharacter.addEventListener('click', () => {
  if (!selectedCharId) return;

  socket.emit('lockCharacter', { roomCode, characterId: selectedCharId }, (res) => {
    if (!res.success) {
      alert(res.message);
      return;
    }

    myCharacter = res.character;

    // Set up permanent HUD data (tetap disembunyikan sampai game dimulai)
    hudAvatarImg.src = myCharacter.image;
    hudPlayerName.textContent = myPlayerName;
    updateHudScoreAndHearts();
    permanentHud.style.display = 'none';

    // Move to waiting room
    stepCharSelect.style.display = 'none';
    waitingAvatarImg.src = myCharacter.image;
    waitingCharName.textContent = myCharacter.name;
    stepWaitingRoom.style.display = 'block';
  });
});

// -------------------------------------------------------------
// STEP 4: RUANG TUNGGU & GAME START
// -------------------------------------------------------------
socket.on('gameStarted', () => {
  stepWaitingRoom.style.display = 'none';
  stepQuiz.style.display = 'block';
  playerBg.style.backgroundImage = "url('/assets/images/backgrounds/bg_player_quiz.png')";

  // Munculkan HUD permanent hanya saat kuis dimulai
  permanentHud.style.display = 'flex';
  document.getElementById('scrollableBody').classList.add('hud-active');

  loadQuestion();
});

// -------------------------------------------------------------
// STEP 5: QUIZ GAMEPLAY
// -------------------------------------------------------------
function loadQuestion() {
  socket.emit('getQuestion', { roomCode }, (q) => {
    if (!q) return;

    if (q.isEliminated) {
      showEliminatedScreen();
      return;
    }

    if (q.isDead) {
      showOutOfHeartsScreen(q.canRevive);
      return;
    }

    if (q.finished) {
      finishGame();
      return;
    }

    currentQuestion = q;
    questionCounter.textContent = `Soal ${q.index + 1} / ${q.total}`;
    questionText.textContent = q.question;

    // Reset answers buttons
    answersList.innerHTML = '';
    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'pixel-btn answer-btn';
      btn.dataset.index = idx;
      btn.textContent = optText;

      btn.addEventListener('click', () => handleAnswerSelect(idx, btn));
      answersList.appendChild(btn);
    });

    startTimer();
  });
}

function startTimer() {
  clearInterval(timerInterval);
  remainingTime = 60;
  timerText.textContent = `${remainingTime}s`;
  quizTimerFill.style.width = '100%';
  quizTimerFill.style.backgroundColor = '#27ae60';

  timerInterval = setInterval(() => {
    remainingTime--;
    timerText.textContent = `${remainingTime}s`;
    const pct = Math.max(0, (remainingTime / 60) * 100);
    quizTimerFill.style.width = `${pct}%`;

    if (remainingTime <= 15) {
      quizTimerFill.style.backgroundColor = '#e74c3c';
    } else if (remainingTime <= 30) {
      quizTimerFill.style.backgroundColor = '#f39c12';
    }

    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      handleTimeOut();
    }
  }, 1000);
}

function handleAnswerSelect(chosenIndex, clickedBtn) {
  clearInterval(timerInterval);
  disableAnswerButtons();

  socket.emit('submitAnswer', {
    roomCode,
    chosenIndex,
    remainingTimeSec: remainingTime
  }, (res) => {
    if (!res) return;

    currentScore = res.newScore;
    currentHearts = res.hearts;
    updateHudScoreAndHearts();

    // Show correct / wrong visual feedback
    if (res.isCorrect) {
      clickedBtn.classList.add('correct');
    } else {
      clickedBtn.classList.add('wrong');
      const correctBtn = answersList.querySelector(`button[data-index="${res.correctIndex}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
    }

    setTimeout(() => {
      if (res.isEliminated) {
        // Jika sudah pernah menggunakan kesempatan kembali dan nyawa habis lagi, langsung gugur!
        showEliminatedScreen();
      } else if (res.isDead) {
        showOutOfHeartsScreen(res.canRevive);
      } else if (res.finished) {
        finishGame();
      } else {
        loadQuestion();
      }
    }, 1200);
  });
}

function handleTimeOut() {
  disableAnswerButtons();
  // Timeout counts as wrong answer
  socket.emit('submitAnswer', {
    roomCode,
    chosenIndex: -1,
    remainingTimeSec: 0
  }, (res) => {
    if (!res) return;
    currentScore = res.newScore;
    currentHearts = res.hearts;
    updateHudScoreAndHearts();

    const correctBtn = answersList.querySelector(`button[data-index="${res.correctIndex}"]`);
    if (correctBtn) correctBtn.classList.add('correct');

    setTimeout(() => {
      if (res.isEliminated) {
        // Jika sudah pernah menggunakan kesempatan kembali dan nyawa habis lagi, langsung gugur!
        showEliminatedScreen();
      } else if (res.isDead) {
        showOutOfHeartsScreen(res.canRevive);
      } else if (res.finished) {
        finishGame();
      } else {
        loadQuestion();
      }
    }, 1200);
  });
}

function disableAnswerButtons() {
  document.querySelectorAll('.answer-btn').forEach((b) => (b.disabled = true));
}

function updateHudScoreAndHearts() {
  hudPlayerScore.textContent = `SCORE: ${currentScore}`;

  // Update hearts
  const heartImgs = hudHeartsRow.querySelectorAll('.hud-heart-icon');
  heartImgs.forEach((img, idx) => {
    if (idx < currentHearts) {
      img.classList.remove('lost');
    } else {
      img.classList.add('lost');
    }
  });

  hudHelpCounter.textContent = `${lifelinesUsed}/3`;
}

// -------------------------------------------------------------
// BANTUAN 50:50 DENGAN MATEMATIKA PERKALIAN
// -------------------------------------------------------------
btnRequestHelp.addEventListener('click', () => {
  if (lifelinesUsed >= 3) {
    alert('Bantuan sudah habis terpakai (maks 3x)!');
    return;
  }

  socket.emit('requestMathHelp', { roomCode }, (res) => {
    if (!res.success) {
      alert(res.message);
      return;
    }

    mathQuestionText.textContent = res.question;
    mathAnswerInput.value = '';
    mathErrorMsg.style.display = 'none';
    mathModal.style.display = 'flex';
    mathAnswerInput.focus();
  });
});

btnCancelMath.addEventListener('click', () => {
  mathModal.style.display = 'none';
});

btnSubmitMath.addEventListener('click', () => {
  const ans = mathAnswerInput.value.trim();
  if (!ans) return;

  socket.emit('submitMathHelp', { roomCode, answer: ans }, (res) => {
    mathModal.style.display = 'none';
    lifelinesUsed = 3 - res.lifelinesLeft;
    updateHudScoreAndHearts();

    if (res.success) {
      // Eliminate 2 wrong choices
      res.eliminateIndices.forEach((idx) => {
        const btn = answersList.querySelector(`button[data-index="${idx}"]`);
        if (btn) btn.classList.add('eliminated');
      });
      alert('Tantangan matematika benar! 2 pilihan salah telah dihilangkan.');
    } else {
      alert(res.message || 'Jawaban salah! Token bantuan hangus.');
    }
  });
});

mathAnswerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSubmitMath.click();
});

// -------------------------------------------------------------
// STEP 6: NYAWA HABIS & PILIHAN
// -------------------------------------------------------------
function showOutOfHeartsScreen(canRevive) {
  stepQuiz.style.display = 'none';
  stepOutOfHearts.style.display = 'flex';
  playerBg.style.backgroundImage = "url('/assets/images/backgrounds/bg_player_dead.png')";

  const allowRevive = (canRevive !== undefined) ? canRevive : !reviveUsed;
  if (!allowRevive) {
    btnChanceRevive.style.display = 'none';
    if (deathSubtitle) {
      deathSubtitle.textContent = 'KESEMPATAN KEMBALI SUDAH DIGUNAKAN. SILAKAN MENYERAH.';
    }
  } else {
    btnChanceRevive.style.display = 'block';
    if (deathSubtitle) {
      deathSubtitle.textContent = 'KLIK PADA SALAH SATU KOLOM DIBAWAH INI';
    }
  }
}

// Menyerah (Kotak Merah)
btnGiveUp.addEventListener('click', () => {
  socket.emit('submitDeathChoice', { roomCode, choice: 'GIVE_UP' }, () => {
    showEliminatedScreen();
  });
});

// Kesempatan Kembali (Kotak Kuning)
btnChanceRevive.addEventListener('click', () => {
  stepOutOfHearts.style.display = 'none';
  stepEssayForm.style.display = 'block';
  essayTextInput.value = '';
  essayWaitMsg.style.display = 'none';
  btnSubmitEssay.disabled = false;
});

btnSubmitEssay.addEventListener('click', () => {
  const text = essayTextInput.value.trim();
  if (text.length < 5) {
    alert('Tulis kalimat essay yang lengkap!');
    return;
  }

  btnSubmitEssay.disabled = true;
  essayWaitMsg.style.display = 'block';
  reviveUsed = true; // Tandai kesempatan kembali sudah digunakan

  socket.emit('submitDeathChoice', {
    roomCode,
    choice: 'REVIVE_REQUEST',
    essayText: text
  }, (res) => {
    if (res && res.error) {
      alert(res.error);
      btnSubmitEssay.disabled = false;
      essayWaitMsg.style.display = 'none';
      return;
    }
    if (res && res.newScore !== undefined) {
      currentScore = res.newScore;
      updateHudScoreAndHearts();
    }
  });
});

// Listen for Host Essay Approval / Rejection
socket.on('essayResult', ({ approved, hearts, newScore, message }) => {
  alert(message);
  stepEssayForm.style.display = 'none';

  if (approved) {
    currentHearts = hearts;
    if (newScore !== undefined) currentScore = newScore;
    updateHudScoreAndHearts();
    playerBg.style.backgroundImage = "url('/assets/images/backgrounds/bg_player_quiz.png')";
    stepQuiz.style.display = 'block';
    loadQuestion();
  } else {
    showEliminatedScreen();
  }
});

// -------------------------------------------------------------
// STEP 8: LAYAR GUGUR (TERELIMINASI)
// -------------------------------------------------------------
function showEliminatedScreen() {
  stepOutOfHearts.style.display = 'none';
  stepEssayForm.style.display = 'none';
  stepQuiz.style.display = 'none';
  stepEliminated.style.display = 'block';
  playerBg.style.backgroundImage = "url('/assets/images/backgrounds/bg_player_dead.png')";

  // HUD Modifications on Death as requested:
  // Karakter, Nama, Skor, Hati 0 + Ikon Tengkorak di sebelah kanan
  currentHearts = 0;
  updateHudScoreAndHearts();
  hudHelpWrapper.style.display = 'none';
  hudSkullTag.style.display = 'block';

  finalDeadScore.textContent = currentScore;
}

// -------------------------------------------------------------
// STEP 9: LAYAR SELESAI
// -------------------------------------------------------------
function finishGame() {
  clearInterval(timerInterval);
  stepQuiz.style.display = 'none';
  stepFinished.style.display = 'block';
  finalSuccessScore.textContent = currentScore;
}
