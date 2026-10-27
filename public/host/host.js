const socket = io();

// Parse room code from query params
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('code');

if (!roomCode) {
  alert('Kode Room tidak valid!');
  window.location.href = '/';
}

// DOM Elements
const hostBg = document.getElementById('hostBg');
const waitingRoomView = document.getElementById('waitingRoomView');
const inGameView = document.getElementById('inGameView');
const podiumView = document.getElementById('podiumView');

const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const playerCountBadge = document.getElementById('playerCountBadge');
const playersGrid = document.getElementById('playersGrid');
const btnStartGame = document.getElementById('btnStartGame');

const scoreboardList = document.getElementById('scoreboardList');
const essayContentBox = document.getElementById('essayContentBox');
const noEssayNotice = document.getElementById('noEssayNotice');
const essayQueueBadge = document.getElementById('essayQueueBadge');
const essayPillsBar = document.getElementById('essayPillsBar');
const btnHostRejectEssay = document.getElementById('btnHostRejectEssay');
const btnHostApproveEssay = document.getElementById('btnHostApproveEssay');

const btnTogglePodium = document.getElementById('btnTogglePodium');
const btnBackToScoreboard = document.getElementById('btnBackToScoreboard');

// Podium Elements
const podiumCol3 = document.getElementById('podiumCol3');
const podiumCol1 = document.getElementById('podiumCol1');
const podiumCol2 = document.getElementById('podiumCol2');
const runnerUpsBox = document.getElementById('runnerUpsBox');
const btnReplayPodium = document.getElementById('btnReplayPodium');
const confettiCanvas = document.getElementById('confettiCanvas');

const podiumRank1Img = document.getElementById('podiumRank1Img');
const podiumRank1Name = document.getElementById('podiumRank1Name');
const podiumRank1Score = document.getElementById('podiumRank1Score');

const podiumRank2Img = document.getElementById('podiumRank2Img');
const podiumRank2Name = document.getElementById('podiumRank2Name');
const podiumRank2Score = document.getElementById('podiumRank2Score');

const podiumRank3Img = document.getElementById('podiumRank3Img');
const podiumRank3Name = document.getElementById('podiumRank3Name');
const podiumRank3Score = document.getElementById('podiumRank3Score');

const runnerUpsList = document.getElementById('runnerUpsList');

let latestLeaderboard = [];

roomCodeDisplay.textContent = roomCode;

// Inform server that host joined this specific room
socket.emit('hostJoin', { roomCode }, (res) => {
  if (!res || !res.success) {
    alert(res ? res.message : 'Room tidak ditemukan!');
    window.location.href = '/';
  }
});

// -------------------------------------------------------------
// REAL-TIME EVENTS
// -------------------------------------------------------------

// Players updated in waiting room
socket.on('playersUpdate', (players) => {
  playerCountBadge.textContent = `${players.length}/30`;

  playersGrid.innerHTML = '';
  if (!players || players.length === 0) {
    playersGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #ffffff; text-shadow: 2px 2px 0 #000; font-size: 13px; padding: 40px 10px;">
        Belum ada pemain yang masuk...<br/><br/>
        <span style="font-size: 10px; color: #f1c40f;">Mintalah mereka memasukkan Kode Room: <strong>${roomCode}</strong></span>
      </div>
    `;
    return;
  }

  players.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'player-card';

    const avatarSrc = p.character ? p.character.image : '/assets/images/characters/male/male_1.png';

    card.innerHTML = `
      <div class="avatar-box">
        <img class="avatar-img" src="${avatarSrc}" alt="${p.name}" />
      </div>
      <div class="name-badge">${p.name}</div>
    `;
    playersGrid.appendChild(card);
  });
});

// Game Started
btnStartGame.addEventListener('click', () => {
  socket.emit('startGame', { roomCode }, (res) => {
    if (res && !res.success) {
      alert(res.message);
    }
  });
});

socket.on('gameStarted', () => {
  waitingRoomView.style.display = 'none';
  inGameView.style.display = 'flex';
  podiumView.style.display = 'none';
  hostBg.style.backgroundImage = "url('/assets/images/backgrounds/bg_host_game.png')";
});

// Real-time Leaderboard Update
socket.on('leaderboardUpdate', (leaderboard) => {
  renderScoreboard(leaderboard);
  renderPodium(leaderboard);
});

function renderScoreboard(leaderboard) {
  scoreboardList.innerHTML = '';

  leaderboard.forEach((p) => {
    const row = document.createElement('div');
    row.className = `score-row ${p.isEliminated ? 'dead' : ''}`;

    const avatarSrc = p.character ? p.character.image : '/assets/images/characters/male/male_1.png';
    const statusTag = p.isEliminated
      ? ' <span style="color: #e74c3c;">(GUGUR)</span>'
      : p.finished
      ? ' <span style="color: #27ae60;">(SELESAI)</span>'
      : '';

    row.innerHTML = `
      <div class="score-row-player">
        <img class="score-row-avatar" src="${avatarSrc}" alt="${p.name}" />
        <span>${p.name}${statusTag}</span>
      </div>
      <div style="font-weight: bold; color: #1b386b;">${p.score} pts</div>
    `;
    scoreboardList.appendChild(row);
  });
}

function renderPodium(leaderboard) {
  if (leaderboard) latestLeaderboard = leaderboard;
  const list = latestLeaderboard || [];

  // Rank 1
  podiumRank1Name.textContent = list[0] ? list[0].name : '-';
  podiumRank1Score.textContent = list[0] ? `${list[0].score} pts` : '0 pts';
  if (list[0] && list[0].character) podiumRank1Img.src = list[0].character.image;

  // Rank 2
  podiumRank2Name.textContent = list[1] ? list[1].name : '-';
  podiumRank2Score.textContent = list[1] ? `${list[1].score} pts` : '0 pts';
  if (list[1] && list[1].character) podiumRank2Img.src = list[1].character.image;

  // Rank 3
  podiumRank3Name.textContent = list[2] ? list[2].name : '-';
  podiumRank3Score.textContent = list[2] ? `${list[2].score} pts` : '0 pts';
  if (list[2] && list[2].character) podiumRank3Img.src = list[2].character.image;

  // Rank 4+ (only name and score, no character as requested)
  runnerUpsList.innerHTML = '';
  const runners = list.slice(3);
  if (runners.length === 0) {
    runnerUpsList.innerHTML = '<div style="color: #ccc; font-size: 10px; text-align: center; padding: 6px;">Belum ada peringkat lainnya</div>';
  } else {
    runners.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'runner-row-item';
      item.style.cssText = `
        display: flex; justify-content: space-between; padding: 8px 12px;
        background: rgba(255, 255, 255, 0.92); border: 2px solid #000; font-size: 11px;
        animation-delay: ${(idx * 0.12) + 0.2}s;
      `;
      item.innerHTML = `
        <span>#${idx + 4} ${escapeHtml(p.name)}</span>
        <span style="font-weight: bold; color: #1b386b;">${p.score} pts</span>
      `;
      runnerUpsList.appendChild(item);
    });
  }
}

// -------------------------------------------------------------
// PENDING ESSAYS (KOREKSI ESSAY DENGAN TOMBOL DI BAGIAN BAWAH)
// -------------------------------------------------------------
let pendingEssaysList = [];
let activeEssayIndex = 0;

function renderActiveEssay() {
  if (!pendingEssaysList || pendingEssaysList.length === 0) {
    if (essayQueueBadge) essayQueueBadge.textContent = '0 Menunggu';
    if (essayPillsBar) essayPillsBar.style.display = 'none';
    essayContentBox.innerHTML = `
      <div id="noEssayNotice" style="color: #777; font-size: 11px; text-align: center; margin: auto 0;">
        Belum ada jawaban essay dari pemain yang gugur.
      </div>
    `;
    btnHostRejectEssay.disabled = true;
    btnHostApproveEssay.disabled = true;
    return;
  }

  if (activeEssayIndex >= pendingEssaysList.length) {
    activeEssayIndex = 0;
  }

  const active = pendingEssaysList[activeEssayIndex];
  if (essayQueueBadge) essayQueueBadge.textContent = `${pendingEssaysList.length} Menunggu`;

  // Tampilkan tab siswa jika lebih dari 1 yang mengajukan
  if (pendingEssaysList.length > 1) {
    essayPillsBar.style.display = 'flex';
    essayPillsBar.innerHTML = '';
    pendingEssaysList.forEach((item, idx) => {
      const pill = document.createElement('div');
      pill.className = `essay-pill ${idx === activeEssayIndex ? 'active' : ''}`;
      pill.textContent = `${idx + 1}. ${item.playerName}`;
      pill.addEventListener('click', () => {
        activeEssayIndex = idx;
        renderActiveEssay();
      });
      essayPillsBar.appendChild(pill);
    });
  } else {
    essayPillsBar.style.display = 'none';
  }

  const avatarSrc = active.character ? active.character.image : '/assets/images/characters/male/male_1.png';

  // Tampilkan konten essay dalam kotak putih besar
  essayContentBox.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; border-bottom: 2px dashed #000; padding-bottom: 10px;">
      <img src="${avatarSrc}" style="width: 44px; height: 44px; object-fit: contain; border: 2px solid #000; background: #fff;" />
      <div>
        <div style="font-size: 13px; font-weight: bold; color: #1a1a1a;">${escapeHtml(active.playerName)}</div>
        <div style="font-size: 10px; color: #555; margin-top: 3px;">Skor: ${active.score} pts</div>
      </div>
    </div>
    <div style="font-size: 10px; color: #666; margin-bottom: 8px; font-weight: bold;">KALIMAT ESSAY SISWA:</div>
    <div style="font-family: var(--font-silk); font-size: 15px; line-height: 1.8; background: #fffde7; padding: 18px; border: 2px solid #000; border-left: 6px solid #f1c40f; flex: 1; min-height: 250px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;">
      "${escapeHtml(active.essayText)}"
    </div>
  `;

  // Aktifkan tombol di bagian bawah
  btnHostRejectEssay.disabled = false;
  btnHostApproveEssay.disabled = false;
}

// Tombol Merah (Tolak / Gugur) di Bagian Bawah
btnHostRejectEssay.addEventListener('click', () => {
  if (pendingEssaysList.length === 0) return;
  const active = pendingEssaysList[activeEssayIndex];
  if (!active) return;

  socket.emit('reviewEssay', { roomCode, playerId: active.playerId, isApproved: false });
});

// Tombol Biru Cyan (Terima / Hidupkan) di Bagian Bawah
btnHostApproveEssay.addEventListener('click', () => {
  if (pendingEssaysList.length === 0) return;
  const active = pendingEssaysList[activeEssayIndex];
  if (!active) return;

  socket.emit('reviewEssay', { roomCode, playerId: active.playerId, isApproved: true });
});

socket.on('pendingEssaysUpdate', (essays) => {
  pendingEssaysList = essays || [];
  renderActiveEssay();
});

// ========================================================
// PIXEL CONFETTI CELEBRATION ENGINE
// ========================================================
class PixelConfetti {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.isRunning = false;
    this.animationFrame = null;
    this.colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#52e3e1', '#ffffff', '#ff7675'];

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    this.canvas.style.display = 'block';
    this.isRunning = true;
    this.resize();
    this.particles = [];

    // 55 butir confetti retro pixel: meriah, elegan, dan tidak menumpuk/mengganggu mata
    for (let i = 0; i < 55; i++) {
      this.particles.push(this.createParticle(true));
    }

    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.canvas.style.display = 'none';
  }

  createParticle(initial = false) {
    const size = Math.floor(Math.random() * 4) + 6; // Kotak 6px - 10px pixel
    return {
      x: Math.random() * this.canvas.width,
      y: initial ? Math.random() * this.canvas.height : -20,
      size: size,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      speedY: Math.random() * 2 + 1.2,
      speedX: (Math.random() - 0.5) * 1.5,
      angle: Math.random() * Math.PI,
      spinSpeed: (Math.random() - 0.5) * 0.08,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.04 + 0.02
    };
  }

  loop() {
    if (!this.isRunning) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.y += p.speedY;
      p.wobble += p.wobbleSpeed;
      p.x += Math.sin(p.wobble) * 1.2 + p.speedX;
      p.angle += p.spinSpeed;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();

      if (p.y > this.canvas.height + 20) {
        this.particles[i] = this.createParticle(false);
      }
    }

    this.animationFrame = requestAnimationFrame(() => this.loop());
  }
}

const pixelConfetti = new PixelConfetti(confettiCanvas);
let podiumTimeouts = [];

function clearPodiumTimeouts() {
  podiumTimeouts.forEach((t) => clearTimeout(t));
  podiumTimeouts = [];
}

// Urutan Animasi Kemunculan Podium (Peringkat Lainnya -> Juara 3 -> Juara 2 -> Juara 1 -> Confetti)
function triggerPodiumSequence() {
  clearPodiumTimeouts();
  if (pixelConfetti) pixelConfetti.stop();

  renderPodium(latestLeaderboard);

  // Sembunyikan elemen terlebih dahulu
  runnerUpsBox.className = 'runner-ups-box runner-ups-hidden';
  podiumCol3.className = 'podium-column podium-hidden';
  podiumCol2.className = 'podium-column podium-hidden';
  podiumCol1.className = 'podium-column podium-hidden';

  // 1. Munculkan peringkat lainnya di bawah (Rank 4+)
  podiumTimeouts.push(
    setTimeout(() => {
      runnerUpsBox.className = 'runner-ups-box runner-ups-visible';
    }, 300)
  );

  // 2. Disusul Juara 3 naik ke podium (kiri)
  podiumTimeouts.push(
    setTimeout(() => {
      podiumCol3.className = 'podium-column podium-rise';
    }, 1500)
  );

  // 3. Disusul Juara 2 naik ke podium (kanan)
  podiumTimeouts.push(
    setTimeout(() => {
      podiumCol2.className = 'podium-column podium-rise';
    }, 2800)
  );

  // 4. Terakhir Juara 1 naik ke podium (tengah paling tinggi dengan mahkota)
  podiumTimeouts.push(
    setTimeout(() => {
      podiumCol1.className = 'podium-column podium-rise';
    }, 4100)
  );

  // 5. Animasi Confetti Meriah melayang setelah Juara 1 naik ke podium
  podiumTimeouts.push(
    setTimeout(() => {
      if (pixelConfetti) pixelConfetti.start();
    }, 5000)
  );
}

// Toggle Podium and Scoreboard
btnTogglePodium.addEventListener('click', () => {
  inGameView.style.display = 'none';
  podiumView.style.display = 'flex';
  triggerPodiumSequence();
});

btnReplayPodium.addEventListener('click', () => {
  triggerPodiumSequence();
});

btnBackToScoreboard.addEventListener('click', () => {
  clearPodiumTimeouts();
  if (pixelConfetti) pixelConfetti.stop();
  podiumView.style.display = 'none';
  inGameView.style.display = 'flex';
});

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return (text || '').replace(/[&<>"']/g, (m) => map[m]);
}
