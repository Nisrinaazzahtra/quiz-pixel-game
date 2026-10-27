const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\31d92ca5-e341-47be-9f57-79515c851732\\.user_uploaded';
const dstDir = path.join(__dirname, '..', 'public', 'assets', 'images', 'backgrounds');

fs.mkdirSync(dstDir, { recursive: true });

const mappings = [
  { src: 'media_1792843807562_4e577882.jpg', dst: 'bg_home.png' },
  { src: 'media_1792843811502_1906c896.jpg', dst: 'bg_host_waiting.png' },
  { src: 'media_1792843823601_ede98ab2.jpg', dst: 'bg_host_game.png' },
  { src: 'media_1792843925130_fe1de978.jpg', dst: 'bg_player_quiz.png' },
  { src: 'media_1792843944680_d798dfcf.jpg', dst: 'bg_player_dead.png' }
];

mappings.forEach(({ src, dst }) => {
  const sourcePath = path.join(srcDir, src);
  const destPath = path.join(dstDir, dst);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied ${src} -> ${dst}`);
  } else {
    console.warn(`File not found: ${sourcePath}`);
  }
});

console.log('Background copies complete.');
