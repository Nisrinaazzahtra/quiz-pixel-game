# 🎮 Kuis Pixel Multiplayer (Bahasa Indonesia)

Game kuis bertema retro pixel art multiplayer interaktif untuk kelas (kapasitas ±30 pemain), lengkap dengan panel Host, sistem kunci karakter eksklusif, nyawa & sistem bantuan perkalian 50:50, kesempatan hidup kembali lewat review essay guru, serta podium juara 3 besar.

---

## 📁 Struktur Folder Proyek

```text
quiz-pixel-game/
├── package.json               # Konfigurasi dependensi (Express & Socket.IO)
├── README.md                  # Dokumentasi lengkap
├── server/
│   ├── server.js              # Entry point Express & Socket.IO server
│   ├── socketHandler.js       # Logika real-time Socket.IO
│   ├── gameState.js           # Manajemen state room, nyawa, skor, dan essay
│   └── data/
│       ├── questions.json     # 10 Soal Utama Bahasa Indonesia & Pilihan Ganda
│       └── characters.json    # Data 20 Karakter Male & 20 Karakter Female
└── public/
    ├── index.html             # Halaman Utama (Buat Room Host & Masuk Kode Player)
    ├── css/
    │   └── style.css          # Styling global retro pixel art & efek kenyamanan latar
    ├── host/
    │   ├── index.html         # Layar Host Landscape (Ruang Tunggu, Papan Skor, Essay, Podium)
    │   ├── host.css
    │   └── host.js
    ├── player/
    │   ├── index.html         # Layar Player Portrait (Nama, Gender, Karakter, Kuis, Gugur)
    │   ├── player.css
    │   └── player.js
    └── assets/
        └── images/
            ├── backgrounds/   # Latar PNG tetap (bg_home, bg_host_waiting, bg_player_quiz, dll)
            ├── characters/    # Folder aset karakter (male/male_1..20.png, female/female_1..20.png)
            └── icons/         # Ikon hati, bohlam bantuan, tengkorak, dan mahkota
```

---

## 🚀 Cara Menjalankan Game di VS Code

1. Buka folder proyek ini di VS Code:
   ```text
   C:\Users\User\.gemini\antigravity\scratch\quiz-pixel-game
   ```
2. Buka terminal di VS Code (`Ctrl + ` ` `), lalu jalankan:
   ```bash
   npm start
   ```
   *(Atau `node server/server.js`)*
3. Server akan menampilkan alamat akses:
   - **Layar Host (Laptop / Proyektor Kelas):** Buka browser ke `http://localhost:3000`
   - **Layar Pemain / Siswa (HP / Laptop Siswa):** Siswa membuka browser HP dan memasukkan alamat IP lokal laptop host, misalnya `http://192.168.1.XX:3000` (kedua perangkat harus berada di jaringan WiFi yang sama).

---

## 🕹️ Panduan Penggunaan & Alur Permainan

### 1. Untuk Host (Tuan Rumah / Guru):
- Klik tombol **"BUAT KODE"** di halaman awal.
- Masukkan PIN Host: **`280628`**.
- Server akan membuat ruangan dan menampilkan **Kode Room** (contoh: `AK72`) dalam tampilan landscape.
- Di **Waiting Room**, Host dapat melihat siswa yang bergabung dan karakter yang mereka pilih secara real-time.
- Klik **"START"** untuk memulai kuis serentak.
- **Koreksi Essay**: Jika ada siswa yang kehabisan nyawa dan memilih *Kesempatan Kembali*, kalimat essay mereka akan masuk ke panel kanan Host:
  - Kotak Biru (`Terima`): Siswa kembali hidup dengan 3 hati.
  - Kotak Merah (`Tolak`): Siswa dinyatakan gugur.
- **Podium Juara**: Host dapat menekan tombol **"LIHAT PODIUM"** kapan saja untuk menampilkan animasi 3 besar (Juara 1 memakai mahkota di tengah, Juara 2 di kanan, Juara 3 di kiri) serta peringkat lainnya di bawahnya.

### 2. Untuk Player (Siswa):
- Masukkan **Kode Room** di halaman awal -> Klik **Start**.
- Masukkan **Nama Panggilan** -> Klik **Lanjut**.
- Pilih **Gender** (Male / Female).
- Pilih **1 dari 20 Karakter Eksklusif** -> Klik **Kunci Karakter** *(Karakter yang sudah dikunci oleh satu siswa otomatis tidak bisa dipilih siswa lain)*.
- **Header Tetap (Permanent HUD)**: Menampilkan avatar karakter, nama, skor, 5 hati, dan counter bantuan `0/3`. Bagian ini tetap diam di atas saat scroll layar.
- **Aturan Kuis**:
  - 10 Soal Utama Bahasa Indonesia, waktu 60 detik per soal.
  - Poin dihitung dari ketepatan dan kecepatan menjawab.
  - Jika salah, hati berkurang 1 (skor tidak bertambah/berkurang).
- **Fitur Bantuan (Maksimal 3 Kali)**:
  - Klik ikon bohlam di kanan atas.
  - Jawab soal perkalian matematika acak.
  - Jika benar, 2 opsi jawaban salah dieliminasi (50:50).
  - Jika salah, token tetap terpakai (hangus).
- **Jika Nyawa Habis (0 Hati)**:
  - **Menyerah (Kotak Merah)**: Langsung masuk ke Halaman Gugur (muncul ikon tengkorak di samping header).
  - **Kesempatan Kembali (Kotak Kuning)**: Skor dipotong penalti 25%, lalu siswa menulis sebuah kalimat essay dan submit untuk menunggu persetujuan Host.

---

## 🎨 Menyesuaikan Gambar Karakter & Soal Kuis

### Mengganti Karakter dengan Gambar Milikmu:
Cukup simpan gambar PNG transparan karaktermu ke dalam folder berikut (nama file harus sesuai):
- Karakter Pria: `public/assets/images/characters/male/male_1.png` sampai `male_20.png`
- Karakter Wanita: `public/assets/images/characters/female/female_1.png` sampai `female_20.png`

### Mengganti atau Menambah Soal:
Buka file `server/data/questions.json`. Kamu dapat mengubah pertanyaan, opsi jawaban, dan kunci jawaban (`correctIndex`: 0 untuk opsi pertama, 1 untuk opsi kedua, dst).
